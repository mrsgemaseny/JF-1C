package com.example.zhanfinancebackend.modules.crm.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.dto.UserDto;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.dto.ClientInfoDto;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeInfoDto;
import com.example.zhanfinancebackend.modules.crm.dto.TaskCreateRequest;
import com.example.zhanfinancebackend.modules.crm.dto.TaskDto;
import com.example.zhanfinancebackend.modules.crm.dto.TaskRequestCreateRequest;
import com.example.zhanfinancebackend.modules.crm.dto.TaskBatchUpdateRequest;
import com.example.zhanfinancebackend.modules.crm.dto.SubtaskDto;
import com.example.zhanfinancebackend.modules.crm.dto.SubtaskCreateRequest;
import com.example.zhanfinancebackend.modules.crm.dto.TaskCommentDto;
import com.example.zhanfinancebackend.modules.crm.dto.TaskActivityDto;
import com.example.zhanfinancebackend.modules.crm.dto.StageDto;
import com.example.zhanfinancebackend.modules.crm.entity.Subtask;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.entity.TaskComment;
import com.example.zhanfinancebackend.modules.crm.entity.TaskActivity;

import com.example.zhanfinancebackend.modules.crm.entity.Stage;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import com.example.zhanfinancebackend.modules.crm.entity.Pipeline;
import com.example.zhanfinancebackend.modules.crm.entity.UserLabel;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.crm.repository.StageRepository;
import com.example.zhanfinancebackend.modules.crm.repository.PipelineRepository;
import com.example.zhanfinancebackend.modules.audit.service.AuditService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Stream;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.crm.dto.TaskBatchOperationRequest;
import com.example.zhanfinancebackend.modules.crm.dto.TaskUpdateRequest;
import com.example.zhanfinancebackend.modules.crm.mapper.TaskMapper;
import com.example.zhanfinancebackend.modules.crm.repository.TaskSpecification;
import com.example.zhanfinancebackend.modules.crm.repository.UserLabelRepository;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import com.example.zhanfinancebackend.modules.services.entity.ServiceEntity;
import com.example.zhanfinancebackend.modules.services.repository.ServiceRepository;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CrmAccessService accessService;
    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final AuditService auditService;
    private final ServiceRepository serviceRepository;
    private final StageRepository stageRepository;
    private final PipelineRepository pipelineRepository;
    private final TaskMapper taskMapper;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final ClientService clientService;
    private final UserLabelRepository userLabelRepository;

    public TaskService(
            TaskRepository taskRepository,
            UserRepository userRepository,
            CrmAccessService accessService,
            NotificationService notificationService,
            EmailNotificationService emailNotificationService,
            AuditService auditService,
            ServiceRepository serviceRepository,
            StageRepository stageRepository,
            PipelineRepository pipelineRepository,
            TaskMapper taskMapper,
            DocumentRepository documentRepository,
            StorageService storageService,
            ClientService clientService,
            UserLabelRepository userLabelRepository
    ) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.accessService = accessService;
        this.notificationService = notificationService;
        this.emailNotificationService = emailNotificationService;
        this.auditService = auditService;
        this.serviceRepository = serviceRepository;
        this.stageRepository = stageRepository;
        this.pipelineRepository = pipelineRepository;
        this.taskMapper = taskMapper;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.clientService = clientService;
        this.userLabelRepository = userLabelRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskDto> getAllTasks() {
        return taskRepository.findAllWithDetails().stream().map(taskMapper::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDto> getAllTasks(Long clientId, Long assignedToId, Long stageId, Boolean unassigned) {
        org.springframework.data.jpa.domain.Specification<Task> spec = TaskSpecification.filterTasks(clientId, assignedToId, stageId, unassigned);
        List<Task> tasks = taskRepository.findAll(spec);
        if (tasks.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<Long> ids = tasks.stream().map(Task::getId).toList();
        List<Task> detailedTasks = taskRepository.findAllByIdInWithDetails(ids);
        java.util.Map<Long, Task> taskMap = detailedTasks.stream()
                .collect(java.util.stream.Collectors.toMap(Task::getId, java.util.function.Function.identity(), (a, b) -> a));
        return ids.stream()
                .map(taskMap::get)
                .filter(java.util.Objects::nonNull)
                .map(taskMapper::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<TaskDto> getAllTasksPaged(Long clientId, Long assignedToId, Long stageId, Boolean unassigned, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("id").descending());
        org.springframework.data.jpa.domain.Specification<Task> spec = TaskSpecification.filterTasks(clientId, assignedToId, stageId, unassigned);

        org.springframework.data.domain.Page<Task> taskPage = taskRepository.findAll(spec, pageable);
        if (taskPage.isEmpty()) {
            return org.springframework.data.domain.Page.empty(pageable);
        }

        List<Long> taskIds = taskPage.getContent().stream().map(Task::getId).toList();
        List<Task> detailedTasks = taskRepository.findAllByIdInWithDetails(taskIds);

        java.util.Map<Long, Task> taskMap = detailedTasks.stream()
                .collect(java.util.stream.Collectors.toMap(Task::getId, java.util.function.Function.identity(), (a, b) -> a));

        List<TaskDto> dtos = taskIds.stream()
                .map(taskMap::get)
                .filter(java.util.Objects::nonNull)
                .map(taskMapper::mapToDto)
                .toList();

        return new org.springframework.data.domain.PageImpl<>(dtos, pageable, taskPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<TaskDto> getTasksForClient(User client) {
        return taskRepository.findAllByClientWithDetails(client.getId()).stream().map(taskMapper::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDto> getTasksForEmployee(User employee) {
        return taskRepository.findAllByEmployeeWithDetails(employee).stream().map(taskMapper::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDto> getArchivedTasks(StageType stageType) {
        return taskRepository.findArchivedByStageType(stageType).stream().map(taskMapper::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public Task getTaskEntity(Long id) {
        return taskRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    }

    @Transactional(readOnly = true)
    public TaskDto getTask(Long id) {
        return taskMapper.mapToDto(getTaskEntity(id));
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto createTask(TaskCreateRequest request, User creator) {
        User client = userRepository.findById(request.clientId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        accessService.assertCanCreateTaskFor(creator, client);

        Task task = new Task(request.title(), client, creator);
        task.setDescription(request.description());

        task.setDueDate(request.dueDate());

        Pipeline pipeline;
        if (request.pipelineId() != null) {
            pipeline = pipelineRepository.findById(request.pipelineId())
                    .orElseThrow(() -> new ResourceNotFoundException("Pipeline not found"));
        } else {
            pipeline = pipelineRepository.findByIsDefaultTrue()
                    .orElseThrow(() -> new ResourceNotFoundException("Default pipeline not found"));
        }
        Stage defaultStage = stageRepository.findByPipelineIdAndIsDefaultTrue(pipeline.getId()).orElse(null);
        if (defaultStage == null) {
            defaultStage = stageRepository.findByPipelineIdOrderByOrderIndexAsc(pipeline.getId()).stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Default stage not found"));
        }
        task.setStage(defaultStage);

        if (request.assignedToId() != null) {
            User assignee = userRepository.findById(request.assignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
            task.setAssignedTo(assignee);
        } else if (client.getAssignedEmployee() != null) {
            task.setAssignedTo(client.getAssignedEmployee());
        }

        if (request.subtasks() != null) {
            for (SubtaskCreateRequest stReq : request.subtasks()) {
                Subtask subtask = new Subtask(task, stReq.title());
                if (stReq.status() != null) {
                    subtask.setStatus(stReq.status());
                }
                task.addSubtask(subtask);
            }
        }
        
        if (request.serviceIds() != null && !request.serviceIds().isEmpty()) {
            List<ServiceEntity> services = serviceRepository.findAllById(request.serviceIds());
            task.setServices(services);
        }

        Task savedTask = taskRepository.save(task);
        auditService.logAction("CREATE", "Task", savedTask.getId(), "Task created: " + savedTask.getTitle());

        if (creator.getRole() != Role.CLIENT) {
            notificationService.createNotification(
                    client,
                    "Новая задача",
                    "Вам создана новая задача: " + savedTask.getTitle(),
                    "/client"
            );
        }

        notificationService.notifyAdmins(
                "Новая задача",
                "Создана новая задача: " + savedTask.getTitle() + " для клиента " + client.getFullName(),
                "/admin/tasks"
        );

        if (savedTask.getAssignedTo() != null) {
            notificationService.createNotification(
                    savedTask.getAssignedTo(),
                    "Новая задача",
                    "Вам назначена задача: " + savedTask.getTitle(),
                    "/employee/tasks"
            );
            emailNotificationService.sendTaskAssignedEmail(savedTask.getAssignedTo(), savedTask);
        }

        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto requestTask(TaskRequestCreateRequest request, User actor) {
        Long targetClientId = (request.clientId() != null && (actor.getRole() == Role.ADMIN || actor.getRole() == Role.EMPLOYEE || actor.getRole() == Role.ADVISOR))
                ? request.clientId()
                : actor.getId();

        User managedClient = userRepository.findById(targetClientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        Task task = new Task(request.title(), managedClient, actor);
        task.setDescription(request.description());
        task.setDueDate(request.dueDate());

        Pipeline pipeline = pipelineRepository.findByIsDefaultTrue()
                .orElseThrow(() -> new ResourceNotFoundException("Default pipeline not found"));
        Stage defaultStage = stageRepository.findByPipelineIdAndIsDefaultTrue(pipeline.getId()).orElse(null);
        if (defaultStage == null) {
            defaultStage = stageRepository.findByPipelineIdOrderByOrderIndexAsc(pipeline.getId()).stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Default stage not found"));
        }
        task.setStage(defaultStage);

        if (managedClient.getAssignedEmployee() != null) {
            task.setAssignedTo(managedClient.getAssignedEmployee());
        }

        if (request.subtasks() != null) {
            for (SubtaskCreateRequest stReq : request.subtasks()) {
                Subtask subtask = new Subtask(task, stReq.title());
                if (stReq.status() != null) {
                    subtask.setStatus(stReq.status());
                }
                task.addSubtask(subtask);
            }
        }

        if (request.serviceIds() != null && !request.serviceIds().isEmpty()) {
            List<ServiceEntity> services = serviceRepository.findAllById(request.serviceIds());
            task.setServices(services);
        }

        Task savedTask = taskRepository.save(task);
        auditService.logAction("CREATE", "Task", savedTask.getId(), "Client requested task: " + savedTask.getTitle());

        notificationService.notifyAdmins(
                "Новая задача от клиента",
                "Клиент " + managedClient.getFullName() + " создал запрос на услугу: " + savedTask.getTitle(),
                "/admin/tasks"
        );

        User employee = managedClient.getAssignedEmployee();
        if (employee != null) {
            notificationService.createNotification(
                    employee,
                    "Новая задача от клиента",
                    "Клиент " + managedClient.getFullName() + " создал запрос на услугу: " + savedTask.getTitle(),
                    "/employee/tasks"
            );
            emailNotificationService.sendTaskAssignedEmail(employee, savedTask);
        }

        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto updateTaskDetails(Long taskId, TaskUpdateRequest request, User user) {
        Task task = getTaskEntity(taskId);
        accessService.assertCanUpdateTaskDetails(user, task);

        boolean isEdited = false;
        if (request.title() != null && !request.title().trim().isEmpty()) {
            task.setTitle(request.title().trim());
            isEdited = true;
        }
        if (request.description() != null) {
            task.setDescription(request.description().trim());
            isEdited = true;
        }
        if (request.dueDate() != null) {
            if (request.dueDate().trim().isEmpty()) {
                task.setDueDate(null);
            } else {
                task.setDueDate(java.time.LocalDate.parse(request.dueDate().trim().substring(0, 10)));
            }
            isEdited = true;
        }
        if (request.tags() != null) {
            task.setTags(request.tags());
        }
        if (isEdited) {
            task.setEditedAt(java.time.LocalDateTime.now());
        }
        
        if (request.subtasks() != null) {
            // keep existing subtasks to preserve status
            java.util.List<Subtask> existing = task.getSubtasks();
            java.util.Map<Long, Subtask> existingMap = new java.util.HashMap<>();
            for (Subtask st : existing) {
                if (st.getId() != null) {
                    existingMap.put(st.getId(), st);
                }
            }
            
            java.util.List<Subtask> updatedSubtasks = new java.util.ArrayList<>();
            for (SubtaskDto stDto : request.subtasks()) {
                if (stDto.id() != null && stDto.id() > 0 && existingMap.containsKey(stDto.id())) {
                    Subtask st = existingMap.get(stDto.id());
                    st.setTitle(stDto.title());
                    if (stDto.status() != null) {
                        st.setStatus(stDto.status());
                    }
                    updatedSubtasks.add(st);
                } else {
                    Subtask newSt = new Subtask(task, stDto.title());
                    if (stDto.status() != null) {
                        newSt.setStatus(stDto.status());
                    }
                    updatedSubtasks.add(newSt);
                }
            }
            task.setSubtasks(updatedSubtasks);
        }

        Task savedTask = taskRepository.save(task);
        logActivity(task, user, "Обновил данные задачи");
        auditService.logAction("UPDATE", "Task", task.getId(), "Task details updated");

        if (user.getRole() == Role.CLIENT) {
            notificationService.createNotification(
                user,
                "Успешное редактирование",
                "Вы успешно отредактировали вашу задачу!",
                "/client"
            );

            if (savedTask.getAssignedTo() != null) {
                notificationService.createNotification(
                    savedTask.getAssignedTo(),
                    "Клиент отредактировал задачу",
                    "Клиент " + user.getFullName() + " отредактировал задачу: " + savedTask.getTitle(),
                    "/employee/tasks"
                );
                emailNotificationService.sendTaskEditedByClientEmail(savedTask.getAssignedTo(), savedTask, user);
            }

            notificationService.notifyAdmins(
                "Клиент отредактировал задачу",
                "Клиент " + user.getFullName() + " отредактировал задачу: " + savedTask.getTitle(),
                "/admin/tasks"
            );
        }

        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto updateTaskStage(Long taskId, Long stageId, String lostReason, User user) {
        Task task = getTaskEntity(taskId);
        Stage newStage = stageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("Stage not found"));

        accessService.assertCanUpdateTaskStage(user, task, newStage);

        if (task.getStage() == null || !task.getStage().getId().equals(stageId)) {
            Stage oldStageObj = task.getStage();
            String oldStage = oldStageObj != null ? oldStageObj.getName() : "None";
            logStageActivity(task, user, "Изменил стадию с " + oldStage + " на " + newStage.getName(), oldStageObj, newStage);
            auditService.logAction("UPDATE_STAGE", "Task", task.getId(), "Stage changed from " + oldStage + " to " + newStage.getName());

            if (newStage.getType() == StageType.LOST) {
                String reason = (lostReason != null && !lostReason.isBlank()) ? lostReason : "No reason provided";
                auditService.logAction("TASK_REJECTED", "Task", task.getId(), "Task rejected/lost: " + newStage.getName() + ". Reason: " + reason);
            } else if (oldStageObj != null && oldStageObj.isPreFinal() && newStage.getType() == StageType.OPEN) {
                auditService.logAction("TASK_REOPENED", "Task", task.getId(), "Task reopened for rework from " + oldStage + " to " + newStage.getName());
            }

            if (user.getRole() == Role.CLIENT) {
                User employee = task.getAssignedTo() != null ? task.getAssignedTo() : (task.getClient() != null ? task.getClient().getAssignedEmployee() : null);
                if (employee != null) {
                    notificationService.createNotification(
                            employee,
                            "Статус задачи изменен",
                            "Клиент " + user.getFullName() + " перевел задачу '" + task.getTitle() + "' в статус " + newStage.getName(),
                            "/employee/tasks"
                    );
                }
                notificationService.notifyAdmins(
                        "Статус задачи изменен",
                        "Клиент " + user.getFullName() + " перевел задачу '" + task.getTitle() + "' в статус " + newStage.getName(),
                        "/admin/tasks"
                );
                
                if (newStage.getType() == StageType.WON) {
                    java.util.List<Document> docs = documentRepository.findByTaskIdOrderByCreatedAtDesc(task.getId());
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskCompletedEmailWithDocuments(task.getClient(), task, docs, storageService);
                    }
                    if (employee != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(employee, task, oldStage, newStage.getName(), null);
                    }
                } else if (newStage.getType() == StageType.LOST) {
                    if (employee != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(employee, task, oldStage, newStage.getName(), lostReason);
                    }
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getClient(), task, oldStage, newStage.getName(), lostReason);
                    }
                } else {
                    if (employee != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(employee, task, oldStage, newStage.getName(), null);
                    }
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getClient(), task, oldStage, newStage.getName(), null);
                    }
                }
            } else {
                notificationService.createNotification(
                        task.getClient(),
                        "Статус задачи изменен",
                        "Статус вашей задачи '" + task.getTitle() + "' изменен на: " + newStage.getName(),
                        "/client"
                );
                
                User employee = task.getAssignedTo();
                if (employee != null && !employee.getId().equals(user.getId())) {
                    notificationService.createNotification(
                        employee,
                        "Статус задачи изменен",
                        "Статус задачи '" + task.getTitle() + "' изменен на: " + newStage.getName(),
                        "/employee/tasks"
                    );
                }

                if (user.getRole() != Role.ADMIN) {
                    notificationService.notifyAdmins(
                        "Статус задачи изменен",
                        user.getFullName() + " перевел задачу '" + task.getTitle() + "' в статус " + newStage.getName(),
                        "/admin/tasks"
                    );
                }

                if (newStage.getType() == StageType.WON) {
                    java.util.List<Document> docs = documentRepository.findByTaskIdOrderByCreatedAtDesc(task.getId());
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskCompletedEmailWithDocuments(task.getClient(), task, docs, storageService);
                    }
                    if (employee != null && !employee.getId().equals(user.getId())) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(employee, task, oldStage, newStage.getName(), null);
                    }
                } else if (newStage.getType() == StageType.LOST) {
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getClient(), task, oldStage, newStage.getName(), lostReason);
                    }
                    if (employee != null && !employee.getId().equals(user.getId())) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(employee, task, oldStage, newStage.getName(), lostReason);
                    }
                } else {
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getClient(), task, oldStage, newStage.getName(), null);
                    }
                    if (employee != null && !employee.getId().equals(user.getId())) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(employee, task, oldStage, newStage.getName(), null);
                    }
                }
            }
        }
        
        if (newStage.getType() == StageType.LOST) {
            if (lostReason != null && !lostReason.isBlank()) {
                task.setLostReason(lostReason);
                logActivity(task, user, "Причина отказа: " + lostReason);
            }
        }
        
        if (newStage.getType() == StageType.WON || newStage.getType() == StageType.LOST) {
            task.setClosedAt(java.time.LocalDate.now());
        } else {
            task.setClosedAt(null);
        }
        
        task.setStage(newStage);
        return taskMapper.mapToDto(taskRepository.save(task));
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto archiveTask(Long taskId, User user) {
        Task task = getTaskEntity(taskId);
        // Only allow archive if stage is WON or LOST
        if (task.getStage() == null || (task.getStage().getType() != StageType.WON && task.getStage().getType() != StageType.LOST)) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Можно архивировать только завершенные задачи");
        }
        // Check access
        accessService.assertCanUpdateTaskDetails(user, task);
        
        if (task.isArchived()) {
            return taskMapper.mapToDto(task);
        }
        
        task.setArchived(true);
        logActivity(task, user, "Задача архивирована");
        return taskMapper.mapToDto(taskRepository.save(task));
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto assignTask(Long taskId, Long assigneeId, User user) {
        if (assigneeId == null) {
            return unassignTask(taskId, user);
        }
        Task task = getTaskEntity(taskId);
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));

        if (assignee.getRole() != Role.EMPLOYEE && assignee.getRole() != Role.ADVISOR) {
            throw new ApiException(
                    ErrorCode.BAD_REQUEST, "Задачу можно назначить только на сотрудника или эдвайзера."
            );
        }
        Long oldAssigneeId = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;

        if (user.getRole() == Role.EMPLOYEE && !assigneeId.equals(user.getId())) {
            throw new ApiException(
                    ErrorCode.FORBIDDEN, "Сотрудники могут назначать задачи только на себя."
            );
        }

        if (!java.util.Objects.equals(oldAssigneeId, assignee.getId())) {
            String oldAssigneeName = task.getAssignedTo() != null ? task.getAssignedTo().getFullName() : "None";
            logActivity(task, user, "Назначил исполнителя: " + assignee.getFullName());
            auditService.logAction("UPDATE_ASSIGNEE", "Task", task.getId(), "Assignee changed from " + oldAssigneeName + " to " + assignee.getFullName());
        }
        task.setAssignedTo(assignee);
        if (task.getStage() != null && task.getStage().getType() == com.example.zhanfinancebackend.modules.crm.entity.StageType.LOST) {
            Long pipelineId = task.getStage().getPipeline() != null ? task.getStage().getPipeline().getId() : 1L;
            com.example.zhanfinancebackend.modules.crm.entity.Stage firstStage = stageRepository.findByPipelineIdOrderByOrderIndexAsc(pipelineId)
                    .stream().findFirst().orElse(task.getStage());
            task.setStage(firstStage);
            logActivity(task, user, "Возобновил отмененную задачу из пула: стадия " + firstStage.getName());
        }

        Task savedTask = taskRepository.save(task);

        notificationService.createNotification(
                assignee,
                "Новая задача",
                "Вам назначена задача: " + savedTask.getTitle(),
                "/employee/tasks"
        );
        emailNotificationService.sendTaskAssignedEmail(assignee, savedTask);

        notificationService.notifyAdmins(
                "Смена исполнителя",
                "Исполнитель задачи '" + task.getTitle() + "' изменен на: " + assignee.getFullName(),
                "/admin/tasks"
        );

        return taskMapper.mapToDto(savedTask);
    }

    /**
     * Атомарный захват задачи из пула (только для EMPLOYEE, ADVISOR или ADMIN, только незанятые задачи).
     */
    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto claimTaskFromPool(Long taskId, User user) {
        if (user.getRole() != Role.EMPLOYEE && user.getRole() != Role.ADVISOR && user.getRole() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Только сотрудник, эдвайзер или администратор может взять задачу из пула.");
        }

        int updated = taskRepository.claimTask(taskId, user.getId());

        if (updated == 0) {
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));

            if (task.getAssignedTo() != null) {
                throw new ConflictException("Задача уже назначена на " + task.getAssignedTo().getFullName() + ". Обновите список.");
            }
            throw new ConflictException("Не удалось захватить задачу. Попробуйте ещё раз.");
        }

        Task savedTask = getTaskEntity(taskId);

        logActivity(savedTask, user, "Взял задачу из пула");
        auditService.logAction("CLAIM_TASK", "Task", taskId, "Claimed by " + user.getFullName());

        notificationService.notifyAdmins(
                "Задача взята из пула",
                "Сотрудник " + user.getFullName() + " взял задачу: " + savedTask.getTitle(),
                "/admin/tasks"
        );

        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto unassignTask(Long taskId, User user) {
        Task task = getTaskEntity(taskId);
        if (task.getAssignedTo() != null) {
            String oldAssigneeName = task.getAssignedTo().getFullName();
            logActivity(task, user, "Снял исполнителя: " + oldAssigneeName);
            auditService.logAction("UNASSIGN_TASK", "Task", task.getId(), "Assignee cleared from " + oldAssigneeName);
            task.setAssignedTo(null);
        }
        Task savedTask = taskRepository.save(task);
        notificationService.notifyAdmins(
                "Снятие исполнителя",
                "С задачи '" + task.getTitle() + "' снят исполнитель",
                "/admin/tasks"
        );
        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto requestReassignment(Long taskId, User user) {
        Task task = getTaskEntity(taskId);
        if (task.getAssignedTo() == null || !task.getAssignedTo().getId().equals(user.getId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Вы можете отказаться только от своих задач");
        }
        task.setReassignmentRequested(true);
        Task savedTask = taskRepository.save(task);

        logActivity(task, user, "Запросил отказ от задачи");
        auditService.logAction("TASK_REASSIGNMENT_REQUESTED", "Task", task.getId(), "Employee " + user.getFullName() + " requested reassignment");
        notificationService.notifyAdmins(
                "Запрос на отказ от задачи",
                "Сотрудник " + user.getFullName() + " запросил отказ от задачи '" + task.getTitle() + "'",
                "/admin/tasks"
        );
        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto approveReassignment(Long taskId, User admin) {
        Task task = getTaskEntity(taskId);
        if (admin.getRole() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Только администратор может подтвердить отказ");
        }
        User oldAssignee = task.getAssignedTo();
        task.setAssignedTo(null);
        task.setReassignmentRequested(false);
        Task savedTask = taskRepository.save(task);

        logActivity(task, admin, "Подтвердил отказ от задачи. Исполнитель снят.");
        auditService.logAction("TASK_REASSIGNMENT_APPROVED", "Task", task.getId(), "Admin " + admin.getFullName() + " approved reassignment. Task reopened to pool.");
        if (oldAssignee != null) {
            notificationService.createNotification(
                    oldAssignee,
                    "Отказ подтвержден",
                    "Администратор подтвердил ваш отказ от задачи '" + task.getTitle() + "'",
                    "/employee/tasks"
            );
        }
        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public TaskDto rejectReassignment(Long taskId, User admin) {
        Task task = getTaskEntity(taskId);
        if (admin.getRole() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Только администратор может отклонить отказ");
        }
        task.setReassignmentRequested(false);
        Task savedTask = taskRepository.save(task);

        logActivity(task, admin, "Отклонил запрос на отказ от задачи.");
        auditService.logAction("TASK_REASSIGNMENT_REJECTED", "Task", task.getId(), "Admin " + admin.getFullName() + " rejected reassignment request");
        if (task.getAssignedTo() != null) {
            notificationService.createNotification(
                    task.getAssignedTo(),
                    "Отказ отклонен",
                    "Администратор отклонил ваш запрос на отказ от задачи '" + task.getTitle() + "'",
                    "/employee/tasks"
            );
        }
        return taskMapper.mapToDto(savedTask);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public List<TaskDto> batchUpdateTasks(TaskBatchUpdateRequest request, User user) {
        if (request.updates() == null || request.updates().isEmpty()) {
            return List.of();
        }
        
        List<Long> ids = request.updates().stream().map(TaskDto::id).toList();
        List<Task> tasks = taskRepository.findAllByIdInWithDetails(ids);
        java.util.Map<Long, Task> taskMap = tasks.stream().collect(java.util.stream.Collectors.toMap(Task::getId, t -> t));
        
        List<Task> updated = new java.util.ArrayList<>();
        for (TaskDto dto : request.updates()) {
            Task task = taskMap.get(dto.id());
            if (task == null) continue;
            
            accessService.assertCanUpdateTaskDetails(user, task);
            
            if (dto.stage() != null && dto.stage().id() != null) {
                Stage stage = stageRepository.findById(dto.stage().id())
                        .orElseThrow(() -> new ResourceNotFoundException("Stage not found: " + dto.stage().id()));
                
                accessService.assertCanUpdateTaskStage(user, task, stage);
                
                Stage oldStageObj = task.getStage();
                String oldStage = oldStageObj != null ? oldStageObj.getName() : "Неизвестно";

                task.setStage(stage);
                if (stage.getType() == StageType.WON || stage.getType() == StageType.LOST) {
                    task.setClosedAt(java.time.LocalDate.now());
                } else {
                    task.setClosedAt(null);
                }
                
                notificationService.createNotification(
                        task.getClient(),
                        "Статус задачи изменен",
                        "Статус вашей задачи '" + task.getTitle() + "' изменен на: " + stage.getName(),
                        "/client"
                );
                
                if (task.getAssignedTo() != null && !task.getAssignedTo().getId().equals(user.getId())) {
                    notificationService.createNotification(
                        task.getAssignedTo(),
                        "Статус задачи изменен",
                        "Статус задачи '" + task.getTitle() + "' изменен на: " + stage.getName(),
                        "/employee/tasks"
                    );
                }

                if (user.getRole() != Role.ADMIN) {
                    notificationService.notifyAdmins(
                        "Обновление задачи",
                        user.getFullName() + " перевел задачу '" + task.getTitle() + "' в статус " + stage.getName(),
                        "/admin/tasks"
                    );
                }

                // Send email notifications on batch stage update
                if (stage.getType() == StageType.WON) {
                    java.util.List<Document> docs = documentRepository.findByTaskIdOrderByCreatedAtDesc(task.getId());
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskCompletedEmailWithDocuments(task.getClient(), task, docs, storageService);
                    }
                    if (task.getAssignedTo() != null && !task.getAssignedTo().getId().equals(user.getId())) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getAssignedTo(), task, oldStage, stage.getName(), null);
                    }
                } else if (stage.getType() == StageType.LOST) {
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getClient(), task, oldStage, stage.getName(), null);
                    }
                    if (task.getAssignedTo() != null && !task.getAssignedTo().getId().equals(user.getId())) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getAssignedTo(), task, oldStage, stage.getName(), null);
                    }
                } else {
                    if (task.getClient() != null) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getClient(), task, oldStage, stage.getName(), null);
                    }
                    if (task.getAssignedTo() != null && !task.getAssignedTo().getId().equals(user.getId())) {
                        emailNotificationService.sendTaskStatusUpdatedEmail(task.getAssignedTo(), task, oldStage, stage.getName(), null);
                    }
                }
            }
            if (dto.assignedToId() != null) {
                 if (user.getRole() == Role.EMPLOYEE && !dto.assignedToId().equals(user.getId())) {
                     throw new ApiException(
                             ErrorCode.FORBIDDEN, "Сотрудники могут назначать задачи только на себя."
                     );
                 }
                 User assignee = userRepository.findById(dto.assignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
                 task.setAssignedTo(assignee);
            }
            updated.add(task);
        }
        
        taskRepository.saveAll(updated);
        return updated.stream().map(taskMapper::mapToDto).toList();
    }

    @Transactional
    public TaskCommentDto addComment(Long taskId, String text, User author) {
        Task task = getTaskEntity(taskId);
        accessService.assertCanReadTask(author, task);
        
        TaskComment comment = new TaskComment(task, author, text);
        task.addComment(comment);
        logActivity(task, author, "Оставил комментарий: " + (text.length() > 30 ? text.substring(0, 30) + "..." : text));

        if (author.getRole() != Role.CLIENT && task.getClient() != null) {
            notificationService.createNotification(
                task.getClient(),
                "Новый комментарий",
                "Новый комментарий к задаче '" + task.getTitle() + "'",
                "/client/tasks"
            );
        } else if (author.getRole() == Role.CLIENT) {
            if (task.getAssignedTo() != null) {
                notificationService.createNotification(
                    task.getAssignedTo(),
                    "Новый комментарий от клиента",
                    "Клиент " + author.getFullName() + " оставил комментарий к задаче '" + task.getTitle() + "'",
                    "/employee/tasks"
                );
            }
            notificationService.notifyAdmins(
                "Новый комментарий от клиента",
                "Клиент " + author.getFullName() + " оставил комментарий к задаче '" + task.getTitle() + "'",
                "/admin/tasks"
            );
        }

        taskRepository.save(task);
        return taskMapper.mapCommentToDto(comment);
    }

    @Transactional(readOnly = true)
    public List<TaskCommentDto> getTaskComments(Long taskId, User user) {
        Task task = getTaskEntity(taskId);
        accessService.assertCanReadTask(user, task);
        return task.getComments().stream().map(taskMapper::mapCommentToDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskActivityDto> getTaskHistory(Long taskId, User user) {
        Task task = getTaskEntity(taskId);
        accessService.assertCanReadTask(user, task);
        return task.getHistory().stream()
                .sorted(java.util.Comparator.comparing(TaskActivity::getCreatedAt).reversed())
                .map(taskMapper::mapActivityToDto)
                .toList();
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public void deleteTask(Long taskId, User user) {
        Task task = getTaskEntity(taskId);
        
        accessService.assertCanUpdateTaskDetails(user, task);
        
        java.util.List<Document> docs = documentRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
        for (Document doc : docs) {
            try {
                if (doc.getStorageKey() != null && !doc.getStorageKey().isBlank()) {
                    storageService.delete(doc.getStorageKey());
                }
            } catch (Exception e) {
                // Ignore if file is already missing
            }
            documentRepository.delete(doc);
        }
        
        auditService.logAction("DELETE", "Task", task.getId(), "Task deleted: " + task.getTitle());
        String taskTitle = task.getTitle();
        
        if (user.getRole() == Role.CLIENT) {
            if (task.getAssignedTo() != null) {
                notificationService.createNotification(
                    task.getAssignedTo(),
                    "Клиент удалил задачу",
                    "Клиент " + user.getFullName() + " удалил задачу: " + taskTitle,
                    "/employee/tasks"
                );
                emailNotificationService.sendTaskDeletedByClientEmail(task.getAssignedTo(), taskTitle, user);
            }

            notificationService.notifyAdmins(
                "Клиент удалил задачу",
                "Клиент " + user.getFullName() + " удалил задачу: " + taskTitle,
                "/admin/tasks"
            );
        }
        
        taskRepository.delete(task);
    }

    @Transactional
    public TaskDto toggleTaskUserLabel(Long taskId, Long labelId, User user) {
        Task task = getTaskEntity(taskId);
        UserLabel label = userLabelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("Label not found"));

        if (!label.getUser().getId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Label access denied");
        }

        if (task.getUserLabels().contains(label)) {
            task.getUserLabels().remove(label);
            logActivity(task, user, "Снял метку '" + label.getName() + "'");
        } else {
            task.getUserLabels().add(label);
            logActivity(task, user, "Добавил метку '" + label.getName() + "'");
        }

        Task saved = taskRepository.save(task);
        return taskMapper.mapToDto(saved);
    }

    @CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    @Transactional
    public void batchUpdateTasks(TaskBatchOperationRequest request, User user) {
        if (request.taskIds() == null || request.taskIds().isEmpty()) return;
        List<Task> tasks = taskRepository.findAllByIdInWithDetails(request.taskIds());

        Stage newStage = request.stageId() != null ? stageRepository.findById(request.stageId()).orElse(null) : null;
        User assignee = request.assignedToId() != null ? userRepository.findById(request.assignedToId()).orElse(null) : null;
        UserLabel label = request.labelId() != null ? userLabelRepository.findById(request.labelId()).orElse(null) : null;

        for (Task task : tasks) {
            accessService.assertCanUpdateTaskDetails(user, task);
            if (newStage != null) {
                accessService.assertCanUpdateTaskStage(user, task, newStage);
                Stage oldStage = task.getStage();
                task.setStage(newStage);
                logStageActivity(task, user, "Пакетное изменение стадии на " + newStage.getName(), oldStage, newStage);
            }
            if (assignee != null) {
                accessService.assertCanAssignTask(user, task);
                task.setAssignedTo(assignee);
                logActivity(task, user, "Пакетное переназначение на " + assignee.getFullName());
            }
            if (label != null && label.getUser().getId().equals(user.getId())) {
                if (!task.getUserLabels().contains(label)) {
                    task.getUserLabels().add(label);
                    logActivity(task, user, "Пакетное добавление метки '" + label.getName() + "'");
                }
            }
            taskRepository.save(task);
        }
    }

    private void logActivity(Task task, User actor, String actionText) {
        TaskActivity activity = new TaskActivity(task, actor, actionText);
        task.addActivity(activity);
    }

    private void logStageActivity(Task task, User actor, String actionText, Stage fromStage, Stage toStage) {
        TaskActivity activity = new TaskActivity(task, actor, actionText, fromStage, toStage);
        task.addActivity(activity);
    }
}
