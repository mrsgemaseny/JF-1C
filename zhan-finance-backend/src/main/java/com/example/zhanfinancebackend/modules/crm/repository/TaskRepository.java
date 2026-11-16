package com.example.zhanfinancebackend.modules.crm.repository;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.zhanfinancebackend.modules.crm.dto.ClientStatsDto;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    @Query("SELECT SUM(t.amount) FROM Task t WHERE t.stage.type = 'WON' AND t.archived = false")
    java.math.BigDecimal sumWonAmount();

    @Query("SELECT SUM(t.amount) FROM Task t WHERE t.stage.type != 'LOST' AND t.archived = false")
    java.math.BigDecimal sumExpectedAmount();

    @Query("select distinct t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s left join fetch t.services where t.archived = false")
    List<Task> findAllWithDetails();

    @Query("select distinct t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s left join fetch t.services where (t.client.id = :clientId or t.createdBy.id = :clientId) and t.archived = false")
    List<Task> findAllByClientWithDetails(@Param("clientId") Long clientId);

    @Query("select distinct t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s left join fetch t.services where t.assignedTo = :employee and t.archived = false")
    List<Task> findAllByEmployeeWithDetails(@Param("employee") User employee);

    @Query("select distinct t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s left join fetch t.services where t.id = :id")
    Optional<Task> findByIdWithDetails(@Param("id") Long id);

    @Query("select t from Task t left join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s " +
           "where (c.id = :userId or t.assignedTo.id = :userId or t.createdBy.id = :userId) " +
           "and t.dueDate >= :startDate and t.dueDate <= :endDate and t.archived = false")
    List<Task> findTasksForCalendar(
            @Param("userId") Long userId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate
    );

    @Query("select t from Task t join fetch t.client c left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s " +
           "where t.dueDate = :dueDate and s.type not in :excludedTypes and t.deadlineNotifiedAt is null and t.archived = false")
    List<Task> findByDueDateAndStageTypeNotInAndNotNotified(
            @Param("dueDate") java.time.LocalDate dueDate, 
            @Param("excludedTypes") List<StageType> excludedTypes
    );

    @Query("select distinct t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s left join fetch t.subtasks " +
           "where (lower(t.title) like lower(concat('%', :query, '%')) or lower(t.description) like lower(concat('%', :query, '%'))) and t.archived = false")
    List<Task> searchTasks(@Param("query") String query);

    @Query("select distinct t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s left join fetch s.pipeline left join fetch t.services " +
           "where t.id in :ids")
    List<Task> findAllByIdInWithDetails(@Param("ids") List<Long> ids);

    @Query("SELECT new com.example.zhanfinancebackend.modules.crm.dto.ClientStatsDto(t.client.id, COUNT(t.id)) FROM Task t WHERE t.archived = false GROUP BY t.client.id")
    List<ClientStatsDto> getClientStats();

    @Query("SELECT s.name as statusName, COUNT(t.id) as count FROM Task t LEFT JOIN t.stage s WHERE t.archived = false GROUP BY s.name")
    List<java.util.Map<String, Object>> countTasksByStatus();

    @Query("SELECT COUNT(t.id) FROM Task t WHERE t.stage.type = :type AND t.archived = false")
    long countTasksByStageType(@Param("type") StageType type);

    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/86400.0) FROM tasks t INNER JOIN stages s ON t.stage_id = s.id WHERE s.type = 'WON' AND t.closed_at IS NOT NULL AND t.created_at IS NOT NULL", nativeQuery = true)
    Double getAverageCompletionDays();

    @Query(value = "SELECT COALESCE(t.assigned_to_id, c.assigned_employee_id) as empId, AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/86400.0) as avgDays FROM tasks t LEFT JOIN app_users c ON t.client_id = c.id INNER JOIN stages s ON t.stage_id = s.id WHERE s.type = 'WON' AND t.closed_at IS NOT NULL AND t.created_at IS NOT NULL GROUP BY COALESCE(t.assigned_to_id, c.assigned_employee_id)", nativeQuery = true)
    List<java.util.Map<String, Object>> getAverageCompletionDaysPerEmployee();

    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/86400.0) FROM tasks t LEFT JOIN app_users c ON t.client_id = c.id INNER JOIN stages s ON t.stage_id = s.id WHERE s.type = 'WON' AND t.closed_at IS NOT NULL AND t.created_at IS NOT NULL AND COALESCE(t.assigned_to_id, c.assigned_employee_id) = :employeeId", nativeQuery = true)
    Double getAverageCompletionDaysForEmployee(@Param("employeeId") Long employeeId);

    @Query("SELECT COALESCE(t.lostReason, 'Не указана') as reason, COUNT(t.id) as count FROM Task t WHERE t.stage.type = 'LOST' AND t.archived = false GROUP BY COALESCE(t.lostReason, 'Не указана')")
    List<java.util.Map<String, Object>> countTasksByLostReason();

    @Query(value = "SELECT COALESCE(t.assigned_to_id, c.assigned_employee_id) as empId, s.type as stageType, COUNT(t.id) as taskCount, SUM(CASE WHEN t.due_date < CURRENT_DATE AND (s.type IS NULL OR s.type NOT IN ('WON', 'LOST')) THEN 1 ELSE 0 END) as overdueCount FROM tasks t LEFT JOIN app_users c ON t.client_id = c.id LEFT JOIN stages s ON t.stage_id = s.id WHERE COALESCE(t.assigned_to_id, c.assigned_employee_id) IS NOT NULL AND t.archived = false GROUP BY COALESCE(t.assigned_to_id, c.assigned_employee_id), s.type", nativeQuery = true)
    List<java.util.Map<String, Object>> getEmployeeTaskStats();

    @Query("SELECT s.name as statusName, COUNT(t.id) as count FROM Task t LEFT JOIN t.stage s WHERE t.client.id = :clientId AND t.archived = false GROUP BY s.name")
    List<java.util.Map<String, Object>> countTasksByStatusForClient(@Param("clientId") Long clientId);

    @Query("SELECT COUNT(t.id) FROM Task t LEFT JOIN t.client c WHERE (t.assignedTo = :employee OR (t.assignedTo IS NULL AND c.assignedEmployee = :employee)) AND t.archived = false")
    long countTasksForEmployee(@Param("employee") User employee);

    @Query("SELECT s.name as statusName, COUNT(t.id) as count FROM Task t LEFT JOIN t.stage s LEFT JOIN t.client c WHERE (t.assignedTo = :employee OR (t.assignedTo IS NULL AND c.assignedEmployee = :employee)) AND t.archived = false GROUP BY s.name")
    List<java.util.Map<String, Object>> countTasksByStatusForEmployee(@Param("employee") User employee);

    @Query("select t from Task t join fetch t.client c left join fetch c.assignedEmployee left join fetch t.assignedTo left join fetch t.createdBy left join fetch t.stage s " +
           "where s.type = :stageType order by t.id desc")
    List<Task> findArchivedByStageType(@Param("stageType") StageType stageType);

    @Query("select t from Task t where t.client.id = :clientId and t.archived = false")
    List<Task> findByClientIdAndArchivedFalse(@Param("clientId") Long clientId);

    /**
     * Атомарно назначает исполнителя только если задача ещё не назначена.
     * Возвращает количество обновлённых строк (0 = уже занято, 1 = успех).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        UPDATE tasks
        SET assigned_to_id = :assigneeId,
            updated_at     = NOW(),
            version        = version + 1
        WHERE id = :taskId
          AND assigned_to_id IS NULL
        """, nativeQuery = true)
    int claimTask(@Param("taskId") Long taskId, @Param("assigneeId") Long assigneeId);
}