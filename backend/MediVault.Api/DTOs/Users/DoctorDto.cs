namespace MediVault.Api.DTOs.Users;

public record DoctorProfileDto(
    int Id,
    string OrdemMedicosId,
    string Email,
    string FirstName,
    string LastName,
    string? Speciality,
    int InstitutionId,
    string InstitutionName
);

public record UpdateDoctorRequest(
    string? Email,
    string? Speciality
);
