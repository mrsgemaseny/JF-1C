package com.example.zhanfinancebackend.modules.admin.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.admin.service.AdminService;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.crm.dto.AdminDashboardDto;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest;
import com.example.zhanfinancebackend.modules.auth.service.UserService;
import com.example.zhanfinancebackend.modules.crm.dto.ClientStatsDto;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeWorkloadDto;

import com.example.zhanfinancebackend.modules.billing.service.InvoiceService;
import com.example.zhanfinancebackend.modules.billing.dto.FinanceSummaryDto;

@RestController
@RequestMapping("/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserService userService;
    private final InvoiceService invoiceService;

    public AdminController(AdminService adminService, UserService userService, InvoiceService invoiceService) {
        this.adminService = adminService;
        this.userService = userService;
        this.invoiceService = invoiceService;
    }

    @GetMapping("/finance/summary")
    public ApiResponse<FinanceSummaryDto> getFinanceSummary() {
        return ApiResponse.success(invoiceService.getFinanceSummary());
    }

    @GetMapping("/employees")
    public ApiResponse<List<EmployeeDto>> getAllEmployees(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ApiResponse.success(adminService.getAllEmployees());
    }

    @GetMapping("/employees/pending")
    public ApiResponse<List<EmployeeDto>> getPendingEmployees() {
        return ApiResponse.success(adminService.getPendingEmployees());
    }

    @GetMapping("/employees/workload")
    public ApiResponse<List<EmployeeWorkloadDto>> getEmployeeWorkload() {
        return ApiResponse.success(adminService.getEmployeeWorkloads());
    }

    @PostMapping("/employees/{id}/approve")
    public ApiResponse<Void> approveEmployee(@PathVariable Long id) {
        adminService.approveEmployee(id);
        return ApiResponse.success(null, "Сотрудник одобрен");
    }

    @PostMapping("/employees/{id}/reject")
    public ApiResponse<Void> rejectEmployee(@PathVariable Long id) {
        adminService.rejectEmployee(id);
        return ApiResponse.success(null, "Сотрудник отклонен");
    }

    @PostMapping("/employees/{id}/promote-to-advisor")
    public ApiResponse<Void> promoteToAdvisor(@PathVariable Long id) {
        adminService.promoteToAdvisor(id);
        return ApiResponse.success(null, "Сотрудник переведен в роль ADVISOR");
    }

    @PostMapping("/employees/{id}/demote-to-employee")
    public ApiResponse<Void> demoteToEmployee(@PathVariable Long id) {
        adminService.demoteToEmployee(id);
        return ApiResponse.success(null, "Эдвайзер переведен в роль EMPLOYEE");
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ApiResponse<Void> toggleUserStatus(@PathVariable Long id) {
        adminService.toggleUserStatus(id);
        return ApiResponse.success(null, "Статус пользователя успешно изменен");
    }

    @DeleteMapping("/employees/{id}")
    public ApiResponse<Void> deleteEmployee(@PathVariable Long id) {
        userService.softDeleteUser(id);
        return ApiResponse.success(null, "Сотрудник деактивирован");
    }

    @GetMapping("/employees/assigned")
    public ApiResponse<List<EmployeeDto>> getAssignedEmployees() {
        return ApiResponse.success(adminService.getAssignedEmployees());
    }

    @GetMapping("/employees/unassigned")
    public ApiResponse<List<EmployeeDto>> getUnassignedEmployees() {
        return ApiResponse.success(adminService.getUnassignedEmployees());
    }

    @GetMapping("/dashboard")
    public ApiResponse<AdminDashboardDto> getAdminDashboard() {
        return ApiResponse.success(adminService.getAdminDashboard());
    }

    @GetMapping("/clients/stats")
    public ApiResponse<List<ClientStatsDto>> getClientStats() {
        return ApiResponse.success(adminService.getClientStats());
    }

    @GetMapping("/learners")
    public ApiResponse<List<EmployeeDto>> getAllLearners() {
        return ApiResponse.success(adminService.getAllLearners());
    }

    @PostMapping("/learners")
    public ApiResponse<Void> createLearner(@jakarta.validation.Valid @RequestBody RegisterRequest request) {
        adminService.createLearner(request);
        return ApiResponse.success(null, "Обучающийся успешно создан");
    }
}
