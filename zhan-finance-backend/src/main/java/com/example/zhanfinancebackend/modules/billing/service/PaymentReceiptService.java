package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptDto;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptUrlResponse;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentRequisitesDto;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceipt;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceiptStatus;
import com.example.zhanfinancebackend.modules.billing.entity.Subscription;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.PaymentReceiptRepository;
import com.example.zhanfinancebackend.modules.billing.repository.SubscriptionRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import com.example.zhanfinancebackend.modules.telegram.service.TelegramOutboxService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class PaymentReceiptService {

    private static final Logger log = LoggerFactory.getLogger(PaymentReceiptService.class);

    private final PaymentReceiptRepository paymentReceiptRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final PaymentReceiptStorageService storageService;
    private final PaymentReceiptAccessService accessService;
    private final TelegramOutboxService telegramOutboxService;
    private final NotificationService notificationService;

    @Value("${app.billing.requisites.recipient-name:ТОО ЖАН FINANCE}")
    private String recipientName = "ТОО ЖАН FINANCE";

    @Value("${app.billing.requisites.bin:240140012345}")
    private String bin = "240140012345";

    @Value("${app.billing.requisites.iban:KZ123456789012345678}")
    private String iban = "KZ123456789012345678";

    @Value("${app.billing.requisites.kbe:17}")
    private String kbe = "17";

    @Value("${app.billing.requisites.bank-name:АО Каспий Банк}")
    private String bankName = "АО Каспий Банк";

    @org.springframework.beans.factory.annotation.Autowired
    public PaymentReceiptService(
            PaymentReceiptRepository paymentReceiptRepository,
            SubscriptionRepository subscriptionRepository,
            InvoiceRepository invoiceRepository,
            UserRepository userRepository,
            PaymentReceiptStorageService storageService,
            PaymentReceiptAccessService accessService,
            TelegramOutboxService telegramOutboxService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) NotificationService notificationService
    ) {
        this.paymentReceiptRepository = paymentReceiptRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.accessService = accessService;
        this.telegramOutboxService = telegramOutboxService;
        this.notificationService = notificationService;
    }

    public PaymentReceiptService(
            PaymentReceiptRepository paymentReceiptRepository,
            SubscriptionRepository subscriptionRepository,
            InvoiceRepository invoiceRepository,
            UserRepository userRepository,
            PaymentReceiptStorageService storageService,
            PaymentReceiptAccessService accessService,
            TelegramOutboxService telegramOutboxService
    ) {
        this(paymentReceiptRepository, subscriptionRepository, invoiceRepository, userRepository,
                storageService, accessService, telegramOutboxService, null);
    }

    @Transactional
    public PaymentReceiptDto submitReceipt(User client, Long subscriptionId, Long invoiceId,
                                          BigDecimal amount, String currency, MultipartFile file) {
        accessService.assertCanSubmit(client);

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero.");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Receipt PDF file is required.");
        }

        Subscription subscription = null;
        if (subscriptionId != null) {
            subscription = subscriptionRepository.findById(subscriptionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Subscription not found: " + subscriptionId));
            if (!subscription.getUser().getId().equals(client.getId()) && client.getRole() != Role.ADMIN) {
                throw new BadRequestException("Subscription does not belong to this user.");
            }
            if (paymentReceiptRepository.existsBySubscriptionIdAndStatus(subscription.getId(), PaymentReceiptStatus.AWAITING_REVIEW)) {
                throw new ConflictException("A receipt for this subscription is already awaiting review.");
            }
        }

        Invoice invoice = null;
        if (invoiceId != null) {
            invoice = invoiceRepository.findById(invoiceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
            if (!invoice.getUser().getId().equals(client.getId()) && client.getRole() != Role.ADMIN) {
                throw new BadRequestException("Invoice does not belong to this user.");
            }
            if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
                throw new ConflictException("Invoice has already been paid.");
            }
            if (invoice.getStatus() == Invoice.InvoiceStatus.CANCELED) {
                throw new ConflictException("Invoice has been canceled.");
            }
            if (paymentReceiptRepository.existsByInvoiceIdAndStatus(invoice.getId(), PaymentReceiptStatus.AWAITING_REVIEW)) {
                throw new ConflictException("A receipt for this invoice is already awaiting review.");
            }
        }

        if (subscriptionId == null && invoiceId == null) {
            if (paymentReceiptRepository.existsByClientIdAndStatus(client.getId(), PaymentReceiptStatus.AWAITING_REVIEW)) {
                throw new ConflictException("You already have a payment receipt awaiting review.");
            }
        }

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file: " + e.getMessage());
        }

        String fileKey = storageService.storeReceipt(fileBytes, file.getOriginalFilename());

        PaymentReceipt receipt = new PaymentReceipt(
                client,
                subscription,
                invoice,
                amount,
                currency != null && !currency.isBlank() ? currency.toUpperCase() : "KZT",
                fileKey
        );
        PaymentReceipt savedReceipt = paymentReceiptRepository.save(receipt);
        notifyAdminsAboutReceipt(savedReceipt);
        return mapToDto(savedReceipt);
    }

    @Transactional
    public PaymentReceiptDto confirmReceipt(User admin, Long receiptId) {
        accessService.assertCanReview(admin);

        PaymentReceipt receipt = paymentReceiptRepository.findByIdForUpdate(receiptId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment receipt not found: " + receiptId));


        if (receipt.getStatus() != PaymentReceiptStatus.AWAITING_REVIEW) {
            throw new ConflictException("Receipt has already been reviewed with status: " + receipt.getStatus());
        }

        receipt.setStatus(PaymentReceiptStatus.CONFIRMED);
        receipt.setReviewedBy(admin);
        receipt.setReviewedAt(Instant.now());

        // Activate subscription if present or auto-create for client
        Subscription subscription = receipt.getSubscription();
        if (subscription == null && receipt.getClient() != null) {
            List<Subscription> userSubs = subscriptionRepository.findAllByUser(receipt.getClient());
            if (!userSubs.isEmpty()) {
                subscription = userSubs.get(0);
                receipt.setSubscription(subscription);
            }
        }

        LocalDate today = LocalDate.now();
        if (subscription != null) {
            subscription.setStatus(Subscription.SubscriptionStatus.ACTIVE);
            if (subscription.getEndsAt() != null && subscription.getEndsAt().isAfter(today)) {
                subscription.setEndsAt(subscription.getEndsAt().plusDays(30));
            } else {
                subscription.setStartsAt(today);
                subscription.setEndsAt(today.plusDays(30));
            }
            subscriptionRepository.save(subscription);
            log.info("Subscription {} activated for client {} until {}", subscription.getId(), receipt.getClient().getId(), subscription.getEndsAt());
        } else if (receipt.getClient() != null) {
            Subscription newSub = new Subscription(
                    receipt.getClient(),
                    "Бухгалтерское обслуживание",
                    receipt.getAmount(),
                    today,
                    today.plusDays(30)
            );
            newSub.setStatus(Subscription.SubscriptionStatus.ACTIVE);
            Subscription savedSub = subscriptionRepository.save(newSub);
            receipt.setSubscription(savedSub);
            log.info("New Subscription {} created and activated for client {} until {}", savedSub.getId(), receipt.getClient().getId(), savedSub.getEndsAt());
        }

        // Close invoice if present
        Invoice invoice = receipt.getInvoice();
        if (invoice != null) {
            invoice.setStatus(Invoice.InvoiceStatus.PAID);
            invoiceRepository.save(invoice);
            log.info("Invoice {} marked as PAID via receipt {}", invoice.getId(), receipt.getId());
        }

        PaymentReceipt saved = paymentReceiptRepository.save(receipt);
        notifyClientReceiptConfirmed(saved);
        return mapToDto(saved);
    }

    @Transactional
    public PaymentReceiptDto rejectReceipt(User admin, Long receiptId, String note) {
        accessService.assertCanReview(admin);

        PaymentReceipt receipt = paymentReceiptRepository.findByIdForUpdate(receiptId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment receipt not found: " + receiptId));


        if (receipt.getStatus() != PaymentReceiptStatus.AWAITING_REVIEW) {
            throw new ConflictException("Receipt has already been reviewed with status: " + receipt.getStatus());
        }

        if (note == null || note.trim().isBlank()) {
            throw new BadRequestException("Rejection note is required.");
        }

        receipt.setStatus(PaymentReceiptStatus.REJECTED);
        receipt.setRejectNote(note.trim());
        receipt.setReviewedBy(admin);
        receipt.setReviewedAt(Instant.now());

        PaymentReceipt saved = paymentReceiptRepository.save(receipt);
        notifyClientReceiptRejected(saved);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentReceiptDto> getClientReceipts(User client) {
        accessService.assertCanSubmit(client);
        return paymentReceiptRepository.findByClientIdOrderByCreatedAtDesc(client.getId())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentReceiptDto> getAllReceipts(User admin, PaymentReceiptStatus status) {
        accessService.assertCanReview(admin);
        List<PaymentReceipt> receipts = status != null
                ? paymentReceiptRepository.findByStatusOrderByCreatedAtDesc(status)
                : paymentReceiptRepository.findAllWithDetailsOrderByCreatedAtDesc();

        return receipts.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentReceiptUrlResponse getReceiptFileUrl(User actor, Long receiptId) {
        PaymentReceipt receipt = paymentReceiptRepository.findById(receiptId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment receipt not found: " + receiptId));

        accessService.assertCanRead(actor, receipt);

        String presignedUrl = storageService.generatePresignedUrl(receipt.getReceiptFileKey(), Duration.ofMinutes(15));
        return new PaymentReceiptUrlResponse(presignedUrl, 900);
    }

    @Transactional(readOnly = true)
    public byte[] loadReceiptFile(User actor, Long receiptId) {
        PaymentReceipt receipt = paymentReceiptRepository.findById(receiptId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment receipt not found: " + receiptId));

        accessService.assertCanRead(actor, receipt);

        return storageService.loadReceipt(receipt.getReceiptFileKey());
    }

    @Transactional(readOnly = true)
    public byte[] loadReceiptFileByKey(User actor, String fileKey) {
        if (fileKey == null || fileKey.isBlank()) {
            throw new BadRequestException("File key is required");
        }
        PaymentReceipt receipt = paymentReceiptRepository.findByReceiptFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("Payment receipt not found for key: " + fileKey));

        accessService.assertCanRead(actor, receipt);

        return storageService.loadReceipt(receipt.getReceiptFileKey());
    }


    public PaymentRequisitesDto getRequisites() {
        return new PaymentRequisitesDto(recipientName, bin, iban, kbe, bankName);
    }

    private PaymentReceiptDto mapToDto(PaymentReceipt r) {
        User client = r.getClient();
        Subscription sub = r.getSubscription();
        Invoice inv = r.getInvoice();
        User reviewer = r.getReviewedBy();

        return new PaymentReceiptDto(
                r.getId(),
                client != null ? client.getId() : null,
                client != null ? (client.getFullName() != null && !client.getFullName().isBlank() ? client.getFullName() : client.getEmail()) : null,
                client != null ? client.getEmail() : null,
                sub != null ? sub.getId() : null,
                sub != null ? sub.getPlanName() : null,
                inv != null ? inv.getId() : null,
                inv != null ? inv.getTitle() : null,
                r.getAmount(),
                r.getCurrency(),
                r.getReceiptFileKey(),
                r.getStatus(),
                reviewer != null ? reviewer.getId() : null,
                reviewer != null ? reviewer.getFullName() : null,
                r.getReviewedAt(),
                r.getRejectNote(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }

    private void notifyAdminsAboutReceipt(PaymentReceipt receipt) {
        try {
            User client = receipt.getClient();
            String clientDisplay = client != null && client.getFullName() != null && !client.getFullName().isBlank()
                    ? client.getFullName()
                    : (client != null ? client.getEmail() : "Неизвестный клиент");
            String clientEmail = client != null && client.getEmail() != null ? " (" + client.getEmail() + ")" : "";

            String title = "Новый чек об оплате";
            String message = String.format("Клиент %s%s загрузил чек на сумму %s %s. Требуется модерация в панели управления.",
                    clientDisplay, clientEmail, receipt.getAmount(), receipt.getCurrency());

            if (notificationService != null) {
                notificationService.notifyAdmins(title, message, "/admin/billing/receipts");
            } else if (telegramOutboxService != null) {
                List<User> admins = userRepository.findAllByRole(Role.ADMIN);
                for (User admin : admins) {
                    telegramOutboxService.enqueue(admin, title, message, "/admin/billing/receipts");
                }
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch admin notification for receipt {}: {}", receipt.getId(), e.getMessage());
        }
    }

    private void notifyClientReceiptConfirmed(PaymentReceipt receipt) {
        try {
            User client = receipt.getClient();
            if (client == null) return;

            Subscription subscription = receipt.getSubscription();
            String planName = subscription != null && subscription.getPlanName() != null
                    ? subscription.getPlanName()
                    : "Бухгалтерское обслуживание";
            String periodInfo = subscription != null && subscription.getEndsAt() != null
                    ? "до " + subscription.getEndsAt()
                    : "на 30 дней";

            String title = "Оплата подтверждена";
            String message = String.format("Ваш платеж на сумму %s %s за тариф «%s» успешно подтвержден. Подписка активна %s.",
                    receipt.getAmount(), receipt.getCurrency(), planName, periodInfo);

            if (notificationService != null) {
                notificationService.createNotification(client, title, message, "/client/billing");
            } else if (telegramOutboxService != null) {
                telegramOutboxService.enqueue(client, title, message, "/client/billing");
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch client confirmation notification for receipt {}: {}", receipt.getId(), e.getMessage());
        }
    }

    private void notifyClientReceiptRejected(PaymentReceipt receipt) {
        try {
            User client = receipt.getClient();
            if (client == null) return;

            String title = "Чек об оплате отклонен";
            String message = String.format("Ваш чек на сумму %s %s был отклонен. Причина: %s. Пожалуйста, загрузите корректный чек в разделе Биллинг.",
                    receipt.getAmount(), receipt.getCurrency(), receipt.getRejectNote());

            if (notificationService != null) {
                notificationService.createNotification(client, title, message, "/client/billing");
            } else if (telegramOutboxService != null) {
                telegramOutboxService.enqueue(client, title, message, "/client/billing");
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch client rejection notification for receipt {}: {}", receipt.getId(), e.getMessage());
        }
    }
}
