package com.example.zhanfinancebackend.modules.notifications.service;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import com.example.zhanfinancebackend.modules.notifications.event.EmailAttachment;
import com.example.zhanfinancebackend.modules.notifications.event.SendHtmlEmailEvent;
import com.example.zhanfinancebackend.modules.notifications.event.SendSimpleEmailEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.mail.from-address:no-reply@zhan-finance.com}")
    private String fromAddress;

    @Value("${app.frontend.url:http://localhost:5173/JF-1C}")
    private String frontendUrl;

    public EmailNotificationService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void sendEmailAsync(String to, String subject, String text) {
        if (to == null || to.isBlank()) return;
        eventPublisher.publishEvent(new SendSimpleEmailEvent(to, subject, text));
    }

    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) return;
        eventPublisher.publishEvent(new SendHtmlEmailEvent(to, subject, htmlBody));
    }

    /**
     * Master-шаблон. Табличная верстка гарантирует, что дизайн не развалится в десктопном Outlook.
     */
    public String buildFormalEmailHtml(String headerTitle, String recipientName, String contentHtml, String buttonText, String buttonUrl) {
        String buttonHtml = "";
        if (buttonText != null && buttonUrl != null && !buttonText.isBlank() && !buttonUrl.isBlank()) {
            buttonHtml = String.format(
                "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-top: 32px; margin-bottom: 8px;\">" +
                "  <tr><td align=\"center\">" +
                "    <a href=\"%s\" style=\"display: inline-block; padding: 15px 36px; background: linear-gradient(135deg, #047857 0%%, #059669 100%%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(4, 120, 87, 0.3);\">%s &rarr;</a>" +
                "  </td></tr>" +
                "</table>",
                buttonUrl, buttonText
            );
        }

        String template = 
            "<!DOCTYPE html>" +
            "<html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>" +
            "<body style=\"margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\">" +
            "  <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f3f4f6; padding: 32px 16px;\">" +
            "    <tr><td align=\"center\">" +
            "      <table width=\"100%\" max-width=\"600\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01);\">" +
            "        <tr><td style=\"padding: 28px 40px; border-bottom: 1px solid #f3f4f6;\">" +
            "          <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "            <tr>" +
            "              <td align=\"left\" style=\"vertical-align: middle;\">" +
            "                <img src=\"https://mrsgemaseny.github.io/JF-1C/logo.png\" width=\"40\" height=\"40\" alt=\"Zhan Finance Logo\" style=\"display: inline-block; vertical-align: middle; border-radius: 10px; margin-right: 12px;\" />" +
            "                <span style=\"font-size: 22px; font-weight: 800; color: #047857; letter-spacing: 0.5px; vertical-align: middle;\">Zhan</span>" +
            "                <span style=\"font-size: 22px; font-weight: 700; color: #111827; letter-spacing: 0.5px; vertical-align: middle;\"> Finance</span>" +
            "              </td>" +
            "            </tr>" +
            "          </table>" +
            "        </td></tr>" +
            "        <tr><td style=\"padding: 36px 40px;\">" +
            "          <h2 style=\"color: #111827; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.3px;\">{HEADER_TITLE}</h2>" +
            "          <p style=\"color: #374151; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Здравствуйте, <b style=\"color: #111827;\">{RECIPIENT_NAME}</b>!</p>" +
            "          {CONTENT_HTML}" +
            "          {BUTTON_HTML}" +
            "          <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-top: 36px; border-top: 1px solid #f3f4f6;\">" +
            "            <tr><td style=\"padding-top: 24px; text-align: center;\">" +
            "              <p style=\"font-size: 14px; color: #6b7280; line-height: 20px; margin: 0 0 8px 0;\">С уважением,<br/><b style=\"color: #111827;\">Команда Zhan Finance</b></p>" +
            "              <p style=\"font-size: 12px; color: #9ca3af; line-height: 18px; margin: 0;\">ТОО \"Zhan Finance\" &bull; Поддержка: <a href=\"mailto:support@zhanfinance.kz\" style=\"color: #047857; text-decoration: none; font-weight: 600;\">support@zhanfinance.kz</a></p>" +
            "              <p style=\"font-size: 11px; color: #9ca3af; line-height: 16px; margin-top: 8px; margin-bottom: 0;\">Это автоматическое транзакционное сообщение сервиса Zhan Finance.</p>" +
            "            </td></tr>" +
            "          </table>" +
            "        </td></tr>" +
            "      </table>" +
            "    </td></tr>" +
            "  </table>" +
            "</body></html>";
            
        return template
            .replace("{HEADER_TITLE}", headerTitle != null ? org.springframework.web.util.HtmlUtils.htmlEscape(headerTitle) : "")
            .replace("{RECIPIENT_NAME}", recipientName != null ? org.springframework.web.util.HtmlUtils.htmlEscape(recipientName) : "")
            .replace("{CONTENT_HTML}", contentHtml != null ? contentHtml : "")
            .replace("{BUTTON_HTML}", buttonHtml != null ? buttonHtml : "");
    }

    public String getFrontendUrl() {
        return frontendUrl;
    }

    public void sendTaskAssignedEmail(User assignee, Task task) {
        if (assignee.getEmail() == null || assignee.getEmail().isBlank()) return;

        String subject = "Вам назначена новая задача: " + task.getTitle();
        String deadlineStr = task.getDueDate() != null ? task.getDueDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy")) : "Не указан";
        
        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Вам была назначена новая задача в рабочей системе.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #111827; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px;\">Детали задачи</p>" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px; width: 30%%;\">Название:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
            "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px;\">Клиент:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
            "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px;\">Дедлайн:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
            "      <tr><td style=\"color: #6b7280; font-size: 14px; vertical-align: top;\">Описание:</td><td style=\"color: #111827; font-size: 15px; font-weight: 500; line-height: 22px;\">%s</td></tr>" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            org.springframework.web.util.HtmlUtils.htmlEscape(task.getTitle()),
            task.getClient() != null ? org.springframework.web.util.HtmlUtils.htmlEscape(task.getClient().getFullName()) : "Не указан",
            deadlineStr,
            task.getDescription() != null && !task.getDescription().isBlank() ? org.springframework.web.util.HtmlUtils.htmlEscape(task.getDescription()) : "Отсутствует"
        );

        String html = buildFormalEmailHtml("Новая задача в системе", assignee.getFullName(), contentHtml, "Открыть задачу", frontendUrl);
        sendHtmlEmail(assignee.getEmail(), subject, html);
    }


    public void sendTaskDeadlineAlertEmail(User user, Task task) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Приближается дедлайн по задаче: " + task.getTitle();
        String deadlineStr = task.getDueDate() != null ? task.getDueDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy")) : "Не указан";
        
        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Напоминаем, что срок выполнения задачи скоро истекает. Пожалуйста, проверьте статус выполнения.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px;\">Параметры дедлайна</p>" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      <tr><td style=\"padding-bottom: 12px; color: #7f1d1d; font-size: 14px; width: 30%%;\">Задача:</td><td style=\"padding-bottom: 12px; color: #7f1d1d; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "      <tr><td style=\"padding-bottom: 12px; color: #7f1d1d; font-size: 14px;\">Клиент:</td><td style=\"padding-bottom: 12px; color: #7f1d1d; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "      <tr><td style=\"color: #7f1d1d; font-size: 14px;\">Дедлайн:</td><td style=\"color: #dc2626; font-size: 15px; font-weight: 700;\">%s</td></tr>" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            task.getTitle(),
            task.getClient() != null ? task.getClient().getFullName() : "Не указан",
            deadlineStr
        );

        String html = buildFormalEmailHtml("Внимание: Горит Дедлайн!", user.getFullName(), contentHtml, "Посмотреть задачу", frontendUrl);
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendTaskStatusUpdatedEmail(User user, Task task, String oldStatus, String newStatus) {
        sendTaskStatusUpdatedEmail(user, task, oldStatus, newStatus, null);
    }

    public void sendTaskStatusUpdatedEmail(User user, Task task, String oldStatus, String newStatus, String lostReason) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Обновлен статус задачи: " + task.getTitle();
        
        String lostReasonRow = (lostReason != null && !lostReason.isBlank()) 
            ? "<tr><td style=\"padding-top: 12px; color: #6b7280; font-size: 14px; vertical-align: top;\">Причина отмены:</td><td style=\"padding-top: 12px; color: #111827; font-size: 15px; font-weight: 500;\">" + lostReason + "</td></tr>"
            : "";

        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Статус вашей задачи был успешно изменен в системе.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #111827; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px;\">Информация о статусе</p>" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px; width: 40%%;\">Задача:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
            "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px;\">Предыдущий статус:</td><td style=\"padding-bottom: 12px; color: #4b5563; font-size: 15px;\">%s</td></tr>" +
            "      <tr><td style=\"color: #6b7280; font-size: 14px;\">Новый статус:</td><td style=\"color: #047857; font-size: 15px; font-weight: 700;\">%s</td></tr>" +
            "      %s" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            task.getTitle(),
            oldStatus != null ? oldStatus : "Не указан",
            newStatus != null ? newStatus : "Не указан",
            lostReasonRow
        );

        String html = buildFormalEmailHtml("Изменение статуса задачи", user.getFullName(), contentHtml, "Посмотреть задачу", frontendUrl);
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendTaskCompletedEmailWithDocuments(User user, Task task, List<Document> documents, StorageService storageService) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Ваша задача успешно завершена: " + task.getTitle();
        
        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">С радостью сообщаем, что работа по вашей задаче полностью завершена.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #065f46; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px;\">Результат выполнения</p>" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      <tr><td style=\"padding-bottom: 12px; color: #047857; font-size: 14px; width: 30%%;\">Задача:</td><td style=\"padding-bottom: 12px; color: #065f46; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "      <tr><td style=\"color: #047857; font-size: 14px;\">Документы:</td><td style=\"color: #065f46; font-size: 15px; font-weight: 600;\">Итоговые файлы прикреплены во вложении</td></tr>" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            task.getTitle()
        );

        String html = buildFormalEmailHtml("Задача успешно выполнена!", user.getFullName(), contentHtml, "Перейти в личный кабинет", frontendUrl);

        List<EmailAttachment> attachments = new ArrayList<>();
        if (documents != null && !documents.isEmpty() && storageService != null) {
            for (Document doc : documents) {
                try {
                    if (doc.getStorageKey() == null || doc.getStorageKey().isBlank()) {
                        log.warn("Document {} has no storageKey, skipping attachment", doc.getId());
                        continue;
                    }
                    byte[] fileData = storageService.loadAsBytes(doc.getStorageKey());
                    attachments.add(new EmailAttachment(doc.getFileName(), fileData));
                } catch (Exception e) {
                    log.warn("Failed to attach document {} to email: {}", doc.getFileName(), e.getMessage());
                }
            }
        }

        eventPublisher.publishEvent(new SendHtmlEmailEvent(user.getEmail(), subject, html, attachments));
    }

    public void sendWelcomeEmail(User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Добро пожаловать в Zhan Finance";
        String contentHtml = 
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Вы успешно зарегистрировались в системе Zhan Finance.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #166534; font-size: 15px; line-height: 24px; margin: 0;\">Вам открыт доступ в личный кабинет для работы с бухгалтерскими и финансовыми услугами.</p>" +
            "  </td></tr>" +
            "</table>";

        String html = buildFormalEmailHtml("Добро пожаловать в Zhan Finance!", user.getFullName(), contentHtml, "Войти в личный кабинет", frontendUrl + "/login");
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendAccountApprovedEmail(User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Аккаунт сотрудника подтвержден";
        String contentHtml = 
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Ваш аккаунт сотрудника был успешно подтвержден администратором.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #374151; font-size: 15px; line-height: 24px; margin: 0;\">Теперь вы можете войти в рабочую систему и приступить к выполнению задач.</p>" +
            "  </td></tr>" +
            "</table>";

        String html = buildFormalEmailHtml("Подтверждение аккаунта", user.getFullName(), contentHtml, "Войти в систему", frontendUrl + "/login");
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendTaskEditedByClientEmail(User user, Task task, User client) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Клиент отредактировал задачу: " + task.getTitle();
        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Клиент внес изменения в параметры задачи.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      <tr><td style=\"padding-bottom: 12px; color: #0369a1; font-size: 14px; width: 30%%;\">Клиент:</td><td style=\"padding-bottom: 12px; color: #075985; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "      <tr><td style=\"color: #0369a1; font-size: 14px;\">Обновленная задача:</td><td style=\"color: #075985; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            client != null ? client.getFullName() : "Клиент",
            task.getTitle()
        );

        String html = buildFormalEmailHtml("Обновление задачи клиентом", user.getFullName(), contentHtml, "Посмотреть задачу", frontendUrl);
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendTaskDeletedByClientEmail(User user, String taskTitle, User client) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Клиент удалил задачу: " + taskTitle;
        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Обратите внимание, задача была отменена и удалена клиентом.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      <tr><td style=\"padding-bottom: 12px; color: #991b1b; font-size: 14px; width: 30%%;\">Клиент:</td><td style=\"padding-bottom: 12px; color: #7f1d1d; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "      <tr><td style=\"color: #991b1b; font-size: 14px;\">Удаленная задача:</td><td style=\"color: #7f1d1d; font-size: 15px; font-weight: 600;\">%s</td></tr>" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            client != null ? client.getFullName() : "Клиент",
            taskTitle
        );

        String html = buildFormalEmailHtml("Удаление задачи", user.getFullName(), contentHtml, null, null);
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendDocumentAttachedEmail(User user, Document document, Task task) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Новый документ: " + document.getFileName();
        
        String taskInfo = task != null 
            ? "<tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px; width: 30%;\">Задача:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">" + task.getTitle() + "</td></tr>"
            : "";

        String contentHtml = String.format(
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Сотрудник загрузил новый документ для вас.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
            "      %s" +
            "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px; width: 30%%;\">Файл:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
            "    </table>" +
            "  </td></tr>" +
            "</table>",
            taskInfo,
            document.getFileName()
        );

        String html = buildFormalEmailHtml("Новый документ", user.getFullName(), contentHtml, "Перейти в личный кабинет", frontendUrl + "/client");
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendPasswordResetEmail(User user, String rawToken) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;

        String subject = "Восстановление пароля — Zhan Finance";
        String resetUrl = frontendUrl + "/reset-password?token=" + rawToken;

        String contentHtml = 
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Вы запросили сброс пароля для вашей учетной записи в системе Zhan Finance.</p>" +
            "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;\">" +
            "  <tr><td style=\"padding: 24px;\">" +
            "    <p style=\"color: #166534; font-size: 14px; line-height: 22px; margin: 0;\">Ссылка действительна в течение <strong>15 минут</strong>. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо — ваш аккаунт находится в полной безопасности.</p>" +
            "  </td></tr>" +
            "</table>";

        String html = buildFormalEmailHtml("Сброс пароля", user.getFullName(), contentHtml, "Задать новый пароль", resetUrl);
        sendHtmlEmail(user.getEmail(), subject, html);
    }

    public void sendLoginOtpEmail(String email, String fullName, String code) {
        if (email == null || email.isBlank()) return;

        String subject = "Код подтверждения входа — ZhanFinance";
        String contentHtml =
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Обнаружена попытка входа в аккаунт ZhanFinance с адреса Google.</p>" +
            "<table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;\">" +
            "  <tr><td style=\"padding: 24px; text-align: center;\">" +
            "    <p style=\"color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;\">Ваш проверочный код</p>" +
            "    <p style=\"font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 6px; margin: 0; font-family: monospace;\">" + code + "</p>" +
            "  </td></tr>" +
            "</table>" +
            "<p style=\"color: #64748b; font-size: 13px; line-height: 20px; margin: 0;\">Код действителен в течение 10 минут. Если это были не вы, срочно защитите свой аккаунт или измените пароль.</p>";

        String name = (fullName != null && !fullName.isBlank()) ? fullName : "Пользователь";
        String html = buildFormalEmailHtml("Подтверждение входа", name, contentHtml, null, null);
        sendHtmlEmail(email, subject, html);
    }

    public void sendRegisterOtpEmail(String email, String fullName, String code) {
        if (email == null || email.isBlank()) return;

        String subject = "Подтверждение регистрации — ZhanFinance";
        String contentHtml =
            "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">Благодарим за регистрацию в платформе ZhanFinance.</p>" +
            "<table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;\">" +
            "  <tr><td style=\"padding: 24px; text-align: center;\">" +
            "    <p style=\"color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;\">Ваш код подтверждения почты</p>" +
            "    <p style=\"font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 6px; margin: 0; font-family: monospace;\">" + code + "</p>" +
            "  </td></tr>" +
            "</table>" +
            "<p style=\"color: #64748b; font-size: 13px; line-height: 20px; margin: 0;\">Введите этот 6-значный код на сайте для завершения регистрации. Срок действия кода: 10 минут.</p>";

        String name = (fullName != null && !fullName.isBlank()) ? fullName : "Пользователь";
        String html = buildFormalEmailHtml("Подтверждение почты", name, contentHtml, null, null);
        sendHtmlEmail(email, subject, html);
    }
}