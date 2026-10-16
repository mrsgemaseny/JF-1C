package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    Page<Invoice> findAllByUser(User user, Pageable pageable);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    List<Invoice> findAllByUser(User user);

    Optional<Invoice> findByIdAndUser(Long id, User user);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    Page<Invoice> findAllByUserAssignedEmployee(User employee, Pageable pageable);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    List<Invoice> findAllByUserAssignedEmployee(User employee);

    @Query(
        value = "select invoice from Invoice invoice join fetch invoice.user client left join fetch client.assignedEmployee",
        countQuery = "select count(invoice) from Invoice invoice"
    )
    Page<Invoice> findAllWithClient(Pageable pageable);

    @Query("select invoice from Invoice invoice join fetch invoice.user client left join fetch client.assignedEmployee")
    List<Invoice> findAllWithClient();

    @Query("select invoice from Invoice invoice join fetch invoice.user client left join fetch client.assignedEmployee where invoice.id = :id")
    Optional<Invoice> findByIdWithClient(@Param("id") Long id);

    interface InvoiceStatusSummary {
        Invoice.InvoiceStatus getStatus();
        Long getCount();
        java.math.BigDecimal getTotalAmount();
    }

    List<Invoice> findByStatusAndDueDateBefore(Invoice.InvoiceStatus status, LocalDate date);

    @Modifying
    @Query("UPDATE Invoice i SET i.status = :targetStatus WHERE i.status = :sourceStatus AND i.dueDate < :date")
    int bulkUpdateInvoiceStatus(
            @Param("sourceStatus") Invoice.InvoiceStatus sourceStatus,
            @Param("targetStatus") Invoice.InvoiceStatus targetStatus,
            @Param("date") LocalDate date
    );

    @Query("SELECT i.status as status, COUNT(i.id) as count, SUM(i.amount) as totalAmount FROM Invoice i GROUP BY i.status")
    List<InvoiceStatusSummary> getFinanceSummaryByStatus();
}
