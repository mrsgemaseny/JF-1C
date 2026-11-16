package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.entity.Subscription;
import com.example.zhanfinancebackend.modules.billing.repository.SubscriptionRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Settles a provider-verified online payment: records it in the ledger (idempotent), and only
 * when it was newly recorded grants the client's subscription period and notifies. Mirrors the
 * effects of PaymentReceiptService.confirmReceipt so manual and online payments behave the same.
 * Replays of the same provider payment id are no-ops and never extend the subscription twice.
 */
@Service
public class OnlinePaymentSettlementService {
    private static final Logger log = LoggerFactory.getLogger(OnlinePaymentSettlementService.class);
    private static final String DEFAULT_PLAN = "Бухгалтерское обслуживание";

    private final OnlinePaymentLedgerService ledger;
    private final SubscriptionRepository subscriptions;
    private final NotificationService notifications;

    public OnlinePaymentSettlementService(OnlinePaymentLedgerService ledger,
                                          SubscriptionRepository subscriptions,
                                          NotificationService notifications) {
        this.ledger = ledger;
        this.subscriptions = subscriptions;
        this.notifications = notifications;
    }

    /** paymentId is the ledger row; newlyRecorded is false for an idempotent replay. */
    public record Settlement(Long paymentId, boolean newlyRecorded) {}

    @Transactional
    public Settlement settle(PaymentProvider provider, String providerPaymentId, Long invoiceId,
                          BigDecimal amount, String currency) {
        OnlinePaymentLedgerService.Result result =
                ledger.recordConfirmedPayment(provider, providerPaymentId, invoiceId, amount, currency);
        Long paymentId = result.payment().getId();
        if (!result.newlyRecorded()) {
            return new Settlement(paymentId, false);
        }
        Invoice invoice = result.payment().getInvoice();
        User client = invoice.getUser();
        if (client == null) {
            return new Settlement(paymentId, true);
        }
        Subscription subscription = extendSubscription(client, amount);
        notifyClient(client, amount, subscription, provider);
        return new Settlement(paymentId, true);
    }

    private Subscription extendSubscription(User client, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        List<Subscription> existing = subscriptions.findAllByUser(client);
        Subscription subscription = existing.isEmpty() ? null : existing.get(0);
        if (subscription != null) {
            subscription.setStatus(Subscription.SubscriptionStatus.ACTIVE);
            if (subscription.getEndsAt() != null && subscription.getEndsAt().isAfter(today)) {
                subscription.setEndsAt(subscription.getEndsAt().plusDays(30));
            } else {
                subscription.setStartsAt(today);
                subscription.setEndsAt(today.plusDays(30));
            }
            return subscriptions.save(subscription);
        }
        Subscription created = new Subscription(client, DEFAULT_PLAN, amount, today, today.plusDays(30));
        created.setStatus(Subscription.SubscriptionStatus.ACTIVE);
        return subscriptions.save(created);
    }

    private void notifyClient(User client, BigDecimal amount, Subscription subscription, PaymentProvider provider) {
        try {
            String plan = subscription.getPlanName() != null ? subscription.getPlanName() : DEFAULT_PLAN;
            String until = subscription.getEndsAt() != null ? "до " + subscription.getEndsAt() : "на 30 дней";
            notifications.createNotification(client, "Оплата получена",
                    String.format("Онлайн-платёж на сумму %s KZT за тариф «%s» получен. Подписка активна %s.",
                            amount, plan, until),
                    "/client/billing");
            notifications.notifyAdmins("Онлайн-оплата (" + provider + ")",
                    String.format("Клиент %s оплатил счёт на %s KZT.", client.getEmail(), amount),
                    "/admin/billing/receipts");
        } catch (Exception e) {
            // Money is already recorded; a failed notification must not roll back the settlement.
            log.warn("Failed to dispatch online payment notification: {}", e.getMessage());
        }
    }
}
