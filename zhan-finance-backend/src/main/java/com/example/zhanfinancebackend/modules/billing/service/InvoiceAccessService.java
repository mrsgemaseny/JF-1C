package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import org.springframework.stereotype.Service;

@Service
public class InvoiceAccessService {

    public boolean canRead(User actor, Invoice invoice) {
        if (actor.getRole() == Role.ADMIN) {
            return true;
        }
        if (actor.getRole() == Role.CLIENT) {
            return sameUser(actor, invoice.getUser());
        }
        return actor.getRole() == Role.EMPLOYEE && assignedToEmployee(actor, invoice.getUser());
    }

    public boolean canWrite(User actor, Invoice invoice) {
        return actor.getRole() == Role.ADMIN
                || actor.getRole() == Role.EMPLOYEE && assignedToEmployee(actor, invoice.getUser());
    }

    public void assertCanRead(User actor, Invoice invoice) {
        if (!canRead(actor, invoice)) {
            throw new org.springframework.security.access.AccessDeniedException("Invoice access denied");
        }
    }

    public void assertCanWrite(User actor, Invoice invoice) {
        if (!canWrite(actor, invoice)) {
            throw new org.springframework.security.access.AccessDeniedException("Invoice mutation denied");
        }
    }

    public boolean canCreateFor(User actor, User client) {
        return actor.getRole() == Role.ADMIN
                || actor.getRole() == Role.EMPLOYEE && assignedToEmployee(actor, client);
    }

    public void assertCanCreateFor(User actor, User client) {
        if (!canCreateFor(actor, client)) {
            throw new org.springframework.security.access.AccessDeniedException("Invoice creation denied");
        }
    }

    private boolean sameUser(User left, User right) {
        return left.getId() != null && left.getId().equals(right.getId());
    }

    private boolean assignedToEmployee(User employee, User client) {
        return client.getAssignedEmployee() != null && sameUser(employee, client.getAssignedEmployee());
    }
}

