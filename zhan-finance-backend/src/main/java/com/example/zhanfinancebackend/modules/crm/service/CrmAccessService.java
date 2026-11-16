package com.example.zhanfinancebackend.modules.crm.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import org.springframework.stereotype.Service;

import com.example.zhanfinancebackend.modules.crm.entity.Stage;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import com.example.zhanfinancebackend.modules.crm.statemachine.TaskStateMachine;

@Service
public class CrmAccessService {

    private final TaskStateMachine taskStateMachine;

    public CrmAccessService() {
        this.taskStateMachine = new TaskStateMachine();
    }

    @org.springframework.beans.factory.annotation.Autowired
    public CrmAccessService(TaskStateMachine taskStateMachine) {
        this.taskStateMachine = taskStateMachine != null ? taskStateMachine : new TaskStateMachine();
    }

    public TaskStateMachine getTaskStateMachine() {
        return taskStateMachine;
    }

    public boolean canReadClient(User actor, User client) {
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.ADVISOR) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return assignedToEmployee(actor, client);
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, client);
        }
        return false;
    }

    public void assertCanReadClient(User actor, User client) {
        if (!canReadClient(actor, client)) {
            throw new org.springframework.security.access.AccessDeniedException("Client profile access denied");
        }
    }

    public boolean canReadTask(User actor, Task task) {
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.ADVISOR) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return task.getAssignedTo() == null || assignedToEmployee(actor, task.getClient()) || sameUser(actor, task.getAssignedTo());
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, task.getClient());
        }
        return false;
    }

    public void assertCanReadTask(User actor, Task task) {
        if (!canReadTask(actor, task)) {
            throw new org.springframework.security.access.AccessDeniedException("Task access denied");
        }
    }

    public boolean canCreateTaskFor(User actor, User client) {
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.ADVISOR) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return assignedToEmployee(actor, client);
        }
        return false;
    }

    public void assertCanCreateTaskFor(User actor, User client) {
        if (!canCreateTaskFor(actor, client)) {
            throw new org.springframework.security.access.AccessDeniedException("Task creation denied for this client");
        }
    }

    public boolean canUpdateTaskStage(User actor, Task task, Stage newStage) {
        return taskStateMachine.canTransition(actor, task, newStage);
    }

    public void assertCanUpdateTaskStage(User actor, Task task, Stage newStage) {
        taskStateMachine.assertCanTransition(actor, task, newStage);
    }

    public boolean canUpdateTaskDetails(User actor, Task task) {
        if (actor.getRole() == Role.ADMIN) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return assignedToEmployee(actor, task.getClient()) || sameUser(actor, task.getAssignedTo());
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, task.getClient());
        }
        return false;
    }

    public void assertCanUpdateTaskDetails(User actor, Task task) {
        if (!canUpdateTaskDetails(actor, task)) {
            throw new org.springframework.security.access.AccessDeniedException("Task details update denied");
        }
    }

    public boolean canAssignClient(User actor) {
        return actor.getRole() == Role.ADMIN;
    }

    public void assertCanAssignClient(User actor) {
        if (!canAssignClient(actor)) {
            throw new org.springframework.security.access.AccessDeniedException("Assigning client denied");
        }
    }

    public boolean canAssignTask(User actor, Task task) {
        if (task.getStage() != null && (task.getStage().getType() == StageType.WON || task.getStage().getType() == StageType.LOST)) {
            return false;
        }
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.ADVISOR) return true;
        if (actor.getRole() != Role.EMPLOYEE) return false;
        return task.getAssignedTo() == null
                || assignedToEmployee(actor, task.getClient())
                || sameUser(actor, task.getAssignedTo());
    }

    public void assertCanAssignTask(User actor, Task task) {
        if (!canAssignTask(actor, task)) {
            throw new org.springframework.security.access.AccessDeniedException("Assigning task denied");
        }
    }

    public boolean canUnassignTask(User actor, Task task) {
        if (task.getStage() != null && (task.getStage().getType() == StageType.WON || task.getStage().getType() == StageType.LOST)) {
            return false;
        }
        return actor.getRole() == Role.ADMIN;
    }

    public void assertCanUnassignTask(User actor, Task task) {
        if (!canUnassignTask(actor, task)) {
            throw new org.springframework.security.access.AccessDeniedException("Unassigning task denied. Only ADMIN can clear task assignee or task is closed.");
        }
    }

    private boolean sameUser(User left, User right) {
        if (left == null || right == null) return false;
        return left.getId() != null && left.getId().equals(right.getId());
    }

    private boolean assignedToEmployee(User employee, User client) {
        if (employee == null || client == null) return false;
        return client.getAssignedEmployee() != null && sameUser(employee, client.getAssignedEmployee());
    }
}

