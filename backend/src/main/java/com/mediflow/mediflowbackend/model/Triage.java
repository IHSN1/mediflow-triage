package com.mediflow.mediflowbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité JPA représentant un triage (une session d'accueil patient, de la
 * saisie initiale jusqu'au résultat ESI produit par le service IA FastAPI).
 * Mappée vers la table "triages".
 *
 * Une ligne est créée dès /api/triage/start (identité + signes vitaux) puis
 * complétée par /api/triage/result (niveau ESI, règles, résumé clinique).
 */
@Entity
@Table(name = "triages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Triage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identifiant de session renvoyé par le service IA FastAPI. */
    @Column(nullable = false, unique = true)
    private String sessionId;

    private String patientFirstName;

    private String patientLastName;

    private Integer age;

    /** "M", "F" ou "Autre". */
    private String sexe;

    /** Seul champ obligatoire du formulaire d'accueil. */
    @Column(nullable = false)
    private String chiefComplaint;

    private Double temperature;
    private Integer heartrate;
    private Integer resprate;
    private Integer o2sat;
    private Integer sbp;
    private Integer dbp;
    private Integer pain;

    /** Niveau ESI prédit brut par le modèle XGBoost (1 à 5), avant règles de sécurité. */
    private Integer niveauXgboostBrut;

    /**
     * Niveau ESI final suggéré par l'IA (XGBoost + règles de sécurité NEWS2),
     * au moment où le résultat FastAPI est reçu. Sert de référence à
     * l'infirmière lors de la validation manuelle (voir
     * /api/triage/{id}/validate) : elle peut confirmer ou modifier ce
     * niveau, conformément à ISO 14971 (gestion des risques médicaux — une
     * IA d'aide à la décision ne doit jamais se substituer au jugement
     * clinique final).
     *
     * Unique colonne pour "le niveau final suggéré par l'IA" : il n'existe
     * plus de niveauFinal séparé, qui n'était qu'un doublon exact de ce
     * champ (jamais modifié après coup, contrairement à niveauInfirmiere).
     */
    private Integer niveauIa;

    /** Niveau ESI définitivement retenu par l'infirmière (peut différer de niveauIa). */
    private Integer niveauInfirmiere;

    /** Justification obligatoire côté métier si niveauInfirmiere diffère de niveauIa. */
    @Column(columnDefinition = "TEXT")
    private String motifModification;

    /** Ex: "Point A (sauvetage immédiat)", "Point D (signes vitaux anormaux)", ou null. */
    private String regleDeclenchee;

    /**
     * Détails de la règle déclenchée. FastAPI renvoie une liste de chaînes ;
     * elle est jointe avec "\n" pour tenir dans une seule colonne texte, et
     * re-séparée en liste par TriageService lors de la lecture.
     */
    @Column(columnDefinition = "TEXT")
    private String detailsRegle;

    /**
     * Score NEWS2 total calculé par la couche de sécurité (voir safety_rules.py), affiché dans
     * "Explicabilité". Nom de colonne explicite : le mapping par défaut d'Hibernate n'insère pas
     * de "_" entre un chiffre et la majuscule qui suit ("news2Score" devenait "news2score").
     */
    @Column(name = "news2_score")
    private Integer news2Score;

    @Column(columnDefinition = "TEXT")
    private String resumeClinique;

    /** Infirmier(ère) ayant réalisé le triage — sert à filtrer /api/history par utilisateur. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @jakarta.persistence.PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    /** "Prénom Nom", utilisé partout où le patient doit être affiché (historique, tableau de bord, journal d'audit). */
    public String getPatientFullName() {
        String full = ((patientFirstName == null ? "" : patientFirstName) + " "
                + (patientLastName == null ? "" : patientLastName)).trim();
        return full.isEmpty() ? "Patient anonyme" : full;
    }
}
