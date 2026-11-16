package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.OnlinePayment;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.OnlinePaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OnlinePaymentLedgerServiceTest {
    @Mock InvoiceRepository invoices;
    @Mock OnlinePaymentRepository payments;
    OnlinePaymentLedgerService service;
    Invoice invoice;

    @BeforeEach
    void setUp() {
        service = new OnlinePaymentLedgerService(invoices, payments);
        invoice = new Invoice(null, "Service", new BigDecimal("30000.00"), LocalDate.now());
        invoice.setId(7L);
        invoice.setStatus(Invoice.InvoiceStatus.ISSUED);
    }

    @Test
    void confirmedPaymentIsRecordedAndInvoicePaid() {
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.saveAndFlush(any(OnlinePayment.class))).thenAnswer(call -> call.getArgument(0));

        OnlinePaymentLedgerService.Result result = service.recordConfirmedPayment(PaymentProvider.KASPI, "provider-1", 7L, new BigDecimal("30000.00"), "KZT");

        assertEquals("provider-1", result.payment().getProviderPaymentId());
        assertEquals(PaymentProvider.KASPI, result.payment().getProvider());
        assertEquals(true, result.newlyRecorded());
        assertEquals(Invoice.InvoiceStatus.PAID, invoice.getStatus());
        verify(invoices).save(invoice);
    }

    @Test
    void identicalRetryReturnsStoredPaymentWithoutCreditingAgain() {
        OnlinePayment stored = new OnlinePayment(PaymentProvider.KASPI, "provider-1", invoice, new BigDecimal("30000.00"));
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.findByProviderAndProviderPaymentId(PaymentProvider.KASPI, "provider-1")).thenReturn(Optional.of(stored));

        OnlinePaymentLedgerService.Result result = service.recordConfirmedPayment(PaymentProvider.KASPI, "provider-1", 7L, new BigDecimal("30000.00"), "KZT");
        assertSame(stored, result.payment());
        assertEquals(false, result.newlyRecorded());
        verify(payments, never()).saveAndFlush(any());
        verify(invoices, never()).save(any());
    }

    @Test
    void reusedProviderIdWithDifferentAmountIsRejected() {
        OnlinePayment stored = new OnlinePayment(PaymentProvider.KASPI, "provider-1", invoice, new BigDecimal("30000.00"));
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.findByProviderAndProviderPaymentId(PaymentProvider.KASPI, "provider-1")).thenReturn(Optional.of(stored));

        assertThrows(ConflictException.class, () ->
                service.recordConfirmedPayment(PaymentProvider.KASPI, "provider-1", 7L, new BigDecimal("20000.00"), "KZT"));
        verify(invoices, never()).save(any());
    }

    @Test
    void invoiceAmountMismatchIsRejected() {
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));

        assertThrows(ConflictException.class, () ->
                service.recordConfirmedPayment(PaymentProvider.KASPI, "provider-1", 7L, new BigDecimal("20000.00"), "KZT"));
        verify(payments, never()).saveAndFlush(any());
    }

    @Test
    void sameProviderIdUnderDifferentProviderIsIndependent() {
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.findByProviderAndProviderPaymentId(PaymentProvider.FREEDOM, "provider-1")).thenReturn(Optional.empty());
        when(payments.saveAndFlush(any(OnlinePayment.class))).thenAnswer(call -> call.getArgument(0));

        OnlinePaymentLedgerService.Result result = service.recordConfirmedPayment(PaymentProvider.FREEDOM, "provider-1", 7L, new BigDecimal("30000.00"), "KZT");
        assertEquals(PaymentProvider.FREEDOM, result.payment().getProvider());
    }
}
