package com.example.zhanfinancebackend.modules.billing.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.billing.dto.InvoiceDto;
import com.example.zhanfinancebackend.modules.billing.service.InvoiceService;
import com.example.zhanfinancebackend.modules.billing.service.PdfGeneratorService;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/v1/billing/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final PdfGeneratorService pdfGeneratorService;

    public InvoiceController(InvoiceService invoiceService, PdfGeneratorService pdfGeneratorService) {
        this.invoiceService = invoiceService;
        this.pdfGeneratorService = pdfGeneratorService;
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'CLIENT')")
    public ResponseEntity<byte[]> downloadPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        Invoice invoice = invoiceService.getInvoiceForPdf(principal.getUser(), id);
        Map<String, Object> data = new HashMap<>();
        data.put("invoice", invoice);
        
        byte[] pdfBytes = pdfGeneratorService.generatePdf("pdf/invoice", data);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice_" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/{id}/act-pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'CLIENT')")
    public ResponseEntity<byte[]> downloadActPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        Invoice invoice = invoiceService.getInvoiceForPdf(principal.getUser(), id);
        Map<String, Object> data = new HashMap<>();
        data.put("invoice", invoice);
        
        byte[] pdfBytes = pdfGeneratorService.generatePdf("pdf/act", data);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"act_" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'CLIENT')")
    public ApiResponse<?> findAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "id"));
            return ApiResponse.success(invoiceService.findAllPaged(principal.getUser(), pageable));
        }
        return ApiResponse.success(invoiceService.findAll(principal.getUser()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'CLIENT')")
    public ApiResponse<InvoiceDto> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ApiResponse.success(invoiceService.getById(principal.getUser(), id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ApiResponse<InvoiceDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InvoiceDto request
    ) {
        return ApiResponse.success(invoiceService.create(principal.getUser(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ApiResponse<InvoiceDto> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody InvoiceDto request
    ) {
        return ApiResponse.success(invoiceService.update(principal.getUser(), id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        invoiceService.delete(principal.getUser(), id);
        return ApiResponse.success(null, "Invoice deleted");
    }
}