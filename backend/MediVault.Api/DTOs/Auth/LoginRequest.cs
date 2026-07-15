namespace MediVault.Api.DTOs.Auth;

public record PatientLoginRequest(string UtentNumber, string Password);

public record DoctorLoginRequest(string OrdemMedicosId, string Password);

public record LoginResponse(string Token, string Role, int Id, string Name);
