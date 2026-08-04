using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class TeamChatService(MediVaultDbContext db)
{
    public async Task<List<ChatMessageDto>> GetMessagesAsync(string userId)
    {
        var rows = await db.TeamChatMessages
            .Include(m => m.AuthorDoctor)
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
        return rows.Select(m => new ChatMessageDto(m.Id, m.AuthorDoctorId, $"{m.AuthorDoctor.FirstName} {m.AuthorDoctor.LastName}", m.Message, m.CreatedAt)).ToList();
    }

    public async Task<ChatMessageDto> AddMessageAsync(string userId, string doctorId, string message)
    {
        var entry = new TeamChatMessage { UserId = userId, AuthorDoctorId = doctorId, Message = message, CreatedAt = DateTime.UtcNow.ToString("o") };
        db.TeamChatMessages.Add(entry);
        await db.SaveChangesAsync();
        var doctor = await db.Doctors.FindAsync(doctorId);
        return new ChatMessageDto(entry.Id, doctorId, $"{doctor!.FirstName} {doctor.LastName}", entry.Message, entry.CreatedAt);
    }
}
