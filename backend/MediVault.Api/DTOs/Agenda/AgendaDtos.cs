namespace MediVault.Api.DTOs.Agenda;

public record ScheduleEventDto(
    int Id, string EventTypeCode, string EventTypeDescription,
    string Title, string? Location, string StartDate, string EndDate, string? Notes);

public record PatientAppointmentDto(
    int Id, string PatientName, string AppointmentTypeDescription,
    string Modality, string ScheduledAt, string Status);

public record InstitutionContactDto(int Id, string ServiceName, string Extension);

public record ScheduleEventTypeDto(int Id, string Code, string Description);
public record AppointmentTypeDto(int Id, string Code, string Description);

public record CreateScheduleEventRequest(string EventTypeCode, string Title, string? Location, string StartDate, string EndDate, string? Notes);
public record UpdateScheduleEventRequest(string EventTypeCode, string Title, string? Location, string StartDate, string EndDate, string? Notes);

public record CreateAppointmentRequest(string UserId, string AppointmentTypeCode, string Modality, string ScheduledAt, string Status, string? Notes);
public record UpdateAppointmentRequest(string AppointmentTypeCode, string Modality, string ScheduledAt, string Status, string? Notes);
