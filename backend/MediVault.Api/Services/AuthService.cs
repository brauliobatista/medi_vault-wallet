using Microsoft.EntityFrameworkCore;
using MediVault.Api.Auth;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Auth;

namespace MediVault.Api.Services;

public class AuthService(MediVaultDbContext db, JwtService jwt)
{
    public async Task<LoginResponse?> LoginPatientAsync(PatientLoginRequest req)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.UtentNumber == req.UtentNumber && u.IsActive == 1);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return null;

        var token = jwt.GenerateToken(user.Id, "Patient", user.UtentNumber);
        return new LoginResponse(token, "Patient", user.Id, $"{user.FirstName} {user.LastName}", user.Language);
    }

    public async Task<LoginResponse?> LoginDoctorAsync(DoctorLoginRequest req)
    {
        var doctor = await db.Doctors
            .FirstOrDefaultAsync(d => d.OrdemMedicosId == req.OrdemMedicosId && d.IsActive == 1);
        if (doctor is null || !BCrypt.Net.BCrypt.Verify(req.Password, doctor.PasswordHash))
            return null;

        var token = jwt.GenerateToken(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        return new LoginResponse(token, "Doctor", doctor.Id, $"{doctor.FirstName} {doctor.LastName}", doctor.Language);
    }
}
