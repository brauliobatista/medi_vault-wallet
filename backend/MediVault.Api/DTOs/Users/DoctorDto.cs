namespace MediVault.Api.DTOs.Users;

public record DoctorProfileDto(
    string Id,
    string OrdemMedicosId,
    string Email,
    string FirstName,
    string LastName,
    string? Speciality,
    string InstitutionId,
    string InstitutionName
);

public record UpdateDoctorRequest(
    string? Email,
    string? Speciality
);
