namespace MediVault.Api.DTOs.Medical;

public record SurgicalHistoryDto(
    int Id, string SurgeryName, string? SurgeryDate,
    string? Location, string? Notes, bool IsActive, string CreatedAt);

public record CreateSurgicalHistoryRequest(
    string SurgeryName, string? SurgeryDate, string? Location, string? Notes);

public record ChronicMedicationDto(
    int Id, string ActiveSubstance, string? Dose, string? Posology,
    string? StartDate, string? EndDate, bool IsActive, string CreatedAt);

public record CreateChronicMedicationRequest(
    string ActiveSubstance, string? Dose, string? Posology,
    string? StartDate, string? EndDate);

public record DrugAllergyDto(
    int Id, string ActiveSubstance, string? AllergicReaction, string? Severity, string CreatedAt);

public record CreateDrugAllergyRequest(
    string ActiveSubstance, string? AllergicReaction, string? Severity);

public record FamilyHistoryDto(
    int Id, string Condition, bool HasCondition, string? KinshipDegree, string? Notes);

public record UpsertFamilyHistoryRequest(
    string Condition, bool HasCondition, string? KinshipDegree, string? Notes);

public record HealthHabitDto(
    int Id, int TypeId, string? Name, bool? Consumes, string? Frequency,
    string? Quantity, string? StartDate, string? Details, string UpdatedAt);

public record UpsertHealthHabitRequest(
    int TypeId, string? Name, bool? Consumes, string? Frequency,
    string? Quantity, string? StartDate, string? Details);

public record AnalyticalExamDto(
    int Id, string ExamDate, string? Laboratory, string? Notes, bool IsActive,
    string CreatedAt, List<AnalyticalExamParameterDto> Parameters);

public record AnalyticalExamParameterDto(
    int Id, string ParameterName, double? Value, string? Unit,
    double? ReferenceMin, double? ReferenceMax, bool IsAbnormal);

public record CreateAnalyticalExamRequest(
    string ExamDate, string? Laboratory, string? Notes,
    List<CreateParameterRequest> Parameters);

public record CreateParameterRequest(
    string ParameterName, double? Value, string? Unit,
    double? ReferenceMin, double? ReferenceMax);

public record ImagingExamDto(
    int Id, string ExamType, string? BodyArea, string ExamDate,
    string? Institution, string? ReportText, bool IsActive, string CreatedAt);

public record CreateImagingExamRequest(
    string ExamType, string? BodyArea, string ExamDate,
    string? Institution, string? ReportText);

public record OptometryExamDto(
    int Id, string ExamDate, double? RightSphere, double? RightCylinder, int? RightAxis,
    double? LeftSphere, double? LeftCylinder, int? LeftAxis, string? DiseaseReport,
    bool IsActive, string CreatedAt);

public record CreateOptometryExamRequest(
    string ExamDate, double? RightSphere, double? RightCylinder, int? RightAxis,
    double? LeftSphere, double? LeftCylinder, int? LeftAxis, string? DiseaseReport);

public record VaccinationDto(
    int Id, string VaccineName, string? DoseNumber, string? AdministeredAt,
    string? NextDueDate, string? BatchNumber, string? Institution, string? Notes);

public record CreateVaccinationRequest(
    int VaccineId, string? DoseNumber, string? AdministeredAt,
    string? NextDueDate, string? BatchNumber, string? Institution, string? Notes);

public record AccessRequestDto(
    int Id, string UserId, string PatientName, string PatientPublicId, string UtentNumber, string DoctorId, string DoctorName,
    string Status, bool IsEmergency, string RequestedAt, string? ApprovedAt, string? ExpiresAt);

public record RespondAccessRequest(string Action);

public record ScanQrRequest(string QrCode);

public record DoctorNoteDto(
    int Id, string DoctorId, string DoctorName, string Section,
    string NoteText, string CreatedAt, string UpdatedAt);

public record CreateDoctorNoteRequest(string UserId, string Section, string NoteText);

public record PendingReviewFlagDto(
    int Id, string UserId, string Section, string CreatedAt, string? ReviewedAt);

public record PatientSummaryDto(
    string UserId, string FirstName, string LastName, string BiologicalGender,
    string? BloodType, bool AcceptsTransfusion,
    string Sex, string Birthday, string UtentNumber, string? PhotoUrl);

public record UpdateBloodTypeRequest(string? BloodType);

public record MedicalFileDto(
    int Id, string FileName, string? FileType, string FileUrl, string UploadedAt, string? UploadedByName);

public record ChatMessageDto(
    int Id, string AuthorDoctorId, string AuthorName, string Message, string CreatedAt);

public record CreateChatMessageRequest(string Message);

public record PathologyDto(
    int Id, string Icpc2Description, string Type, string? DiagnosedAt, string? Notes);

public record Icpc2CodeDto(int Id, string Code, string Description);

public record CreatePathologyRequest(int Icpc2Id, string Type, string? DiagnosedAt, string? Notes);

public record VitalSignDto(
    int Id, string RecordedAt, int? BloodPressureSystolic, int? BloodPressureDiastolic,
    int? HeartRate, int? RespiratoryRate, decimal? Temperature, int? Spo2,
    decimal? Weight, decimal? Height, string? Notes);

public record CreateVitalSignRequest(
    string RecordedAt, int? BloodPressureSystolic, int? BloodPressureDiastolic,
    int? HeartRate, int? RespiratoryRate, decimal? Temperature, int? Spo2,
    decimal? Weight, decimal? Height, string? Notes);

public record ClinicalAssessmentDto(int Id, string Hypothesis, string Plan, string CreatedAt, string UpdatedAt);

public record CreateAssessmentRequest(string Hypothesis, string Plan);

public record AnamnesisDto(
    int Id, string DoctorId, string DoctorName, string? ChiefComplaint, string? IllnessHistory,
    string? PersonalHistory, string CreatedAt, string UpdatedAt, bool CanEdit);

public record UpsertAnamnesisRequest(string? ChiefComplaint, string? IllnessHistory, string? PersonalHistory);
