package com.example.zhanfinancebackend.modules.landing.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.landing.dto.ContactRequestCreateRequest;
import com.example.zhanfinancebackend.modules.landing.dto.ContactRequestDto;
import com.example.zhanfinancebackend.modules.landing.dto.ContactRequestFileDto;
import com.example.zhanfinancebackend.modules.landing.entity.ContactRequest.ContactRequestStatus;
import com.example.zhanfinancebackend.modules.landing.service.ContactRequestService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/contact-requests")
public class ContactRequestController {

    private final ContactRequestService contactRequestService;

    public ContactRequestController(ContactRequestService contactRequestService) {
        this.contactRequestService = contactRequestService;
    }

    @PostMapping
    public ApiResponse<ContactRequestDto> create(@Valid @RequestBody ContactRequestCreateRequest request) {
        return ApiResponse.success(contactRequestService.create(request), "Contact request created");
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'ADVISOR')")
    public ApiResponse<List<ContactRequestDto>> findAll() {
        return ApiResponse.success(contactRequestService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'ADVISOR')")
    public ApiResponse<ContactRequestDto> findById(@PathVariable Long id) {
        return ApiResponse.success(contactRequestService.findById(id));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ApiResponse<ContactRequestDto> updateStatus(
            @PathVariable Long id,
            @RequestParam ContactRequestStatus status
    ) {
        return ApiResponse.success(contactRequestService.updateStatus(id, status));
    }


    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        contactRequestService.delete(id);
        return ApiResponse.success(null, "Contact request deleted");
    }

    @PostMapping("/{id}/files")
    public ApiResponse<List<ContactRequestFileDto>> uploadFiles(
            @PathVariable Long id,
            @RequestParam("files") org.springframework.web.multipart.MultipartFile[] files) {
        return ApiResponse.success(contactRequestService.uploadFiles(id, files), "Files uploaded");
    }

    @GetMapping("/{id}/files/{fileId}/download")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'ADVISOR')")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadFile(
            @PathVariable Long id,
            @PathVariable Long fileId) {
        return contactRequestService.downloadFile(id, fileId);
    }

}
