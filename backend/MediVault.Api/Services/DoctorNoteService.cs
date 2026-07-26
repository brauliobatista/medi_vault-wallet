using Microsoft.EntityFrameworkCore;
using MediVault.Api.Auth;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class DoctorNoteService(MediVaultDbContext db, EncryptionService encryption)
{
    public async Task<List<DoctorNoteDto>> GetNotesForDoctorAsync(string doctorId, string userId) =>
        (await db.DoctorNotes
            .Where(n => n.DoctorId == doctorId && n.UserId == userId)
            .Include(n => n.Doctor)
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync())
        .Select(n => new DoctorNoteDto(
            n.Id, n.DoctorId, $"{n.Doctor.FirstName} {n.Doctor.LastName}",
            n.Section, n.NoteText is not null ? encryption.Decrypt(n.NoteText) : "",
            n.CreatedAt, n.UpdatedAt))
        .ToList();

    public async Task<DoctorNoteDto> CreateNoteAsync(string doctorId, CreateDoctorNoteRequest req)
    {
        var doctor = await db.Doctors.FindAsync(doctorId) ?? throw new InvalidOperationException("Doctor not found");
        var note = new DoctorNote
        {
            UserId = req.UserId,
            DoctorId = doctorId,
            Section = req.Section,
            NoteText = encryption.Encrypt(req.NoteText),
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        db.DoctorNotes.Add(note);
        await db.SaveChangesAsync();
        return new DoctorNoteDto(note.Id, doctorId, $"{doctor.FirstName} {doctor.LastName}",
            note.Section, req.NoteText, note.CreatedAt, note.UpdatedAt);
    }

    public async Task<bool> UpdateNoteAsync(int noteId, string doctorId, string newText)
    {
        var note = await db.DoctorNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.DoctorId == doctorId);
        if (note is null) return false;
        note.NoteText = encryption.Encrypt(newText);
        note.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteNoteAsync(int noteId, string doctorId)
    {
        var note = await db.DoctorNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.DoctorId == doctorId);
        if (note is null) return false;
        db.DoctorNotes.Remove(note);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<PendingReviewFlagDto>> GetFlagsAsync(string userId) =>
        await db.PendingReviewFlags
            .Where(f => f.UserId == userId && f.ReviewedAt == null)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new PendingReviewFlagDto(f.Id, f.UserId, f.Section, f.CreatedAt, f.ReviewedAt))
            .ToListAsync();

    public async Task<bool> MarkFlagReviewedAsync(int flagId, string doctorId)
    {
        var flag = await db.PendingReviewFlags.FindAsync(flagId);
        if (flag is null) return false;
        flag.ReviewedAt = DateTime.UtcNow.ToString("o");
        flag.ReviewedBy = doctorId;
        await db.SaveChangesAsync();
        return true;
    }
}
