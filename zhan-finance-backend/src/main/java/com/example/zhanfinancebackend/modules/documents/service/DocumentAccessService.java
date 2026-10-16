package com.example.zhanfinancebackend.modules.documents.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import org.springframework.stereotype.Service;

@Service
public class DocumentAccessService {

    public boolean canRead(User actor, Document document) {
        if (actor == null || document == null) return false;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.ADVISOR) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return sameUser(actor, document.getUser())
                    || assignedToEmployee(actor, document.getUser())
                    || (document.getTask() != null && document.getTask().getAssignedTo() != null && sameUser(actor, document.getTask().getAssignedTo()));
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, document.getUser());
        }
        return false;
    }

    public boolean canWrite(User actor, Document document) {
        if (actor == null || document == null) return false;
        if (actor.getRole() == Role.ADMIN) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return sameUser(actor, document.getUser())
                    || assignedToEmployee(actor, document.getUser())
                    || (document.getTask() != null && document.getTask().getAssignedTo() != null && sameUser(actor, document.getTask().getAssignedTo()));
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, document.getUser());
        }
        return false;
    }

    public void assertCanRead(User actor, Document document) {
        if (!canRead(actor, document)) {
            throw new org.springframework.security.access.AccessDeniedException("Document access denied");
        }
    }

    public void assertCanWrite(User actor, Document document) {
        if (!canWrite(actor, document)) {
            throw new org.springframework.security.access.AccessDeniedException("Document mutation denied");
        }
    }

    public boolean canCreateFor(User actor, User targetUser) {
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN) {
            return true;
        }
        if (actor.getRole() == Role.EMPLOYEE) {
            return sameUser(actor, targetUser) || assignedToEmployee(actor, targetUser);
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, targetUser);
        }
        return false;
    }

    public void assertCanCreateFor(User actor, User targetUser) {
        if (!canCreateFor(actor, targetUser)) {
            throw new org.springframework.security.access.AccessDeniedException("Document creation denied for this user");
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


