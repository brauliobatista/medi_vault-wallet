using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Users;

namespace MediVault.Api.Services;

public class DoctorService(MediVaultDbContext db)
{
    public async Task<DoctorProfileDto?> GetProfileAsync(string doctorId)
    {
        var d = await db.Doctors
            .Include(x => x.Institution)
            .Include(x => x.Nationality)
            .FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return null;
        return new DoctorProfileDto(d.Id, d.OrdemMedicosId, d.Email, d.FirstName, d.LastName,
            d.Speciality, d.InstitutionId, d.Institution?.Name ?? string.Empty,
            d.Nationality?.Name);
    }

    public async Task<bool> UpdateProfileAsync(string doctorId, UpdateDoctorRequest req)
    {
        var d = await db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return false;
        if (req.Email is not null) d.Email = req.Email;
        if (req.Speciality is not null) d.Speciality = req.Speciality;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ChangePasswordAsync(string doctorId, ChangePasswordRequest req)
    {
        var d = await db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, d.PasswordHash))
            return false;
        d.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
        return true;
    }
}
