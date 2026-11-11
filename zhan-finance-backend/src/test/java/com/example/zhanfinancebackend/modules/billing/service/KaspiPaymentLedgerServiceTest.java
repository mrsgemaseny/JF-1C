package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.KaspiPayment;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.KaspiPaymentRepository;
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
class KaspiPaymentLedgerServiceTest {
    @Mock InvoiceRepository invoices;
    @Mock KaspiPaymentRepository payments;
    KaspiPaymentLedgerService service;
    Invoice invoice;

    @BeforeEach
    void setUp() {
        service = new KaspiPaymentLedgerService(invoices, payments);
        invoice = new Invoice(null, "Service", new BigDecimal("30000.00"), LocalDate.now());
        invoice.setId(7L);
        invoice.setStatus(Invoice.InvoiceStatus.ISSUED);
    }

    @Test
    void confirmedPaymentIsRecordedAndInvoicePaid() {
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.saveAndFlush(any(KaspiPayment.class))).thenAnswer(call -> call.getArgument(0));

        KaspiPayment recorded = service.recordConfirmedPayment("provider-1", 7L, new BigDecimal("30000.00"), "KZT");

        assertEquals("provider-1", recorded.getProviderPaymentId());
        assertEquals(Invoice.InvoiceStatus.PAID, invoice.getStatus());
        verify(invoices).save(invoice);
    }

    @Test
    void identicalRetryReturnsStoredPaymentWithoutCreditingAgain() {
        KaspiPayment stored = new KaspiPayment("provider-1", invoice, new BigDecimal("30000.00"));
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.findByProviderPaymentId("provider-1")).thenReturn(Optional.of(stored));

        assertSame(stored, service.recordConfirmedPayment("provider-1", 7L, new BigDecimal("30000.00"), "KZT"));
        verify(payments, never()).saveAndFlush(any());
        verify(invoices, never()).save(any());
    }

    @Test
    void reusedProviderIdWithDifferentAmountIsRejected() {
        KaspiPayment stored = new KaspiPayment("provider-1", invoice, new BigDecimal("30000.00"));
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));
        when(payments.findByProviderPaymentId("provider-1")).thenReturn(Optional.of(stored));

        assertThrows(ConflictException.class, () ->
                service.recordConfirmedPayment("provider-1", 7L, new BigDecimal("20000.00"), "KZT"));
        verify(invoices, never()).save(any());
    }

    @Test
    void invoiceAmountMismatchIsRejected() {
        when(invoices.findByIdForPaymentUpdate(7L)).thenReturn(Optional.of(invoice));

        assertThrows(ConflictException.class, () ->
                service.recordConfirmedPayment("provider-1", 7L, new BigDecimal("20000.00"), "KZT"));
        verify(payments, never()).saveAndFlush(any());
    }
}
