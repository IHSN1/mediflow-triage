package com.mediflow.mediflowbackend.service;

import com.mediflow.mediflowbackend.dto.HistoryEntryResponse;
import com.mediflow.mediflowbackend.model.Triage;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.TriageRepository;
import com.mediflow.mediflowbackend.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Logique partagée par GET/DELETE /api/history (infirmier : ses propres
 * triages) et GET/DELETE /api/patients (médecin : tous les triages du
 * service). Les deux contrôleurs appellent les mêmes méthodes avec un
 * "scope" différent ("mine" ou "service").
 */
@Service
@RequiredArgsConstructor
public class HistoryService {

    public static final String SCOPE_MINE = "mine";
    public static final String SCOPE_SERVICE = "service";

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** Marqueur d'ordre des octets UTF-8, pour que les accents s'affichent correctement dans Excel. */
    private static final char BOM = (char) 0xFEFF;

    private final TriageRepository triageRepository;
    private final UserRepository userRepository;

    /**
     * Convertit le paramètre de requête "esi" (String, car le frontend peut
     * envoyer "all" pour "aucun filtre") en niveau ESI numérique ou null.
     */
    public static Integer parseEsiParam(String rawEsi) {
        if (rawEsi == null || rawEsi.isBlank() || "all".equalsIgnoreCase(rawEsi.trim())) {
            return null;
        }
        try {
            return Integer.parseInt(rawEsi.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public List<HistoryEntryResponse> list(String scope, Integer esi, String search) {
        List<Triage> triages = SCOPE_MINE.equals(scope)
                ? triageRepository.findByCreatedByOrderByCreatedAtDesc(getCurrentUser())
                : triageRepository.findAllByOrderByCreatedAtDesc();

        return triages.stream()
                // Un triage n'existe dans l'historique qu'une fois validé par l'infirmière
                // (voir PUT /api/triage/{id}/validate) : avant cela, aucune décision
                // clinique finale n'a été prise et il ne doit pas apparaître ici.
                .filter(t -> t.getNiveauInfirmiere() != null)
                .filter(t -> esi == null || esi.equals(t.getNiveauIa()))
                .filter(t -> matchesSearch(t, search))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Transaction explicite : la vérification d'autorisation (scope "mine") et la
     * suppression doivent réussir ou échouer ensemble, sur la même entité gérée.
     */
    @Transactional
    public void delete(String scope, Long id) {
        Triage triage = triageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Triage introuvable : " + id));

        if (SCOPE_MINE.equals(scope) && !triage.getCreatedBy().getId().equals(getCurrentUser().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Vous ne pouvez supprimer que vos propres triages");
        }

        triageRepository.delete(triage);
    }

    /** Génère un CSV UTF-8 (avec BOM, pour un bon rendu des accents dans Excel). */
    public byte[] exportCsv(String scope, Integer esi, String search) {
        List<HistoryEntryResponse> rows = list(scope, esi, search);

        StringBuilder csv = new StringBuilder();
        csv.append(BOM);
        csv.append("Date,Patient,Motif,ESI,Résumé\n");
        for (HistoryEntryResponse row : rows) {
            csv.append(escape(row.getDate())).append(',')
                    .append(escape(row.getPatient())).append(',')
                    .append(escape(row.getChiefComplaint())).append(',')
                    .append(escape("ESI " + row.getNiveauFinal())).append(',')
                    .append(escape(row.getResumeClinique())).append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private boolean matchesSearch(Triage triage, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String needle = search.toLowerCase();
        return containsIgnoreCase(triage.getPatientFullName(), needle)
                || containsIgnoreCase(triage.getChiefComplaint(), needle)
                || containsIgnoreCase(triage.getResumeClinique(), needle);
    }

    private boolean containsIgnoreCase(String haystack, String needleLowerCase) {
        return haystack != null && haystack.toLowerCase().contains(needleLowerCase);
    }

    private String escape(String value) {
        String safe = value == null ? "" : value.replace("\"", "\"\"").replace("\n", " ");
        return "\"" + safe + "\"";
    }

    private HistoryEntryResponse toResponse(Triage triage) {
        return HistoryEntryResponse.builder()
                .id(triage.getId())
                .sessionId(triage.getSessionId())
                .date(triage.getCreatedAt().format(DATE_FORMAT))
                .patient(triage.getPatientFullName())
                .chiefComplaint(triage.getChiefComplaint())
                // "niveau_final" reste dans le contrat JSON mais n'existe plus comme colonne
                // séparée en base : niveauIa en est l'unique source (voir Triage.java).
                .niveauFinal(triage.getNiveauIa())
                .resumeClinique(triage.getResumeClinique())
                .niveauXgboostBrut(triage.getNiveauXgboostBrut())
                .regleDeclenchee(triage.getRegleDeclenchee())
                .detailsRegle(splitDetailsRegle(triage.getDetailsRegle()))
                .niveauIa(triage.getNiveauIa())
                .niveauInfirmiere(triage.getNiveauInfirmiere())
                .motifModification(triage.getMotifModification())
                .news2Score(triage.getNews2Score())
                .build();
    }

    /** Inverse de String.join("\n", ...) utilisé pour stocker details_regle en base sur une seule colonne. */
    private List<String> splitDetailsRegle(String detailsRegle) {
        if (detailsRegle == null || detailsRegle.isBlank()) {
            return List.of();
        }
        return List.of(detailsRegle.split("\n"));
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }
}
