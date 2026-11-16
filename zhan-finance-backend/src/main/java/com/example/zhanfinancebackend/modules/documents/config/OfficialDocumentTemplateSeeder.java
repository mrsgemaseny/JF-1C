package com.example.zhanfinancebackend.modules.documents.config;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.documents.entity.DocumentTemplate;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentTemplateRepository;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import org.apache.poi.xwpf.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayOutputStream;

@Component
public class OfficialDocumentTemplateSeeder {

    private static final Logger log = LoggerFactory.getLogger(OfficialDocumentTemplateSeeder.class);

    private final DocumentTemplateRepository templateRepository;
    private final StorageService storageService;
    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;

    public OfficialDocumentTemplateSeeder(DocumentTemplateRepository templateRepository,
                                         StorageService storageService,
                                         UserRepository userRepository,
                                         TransactionTemplate transactionTemplate) {
        this.templateRepository = templateRepository;
        this.storageService = storageService;
        this.userRepository = userRepository;
        this.transactionTemplate = transactionTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedOfficialTemplates() {
        User admin = userRepository.findAll().stream().findFirst().orElse(null);

        // 1. Act of Completed Works (Form R-1 RK)
        createTemplateIfAbsent(
                "Акт выполненных работ (Форма Р-1)",
                "Официальная форма Р-1 утверждена МФ РК для акта приём-передачи оказанных услуг",
                admin,
                this::generateFormR1Docx
        );

        // 2. Report of Rendered Services
        createTemplateIfAbsent(
                "Отчет об оказанных услугах (АВР)",
                "Подробный отчет о выполненных бухгалтерских и консультационных работах по задаче",
                admin,
                this::generateServicesReportDocx
        );

        // 3. Client Approval and Signature Sheet
        createTemplateIfAbsent(
                "Лист согласования и подписи",
                "Официальный протокол подтверждения приема оказанных услуг клиентом",
                admin,
                this::generateApprovalSheetDocx
        );
    }

    @FunctionalInterface
    private interface DocxGenerator {
        byte[] generate() throws Exception;
    }

    private void createTemplateIfAbsent(String name, String description, User admin, DocxGenerator generator) {
        if (templateRepository.existsByNameIgnoreCase(name)) {
            log.debug("Official document template already exists, skipping: {}", name);
            return;
        }

        transactionTemplate.execute(status -> {
            try {
                byte[] docxBytes = generator.generate();
                String storageKey = storageService.store(
                        docxBytes,
                        name.replaceAll("[^a-zA-Z0-9_-]", "_") + ".docx",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                );
                DocumentTemplate template = new DocumentTemplate(name, description, storageKey, admin);
                templateRepository.save(template);
                log.info("Successfully seeded official document template: {}", name);
            } catch (Exception e) {
                log.error("Failed to seed document template {}: {}", name, e.getMessage());
                status.setRollbackOnly();
            }
            return null;
        });
    }

    private void addParagraph(XWPFDocument doc, String text) {
        addParagraph(doc, text, false, ParagraphAlignment.LEFT, 0);
    }

    private void addParagraph(XWPFDocument doc, String text, boolean bold, ParagraphAlignment alignment, int spacingBefore) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(alignment);
        if (spacingBefore > 0) p.setSpacingBefore(spacingBefore);
        XWPFRun r = p.createRun();
        r.setText(text);
        if (bold) r.setBold(true);
    }

    private byte[] generateFormR1Docx() throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            addParagraph(doc, "Приложение 50", false, ParagraphAlignment.RIGHT, 0);
            addParagraph(doc, "к приказу Министра финансов Республики Казахстан", false, ParagraphAlignment.RIGHT, 0);
            addParagraph(doc, "от 20 декабря 2012 года № 562", false, ParagraphAlignment.RIGHT, 0);
            addParagraph(doc, "Форма Р-1", true, ParagraphAlignment.RIGHT, 0);

            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            title.setSpacingBefore(300);
            XWPFRun rTitle = title.createRun();
            rTitle.setText("АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ)");
            rTitle.setBold(true);
            rTitle.setFontSize(14);

            addParagraph(doc, "№ {{DOC_NUMBER}} от \"{{DATE_TODAY_SHORT}}\"", true, ParagraphAlignment.CENTER, 0);
            addParagraph(doc, " ");

            addParagraph(doc, "Исполнитель: ТОО \"Zhan Finance\", БИН: 220340012345", true, ParagraphAlignment.LEFT, 0);
            addParagraph(doc, "Адрес: РК, г. Шымкент, Улица Байтерекова, 79а");
            addParagraph(doc, " ");
            
            addParagraph(doc, "Заказчик: {{CLIENT_COMPANY}}, ИИН/БИН: {{CLIENT_IIN}}", true, ParagraphAlignment.LEFT, 0);
            addParagraph(doc, "ФИО представителя: {{CLIENT_NAME}}");
            addParagraph(doc, " ");
            
            addParagraph(doc, "Договор оказания услуг: № {{DOC_NUMBER}} от {{DATE_TODAY_SHORT}}", false, ParagraphAlignment.LEFT, 0);
            addParagraph(doc, " ");

            // Official Table of services
            XWPFTable table = doc.createTable(2, 8);
            table.setWidth("100%");
            
            XWPFTableRow headerRow = table.getRow(0);
            headerRow.getCell(0).setText("№ п/п");
            headerRow.getCell(1).setText("Наименование работ (услуг) (в разрезе их подгрупп в соответствии с Национальным классификатором)");
            headerRow.getCell(2).setText("Дата выполнения работ (оказания услуг)");
            headerRow.getCell(3).setText("Сведения об отчете (дата, номер, количество страниц) (при наличии)");
            headerRow.getCell(4).setText("Единица измерения");
            headerRow.getCell(5).setText("Количество");
            headerRow.getCell(6).setText("Цена за единицу");
            headerRow.getCell(7).setText("Стоимость");

            XWPFTableRow dataRow = table.getRow(1);
            dataRow.getCell(0).setText("1");
            dataRow.getCell(1).setText("{{TASK_SERVICE}} — {{TASK_TITLE}}");
            dataRow.getCell(2).setText("{{DATE_TODAY_SHORT}}");
            dataRow.getCell(3).setText("-");
            dataRow.getCell(4).setText("услуга");
            dataRow.getCell(5).setText("1");
            dataRow.getCell(6).setText("{{TASK_AMOUNT}}");
            dataRow.getCell(7).setText("{{TASK_AMOUNT}}");

            addParagraph(doc, "Итого оказано услуг на сумму: {{TASK_AMOUNT}} тенге.", true, ParagraphAlignment.LEFT, 200);
            addParagraph(doc, " ");
            
            addParagraph(doc, "Сведения об использовании запасов, полученных от заказчика: отсутствуют.");
            addParagraph(doc, "Работы (услуги) выполнены полностью и в срок. Заказчик претензий по объему, качеству и срокам оказания услуг не имеет.");
            addParagraph(doc, " ");

            // Signatures table
            XWPFTable sigTable = doc.createTable(1, 2);
            sigTable.setWidth("100%");
            sigTable.getCTTbl().getTblPr().unsetTblBorders();
            
            XWPFParagraph sigP1 = sigTable.getRow(0).getCell(0).addParagraph();
            XWPFRun rSig1 = sigP1.createRun();
            rSig1.setText("Сдал (Исполнитель):");
            rSig1.addBreak();
            rSig1.setText("ТОО \"Zhan Finance\"");
            rSig1.addBreak();
            rSig1.addBreak();
            rSig1.setText("__________________ / Директор");
            rSig1.addBreak();
            rSig1.setText("М.П.");

            XWPFParagraph sigP2 = sigTable.getRow(0).getCell(1).addParagraph();
            XWPFRun rSig2 = sigP2.createRun();
            rSig2.setText("Принял (Заказчик):");
            rSig2.addBreak();
            rSig2.setText("{{CLIENT_COMPANY}}");
            rSig2.addBreak();
            rSig2.addBreak();
            rSig2.setText("__________________ / {{CLIENT_NAME}}");
            rSig2.addBreak();
            rSig2.setText("М.П.");

            doc.write(out);
            return out.toByteArray();
        }
    }

    private byte[] generateServicesReportDocx() throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            addParagraph(doc, "УТВЕРЖДАЮ", true, ParagraphAlignment.RIGHT, 0);
            addParagraph(doc, "Заказчик: {{CLIENT_COMPANY}}", false, ParagraphAlignment.RIGHT, 0);
            addParagraph(doc, "__________________ / {{CLIENT_NAME}}", false, ParagraphAlignment.RIGHT, 0);
            addParagraph(doc, "\"____\" ______________ 20___ г.", false, ParagraphAlignment.RIGHT, 0);

            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            title.setSpacingBefore(400);
            XWPFRun rTitle = title.createRun();
            rTitle.setText("ОТЧЕТ БУХГАЛТЕРСКОЙ КОМПАНИИ О ПРОДЕЛАННОЙ РАБОТЕ");
            rTitle.setBold(true);
            rTitle.setFontSize(14);

            addParagraph(doc, "Приложение к Договору № {{DOC_NUMBER}} от {{DATE_TODAY_SHORT}}", false, ParagraphAlignment.CENTER, 0);
            addParagraph(doc, " ");

            addParagraph(doc, "Исполнитель: ТОО \"Zhan Finance\"", false, ParagraphAlignment.LEFT, 200);
            addParagraph(doc, "Заказчик: {{CLIENT_COMPANY}} (ИИН/БИН: {{CLIENT_IIN}})");
            addParagraph(doc, " ");
            addParagraph(doc, "Настоящий отчет составлен о том, что Исполнителем были оказаны следующие бухгалтерские и консультационные услуги за период обслуживания:");
            addParagraph(doc, " ");
            
            // Detailed report table
            XWPFTable table = doc.createTable(2, 4);
            table.setWidth("100%");
            
            XWPFTableRow headerRow = table.getRow(0);
            headerRow.getCell(0).setText("№");
            headerRow.getCell(1).setText("Вид оказанных услуг (Описание)");
            headerRow.getCell(2).setText("Объем / Кол-во");
            headerRow.getCell(3).setText("Стоимость (тенге)");

            XWPFTableRow dataRow = table.getRow(1);
            dataRow.getCell(0).setText("1");
            dataRow.getCell(1).setText("Направление: {{TASK_SERVICE}}\nДетальное описание: {{TASK_DESCRIPTION}}");
            dataRow.getCell(2).setText("1 ед.");
            dataRow.getCell(3).setText("{{TASK_AMOUNT}}");

            addParagraph(doc, " ");
            addParagraph(doc, "Итоговая стоимость обслуживания составила: {{TASK_AMOUNT}} тенге.", true, ParagraphAlignment.LEFT, 0);
            addParagraph(doc, " ");
            addParagraph(doc, "Услуги оказаны в полном объеме, своевременно и с надлежащим качеством. Стороны претензий друг к другу не имеют.");
            addParagraph(doc, " ");

            XWPFTable sigTable = doc.createTable(1, 2);
            sigTable.setWidth("100%");
            sigTable.getCTTbl().getTblPr().unsetTblBorders();
            
            XWPFParagraph sigP1 = sigTable.getRow(0).getCell(0).addParagraph();
            XWPFRun rSig1 = sigP1.createRun();
            rSig1.setText("От Исполнителя:");
            rSig1.addBreak();
            rSig1.setText("ТОО \"Zhan Finance\"");
            rSig1.addBreak();
            rSig1.addBreak();
            rSig1.setText("_______________ / Директор");

            XWPFParagraph sigP2 = sigTable.getRow(0).getCell(1).addParagraph();
            XWPFRun rSig2 = sigP2.createRun();
            rSig2.setText("От Заказчика:");
            rSig2.addBreak();
            rSig2.setText("{{CLIENT_COMPANY}}");
            rSig2.addBreak();
            rSig2.addBreak();
            rSig2.setText("_______________ / {{CLIENT_NAME}}");

            doc.write(out);
            return out.toByteArray();
        }
    }

    private byte[] generateApprovalSheetDocx() throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            title.setSpacingBefore(400);
            XWPFRun rTitle = title.createRun();
            rTitle.setText("ЛИСТ СОГЛАСОВАНИЯ И ПОДТВЕРЖДЕНИЯ УСЛУГ");
            rTitle.setBold(true);
            rTitle.setFontSize(14);

            addParagraph(doc, "Настоящим Клиент {{CLIENT_NAME}} (Организация: {{CLIENT_COMPANY}}, ИИН/БИН: {{CLIENT_IIN}}) подтверждает получение и согласование всех документов, отчетов и результатов работ по задаче:", false, ParagraphAlignment.LEFT, 200);
            addParagraph(doc, " ");
            
            addParagraph(doc, "Наименование задачи: \"{{TASK_TITLE}}\"", true, ParagraphAlignment.LEFT, 0);
            addParagraph(doc, "Направление: {{TASK_SERVICE}}");
            addParagraph(doc, " ");
            
            addParagraph(doc, "Дата согласования: {{DATE_TODAY_SHORT}}");
            addParagraph(doc, "Контактные данные клиента: {{CLIENT_PHONE}}, {{CLIENT_EMAIL}}");
            addParagraph(doc, " ");
            addParagraph(doc, "Статус подписи: Электронно подтверждено в CRM Zhan Finance.");
            addParagraph(doc, " ");
            
            addParagraph(doc, "Подпись Клиента: __________________");

            doc.write(out);
            return out.toByteArray();
        }
    }
}
