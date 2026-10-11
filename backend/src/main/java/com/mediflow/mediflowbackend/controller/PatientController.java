package com.mediflow.mediflowbackend.controller;

import com.mediflow.mediflowbackend.dto.HistoryEntryResponse;
import com.mediflow.mediflowbackend.service.HistoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liste de tous les triages du service (page "Liste des patients" du
 * frontend). Réservé au rôle MEDECIN (voir SecurityConfig) : contrairement
 * à /api/history, aucun filtrage par créateur n'est appliqué.
 */
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final HistoryService historyService;

    @GetMapping
    public List<HistoryEntryResponse> list(
            @RequestParam(required = false) String esi,
            @RequestParam(required = false) String search) {
        return historyService.list(HistoryService.SCOPE_SERVICE, HistoryService.parseEsiParam(esi), search);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        historyService.delete(HistoryService.SCOPE_SERVICE, id);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String esi,
            @RequestParam(required = false) String search) {
        byte[] csv = historyService.exportCsv(HistoryService.SCOPE_SERVICE, HistoryService.parseEsiParam(esi), search);
        return HistoryController.csvResponse(csv, "mediflow-patients.csv");
    }
}
