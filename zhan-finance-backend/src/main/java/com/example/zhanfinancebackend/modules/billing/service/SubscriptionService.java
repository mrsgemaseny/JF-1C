package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.dto.SubscriptionDto;
import com.example.zhanfinancebackend.modules.billing.entity.Subscription;
import com.example.zhanfinancebackend.modules.billing.repository.SubscriptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;

@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @Transactional(readOnly = true)
    public Page<SubscriptionDto> findAllPaged(User user, Pageable pageable) {
        return subscriptionRepository.findAllByUser(user, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<SubscriptionDto> findAll(User user) {
        Pageable bounded = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "id"));
        return findAllPaged(user, bounded).getContent();
    }

    @Transactional
    public SubscriptionDto create(User user, SubscriptionDto request) {
        if (hasOverlap(user, null, request.startsAt(), request.endsAt())) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Subscription dates overlap with an existing subscription");
        }
        Subscription subscription = new Subscription(
                user,
                request.planName(),
                request.monthlyPrice(),
                request.startsAt(),
                request.endsAt()
        );
        if (request.status() != null) {
            subscription.setStatus(request.status());
        }
        return toDto(subscriptionRepository.save(subscription));
    }

    @Transactional
    public SubscriptionDto update(User user, Long id, SubscriptionDto request) {
        if (hasOverlap(user, id, request.startsAt(), request.endsAt())) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Subscription dates overlap with an existing subscription");
        }
        Subscription subscription = get(user, id);
        subscription.setPlanName(request.planName());
        subscription.setMonthlyPrice(request.monthlyPrice());
        subscription.setStartsAt(request.startsAt());
        subscription.setEndsAt(request.endsAt());
        if (request.status() != null) {
            subscription.setStatus(request.status());
        }
        return toDto(subscription);
    }

    @Transactional
    public void delete(User user, Long id) {
        subscriptionRepository.delete(get(user, id));
    }

    private Subscription get(User user, Long id) {
        return subscriptionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));
    }

    private SubscriptionDto toDto(Subscription subscription) {
        return new SubscriptionDto(
                subscription.getId(),
                subscription.getPlanName(),
                subscription.getMonthlyPrice(),
                subscription.getStatus(),
                subscription.getStartsAt(),
                subscription.getEndsAt()
        );
    }

    private boolean hasOverlap(User user, Long excludeId, java.time.LocalDate startsAt, java.time.LocalDate endsAt) {
        if (startsAt == null) {
            return false;
        }
        return subscriptionRepository.existsOverlappingSubscription(user, excludeId, startsAt, endsAt);
    }
}
