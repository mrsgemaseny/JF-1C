package com.example.zhanfinancebackend.modules.billing.controller;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptDto;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptUrlResponse;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentRequisitesDto;
import com.example.zhanfinancebackend.modules.billing.service.PaymentReceiptService;
import com.example.zhanfinancebackend.common.idempotency.IdempotencyService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/billing/receipts")
public class PaymentReceiptController {

    private final PaymentReceiptService paymentReceiptService;
    private final IdempotencyService idempotencyService;

    public PaymentReceiptController(PaymentReceiptService paymentReceiptService, IdempotencyService idempotencyService) {
        this.paymentReceiptService = paymentReceiptService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentReceiptDto>> submitReceipt(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestParam("amount") BigDecimal amount,
            @RequestParam(value = "currency", defaultValue = "KZT") String currency,
            @RequestParam(value = "subscriptionId", required = false) Long subscriptionId,
            @RequestParam(value = "invoiceId", required = false) Long invoiceId,
            @RequestParam("file") MultipartFile file
    ) {
        User currentUser = principal != null ? principal.getUser() : null;
        PaymentReceiptDto result = idempotencyService.execute(idempotencyKey, PaymentReceiptDto.class, () ->
                paymentReceiptService.submitReceipt(
                        currentUser, subscriptionId, invoiceId, amount, currency, file
                )
        );
        return ResponseEntity.ok(ApiResponse.success(result, "Receipt submitted successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentReceiptDto>>> getMyReceipts(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = principal != null ? principal.getUser() : null;
        List<PaymentReceiptDto> receipts = paymentReceiptService.getClientReceipts(currentUser);
        return ResponseEntity.ok(ApiResponse.success(receipts));
    }

    @GetMapping("/{id}/file")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentReceiptUrlResponse>> getReceiptFileUrl(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") Long id
    ) {
        User currentUser = principal != null ? principal.getUser() : null;
        PaymentReceiptUrlResponse response = paymentReceiptService.getReceiptFileUrl(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<ByteArrayResource> downloadReceipt(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") Long id
    ) {
        User currentUser = principal != null ? principal.getUser() : null;
        byte[] data = paymentReceiptService.loadReceiptFile(currentUser, id);
        ByteArrayResource resource = new ByteArrayResource(data);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"receipt-" + id + ".pdf\"")
                .body(resource);
    }

    @GetMapping("/requisites")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<PaymentRequisitesDto>> getRequisites() {
        PaymentRequisitesDto requisites = paymentReceiptService.getRequisites();
        return ResponseEntity.ok(ApiResponse.success(requisites));
    }

    @GetMapping("/files/download")
    @PreAuthorize("hasAnyRole('CLIENT', 'EMPLOYEE', 'ADMIN', 'ADVISOR')")
    public ResponseEntity<ByteArrayResource> downloadFallbackFile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("key") String fileKey
    ) {
        if (fileKey == null || !fileKey.startsWith("receipts/")) {
            throw new BadRequestException("Invalid or unauthorized receipt file key.");
        }
        byte[] data = paymentReceiptService.loadReceiptFileByKey(principal.getUser(), fileKey);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"receipt.pdf\"")
                .body(new ByteArrayResource(data));
    }
}

