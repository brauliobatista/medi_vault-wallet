namespace MediVault.Api.DTOs.Users;

public record UserProfileDto(
    int Id,
    string UtentNumber,
    string Email,
    string FirstName,
    string LastName,
    string Birthday,
    string BiologicalGender,
    string Sex,
    string? MaritalStatus,
    string? BloodType,
    bool AcceptsTransfusion,
    bool AcceptsResuscitation,
    bool EmergencyAccess,
    bool IsDependent,
    string? Profession,
    string? Phone
);

public record UpdateUserRequest(
    string? Email,
    string? Phone,
    string? Profession,
    string? MaritalStatus,
    bool? AcceptsTransfusion,
    bool? AcceptsResuscitation,
    bool? EmergencyAccess
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
