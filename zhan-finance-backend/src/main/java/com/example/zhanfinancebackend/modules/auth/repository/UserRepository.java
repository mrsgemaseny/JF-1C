package com.example.zhanfinancebackend.modules.auth.repository;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeWorkloadDto;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByGoogleSub(String googleSub);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(Role role);

    long countByAssignedEmployee(User employee);

    List<User> findAllByRole(Role role);

    List<User> findAllByRoleInAndRegistrationStatus(List<Role> roles, com.example.zhanfinancebackend.modules.auth.entity.RegistrationStatus status);
    
    List<User> findAllByAssignedEmployee(User employee);

    @Query("SELECT u FROM User u WHERE u.role = 'CLIENT' AND u.deletedAt IS NULL AND NOT EXISTS (SELECT cp FROM com.example.zhanfinancebackend.modules.crm.entity.ClientProfile cp WHERE cp.user = u)")
    List<User> findClientsWithoutProfile();

    @Query("SELECT DISTINCT e FROM User e JOIN User c ON c.assignedEmployee = e WHERE e.role = 'EMPLOYEE' AND e.deletedAt IS NULL")
    List<User> findAssignedEmployees();

    @Query("SELECT e FROM User e WHERE e.role = 'EMPLOYEE' AND e.deletedAt IS NULL AND NOT EXISTS (SELECT c FROM User c WHERE c.assignedEmployee = e)")
    List<User> findUnassignedEmployees();

    @Query("SELECT new com.example.zhanfinancebackend.modules.crm.dto.EmployeeWorkloadDto(u.id, u.fullName, u.email, CAST(COUNT(t.id) AS int)) " +
           "FROM User u " +
           "LEFT JOIN Task t ON t.assignedTo = u AND (t.stage IS NULL OR t.stage.type != 'WON') " +
           "WHERE u.role = 'EMPLOYEE' AND u.deletedAt IS NULL " +
           "GROUP BY u.id, u.fullName, u.email")
    List<EmployeeWorkloadDto> getEmployeeWorkloads();

    @Query(value = """
        SELECT u.* FROM app_users u
        LEFT JOIN tasks t ON t.assigned_to_id = u.id AND t.status IN ('NEW', 'IN_PROGRESS')
        WHERE u.role = 'EMPLOYEE' AND u.enabled = true AND u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY COUNT(t.id) ASC
        LIMIT 1
    """, nativeQuery = true)
    Optional<User> findLeastLoadedEmployee();
    
    List<User> findAllByRoleIn(List<Role> roles);

    @org.springframework.data.jpa.repository.Query("select u from User u where lower(u.fullName) like lower(concat('%', :query, '%')) or lower(u.email) like lower(concat('%', :query, '%'))")
    List<User> searchUsers(@org.springframework.data.repository.query.Param("query") String query);
}