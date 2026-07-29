namespace MediVault.Api.DTOs.Users;

public record DoctorProfileDto(
    string Id,
    string OrdemMedicosId,
    string Email,
    string FirstName,
    string LastName,
    string? Speciality,
    string InstitutionId,
    string InstitutionName,
    string? NationalityName
);

public record UpdateDoctorRequest(
    string? Email,
    string? Speciality
);
