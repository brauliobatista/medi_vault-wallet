namespace MediVault.Api.DTOs.Users;

public record InstitutionOptionDto(string Id, string Name);

public record SpecialtyOptionDto(int Id, string Name);

public record DoctorProfileDto(
    string Id,
    string OrdemMedicosId,
    string Email,
    string FirstName,
    string LastName,
    string? Speciality,
    List<InstitutionOptionDto> Institutions
);

public record UpdateDoctorRequest(
    string? Email,
    string? Speciality,
    List<string>? InstitutionIds
);
