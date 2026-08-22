using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class MedicalFileService(MediVaultDbContext db, IWebHostEnvironment env)
{
    private static readonly string[] AllowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    private const long MaxSizeBytes = 10 * 1024 * 1024;

    private static MedicalFileDto ToDto(MedicalFile f) => new(
        f.Id, f.FileName, f.FileType, $"/uploads/documents/{Path.GetFileName(f.FilePath)}",
        f.UploadedAt, f.UploadedByDoctor is null ? null : $"{f.UploadedByDoctor.FirstName} {f.UploadedByDoctor.LastName}");

    public async Task<List<MedicalFileDto>> GetDocumentsAsync(string userId)
    {
        var rows = await db.MedicalFiles
            .Include(f => f.UploadedByDoctor)
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.UploadedAt)
            .ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    public async Task<(MedicalFileDto? Dto, string? Error)> UploadAsync(string userId, string doctorId, IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext)) return (null, "Tipo de ficheiro não suportado. Use PDF, JPG ou PNG.");
        if (file.Length > MaxSizeBytes) return (null, "Ficheiro excede o tamanho máximo de 10MB.");

        var dir = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "documents");
        Directory.CreateDirectory(dir);
        var storedName = $"{userId}-{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(dir, storedName);
        await using (var stream = File.Create(fullPath))
            await file.CopyToAsync(stream);

        var entry = new MedicalFile
        {
            UserId = userId, FileName = file.FileName, FileType = ext.TrimStart('.'),
            FilePath = fullPath, UploadedBy = doctorId, UploadedAt = DateTime.UtcNow.ToString("o")
        };
        db.MedicalFiles.Add(entry);
        await db.SaveChangesAsync();

        var doctor = await db.Doctors.FindAsync(doctorId);
        return (new MedicalFileDto(entry.Id, entry.FileName, entry.FileType, $"/uploads/documents/{storedName}",
            entry.UploadedAt, doctor is null ? null : $"{doctor.FirstName} {doctor.LastName}"), null);
    }

    public async Task<bool> DeleteAsync(int id, string userId)
    {
        var entry = await db.MedicalFiles.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (entry is null) return false;
        db.MedicalFiles.Remove(entry);
        await db.SaveChangesAsync();
        try { File.Delete(entry.FilePath); } catch { /* best-effort */ }
        return true;
    }
}
