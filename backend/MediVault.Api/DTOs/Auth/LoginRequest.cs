namespace MediVault.Api.DTOs.Auth;

public record PatientLoginRequest(string UtentNumber, string Password);

public record DoctorLoginRequest(string OrdemMedicosId, string Password);

public record LoginResponse(string Token, string Role, string Id, string Name, string Language, string? PhotoUrl);
