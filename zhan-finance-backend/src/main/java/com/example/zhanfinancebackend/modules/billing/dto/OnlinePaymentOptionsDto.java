package com.example.zhanfinancebackend.modules.billing.dto;

/** Which online payment methods are switched on, so the UI shows only working buttons. */
public record OnlinePaymentOptionsDto(boolean freedomPayEnabled, boolean kaspiPayEnabled) {}
