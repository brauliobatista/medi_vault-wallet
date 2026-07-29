namespace MediVault.Api.DTOs.Users;

public record UserProfileDto(
    string Id,
    string UtentNumber,
    string Email,
    string FirstName,
    string LastName,
    string Birthday,
    string BiologicalGender,
    int SexId,
    string? SexGenderDescription,
    int NationalityId,
    string? NationalityName,
    string? MaritalStatus,
    string? BloodType,
    bool AcceptsTransfusion,
    bool AcceptsResuscitation,
    bool EmergencyAccess,
    bool IsDependent,
    string? Profession,
    string? Phone,
    bool CardActive,
    string? PhotoUrl
);

public record UpdateUserRequest(
    string? Email,
    string? Phone,
    string? Profession,
    string? MaritalStatus,
    bool? AcceptsTransfusion,
    bool? AcceptsResuscitation
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record ToggleCardRequest(bool Active);
