package com.example.zhanfinancebackend.modules.crm.controller;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.crm.dto.PipelineDto;
import com.example.zhanfinancebackend.modules.crm.dto.StageCreateRequest;
import com.example.zhanfinancebackend.modules.crm.dto.StageDto;
import com.example.zhanfinancebackend.modules.crm.dto.StageUpdateRequest;
import com.example.zhanfinancebackend.modules.crm.entity.Pipeline;
import com.example.zhanfinancebackend.modules.crm.entity.Stage;
import com.example.zhanfinancebackend.modules.crm.repository.PipelineRepository;
import com.example.zhanfinancebackend.modules.crm.repository.StageRepository;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/crm/pipelines")
public class PipelineController {

    private final PipelineRepository pipelineRepository;
    private final StageRepository stageRepository;

    public PipelineController(PipelineRepository pipelineRepository, StageRepository stageRepository) {
        this.pipelineRepository = pipelineRepository;
        this.stageRepository = stageRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'CLIENT', 'ADVISOR')")
    public ApiResponse<List<PipelineDto>> getPipelines() {
        List<PipelineDto> pipelines = pipelineRepository.findAllWithStages().stream().map(p -> new PipelineDto(
                p.getId(),
                p.getName(),
                p.isDefault(),
                p.getStages().stream().map(s -> mapToStageDto(p.getId(), s)).toList()
        )).toList();
        return ApiResponse.success(pipelines);
    }

    @PostMapping("/{pipelineId}/stages")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public ApiResponse<StageDto> createStage(@PathVariable Long pipelineId, @Valid @RequestBody StageCreateRequest request) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline not found"));

        int nextOrderIndex = request.orderIndex() != null ? request.orderIndex() : pipeline.getStages().size() + 1;

        Stage stage = new Stage(pipeline, request.name(), nextOrderIndex, request.color() != null ? request.color() : "#3b82f6", request.type());
        if (request.nameEn() != null) stage.setNameEn(request.nameEn());
        stage.setPreFinal(request.isPreFinal());
        stage.setSlaHours(request.slaHours());

        Stage saved = stageRepository.save(stage);
        return ApiResponse.success(mapToStageDto(pipelineId, saved));
    }

    @PatchMapping("/{pipelineId}/stages/{stageId}")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public ApiResponse<StageDto> updateStage(@PathVariable Long pipelineId, @PathVariable Long stageId, @RequestBody StageUpdateRequest request) {
        Stage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("Stage not found"));

        if (request.name() != null && !request.name().isBlank()) stage.setName(request.name().trim());
        if (request.nameEn() != null) stage.setNameEn(request.nameEn().trim());
        if (request.color() != null && !request.color().isBlank()) stage.setColor(request.color());
        if (request.type() != null) stage.setType(request.type());
        if (request.isPreFinal() != null) stage.setPreFinal(request.isPreFinal());
        if (request.orderIndex() != null) stage.setOrderIndex(request.orderIndex());
        if (request.slaHours() != null) stage.setSlaHours(request.slaHours());

        Stage updated = stageRepository.save(stage);
        return ApiResponse.success(mapToStageDto(pipelineId, updated));
    }

    @DeleteMapping("/{pipelineId}/stages/{stageId}")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public ApiResponse<Void> deleteStage(@PathVariable Long pipelineId, @PathVariable Long stageId) {
        Stage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("Stage not found"));
        stageRepository.delete(stage);
        return ApiResponse.success(null);
    }

    private StageDto mapToStageDto(Long pipelineId, Stage s) {
        return new StageDto(
                s.getId(),
                pipelineId,
                s.getName(),
                s.getNameEn(),
                s.getOrderIndex(),
                s.getColor(),
                s.getType(),
                s.isDefault(),
                s.isPreFinal(),
                s.getSlaHours()
        );
    }
}
