package com.example.zhanfinancebackend.modules.billing.controller;

import com.example.zhanfinancebackend.ZhanFinanceBackendApplication;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptDto;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptReviewRequest;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentReceiptUrlResponse;
import com.example.zhanfinancebackend.modules.billing.dto.PaymentRequisitesDto;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceiptStatus;
import com.example.zhanfinancebackend.modules.billing.service.PaymentReceiptService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = ZhanFinanceBackendApplication.class)
@AutoConfigureMockMvc
class PaymentReceiptControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PaymentReceiptService paymentReceiptService;

    private UserPrincipal clientPrincipal;
    private UserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        User clientUser = new User("client@test.com", "password", "Client User", Role.CLIENT);
        clientUser.setId(10L);
        clientUser.setEnabled(true);
        this.clientPrincipal = new UserPrincipal(clientUser);

        User adminUser = new User("admin@test.com", "password", "Admin User", Role.ADMIN);
        adminUser.setId(1L);
        adminUser.setEnabled(true);
        this.adminPrincipal = new UserPrincipal(adminUser);
    }

    @Test
    @DisplayName("POST /api/v1/billing/receipts: submit receipt returns 200 with DTO")
    void submitReceipt_returns200() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "receipt.pdf", "application/pdf", "%PDF".getBytes());
        PaymentReceiptDto mockDto = new PaymentReceiptDto(
                100L, 10L, "Client User", "client@test.com",
                null, null, null, null,
                BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf",
                PaymentReceiptStatus.AWAITING_REVIEW,
                null, null, null, null,
                Instant.now(), Instant.now()
        );

        when(paymentReceiptService.submitReceipt(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(10L)), any(), any(), any(), any(), any()))
                .thenReturn(mockDto);

        mockMvc.perform(multipart("/api/v1/billing/receipts")
                        .file(file)
                        .param("amount", "50000")
                        .param("currency", "KZT")
                        .contextPath("/api")
                        .with(user(clientPrincipal))
                        .with(csrf())
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100))
                .andExpect(jsonPath("$.data.status").value("AWAITING_REVIEW"))
                .andExpect(jsonPath("$.data.amount").value(50000));
    }

    @Test
    @DisplayName("GET /api/v1/billing/receipts: returns list of client receipts")
    void getMyReceipts_returns200() throws Exception {
        PaymentReceiptDto mockDto = new PaymentReceiptDto(
                100L, 10L, "Client User", "client@test.com",
                null, null, null, null,
                BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf",
                PaymentReceiptStatus.AWAITING_REVIEW,
                null, null, null, null,
                Instant.now(), Instant.now()
        );

        when(paymentReceiptService.getClientReceipts(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(10L))))
                .thenReturn(List.of(mockDto));

        mockMvc.perform(get("/api/v1/billing/receipts")
                        .contextPath("/api")
                        .with(user(clientPrincipal))
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(100));
    }

    @Test
    @DisplayName("GET /api/v1/billing/receipts/{id}/file: returns presigned URL")
    void getReceiptFileUrl_returns200() throws Exception {
        PaymentReceiptUrlResponse mockResponse = new PaymentReceiptUrlResponse("https://r2.storage.com/url", 900);

        when(paymentReceiptService.getReceiptFileUrl(any(), eq(100L)))
                .thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/billing/receipts/100/file")
                        .contextPath("/api")
                        .with(user(clientPrincipal))
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.url").value("https://r2.storage.com/url"))
                .andExpect(jsonPath("$.data.expiresInSeconds").value(900));
    }

    @Test
    @DisplayName("GET /api/v1/billing/receipts/requisites: returns company payment requisites")
    void getRequisites_returns200() throws Exception {
        PaymentRequisitesDto requisites = new PaymentRequisitesDto(
                "ТОО ЖАН FINANCE", "240140012345", "KZ123456789012345678", "17", "АО Каспий Банк"
        );

        when(paymentReceiptService.getRequisites()).thenReturn(requisites);

        mockMvc.perform(get("/api/v1/billing/receipts/requisites")
                        .contextPath("/api")
                        .with(user(clientPrincipal))
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.recipientName").value("ТОО ЖАН FINANCE"))
                .andExpect(jsonPath("$.data.bin").value("240140012345"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/billing/receipts/{id}/confirm: admin confirms receipt")
    void adminConfirmReceipt_returns200() throws Exception {
        PaymentReceiptDto mockDto = new PaymentReceiptDto(
                100L, 10L, "Client User", "client@test.com",
                null, null, null, null,
                BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf",
                PaymentReceiptStatus.CONFIRMED,
                1L, "Admin User", Instant.now(), null,
                Instant.now(), Instant.now()
        );

        when(paymentReceiptService.confirmReceipt(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(1L)), eq(100L))).thenReturn(mockDto);

        mockMvc.perform(post("/api/v1/admin/billing/receipts/100/confirm")
                        .contextPath("/api")
                        .with(user(adminPrincipal))
                        .with(csrf())
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/billing/receipts/{id}/reject: admin rejects receipt with note")
    void adminRejectReceipt_returns200() throws Exception {
        PaymentReceiptReviewRequest request = new PaymentReceiptReviewRequest("Неверная сумма платежа");
        PaymentReceiptDto mockDto = new PaymentReceiptDto(
                100L, 10L, "Client User", "client@test.com",
                null, null, null, null,
                BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf",
                PaymentReceiptStatus.REJECTED,
                1L, "Admin User", Instant.now(), "Неверная сумма платежа",
                Instant.now(), Instant.now()
        );

        when(paymentReceiptService.rejectReceipt(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(1L)), eq(100L), eq("Неверная сумма платежа")))
                .thenReturn(mockDto);

        mockMvc.perform(post("/api/v1/admin/billing/receipts/100/reject")
                        .contextPath("/api")
                        .with(user(adminPrincipal))
                        .with(csrf())
                        .header("X-Requested-With", "XMLHttpRequest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectNote").value("Неверная сумма платежа"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/billing/receipts: admin gets all receipts")
    void adminGetAllReceipts_returns200() throws Exception {
        PaymentReceiptDto mockDto = new PaymentReceiptDto(
                100L, 10L, "Client User", "client@test.com",
                null, null, null, null,
                BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf",
                PaymentReceiptStatus.AWAITING_REVIEW,
                null, null, null, null,
                Instant.now(), Instant.now()
        );

        when(paymentReceiptService.getAllReceipts(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(1L)), eq(null)))
                .thenReturn(List.of(mockDto));

        mockMvc.perform(get("/api/v1/admin/billing/receipts")
                        .contextPath("/api")
                        .with(user(adminPrincipal))
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(100));
    }

    @Test
    @DisplayName("GET /api/v1/admin/billing/receipts?status=AWAITING_REVIEW: admin gets filtered receipts")
    void adminGetReceiptsWithStatus_returns200() throws Exception {
        PaymentReceiptDto mockDto = new PaymentReceiptDto(
                100L, 10L, "Client User", "client@test.com",
                null, null, null, null,
                BigDecimal.valueOf(50000), "KZT", "receipts/test.pdf",
                PaymentReceiptStatus.AWAITING_REVIEW,
                null, null, null, null,
                Instant.now(), Instant.now()
        );

        when(paymentReceiptService.getAllReceipts(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(1L)), eq(PaymentReceiptStatus.AWAITING_REVIEW)))
                .thenReturn(List.of(mockDto));

        mockMvc.perform(get("/api/v1/admin/billing/receipts")
                        .param("status", "AWAITING_REVIEW")
                        .contextPath("/api")
                        .with(user(adminPrincipal))
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(100));
    }

    @Test
    @DisplayName("GET /api/v1/billing/receipts/files/download: client downloads fallback file successfully")
    void downloadFallbackFile_authorized_returnsFile() throws Exception {
        byte[] fileBytes = "%PDF-1.4 sample content".getBytes();
        when(paymentReceiptService.loadReceiptFileByKey(org.mockito.ArgumentMatchers.argThat(u -> u != null && u.getId().equals(10L)), eq("receipts/test.pdf")))
                .thenReturn(fileBytes);

        mockMvc.perform(get("/api/v1/billing/receipts/files/download")
                        .param("key", "receipts/test.pdf")
                        .contextPath("/api")
                        .with(user(clientPrincipal))
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/v1/billing/receipts/files/download: unauthorized returns 401")
    void downloadFallbackFile_unauthorized_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/billing/receipts/files/download")
                        .param("key", "receipts/test.pdf")
                        .contextPath("/api")
                        .header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isUnauthorized());
    }
}
