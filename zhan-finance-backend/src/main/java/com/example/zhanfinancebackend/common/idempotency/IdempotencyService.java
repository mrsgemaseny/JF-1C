package com.example.zhanfinancebackend.common.idempotency;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);

    private enum State {
        IN_PROGRESS,
        COMPLETED
    }

    private record Entry(State state, Object result) {}

    private final Cache<String, Entry> cache = Caffeine.newBuilder()
            .expireAfterWrite(24, TimeUnit.HOURS)
            .maximumSize(50000)
            .build();

    private String resolveScopedKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return null;
        }
        String principalName = "anon";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
            principalName = auth.getName();
        }
        return principalName + ":" + rawKey.trim();
    }

    /**
     * Выполняет операцию идемпотентно с изоляцией по аутентифицированному пользователю.
     * При повторном запросе с тем же ключом после успешного завершения возвращает ранее сохранённый результат.
     * При одновременном параллельном запросе блокирует второй поток ошибкой 409 Conflict.
     * При ошибке выполнения операции ключ очищается, разрешая клиенту повторить запрос.
     */
    public <T> T execute(String idempotencyKey, Class<T> resultClass, Supplier<T> action) {
        String scopedKey = resolveScopedKey(idempotencyKey);
        if (scopedKey == null) {
            return action.get();
        }

        Entry existing = cache.asMap().putIfAbsent(scopedKey, new Entry(State.IN_PROGRESS, null));
        if (existing != null) {
            if (existing.state() == State.COMPLETED) {
                Object cached = existing.result();
                if (cached != null && resultClass.isInstance(cached)) {
                    log.info("Idempotent retry for key {}. Returning cached result.", idempotencyKey);
                    return resultClass.cast(cached);
                }
                throw new ConflictException("Дублирующий запрос: операция с Idempotency-Key '" + idempotencyKey + "' уже была успешно выполнена");
            }
            throw new ConflictException("Параллельный дублирующий запрос: операция с Idempotency-Key '" + idempotencyKey + "' уже выполняется");
        }

        try {
            T result = action.get();
            cache.put(scopedKey, new Entry(State.COMPLETED, result));
            return result;
        } catch (RuntimeException e) {
            cache.invalidate(scopedKey);
            throw e;
        }
    }

    /**
     * Атомарная регистрация ключа для ручной валидации в контроллерах.
     */
    public void validateOrRegister(String idempotencyKey, String operation) {
        String scopedKey = resolveScopedKey(idempotencyKey);
        if (scopedKey == null) {
            return;
        }

        Entry existing = cache.asMap().putIfAbsent(scopedKey, new Entry(State.IN_PROGRESS, null));
        if (existing != null) {
            if (existing.state() == State.COMPLETED) {
                throw new ConflictException("Дублирующий запрос: операция с Idempotency-Key '" + idempotencyKey + "' уже обработана");
            }
            throw new ConflictException("Параллельный дублирующий запрос: операция с Idempotency-Key '" + idempotencyKey + "' уже выполняется");
        }
    }

    public void complete(String idempotencyKey, Object result) {
        String scopedKey = resolveScopedKey(idempotencyKey);
        if (scopedKey != null) {
            cache.put(scopedKey, new Entry(State.COMPLETED, result));
        }
    }

    public boolean isPresent(String idempotencyKey) {
        String scopedKey = resolveScopedKey(idempotencyKey);
        if (scopedKey == null) {
            return false;
        }
        return cache.getIfPresent(scopedKey) != null;
    }

    public void evict(String idempotencyKey) {
        String scopedKey = resolveScopedKey(idempotencyKey);
        if (scopedKey != null) {
            cache.invalidate(scopedKey);
        }
    }
}

