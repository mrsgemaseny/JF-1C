package com.example.zhanfinancebackend.modules.notifications.controller;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@Profile("!prod")
@PreAuthorize("hasRole('ADMIN')")
public class TestEmailController {

    private final JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${app.mail.from-address:no-reply@zhan-finance.com}")
    private String fromAddress;

    public TestEmailController(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @GetMapping("/api/test-email")
    public String sendTestEmail(@RequestParam String email) {
        String html = "<h2>Почта работает!</h2>" +
                      "<p>Привет! Это тестовое сообщение от вашего сервера ZhanFinance.</p>";
        
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromAddress);
            helper.setTo(email);
            helper.setSubject("Тестовое письмо от ZhanFinance");
            helper.setText(html, true);
            
            mailSender.send(message);
            return "Успех! Тестовое письмо отправлено на адрес: " + email;
        } catch (Exception e) {
            return "ОШИБКА ОТПРАВКИ: " + e.getMessage() + "\n\nДетали: " + e.toString();
        }
    }
}
