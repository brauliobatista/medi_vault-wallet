namespace MediVault.Api.DTOs.Family;

public record RelationshipTypeDto(int Id, string Code, string? Description);

public record GenderDto(int Id, string Code, string? Description);

public record FamilyMemberDto(
    int GuardianshipId, string UserId, string Name, string PublicId,
    string RelationshipCode, string Status, bool IsDependent, string CreatedAt, string Direction);

public record SearchUserByEmailResult(string UserId, string Name, string PublicId);

public record InviteByEmailRequest(string Email, int RelationshipTypeId);

public record CreateDependentRequest(
    string FirstName, string LastName, string Birthday,
    string BiologicalGender, string Sex, int RelationshipTypeId);

public record RespondGuardianshipRequest(string Action);

public record FamilyContactDto(
    string UserId, string Name, string? Phone, string RelationshipCode, string Direction);
