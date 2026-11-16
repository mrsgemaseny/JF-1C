package com.example.zhanfinancebackend.modules.billing.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.billing.dto.OnlinePaymentIntentDto;
import com.example.zhanfinancebackend.modules.billing.dto.OnlinePaymentOptionsDto;
import com.example.zhanfinancebackend.modules.billing.service.FreedomPaymentService;
import com.example.zhanfinancebackend.modules.billing.service.KaspiProviderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Client-facing endpoints for paying an invoice online. */
@RestController
@RequestMapping("/v1/billing/online-payments")
@PreAuthorize("hasRole('CLIENT')")
public class OnlinePaymentController {

    private final FreedomPaymentService freedom;
    private final KaspiProviderService kaspi;

    public OnlinePaymentController(FreedomPaymentService freedom, KaspiProviderService kaspi) {
        this.freedom = freedom;
        this.kaspi = kaspi;
    }

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<OnlinePaymentOptionsDto>> options() {
        return ResponseEntity.ok(ApiResponse.success(
                new OnlinePaymentOptionsDto(freedom.isEnabled(), kaspi.isEnabled()), "OK"));
    }

    @PostMapping("/freedom/invoices/{invoiceId}")
    public ResponseEntity<ApiResponse<OnlinePaymentIntentDto>> startFreedomPayment(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long invoiceId) {
        User user = principal.getUser();
        return ResponseEntity.ok(ApiResponse.success(freedom.createPayment(user, invoiceId), "Payment created"));
    }

    @GetMapping("/freedom/orders/{orderId}")
    public ResponseEntity<ApiResponse<OnlinePaymentIntentDto>> freedomStatus(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable String orderId) {
        return ResponseEntity.ok(ApiResponse.success(freedom.getStatus(principal.getUser(), orderId), "OK"));
    }
}
