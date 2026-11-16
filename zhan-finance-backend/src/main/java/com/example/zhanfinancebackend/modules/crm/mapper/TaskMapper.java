package com.example.zhanfinancebackend.modules.crm.mapper;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.dto.UserDto;
import com.example.zhanfinancebackend.modules.crm.dto.*;
import com.example.zhanfinancebackend.modules.crm.entity.*;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import com.example.zhanfinancebackend.modules.services.dto.ServiceDto;

@Component
public class TaskMapper {

    public TaskDto mapToDto(Task task) {
        if (task == null) return null;

        boolean isSlaBreached = false;
        if (task.getStage() != null && task.getStage().getSlaHours() != null && task.getStage().getSlaHours() > 0 
                && task.getStage().getType() == StageType.OPEN && task.getUpdatedAt() != null) {
            long hoursInStage = Duration.between(task.getUpdatedAt(), Instant.now()).toHours();
            if (hoursInStage >= task.getStage().getSlaHours()) {
                isSlaBreached = true;
            }
        }

        List<UserLabelDto> userLabels = task.getUserLabels() != null 
                ? task.getUserLabels().stream().map(l -> new UserLabelDto(l.getId(), l.getUser().getId(), l.getName(), l.getColor())).toList() 
                : List.of();

        return new TaskDto(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getClient() != null ? task.getClient().getId() : null,
                mapUserToClientInfoDto(task.getClient()),
                task.getAssignedTo() != null ? task.getAssignedTo().getId() : null,
                mapUserToEmployeeInfoDto(task.getAssignedTo()),
                task.getStage() != null ? task.getStage().getId() : null,
                mapStageToDto(task.getStage()),
                task.getAmount(),
                task.getCurrency(),
                task.getSource(),
                task.getClosedAt(),
                task.getLostReason(),
                task.getDueDate(),
                mapUserToDto(task.getCreatedBy()),
                task.getCreatedAt() != null ? task.getCreatedAt().atZone(ZoneOffset.UTC) : null,
                task.getUpdatedAt() != null ? task.getUpdatedAt().atZone(ZoneOffset.UTC) : null,
                task.getStagePosition(),
                task.isReassignmentRequested(),
                task.getSubtasks() != null ? task.getSubtasks().stream().map(this::mapSubtaskToDto).toList() : List.of(),
                task.getTags() != null ? new java.util.ArrayList<>(task.getTags()) : List.of(),
                task.getServices() != null ? task.getServices().stream().map(BaseEntity::getId).toList() : List.of(),
                task.getServices() != null ? task.getServices().stream().map(s -> new ServiceDto(
                        s.getId(),
                        s.getTitle(),
                        s.getTitleEn(),
                        s.getDescription(),
                        s.getDescriptionEn(),
                        s.getPrice(),
                        s.getImageUrl(),
                        s.getIsHighlighted(),
                        s.getFeatures() != null ? new java.util.ArrayList<>(s.getFeatures()) : List.of(),
                        s.getCreatedAt() != null ? s.getCreatedAt().atZone(java.time.ZoneOffset.UTC) : null
                )).toList() : List.of(),
                task.isArchived(),
                task.getEditedAt() != null ? task.getEditedAt().atZone(ZoneOffset.UTC) : null,
                userLabels,
                isSlaBreached
        );
    }

    public StageDto mapStageToDto(Stage stage) {
        if (stage == null) return null;
        return new StageDto(
                stage.getId(),
                stage.getPipeline().getId(),
                stage.getName(),
                stage.getNameEn(),
                stage.getOrderIndex(),
                stage.getColor(),
                stage.getType(),
                stage.isDefault(),
                stage.isPreFinal(),
                stage.getSlaHours()
        );
    }

    public SubtaskDto mapSubtaskToDto(Subtask subtask) {
        return new SubtaskDto(
                subtask.getId(),
                subtask.getTask().getId(),
                subtask.getTitle(),
                subtask.getStatus(),
                subtask.getCreatedAt() != null ? subtask.getCreatedAt().atZone(ZoneOffset.UTC) : null
        );
    }

    public UserDto mapUserToDto(User user) {
        if (user == null) return null;
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getRole(), user.getLocale());
    }

    public ClientInfoDto mapUserToClientInfoDto(User user) {
        if (user == null) return null;
        return new ClientInfoDto(user.getId(), user.getFullName(), user.getEmail(), null);
    }

    public EmployeeInfoDto mapUserToEmployeeInfoDto(User user) {
        if (user == null) return null;
        return new EmployeeInfoDto(user.getId(), user.getFullName(), user.getEmail(), user.getAvatarUrl());
    }

    public TaskCommentDto mapCommentToDto(TaskComment comment) {
        return new TaskCommentDto(
                comment.getId(),
                comment.getTask().getId(),
                mapUserToDto(comment.getAuthor()),
                comment.getText(),
                comment.getCreatedAt() != null ? comment.getCreatedAt().atZone(ZoneOffset.UTC) : null
        );
    }

    public TaskActivityDto mapActivityToDto(TaskActivity activity) {
        return new TaskActivityDto(
                activity.getId(),
                activity.getTask().getId(),
                mapUserToDto(activity.getActor()),
                activity.getActionText(),
                activity.getCreatedAt() != null ? activity.getCreatedAt().atZone(ZoneOffset.UTC) : null
        );
    }
}
