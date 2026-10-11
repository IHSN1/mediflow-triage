package com.mediflow.mediflowbackend.service;

import com.mediflow.mediflowbackend.dto.FastApiStartRequest;
import com.mediflow.mediflowbackend.dto.PatientFormRequest;
import com.mediflow.mediflowbackend.dto.RespondTriageRequest;
import com.mediflow.mediflowbackend.dto.RespondTriageResponse;
import com.mediflow.mediflowbackend.dto.StartTriageResponse;
import com.mediflow.mediflowbackend.dto.TriageResultResponse;
import com.mediflow.mediflowbackend.dto.TriageValidationResponse;
import com.mediflow.mediflowbackend.dto.ValidateTriageRequest;
import com.mediflow.mediflowbackend.exception.ServiceIaIndisponibleException;
import com.mediflow.mediflowbackend.model.AuditAction;
import com.mediflow.mediflowbackend.model.Triage;
import com.mediflow.mediflowbackend.model.User;
import com.mediflow.mediflowbackend.repository.TriageRepository;
import com.mediflow.mediflowbackend.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Fait le lien entre le frontend et le service IA FastAPI pour le parcours
 * de triage : Spring Boot agit comme gateway, le frontend n'appelle jamais
 * FastAPI directement (voir README du frontend).
 *
 * /triage/start crée aussi la ligne Triage en base (identité + signes
 * vitaux) ; /triage/result la complète avec le résultat ESI dès qu'il est
 * disponible. /triage/{id}/validate enregistre ensuite la décision finale
 * de l'infirmière (ISO 14971 : une IA d'aide à la décision médicale ne
 * remplace jamais le jugement clinique humain, qui reste tracé).
 */
@Service
@RequiredArgsConstructor
public class TriageService {

    private static final String SERVICE_IA_INDISPONIBLE = "Service IA (FastAPI) indisponible";

    private final RestTemplate restTemplate;
    private final TriageRepository triageRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    public StartTriageResponse start(PatientFormRequest request, String ipAddress) {
        FastApiStartRequest fastApiRequest = FastApiStartRequest.builder()
                .chiefComplaint(request.getChiefComplaint())
                .temperature(request.getTemperature())
                .heartrate(request.getHeartrate())
                .resprate(request.getResprate())
                .o2sat(request.getO2sat())
                .sbp(request.getSbp())
                .dbp(request.getDbp())
                .pain(request.getPain())
                .build();

        StartTriageResponse fastApiResponse = callFastApi(
                () -> restTemplate.postForObject(
                        fastApiBaseUrl + "/triage/start", fastApiRequest, StartTriageResponse.class));

        User currentUser = getCurrentUser();
        Triage triage = Triage.builder()
                .sessionId(fastApiResponse.getSessionId())
                .patientFirstName(request.getFirstName())
                .patientLastName(request.getLastName())
                .age(request.getAge())
                .sexe(request.getSex())
                .chiefComplaint(request.getChiefComplaint())
                .temperature(request.getTemperature())
                .heartrate(request.getHeartrate())
                .resprate(request.getResprate())
                .o2sat(request.getO2sat())
                .sbp(request.getSbp())
                .dbp(request.getDbp())
                .pain(request.getPain())
                .createdBy(currentUser)
                .build();
        triageRepository.save(triage);

        auditLogService.log(currentUser, AuditAction.TRIAGE_CREATED,
                "Triage créé pour " + triage.getPatientFullName() + " — motif : " + triage.getChiefComplaint(),
                ipAddress);

        return fastApiResponse;
    }

    public RespondTriageResponse respond(RespondTriageRequest request) {
        return callFastApi(() -> restTemplate.postForObject(
                fastApiBaseUrl + "/triage/respond", request, RespondTriageResponse.class));
    }

    public TriageResultResponse getResult(String sessionId) {
        TriageResultResponse fastApiResult = callFastApi(() -> restTemplate.getForObject(
                fastApiBaseUrl + "/triage/result/" + sessionId, TriageResultResponse.class));

        Triage triage = triageRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Triage introuvable pour la session : " + sessionId));

        triage.setNiveauXgboostBrut(fastApiResult.getNiveauXgboostBrut());
        // Suggestion de l'IA figée au moment du résultat : sert de référence
        // à l'infirmière lors de la validation (PUT /triage/{id}/validate).
        triage.setNiveauIa(fastApiResult.getNiveauFinal());
        triage.setRegleDeclenchee(fastApiResult.getRegleDeclenchee());
        triage.setDetailsRegle(
                fastApiResult.getDetailsRegle() == null ? null : String.join("\n", fastApiResult.getDetailsRegle()));
        triage.setNews2Score(fastApiResult.getNews2Score());
        triage.setResumeClinique(fastApiResult.getResumeClinique());
        triageRepository.save(triage);

        // Renvoyé depuis l'entité persistée (et non la réponse FastAPI brute) pour
        // inclure l'id technique et l'état de validation infirmière courant, que le
        // frontend utilise ensuite pour PUT /api/triage/{id}/validate.
        return TriageResultResponse.builder()
                .id(triage.getId())
                .niveauXgboostBrut(triage.getNiveauXgboostBrut())
                // "niveau_final" reste dans le contrat JSON (le frontend le lit tel quel) mais
                // n'existe plus comme colonne séparée en base : niveauIa en est l'unique source.
                .niveauFinal(triage.getNiveauIa())
                .niveauIa(triage.getNiveauIa())
                .niveauInfirmiere(triage.getNiveauInfirmiere())
                .motifModification(triage.getMotifModification())
                .news2Score(triage.getNews2Score())
                .regleDeclenchee(triage.getRegleDeclenchee())
                .detailsRegle(splitDetailsRegle(triage.getDetailsRegle()))
                .resumeClinique(triage.getResumeClinique())
                .build();
    }

    /**
     * Décision finale de l'infirmière sur le niveau ESI (confirmation ou
     * correction de la suggestion de l'IA). Journalise systématiquement
     * TRIAGE_MODIFIED dans audit_logs, avec le motif si renseigné.
     */
    public TriageValidationResponse validate(Long id, ValidateTriageRequest request, String ipAddress) {
        Triage triage = triageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Triage introuvable : " + id));

        triage.setNiveauInfirmiere(request.getNiveauInfirmiere());
        triage.setMotifModification(request.getMotifModification());
        // Remplace la recommandation brute posée par /api/triage/result par le résumé complet
        // (motif + signes vitaux + antécédents + recommandation) vu par l'infirmière au moment
        // de valider, pour que l'historique réaffiche exactement ce qui a été validé.
        if (request.getResumeClinique() != null && !request.getResumeClinique().isBlank()) {
            triage.setResumeClinique(request.getResumeClinique());
        }
        triageRepository.save(triage);

        User currentUser = getCurrentUser();
        String details = "Triage #" + id + " : niveau ESI infirmière = " + request.getNiveauInfirmiere()
                + (triage.getNiveauIa() != null ? " (suggestion IA : " + triage.getNiveauIa() + ")" : "")
                + (request.getMotifModification() != null && !request.getMotifModification().isBlank()
                        ? " — motif : " + request.getMotifModification()
                        : "");
        auditLogService.log(currentUser, AuditAction.TRIAGE_MODIFIED, details, ipAddress);

        return TriageValidationResponse.builder()
                .id(triage.getId())
                .sessionId(triage.getSessionId())
                .niveauIa(triage.getNiveauIa())
                .niveauInfirmiere(triage.getNiveauInfirmiere())
                .motifModification(triage.getMotifModification())
                .build();
    }

    /**
     * Centralise la gestion d'erreur des appels FastAPI (service injoignable,
     * en panne, ou dépassement du délai de 5s configuré dans
     * RestTemplateConfig). Ne laisse jamais passer l'exception technique
     * brute : elle est convertie en ServiceIaIndisponibleException, que
     * GlobalExceptionHandler transforme en réponse SERVICE_IA_INDISPONIBLE
     * exploitable par le frontend (bascule vers le triage manuel).
     */
    private <T> T callFastApi(java.util.function.Supplier<T> call) {
        T result;
        try {
            result = call.get();
        } catch (RestClientException e) {
            throw new ServiceIaIndisponibleException(SERVICE_IA_INDISPONIBLE, e);
        }
        if (result == null) {
            throw new ServiceIaIndisponibleException("Réponse vide du service IA", null);
        }
        return result;
    }

    /** Inverse de String.join("\n", ...) utilisé pour stocker details_regle en base sur une seule colonne. */
    private List<String> splitDetailsRegle(String detailsRegle) {
        if (detailsRegle == null || detailsRegle.isBlank()) {
            return List.of();
        }
        return List.of(detailsRegle.split("\n"));
    }

    /** Récupère l'infirmier(ère) actuellement authentifié(e) via le JWT (voir JwtAuthenticationFilter). */
    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }
}
