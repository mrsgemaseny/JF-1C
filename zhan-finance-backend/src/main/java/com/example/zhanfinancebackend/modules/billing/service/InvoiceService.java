package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.billing.dto.InvoiceDto;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.audit.service.AuditService;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final InvoiceAccessService invoiceAccessService;
    private final AuditService auditService;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            UserRepository userRepository,
            InvoiceAccessService invoiceAccessService,
            AuditService auditService
    ) {
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.invoiceAccessService = invoiceAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<InvoiceDto> findAllPaged(User user, Pageable pageable) {
        if (user.getRole() == Role.ADMIN) {
            return invoiceRepository.findAllWithClient(pageable).map(this::toDto);
        }
        if (user.getRole() == Role.EMPLOYEE) {
            return invoiceRepository.findAllByUserAssignedEmployee(user, pageable).map(this::toDto);
        }
        return invoiceRepository.findAllByUser(user, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto> findAll(User user) {
        Pageable bounded = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "id"));
        return findAllPaged(user, bounded).getContent();
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceForPdf(User user, Long id) {
        return get(user, id);
    }

    @Transactional(readOnly = true)
    public InvoiceDto getById(User user, Long id) {
        return toDto(get(user, id));
    }

    @Transactional(readOnly = true)
    public com.example.zhanfinancebackend.modules.billing.dto.FinanceSummaryDto getFinanceSummary() {
        List<InvoiceRepository.InvoiceStatusSummary> summaryList = invoiceRepository.getFinanceSummaryByStatus();
        java.util.Map<String, Long> countMap = new java.util.HashMap<>();
        java.util.Map<String, java.math.BigDecimal> amountMap = new java.util.HashMap<>();

        java.math.BigDecimal totalInvoiced = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalPaid = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalIssued = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalOverdue = java.math.BigDecimal.ZERO;

        for (InvoiceRepository.InvoiceStatusSummary row : summaryList) {
            Invoice.InvoiceStatus statusEnum = row.getStatus();
            String status = statusEnum != null ? statusEnum.name() : "UNKNOWN";
            Long count = row.getCount() != null ? row.getCount() : 0L;
            java.math.BigDecimal amount = row.getTotalAmount() != null ? row.getTotalAmount() : java.math.BigDecimal.ZERO;

            countMap.put(status, count);
            amountMap.put(status, amount);

            if (!"CANCELED".equals(status)) {
                totalInvoiced = totalInvoiced.add(amount);
            }
            if ("PAID".equals(status)) {
                totalPaid = amount;
            } else if ("ISSUED".equals(status)) {
                totalIssued = amount;
            } else if ("OVERDUE".equals(status)) {
                totalOverdue = amount;
            }
        }

        return new com.example.zhanfinancebackend.modules.billing.dto.FinanceSummaryDto(
                totalInvoiced,
                totalPaid,
                totalIssued,
                totalOverdue,
                countMap,
                amountMap
        );
    }

    @Transactional
    public InvoiceDto create(User user, InvoiceDto request) {
        User client = resolveClient(user, request.clientId());
        invoiceAccessService.assertCanCreateFor(user, client);
        Invoice invoice = new Invoice(client, request.title(), request.amount(), request.dueDate());
        if (request.status() != null) {
            invoice.setStatus(request.status());
        }
        Invoice saved = invoiceRepository.save(invoice);
        auditService.logAction("CREATE", "Invoice", saved.getId(), "Invoice created for user " + client.getEmail() + " with amount " + saved.getAmount());
        return toDto(saved);
    }

    @Transactional
    public InvoiceDto update(User user, Long id, InvoiceDto request) {
        Invoice invoice = get(user, id);
        invoiceAccessService.assertCanWrite(user, invoice);
        
        if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException("Cannot modify a PAID invoice");
        }
        if (invoice.getStatus() == Invoice.InvoiceStatus.CANCELED) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException("Cannot modify a CANCELED invoice");
        }

        StringBuilder details = new StringBuilder();
        if (!invoice.getTitle().equals(request.title())) {
            details.append("Title changed from '").append(invoice.getTitle()).append("' to '").append(request.title()).append("'; ");
        }
        if (invoice.getAmount().compareTo(request.amount()) != 0) {
            details.append("Amount changed from ").append(invoice.getAmount()).append(" to ").append(request.amount()).append("; ");
        }
        if (!invoice.getDueDate().equals(request.dueDate())) {
            details.append("Due date changed from ").append(invoice.getDueDate()).append(" to ").append(request.dueDate()).append("; ");
        }
        if (request.status() != null && invoice.getStatus() != request.status()) {
            validateStatusTransition(invoice.getStatus(), request.status());
            details.append("Status changed from ").append(invoice.getStatus()).append(" to ").append(request.status()).append("; ");
        }
        
        invoice.setTitle(request.title());
        invoice.setAmount(request.amount());
        invoice.setDueDate(request.dueDate());
        if (request.status() != null) {
            invoice.setStatus(request.status());
        }
        
        if (details.length() > 0) {
            auditService.logAction("UPDATE", "Invoice", invoice.getId(), details.toString());
        }
        
        return toDto(invoice);
    }

    private void validateStatusTransition(Invoice.InvoiceStatus current, Invoice.InvoiceStatus target) {
        if (current == target) {
            return;
        }
        if (current == Invoice.InvoiceStatus.PAID) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException("Cannot change status of a PAID invoice");
        }
        if (current == Invoice.InvoiceStatus.CANCELED) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException("Cannot change status of a CANCELED invoice");
        }
        boolean allowed = switch (current) {
            case DRAFT -> target == Invoice.InvoiceStatus.ISSUED || target == Invoice.InvoiceStatus.CANCELED;
            case ISSUED -> target == Invoice.InvoiceStatus.PAID || target == Invoice.InvoiceStatus.OVERDUE || target == Invoice.InvoiceStatus.CANCELED;
            case OVERDUE -> target == Invoice.InvoiceStatus.PAID || target == Invoice.InvoiceStatus.CANCELED;
            default -> false;
        };
        if (!allowed) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException(
                    "Invalid invoice status transition from " + current + " to " + target
            );
        }
    }

    @Transactional
    public void delete(User user, Long id) {
        Invoice invoice = get(user, id);
        invoiceAccessService.assertCanWrite(user, invoice);
        if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException("Cannot delete a PAID invoice");
        }
        if (invoice.getStatus() == Invoice.InvoiceStatus.CANCELED) {
            throw new com.example.zhanfinancebackend.common.exception.UnprocessableEntityException("Cannot delete a CANCELED invoice");
        }
        auditService.logAction("DELETE", "Invoice", invoice.getId(), "Invoice deleted: " + invoice.getTitle() + " with amount " + invoice.getAmount());
        invoiceRepository.delete(invoice);
    }

    private Invoice get(User user, Long id) {
        Invoice invoice = invoiceRepository.findByIdWithClient(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        invoiceAccessService.assertCanRead(user, invoice);
        return invoice;
    }

    private User resolveClient(User actor, Long clientId) {
        if (clientId == null) {
            return actor;
        }
        return userRepository.findById(clientId)
                .filter(user -> user.getRole() == Role.CLIENT)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
    }

    private InvoiceDto toDto(Invoice invoice) {
        return new InvoiceDto(
                invoice.getId(),
                invoice.getUser().getId(),
                invoice.getTitle(),
                invoice.getAmount(),
                invoice.getStatus(),
                invoice.getDueDate()
        );
    }
}

