package com.example.zhanfinancebackend.modules.courses.service;

import com.example.zhanfinancebackend.modules.courses.entity.Certificate;
import com.example.zhanfinancebackend.modules.courses.repository.CertificateRepository;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class CertificateGeneratorService {

    private final CertificateRepository certificateRepository;
    private final TemplateEngine templateEngine;

    public CertificateGeneratorService(CertificateRepository certificateRepository, TemplateEngine templateEngine) {
        this.certificateRepository = certificateRepository;
        this.templateEngine = templateEngine;
    }

    @Transactional(readOnly = true)
    public byte[] generateCertificatePdf(Long courseId, Long userId) {
        Certificate cert = certificateRepository.findByCourseIdAndUserId(courseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Сертификат не найден. Убедитесь, что курс завершен."));

        Context context = new Context();
        context.setVariable("studentName", cert.getUser().getFullName());
        context.setVariable("courseTitle", cert.getCourse().getTitle());
        context.setVariable("issueDate", cert.getIssuedAt().format(DateTimeFormatter.ofPattern("dd.MM.yyyy")));
        context.setVariable("certificateCode", cert.getCertificateCode());

        try {
            String html = templateEngine.process("certificate", context);

            try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
                PdfRendererBuilder builder = new PdfRendererBuilder();
                builder.useFastMode();
                builder.withHtmlContent(html, "");
                
                // Add fonts for Cyrillic support if available in resources, fallback to default for now
                // In a real prod setup, we'd do: builder.useFont(new File("arial.ttf"), "Arial");
                
                builder.toStream(os);
                builder.run();
                return os.toByteArray();
            }
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Ошибка генерации PDF: " + e.getMessage());
        }
    }
}
