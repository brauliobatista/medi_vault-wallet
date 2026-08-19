using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Users;

namespace MediVault.Api.Services;

public class DoctorService(MediVaultDbContext db)
{
    public async Task<DoctorProfileDto?> GetProfileAsync(string doctorId)
    {
        return await db.Doctors
            .Where(x => x.Id == doctorId && x.IsActive == 1)
            .Select(x => new DoctorProfileDto(
                x.Id, x.OrdemMedicosId, x.Email, x.FirstName, x.LastName,
                x.Speciality, x.InstitutionId,
                x.Institution != null ? x.Institution.Name : string.Empty,
                x.Institution != null ? x.Institution.Type : string.Empty,
                x.Institution != null ? x.Institution.Address : null,
                x.Institution != null ? x.Institution.Phone : null,
                x.Nationality != null ? x.Nationality.Name : null))
            .FirstOrDefaultAsync();
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
