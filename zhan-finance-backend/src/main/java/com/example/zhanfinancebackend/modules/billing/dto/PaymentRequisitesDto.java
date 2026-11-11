package com.example.zhanfinancebackend.modules.billing.dto;

public record PaymentRequisitesDto(
        String recipientName,
        String bin,
        String iban,
        String kbe,
        String bankName,
        String kaspiPayUrl
) {
    public PaymentRequisitesDto(String recipientName, String bin, String iban, String kbe, String bankName) {
        this(recipientName, bin, iban, kbe, bankName, "https://pay.kaspi.kz/pay/ooixwvwq");
    }
}
