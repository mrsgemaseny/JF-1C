package com.example.zhanfinancebackend.modules.billing.dto;

import java.math.BigDecimal;

/** What the client sees about an online payment attempt. */
public record OnlinePaymentIntentDto(String orderId, Long invoiceId, BigDecimal amount, String currency,
                                     String status, String redirectUrl, String failureReason) {}
