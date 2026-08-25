using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Users;

namespace MediVault.Api.Services;

public class DoctorService(MediVaultDbContext db, IWebHostEnvironment env)
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
                x.Nationality != null ? x.Nationality.Name : null,
                x.Language, ToPhotoUrl(x.PhotoPath)))
            .FirstOrDefaultAsync();
    }

    public async Task<bool> UpdateProfileAsync(string doctorId, UpdateDoctorRequest req)
    {
        var d = await db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return false;
        if (req.Email is not null) d.Email = req.Email;
        if (req.Speciality is not null) d.Speciality = req.Speciality;
        if (req.Language is not null) d.Language = req.Language;
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

    private static readonly HashSet<string> AllowedPhotoExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxPhotoSizeBytes = 5 * 1024 * 1024;
    private string PhotoDirectory => Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "doctor-photos");
    private static string? ToPhotoUrl(string? photoPath) => photoPath is null ? null : $"/uploads/doctor-photos/{photoPath}";

    public async Task<string?> UploadPhotoAsync(string doctorId, IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedPhotoExtensions.Contains(ext) || file.Length == 0 || file.Length > MaxPhotoSizeBytes)
            return null;

        var d = await db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return null;

        Directory.CreateDirectory(PhotoDirectory);

        if (d.PhotoPath is not null)
        {
            var oldPath = Path.Combine(PhotoDirectory, d.PhotoPath);
            if (File.Exists(oldPath)) File.Delete(oldPath);
        }

        var fileName = $"{doctorId}-{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(PhotoDirectory, fileName);
        await using (var stream = new FileStream(fullPath, FileMode.Create))
            await file.CopyToAsync(stream);

        d.PhotoPath = fileName;
        await db.SaveChangesAsync();
        return ToPhotoUrl(fileName);
    }

    public async Task<bool> DeletePhotoAsync(string doctorId)
    {
        var d = await db.Doctors.FirstOrDefaultAsync(x => x.Id == doctorId && x.IsActive == 1);
        if (d is null) return false;

        if (d.PhotoPath is not null)
        {
            var path = Path.Combine(PhotoDirectory, d.PhotoPath);
            if (File.Exists(path)) File.Delete(path);
            d.PhotoPath = null;
            await db.SaveChangesAsync();
        }
        return true;
    }
}
