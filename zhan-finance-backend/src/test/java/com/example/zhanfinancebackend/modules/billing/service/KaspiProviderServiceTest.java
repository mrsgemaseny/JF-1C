package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.KaspiCallback;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.KaspiCallbackRepository;
import com.example.zhanfinancebackend.modules.billing.repository.OnlinePaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
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
class KaspiProviderServiceTest {
    @Mock InvoiceRepository invoices;
    @Mock OnlinePaymentRepository onlinePayments;
    @Mock KaspiCallbackRepository callbacks;
    @Mock OnlinePaymentSettlementService settlement;

    KaspiProviderService service;
    Invoice invoice;

    @BeforeEach
    void setUp() {
        service = new KaspiProviderService(true, "203.0.113.0/29", invoices, onlinePayments, callbacks, settlement);
        invoice = new Invoice(null, "Service", new BigDecimal("30000.00"), LocalDate.now());
        invoice.setId(7L);
        invoice.setStatus(Invoice.InvoiceStatus.ISSUED);
    }

    @Test
    void disabledProviderRejectsEveryone() {
        KaspiProviderService off = new KaspiProviderService(false, "203.0.113.0/29", invoices, onlinePayments, callbacks, settlement);
        assertFalse(off.isCallerAllowed("203.0.113.1"));
    }

    @Test
    void enabledWithoutAllowlistFailsFast() {
        assertThrows(IllegalStateException.class,
                () -> new KaspiProviderService(true, "", invoices, onlinePayments, callbacks, settlement));
    }

    @Test
    void onlyListedAddressIsAllowed() {
        assertTrue(service.isCallerAllowed("203.0.113.3"));
        assertFalse(service.isCallerAllowed("203.0.113.9"));
        assertFalse(service.isCallerAllowed(null));
    }

    @Test
    void checkReturnsOkForPayableInvoice() {
        when(callbacks.findByTxnIdAndCommand("T1", "check")).thenReturn(Optional.empty());
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));

        String body = service.handle("check", "T1", "7", null, null, "203.0.113.1");

        assertTrue(body.contains("<result>0</result>"));
        assertTrue(body.contains("<osmp_txn_id>T1</osmp_txn_id>"));
        verify(callbacks).saveAndFlush(any(KaspiCallback.class));
    }

    @Test
    void checkRejectsMalformedAndUnknownAccounts() {
        when(callbacks.findByTxnIdAndCommand(any(), any())).thenReturn(Optional.empty());
        when(invoices.findById(999L)).thenReturn(Optional.empty());

        assertTrue(service.handle("check", "T2", "abc", null, null, "ip").contains("<result>2</result>"));
        assertTrue(service.handle("check", "T3", "999", null, null, "ip").contains("<result>3</result>"));
    }

    @Test
    void payCreditsInvoiceOnceAndReturnsLedgerId() {
        when(callbacks.findByTxnIdAndCommand("T4", "pay")).thenReturn(Optional.empty());
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));
        when(settlement.settle(PaymentProvider.KASPI, "T4", 7L, new BigDecimal("30000.00"), "KZT"))
                .thenReturn(new OnlinePaymentSettlementService.Settlement(55L, true));

        String body = service.handle("pay", "T4", "7", "30000.00", "20261116101500", "203.0.113.1");

        assertTrue(body.contains("<result>0</result>"));
        assertTrue(body.contains("<prv_txn_id>55</prv_txn_id>"));
        assertTrue(body.contains("<sum>30000.00</sum>"));
    }

    @Test
    void payWithWrongAmountIsRefusedAndNeverReachesLedger() {
        when(callbacks.findByTxnIdAndCommand("T5", "pay")).thenReturn(Optional.empty());
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));

        String body = service.handle("pay", "T5", "7", "100", "20261116101500", "203.0.113.1");

        assertTrue(body.contains("<result>4</result>"));
        verifyNoInteractions(settlement);
    }

    @Test
    void payForAlreadyPaidInvoiceIsRefused() {
        when(callbacks.findByTxnIdAndCommand("T6", "pay")).thenReturn(Optional.empty());
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));
        when(settlement.settle(any(), any(), anyLong(), any(), any())).thenThrow(new ConflictException("Invoice already paid"));

        assertTrue(service.handle("pay", "T6", "7", "30000", null, "203.0.113.1").contains("<result>4</result>"));
    }

    @Test
    void retriedTransactionReplaysStoredResponse() {
        KaspiCallback stored = new KaspiCallback("T7", "pay", "7", new BigDecimal("30000.00"), null, 7L, 0, "55",
                "<response>stored</response>", "ip");
        when(callbacks.findByTxnIdAndCommand("T7", "pay")).thenReturn(Optional.of(stored));

        assertTrue(service.handle("pay", "T7", "7", "30000.00", null, "ip").equals("<response>stored</response>"));
        verifyNoInteractions(settlement);
        verify(callbacks, never()).saveAndFlush(any());
    }

    @Test
    void unexpectedLedgerFailureIsTemporaryAndNotCached() {
        when(callbacks.findByTxnIdAndCommand("T8", "pay")).thenReturn(Optional.empty());
        when(invoices.findById(7L)).thenReturn(Optional.of(invoice));
        when(settlement.settle(any(), eq("T8"), anyLong(), any(), any())).thenThrow(new IllegalStateException("db down"));

        assertThrows(KaspiProviderService.TemporaryFailure.class,
                () -> service.handle("pay", "T8", "7", "30000", null, "203.0.113.1"));
        verify(callbacks, never()).saveAndFlush(any());
    }

    @Test
    void invalidTxnIdAndCommandAreRejectedWithoutDbAccess() {
        assertTrue(service.handle("pay", "bad id<", "7", "1", null, "ip").contains("<result>5</result>"));
        assertTrue(service.handle("refund", "T9", "7", "1", null, "ip").contains("<result>5</result>"));
        verifyNoInteractions(invoices, settlement);
    }
}
