using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class DoctorService(MediVaultDbContext db)
{
    public async Task<DoctorProfileDto?> GetProfileAsync(string doctorId)
    {
        var d = await db.Doctors
            .Include(x => x.Institution)
            .Include(x => x.DoctorInstitutions).ThenInclude(di => di.Institution)
            .FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return null;

        var institutions = d.DoctorInstitutions
            .Select(di => new InstitutionOptionDto(di.InstitutionId, di.Institution.Name))
            .ToList();
        // Fall back to the legacy single institution if no multi-institution rows exist yet
        // (e.g. a doctor created before this feature, whose links haven't been set up).
        if (institutions.Count == 0 && d.Institution is not null)
            institutions.Add(new InstitutionOptionDto(d.InstitutionId, d.Institution.Name));

        return new DoctorProfileDto(d.Id, d.OrdemMedicosId, d.Email, d.FirstName, d.LastName, d.Speciality, institutions);
    }

    public async Task<List<InstitutionOptionDto>> GetInstitutionOptionsAsync() =>
        await db.Institutions
            .Where(i => i.IsActive == 1)
            .OrderBy(i => i.Name)
            .Select(i => new InstitutionOptionDto(i.Id, i.Name))
            .ToListAsync();

    public async Task<List<SpecialtyOptionDto>> GetSpecialtyOptionsAsync() =>
        await db.MedicalSpecialties
            .OrderBy(s => s.Name)
            .Select(s => new SpecialtyOptionDto(s.Id, s.Name))
            .ToListAsync();

    public async Task<bool> UpdateProfileAsync(string doctorId, UpdateDoctorRequest req)
    {
        var d = await db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return false;
        if (req.Email is not null) d.Email = req.Email;
        if (req.Speciality is not null) d.Speciality = req.Speciality;

        if (req.InstitutionIds is not null && req.InstitutionIds.Count > 0)
        {
            var existing = await db.DoctorInstitutions.Where(di => di.DoctorId == doctorId).ToListAsync();
            db.DoctorInstitutions.RemoveRange(existing);
            foreach (var institutionId in req.InstitutionIds.Distinct())
                db.DoctorInstitutions.Add(new DoctorInstitution { DoctorId = doctorId, InstitutionId = institutionId });

            // Keep the legacy single institution_id in sync as the doctor's primary institution.
            d.InstitutionId = req.InstitutionIds[0];
        }

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
