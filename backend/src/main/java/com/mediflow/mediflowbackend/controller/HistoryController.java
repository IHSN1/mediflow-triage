package com.mediflow.mediflowbackend.controller;

import com.mediflow.mediflowbackend.dto.HistoryEntryResponse;
import com.mediflow.mediflowbackend.service.HistoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Historique des triages de l'infirmier(ère) connecté(e) (page "Historique"
 * du frontend). Réservé au rôle INFIRMIER (voir SecurityConfig) : chaque
 * infirmier ne voit et ne supprime que ses propres triages.
 */
@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryService historyService;

    @GetMapping
    public List<HistoryEntryResponse> list(
            @RequestParam(required = false) String esi,
            @RequestParam(required = false) String search) {
        return historyService.list(HistoryService.SCOPE_MINE, HistoryService.parseEsiParam(esi), search);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        historyService.delete(HistoryService.SCOPE_MINE, id);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String esi,
            @RequestParam(required = false) String search) {
        byte[] csv = historyService.exportCsv(HistoryService.SCOPE_MINE, HistoryService.parseEsiParam(esi), search);
        return csvResponse(csv, "mediflow-historique.csv");
    }

    static ResponseEntity<byte[]> csvResponse(byte[] csv, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(csv);
    }
}
