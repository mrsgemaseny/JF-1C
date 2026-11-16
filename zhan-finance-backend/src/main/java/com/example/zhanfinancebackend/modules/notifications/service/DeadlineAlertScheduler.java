package com.example.zhanfinancebackend.modules.notifications.service;

import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;

@Component
public class DeadlineAlertScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeadlineAlertScheduler.class);
    private final TaskRepository taskRepository;
    private final EmailNotificationService emailNotificationService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public DeadlineAlertScheduler(TaskRepository taskRepository, EmailNotificationService emailNotificationService, NotificationService notificationService, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.emailNotificationService = emailNotificationService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // Run every day at 8:00 AM
    @Scheduled(cron = "0 0 8 * * *")
    @net.javacrumbs.shedlock.spring.annotation.SchedulerLock(name = "checkDeadlines", lockAtMostFor = "15m", lockAtLeastFor = "1m")
    public void checkDeadlines() {
        log.info("Checking task deadlines for today and tomorrow...");
        
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        
        List<StageType> excludedTypes = List.of(StageType.WON, StageType.LOST);
        
        List<Task> dueToday = taskRepository.findByDueDateAndStageTypeNotInAndNotNotified(today, excludedTypes);
        List<Task> dueTomorrow = taskRepository.findByDueDateAndStageTypeNotInAndNotNotified(tomorrow, excludedTypes);
        
        log.info("Found {} tasks due today, {} tasks due tomorrow.", dueToday.size(), dueTomorrow.size());
        
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<Task> updatedTasks = new java.util.ArrayList<>();
        
        for (Task task : dueToday) {
            if (task.getAssignedTo() != null) {
                emailNotificationService.sendTaskDeadlineAlertEmail(task.getAssignedTo(), task);
                notificationService.createNotification(
                    task.getAssignedTo(),
                    "Горит дедлайн!",
                    "Дедлайн по задаче '" + task.getTitle() + "' наступает сегодня!",
                    "/employee/tasks"
                );
                task.setDeadlineNotifiedAt(now);
                updatedTasks.add(task);
            }
        }
        
        for (Task task : dueTomorrow) {
            if (task.getAssignedTo() != null) {
                emailNotificationService.sendTaskDeadlineAlertEmail(task.getAssignedTo(), task);
                notificationService.createNotification(
                    task.getAssignedTo(),
                    "Приближается дедлайн",
                    "Дедлайн по задаче '" + task.getTitle() + "' наступает завтра.",
                    "/employee/tasks"
                );
                task.setDeadlineNotifiedAt(now);
                updatedTasks.add(task);
            }
        }
        
        if (!updatedTasks.isEmpty()) {
            taskRepository.saveAll(updatedTasks);
        }
    }
}
