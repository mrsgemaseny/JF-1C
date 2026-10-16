package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.UnprocessableEntityException;
import com.example.zhanfinancebackend.modules.audit.service.AuditService;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceipt;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceiptStatus;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.PaymentReceiptRepository;
import com.example.zhanfinancebackend.modules.billing.repository.SubscriptionRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import com.example.zhanfinancebackend.modules.telegram.service.TelegramOutboxService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingInvariantTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InvoiceAccessService invoiceAccessService;

    @Mock
    private AuditService auditService;

    @Mock
    private PaymentReceiptRepository paymentReceiptRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PaymentReceiptStorageService storageService;

    @Mock
    private PaymentReceiptAccessService paymentReceiptAccessService;

    @Mock
    private TelegramOutboxService telegramOutboxService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private InvoiceService invoiceService;

    @InjectMocks
    private PaymentReceiptService paymentReceiptService;

    private User client;
    private User admin;
    private Invoice paidInvoice;
    private Invoice canceledInvoice;

    @BeforeEach
    void setUp() {
        client = new User("Client 1", "client1@test.com", "hash", Role.CLIENT);
        ReflectionTestUtils.setField(client, "id", 100L);

        admin = new User("Admin", "admin@test.com", "hash", Role.ADMIN);
        ReflectionTestUtils.setField(admin, "id", 1L);

        paidInvoice = new Invoice(client, "Monthly Subscription", BigDecimal.valueOf(10000), LocalDate.now().plusDays(5));
        ReflectionTestUtils.setField(paidInvoice, "id", 200L);
        paidInvoice.setStatus(Invoice.InvoiceStatus.PAID);

        canceledInvoice = new Invoice(client, "Old invoice", BigDecimal.valueOf(5000), LocalDate.now().minusDays(10));
        ReflectionTestUtils.setField(canceledInvoice, "id", 201L);
        canceledInvoice.setStatus(Invoice.InvoiceStatus.CANCELED);
    }

    @Test
    @DisplayName("P1-15: Paid invoice cannot be deleted directly through delete")
    void paidInvoice_CannotBeDeleted() {
        when(invoiceRepository.findByIdWithClient(200L)).thenReturn(Optional.of(paidInvoice));

        assertThatThrownBy(() -> invoiceService.delete(admin, 200L))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("PAID");
    }

    @Test
    @DisplayName("P1-15: Canceled invoice cannot be deleted")
    void canceledInvoice_CannotBeDeleted() {
        when(invoiceRepository.findByIdWithClient(201L)).thenReturn(Optional.of(canceledInvoice));

        assertThatThrownBy(() -> invoiceService.delete(admin, 201L))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("CANCELED");
    }

    @Test
    @DisplayName("P1-15: Confirmed receipt cannot be re-confirmed")
    void confirmedReceipt_CannotBeReconfirmed() {
        PaymentReceipt confirmedReceipt = new PaymentReceipt(
                client, null, paidInvoice, BigDecimal.valueOf(10000), "KZT", "receipts/test.pdf"
        );
        ReflectionTestUtils.setField(confirmedReceipt, "id", 300L);
        confirmedReceipt.setStatus(PaymentReceiptStatus.CONFIRMED);

        when(paymentReceiptRepository.findByIdForUpdate(300L)).thenReturn(Optional.of(confirmedReceipt));

        assertThatThrownBy(() -> paymentReceiptService.confirmReceipt(admin, 300L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("P1-15: Confirmed receipt cannot be rejected")
    void confirmedReceipt_CannotBeRejected() {
        PaymentReceipt confirmedReceipt = new PaymentReceipt(
                client, null, paidInvoice, BigDecimal.valueOf(10000), "KZT", "receipts/test.pdf"
        );
        ReflectionTestUtils.setField(confirmedReceipt, "id", 300L);
        confirmedReceipt.setStatus(PaymentReceiptStatus.CONFIRMED);

        when(paymentReceiptRepository.findByIdForUpdate(300L)).thenReturn(Optional.of(confirmedReceipt));

        assertThatThrownBy(() -> paymentReceiptService.rejectReceipt(admin, 300L, "Mistake"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("P1-15: Cannot submit duplicate receipt when another is awaiting review")
    void duplicateReceipt_CannotBeSubmitted_WhileAwaitingReview() {
        when(paymentReceiptRepository.existsByClientIdAndStatus(100L, PaymentReceiptStatus.AWAITING_REVIEW))
                .thenReturn(true);

        MockMultipartFile mockFile = new MockMultipartFile(
                "file", "receipt.pdf", "application/pdf", new byte[]{1, 2, 3}
        );

        assertThatThrownBy(() -> paymentReceiptService.submitReceipt(client, null, null, BigDecimal.valueOf(10000), "KZT", mockFile))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("awaiting review");
    }
}
