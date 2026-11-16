package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.dto.OnlinePaymentIntentDto;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentIntent;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPayClient;
import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPayConfig;
import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPaySigner;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.OnlinePaymentRepository;
import com.example.zhanfinancebackend.modules.billing.repository.PaymentIntentRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FreedomPaymentServiceTest {
    private static final String SECRET = "top-secret";
    private static final String RESULT_URL = "https://zhanfinance.fly.dev/api/v1/payments/callbacks/freedom";

    @Mock FreedomPayClient gateway;
    @Mock PaymentIntentRepository intents;
    @Mock InvoiceRepository invoices;
    @Mock OnlinePaymentRepository onlinePayments;
    @Mock OnlinePaymentSettlementService settlement;
    @Mock NotificationService notifications;

    FreedomPayConfig config;
    FreedomPaymentService service;
    User owner;
    Invoice invoice;

    @BeforeEach
    void setUp() {
        config = new FreedomPayConfig(true, "9970", SECRET, "https://api.freedompay.kz", RESULT_URL,
                "https://app.example/JF-1C", false, 3600);
        service = new FreedomPaymentService(config, gateway, intents, invoices, onlinePayments, settlement, notifications);
        owner = new User();
        owner.setId(5L);
        invoice = new Invoice(owner, "Service", new BigDecimal("30000.00"), LocalDate.now());
        invoice.setId(7L);
        invoice.setStatus(Invoice.InvoiceStatus.ISSUED);
    }

    private PaymentIntent intent(PaymentIntent.Status status) {
        PaymentIntent i = new PaymentIntent(PaymentProvider.FREEDOM, invoice, owner, "ZF7-abc",
                new BigDecimal("30000.00"), Instant.now().plusSeconds(3600));
        if (status == PaymentIntent.Status.REDIRECTED) i.markRedirected("555", "https://customer.freedompay.kz/p");
        return i;
    }

    private Map<String, String> signedCallback(String result, String amount) {
        Map<String, String> p = new HashMap<>();
        p.put("pg_order_id", "ZF7-abc");
        p.put("pg_payment_id", "555");
        p.put("pg_amount", amount);
        p.put("pg_currency", "KZT");
        p.put("pg_result", result);
        p.put("pg_salt", "s");
        p.put("pg_sig", FreedomPaySigner.sign("freedom", p, SECRET));
        return p;
    }

    private FreedomPayClient.StatusResult paid(String amount) {
        return new FreedomPayClient.StatusResult(true, "555", "ZF7-abc", "success", new BigDecimal(amount), "KZT");
    }

    @Test
    void createPaymentUsesInvoiceAmountAndStoresRedirect() {
        when(invoices.findByIdWithClient(7L)).thenReturn(Optional.of(invoice));
        when(intents.findActiveForInvoice(eq(7L), eq(5L), eq(PaymentIntent.Status.REDIRECTED), any())).thenReturn(List.of());
        when(intents.saveAndFlush(any(PaymentIntent.class))).thenAnswer(c -> c.getArgument(0));
        when(gateway.initPayment(any(), eq(new BigDecimal("30000.00")), any(), any()))
                .thenReturn(new FreedomPayClient.InitResult("555", "https://customer.freedompay.kz/p"));

        OnlinePaymentIntentDto dto = service.createPayment(owner, 7L);

        assertEquals("REDIRECTED", dto.status());
        assertEquals("https://customer.freedompay.kz/p", dto.redirectUrl());
        assertEquals(new BigDecimal("30000.00"), dto.amount());
    }

    @Test
    void createPaymentForSomeoneElsesInvoiceLooksLikeNotFound() {
        User stranger = new User();
        stranger.setId(99L);
        when(invoices.findByIdWithClient(7L)).thenReturn(Optional.of(invoice));

        assertThrows(ResourceNotFoundException.class, () -> service.createPayment(stranger, 7L));
        verifyNoInteractions(gateway);
    }

    @Test
    void createPaymentRejectsAlreadyPaidInvoice() {
        invoice.setStatus(Invoice.InvoiceStatus.PAID);
        when(invoices.findByIdWithClient(7L)).thenReturn(Optional.of(invoice));

        assertThrows(ConflictException.class, () -> service.createPayment(owner, 7L));
    }

    @Test
    void createPaymentResumesActiveIntentInsteadOfCreatingAnother() {
        when(invoices.findByIdWithClient(7L)).thenReturn(Optional.of(invoice));
        when(intents.findActiveForInvoice(eq(7L), eq(5L), eq(PaymentIntent.Status.REDIRECTED), any()))
                .thenReturn(List.of(intent(PaymentIntent.Status.REDIRECTED)));

        OnlinePaymentIntentDto dto = service.createPayment(owner, 7L);

        assertEquals("ZF7-abc", dto.orderId());
        verifyNoInteractions(gateway);
        verify(intents, never()).saveAndFlush(any());
    }

    @Test
    void gatewayFailureMarksIntentFailedAndReturnsBadGateway() {
        when(invoices.findByIdWithClient(7L)).thenReturn(Optional.of(invoice));
        when(intents.findActiveForInvoice(any(), any(), any(), any())).thenReturn(List.of());
        when(intents.saveAndFlush(any(PaymentIntent.class))).thenAnswer(c -> c.getArgument(0));
        when(gateway.initPayment(any(), any(), any(), any())).thenThrow(new FreedomPayClient.GatewayException("down"));

        assertThrows(ResponseStatusException.class, () -> service.createPayment(owner, 7L));
        verify(intents).save(org.mockito.ArgumentMatchers.argThat(
                (PaymentIntent i) -> i.getStatus() == PaymentIntent.Status.FAILED));
    }

    @Test
    void callbackWithBadSignatureIsRejectedWithoutAnyLookup() {
        Map<String, String> p = signedCallback("1", "30000");
        p.put("pg_amount", "1");

        String body = service.handleResult(p);

        assertTrue(body.contains("<pg_status>error</pg_status>"));
        verifyNoInteractions(intents, gateway, settlement);
    }

    @Test
    void callbackWithWrongAmountIsRefusedEvenWithValidSignature() {
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(intent(PaymentIntent.Status.REDIRECTED)));

        String body = service.handleResult(signedCallback("1", "100"));

        assertTrue(body.contains("<pg_status>error</pg_status>"));
        verifyNoInteractions(gateway, settlement);
    }

    @Test
    void successCallbackIsConfirmedServerSideThenSettledOnce() {
        PaymentIntent i = intent(PaymentIntent.Status.REDIRECTED);
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(i));
        when(gateway.getStatus("ZF7-abc")).thenReturn(paid("30000"));
        when(settlement.settle(PaymentProvider.FREEDOM, "555", 7L, new BigDecimal("30000.00"), "KZT"))
                .thenReturn(new OnlinePaymentSettlementService.Settlement(1L, true));

        String body = service.handleResult(signedCallback("1", "30000"));

        assertTrue(body.contains("<pg_status>ok</pg_status>"));
        assertEquals(PaymentIntent.Status.PAID, i.getStatus());
        verify(settlement).settle(PaymentProvider.FREEDOM, "555", 7L, new BigDecimal("30000.00"), "KZT");
    }

    @Test
    void forgedSuccessCallbackIsNotCreditedWhenProviderDoesNotConfirm() {
        PaymentIntent i = intent(PaymentIntent.Status.REDIRECTED);
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(i));
        when(gateway.getStatus("ZF7-abc")).thenReturn(
                new FreedomPayClient.StatusResult(true, "555", "ZF7-abc", "error", new BigDecimal("30000"), "KZT"));

        String body = service.handleResult(signedCallback("1", "30000"));

        assertTrue(body.contains("<pg_status>error</pg_status>"));
        verifyNoInteractions(settlement);
        assertEquals(PaymentIntent.Status.REDIRECTED, i.getStatus());
    }

    @Test
    void providerReportingDifferentAmountIsNotCredited() {
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(intent(PaymentIntent.Status.REDIRECTED)));
        when(gateway.getStatus("ZF7-abc")).thenReturn(paid("10"));

        String body = service.handleResult(signedCallback("1", "30000"));

        assertTrue(body.contains("<pg_status>error</pg_status>"));
        verifyNoInteractions(settlement);
    }

    @Test
    void providerUnreachableBubblesUpSoTheCallbackIsRetried() {
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(intent(PaymentIntent.Status.REDIRECTED)));
        when(gateway.getStatus(any())).thenThrow(new FreedomPayClient.GatewayException("timeout"));

        assertThrows(FreedomPayClient.GatewayException.class, () -> service.handleResult(signedCallback("1", "30000")));
        verifyNoInteractions(settlement);
    }

    @Test
    void invoicePaidElsewhereIsRejectedWhenProviderAllowsIt() {
        PaymentIntent i = intent(PaymentIntent.Status.REDIRECTED);
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(i));
        when(gateway.getStatus("ZF7-abc")).thenReturn(paid("30000"));
        when(settlement.settle(any(), any(), anyLong(), any(), any())).thenThrow(new ConflictException("Invoice already paid"));
        Map<String, String> p = new HashMap<>(signedCallback("1", "30000"));
        p.put("pg_can_reject", "1");
        p.put("pg_sig", FreedomPaySigner.sign("freedom", p, SECRET));

        String body = service.handleResult(p);

        assertTrue(body.contains("<pg_status>rejected</pg_status>"));
        assertEquals(PaymentIntent.Status.FAILED, i.getStatus());
    }

    @Test
    void invoicePaidElsewhereWithoutRejectNotifiesAdminsForRefund() {
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(intent(PaymentIntent.Status.REDIRECTED)));
        when(gateway.getStatus("ZF7-abc")).thenReturn(paid("30000"));
        when(settlement.settle(any(), any(), anyLong(), any(), any())).thenThrow(new ConflictException("Invoice already paid"));

        String body = service.handleResult(signedCallback("1", "30000"));

        assertTrue(body.contains("<pg_status>ok</pg_status>"));
        verify(notifications).notifyAdmins(any(), any(), any());
    }

    @Test
    void failureCallbackMarksIntentFailedWithoutTouchingTheLedger() {
        PaymentIntent i = intent(PaymentIntent.Status.REDIRECTED);
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(i));

        String body = service.handleResult(signedCallback("0", "30000"));

        assertTrue(body.contains("<pg_status>ok</pg_status>"));
        assertEquals(PaymentIntent.Status.FAILED, i.getStatus());
        verifyNoInteractions(gateway, settlement);
    }

    @Test
    void replayedSuccessCallbackForPaidIntentDoesNotCallProviderAgain() {
        PaymentIntent i = intent(PaymentIntent.Status.REDIRECTED);
        i.markPaid("555");
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(i));

        String body = service.handleResult(signedCallback("1", "30000"));

        assertTrue(body.contains("<pg_status>ok</pg_status>"));
        verifyNoInteractions(gateway, settlement);
    }

    @Test
    void responseIsSignedWithTheResultScriptName() {
        String body = service.response("ok", "Accepted");
        String sig = body.replaceAll(".*<pg_sig>([0-9a-f]{32})</pg_sig>.*", "$1");
        String salt = body.replaceAll(".*<pg_salt>([0-9a-f]+)</pg_salt>.*", "$1");
        Map<String, String> fields = new HashMap<>();
        fields.put("pg_status", "ok");
        fields.put("pg_description", "Accepted");
        fields.put("pg_salt", salt);

        assertEquals(FreedomPaySigner.sign("freedom", fields, SECRET), sig);
    }

    @Test
    void pollingForeignOrderLooksLikeNotFound() {
        User stranger = new User();
        stranger.setId(99L);
        when(intents.findByMerchantOrderId("ZF7-abc")).thenReturn(Optional.of(intent(PaymentIntent.Status.REDIRECTED)));

        assertThrows(ResourceNotFoundException.class, () -> service.getStatus(stranger, "ZF7-abc"));
    }
}
