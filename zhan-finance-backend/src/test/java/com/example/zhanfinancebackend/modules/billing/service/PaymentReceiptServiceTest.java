package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentReceiptServiceTest {

    @Mock
    private PaymentReceiptRepository paymentReceiptRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentReceiptStorageService storageService;

    @Mock
    private PaymentReceiptAccessService accessService;

    @Mock
    private TelegramOutboxService telegramOutboxService;

    @Mock
    private NotificationService notificationService;

    private PaymentReceiptService paymentReceiptService;

    private User admin;
    private User client;
    private Subscription subscription;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        paymentReceiptService = new PaymentReceiptService(
                paymentReceiptRepository,
                subscriptionRepository,
                invoiceRepository,
                userRepository,
                storageService,
                accessService,
                telegramOutboxService,
                notificationService
        );

        admin = new User("admin@test.com", "hash", "Admin User", Role.ADMIN);
        admin.setId(1L);

        client = new User("client@test.com", "hash", "Client User", Role.CLIENT);
        client.setId(10L);

        subscription = new Subscription(client, "Pro Plan", BigDecimal.valueOf(50000), LocalDate.now(), null);
        subscription.setId(100L);
        subscription.setStatus(Subscription.SubscriptionStatus.PENDING);

        invoice = new Invoice(client, "Monthly Subscription", BigDecimal.valueOf(50000), LocalDate.now().plusDays(5));
        invoice.setId(200L);
    }

    @Test
    @DisplayName("Submit receipt: success creates receipt and notifies admins")
    void submitReceipt_success() {
        byte[] pdfBytes = "%PDF-1.4 test".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "receipt.pdf", "application/pdf", pdfBytes);

        when(subscriptionRepository.findById(100L)).thenReturn(Optional.of(subscription));
        when(invoiceRepository.findById(200L)).thenReturn(Optional.of(invoice));
        when(storageService.storeReceipt(any(), anyString())).thenReturn("receipts/2026/09/uuid.pdf");
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenAnswer(inv -> {
            PaymentReceipt r = inv.getArgument(0);
            r.setId(500L);
            return r;
        });

        PaymentReceiptDto result = paymentReceiptService.submitReceipt(
                client, 100L, 200L, BigDecimal.valueOf(50000), "KZT", file
        );

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(500L);
        assertThat(result.status()).isEqualTo(PaymentReceiptStatus.AWAITING_REVIEW);
        assertThat(result.amount()).isEqualTo(BigDecimal.valueOf(50000));
        assertThat(result.currency()).isEqualTo("KZT");

        verify(accessService).assertCanSubmit(client);
        verify(notificationService).notifyAdmins(anyString(), anyString(), eq("/admin/billing/receipts"));
    }

    @Test
    @DisplayName("Submit receipt: invalid amount throws BadRequestException")
    void submitReceipt_zeroAmount_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "%PDF".getBytes());

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(
                client, null, null, BigDecimal.ZERO, "KZT", file
        )).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Submit receipt: already pending receipt for subscription throws ConflictException")
    void submitReceipt_alreadyPendingForSubscription_throwsConflict() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "%PDF".getBytes());
        when(subscriptionRepository.findById(100L)).thenReturn(Optional.of(subscription));
        when(paymentReceiptRepository.existsBySubscriptionIdAndStatus(100L, PaymentReceiptStatus.AWAITING_REVIEW))
                .thenReturn(true);

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(
                client, 100L, null, BigDecimal.valueOf(50000), "KZT", file
        )).isInstanceOf(ConflictException.class)
          .hasMessageContaining("subscription is already awaiting review");
    }

    @Test
    @DisplayName("Submit receipt: already pending receipt for invoice throws ConflictException")
    void submitReceipt_alreadyPendingForInvoice_throwsConflict() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "%PDF".getBytes());
        when(invoiceRepository.findById(200L)).thenReturn(Optional.of(invoice));
        when(paymentReceiptRepository.existsByInvoiceIdAndStatus(200L, PaymentReceiptStatus.AWAITING_REVIEW))
                .thenReturn(true);

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(
                client, null, 200L, BigDecimal.valueOf(50000), "KZT", file
        )).isInstanceOf(ConflictException.class)
          .hasMessageContaining("invoice is already awaiting review");
    }

    @Test
    @DisplayName("Submit receipt: paid invoice throws ConflictException")
    void submitReceipt_paidInvoice_throwsConflict() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "%PDF".getBytes());
        invoice.setStatus(Invoice.InvoiceStatus.PAID);
        when(invoiceRepository.findById(200L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(
                client, null, 200L, BigDecimal.valueOf(50000), "KZT", file
        )).isInstanceOf(ConflictException.class)
          .hasMessageContaining("already been paid");
    }

    @Test
    @DisplayName("Submit receipt: canceled invoice throws ConflictException")
    void submitReceipt_canceledInvoice_throwsConflict() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "%PDF".getBytes());
        invoice.setStatus(Invoice.InvoiceStatus.CANCELED);
        when(invoiceRepository.findById(200L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(
                client, null, 200L, BigDecimal.valueOf(50000), "KZT", file
        )).isInstanceOf(ConflictException.class)
          .hasMessageContaining("canceled");
    }

    @Test
    @DisplayName("Submit receipt: client already has general pending receipt throws ConflictException")
    void submitReceipt_alreadyPendingGeneralReceipt_throwsConflict() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "%PDF".getBytes());
        when(paymentReceiptRepository.existsByClientIdAndStatus(10L, PaymentReceiptStatus.AWAITING_REVIEW))
                .thenReturn(true);

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(
                client, null, null, BigDecimal.valueOf(50000), "KZT", file
        )).isInstanceOf(ConflictException.class)
          .hasMessageContaining("already have a payment receipt awaiting review");
    }

    @Test
    @DisplayName("Confirm receipt: activates subscription, marks invoice PAID and notifies client")
    void confirmReceipt_success() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(receipt));
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenReturn(receipt);

        PaymentReceiptDto result = paymentReceiptService.confirmReceipt(admin, 500L);

        assertThat(result.status()).isEqualTo(PaymentReceiptStatus.CONFIRMED);
        assertThat(subscription.getStatus()).isEqualTo(Subscription.SubscriptionStatus.ACTIVE);
        assertThat(subscription.getEndsAt()).isEqualTo(LocalDate.now().plusDays(30));
        assertThat(invoice.getStatus()).isEqualTo(Invoice.InvoiceStatus.PAID);

        verify(accessService).assertCanReview(admin);
        verify(notificationService).createNotification(eq(client), anyString(), anyString(), eq("/client/billing"));
    }

    @Test
    @DisplayName("Confirm receipt: already reviewed throws ConflictException")
    void confirmReceipt_alreadyReviewed_throwsConflict() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);
        receipt.setStatus(PaymentReceiptStatus.CONFIRMED);

        when(paymentReceiptRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(receipt));

        assertThatThrownBy(() -> paymentReceiptService.confirmReceipt(admin, 500L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("Reject receipt: records note, keeps subscription PENDING and notifies client")
    void rejectReceipt_success() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(receipt));
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenReturn(receipt);

        PaymentReceiptDto result = paymentReceiptService.rejectReceipt(admin, 500L, "Сумма в чеке не совпадает с тарифом");

        assertThat(result.status()).isEqualTo(PaymentReceiptStatus.REJECTED);
        assertThat(result.rejectNote()).isEqualTo("Сумма в чеке не совпадает с тарифом");
        assertThat(subscription.getStatus()).isEqualTo(Subscription.SubscriptionStatus.PENDING);

        verify(accessService).assertCanReview(admin);
        verify(notificationService).createNotification(eq(client), anyString(), anyString(), eq("/client/billing"));
    }

    @Test
    @DisplayName("Reject receipt: missing note throws BadRequestException")
    void rejectReceipt_missingNote_throwsBadRequest() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(receipt));

        assertThatThrownBy(() -> paymentReceiptService.rejectReceipt(admin, 500L, "   "))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Get receipt file URL: generates 15-minute presigned URL")
    void getReceiptFileUrl_success() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findById(500L)).thenReturn(Optional.of(receipt));
        when(storageService.generatePresignedUrl(eq("receipts/test.pdf"), any(Duration.class)))
                .thenReturn("https://r2.cloudflarestorage.com/signed-url");

        PaymentReceiptUrlResponse response = paymentReceiptService.getReceiptFileUrl(client, 500L);

        assertThat(response.url()).isEqualTo("https://r2.cloudflarestorage.com/signed-url");
        assertThat(response.expiresInSeconds()).isEqualTo(900);
        verify(accessService).assertCanRead(client, receipt);
    }

    @Test
    @DisplayName("Confirm receipt: early renewal extends existing active subscription by 30 days")
    void confirmReceipt_earlyRenewal_extendsCurrentEndsAt() {
        LocalDate currentEndsAt = LocalDate.now().plusDays(10);
        subscription.setStatus(Subscription.SubscriptionStatus.ACTIVE);
        subscription.setEndsAt(currentEndsAt);

        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(501L);

        when(paymentReceiptRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(receipt));
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenReturn(receipt);

        paymentReceiptService.confirmReceipt(admin, 501L);

        assertThat(subscription.getStatus()).isEqualTo(Subscription.SubscriptionStatus.ACTIVE);
        assertThat(subscription.getEndsAt()).isEqualTo(currentEndsAt.plusDays(30));
    }

    @Test
    @DisplayName("Confirm receipt: auto-creates new subscription if client has none")
    void confirmReceipt_autoCreatesSubscription() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, null, null, BigDecimal.valueOf(45000), "KZT", "receipts/new.pdf"
        );
        receipt.setId(502L);

        when(paymentReceiptRepository.findByIdForUpdate(502L)).thenReturn(Optional.of(receipt));
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenReturn(receipt);
        when(subscriptionRepository.findAllByUser(client)).thenReturn(List.of());
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            s.setId(999L);
            return s;
        });

        PaymentReceiptDto result = paymentReceiptService.confirmReceipt(admin, 502L);

        assertThat(result.status()).isEqualTo(PaymentReceiptStatus.CONFIRMED);
        assertThat(receipt.getSubscription()).isNotNull();
        assertThat(receipt.getSubscription().getStatus()).isEqualTo(Subscription.SubscriptionStatus.ACTIVE);
        assertThat(receipt.getSubscription().getEndsAt()).isEqualTo(LocalDate.now().plusDays(30));
    }

    @Test
    @DisplayName("Get company requisites returns configured values")
    void getRequisites_success() {
        PaymentRequisitesDto requisites = paymentReceiptService.getRequisites();
        assertThat(requisites).isNotNull();
        assertThat(requisites.recipientName()).isNotBlank();
        assertThat(requisites.bin()).isNotBlank();
        assertThat(requisites.iban()).isNotBlank();
    }

    @Test
    @DisplayName("Submit receipt: falls back to telegramOutboxService when notificationService is null")
    void submitReceipt_fallbackToTelegramOutbox() {
        PaymentReceiptService serviceWithoutNotification = new PaymentReceiptService(
                paymentReceiptRepository,
                subscriptionRepository,
                invoiceRepository,
                userRepository,
                storageService,
                accessService,
                telegramOutboxService
        );

        byte[] pdfBytes = "%PDF-1.4 test".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "receipt.pdf", "application/pdf", pdfBytes);

        when(subscriptionRepository.findById(100L)).thenReturn(Optional.of(subscription));
        when(invoiceRepository.findById(200L)).thenReturn(Optional.of(invoice));
        when(storageService.storeReceipt(any(), anyString())).thenReturn("receipts/2026/09/uuid.pdf");
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenAnswer(inv -> {
            PaymentReceipt r = inv.getArgument(0);
            r.setId(500L);
            return r;
        });
        when(userRepository.findAllByRole(Role.ADMIN)).thenReturn(List.of(admin));

        serviceWithoutNotification.submitReceipt(client, 100L, 200L, BigDecimal.valueOf(50000), "KZT", file);

        verify(telegramOutboxService).enqueue(eq(admin), anyString(), anyString(), eq("/admin/billing/receipts"));
    }

    @Test
    @DisplayName("Confirm receipt: falls back to telegramOutboxService when notificationService is null")
    void confirmReceipt_fallbackToTelegramOutbox() {
        PaymentReceiptService serviceWithoutNotification = new PaymentReceiptService(
                paymentReceiptRepository,
                subscriptionRepository,
                invoiceRepository,
                userRepository,
                storageService,
                accessService,
                telegramOutboxService
        );

        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(receipt));
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenReturn(receipt);

        serviceWithoutNotification.confirmReceipt(admin, 500L);

        verify(telegramOutboxService).enqueue(eq(client), anyString(), anyString(), eq("/client/billing"));
    }

    @Test
    @DisplayName("Reject receipt: falls back to telegramOutboxService when notificationService is null")
    void rejectReceipt_fallbackToTelegramOutbox() {
        PaymentReceiptService serviceWithoutNotification = new PaymentReceiptService(
                paymentReceiptRepository,
                subscriptionRepository,
                invoiceRepository,
                userRepository,
                storageService,
                accessService,
                telegramOutboxService
        );

        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(receipt));
        when(paymentReceiptRepository.save(any(PaymentReceipt.class))).thenReturn(receipt);

        serviceWithoutNotification.rejectReceipt(admin, 500L, "Неверная сумма");

        verify(telegramOutboxService).enqueue(eq(client), anyString(), anyString(), eq("/client/billing"));
    }

    @Test
    @DisplayName("Load receipt file by key: success checks access and returns bytes")
    void loadReceiptFileByKey_success() {
        PaymentReceipt receipt = new PaymentReceipt(
                client, subscription, invoice, BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf"
        );
        receipt.setId(500L);

        when(paymentReceiptRepository.findByReceiptFileKey("receipts/test.pdf")).thenReturn(Optional.of(receipt));
        when(storageService.loadReceipt("receipts/test.pdf")).thenReturn("PDF_BYTES".getBytes());

        byte[] result = paymentReceiptService.loadReceiptFileByKey(client, "receipts/test.pdf");

        assertThat(result).isEqualTo("PDF_BYTES".getBytes());
        verify(accessService).assertCanRead(client, receipt);
    }
}
