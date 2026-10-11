package com.mediflow.mediflowbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Corps de la requête POST /api/triage/start.
 * Reprend exactement les champs du formulaire "Nouveau patient" du frontend
 * (interface PatientForm dans frontend/src/types/index.ts) : chief_complaint,
 * first_name et last_name sont obligatoires ; tous les signes vitaux sont
 * facultatifs.
 */
@Data
public class PatientFormRequest {

    @NotBlank(message = "Le prénom du patient est obligatoire")
    @JsonProperty("first_name")
    private String firstName;

    @NotBlank(message = "Le nom du patient est obligatoire")
    @JsonProperty("last_name")
    private String lastName;

    private Integer age;

    /** "M", "F" ou "Autre". */
    private String sex;

    @NotBlank(message = "Le motif de consultation est obligatoire")
    @JsonProperty("chief_complaint")
    private String chiefComplaint;

    private Double temperature;
    private Integer heartrate;
    private Integer resprate;
    private Integer o2sat;
    private Integer sbp;
    private Integer dbp;
    private Integer pain;
}
