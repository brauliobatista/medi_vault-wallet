using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class HealthHabitService(MediVaultDbContext db, UserService userService)
{
    public async Task<List<HealthHabitDto>> GetHabitsAsync(string userId) =>
        await db.HealthHabits
            .Where(h => h.UserId == userId)
            .OrderBy(h => h.Type)
            .Select(h => new HealthHabitDto(h.Id, h.Type, h.Name, h.Consumes == 1, h.Frequency, h.Quantity, h.StartDate, h.Details, h.UpdatedAt))
            .ToListAsync();

    public async Task<HealthHabitDto> UpsertHabitAsync(string userId, UpsertHealthHabitRequest req)
    {
        var entry = await db.HealthHabits.FirstOrDefaultAsync(h => h.UserId == userId && h.Type == req.Type);
        if (entry is null)
        {
            entry = new HealthHabit { UserId = userId };
            db.HealthHabits.Add(entry);
        }
        entry.Type = req.Type;
        entry.Name = req.Name;
        entry.Consumes = req.Consumes.HasValue ? (req.Consumes.Value ? 1 : 0) : null;
        entry.Frequency = req.Frequency;
        entry.Quantity = req.Quantity;
        entry.StartDate = req.StartDate;
        entry.Details = req.Details;
        entry.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        await userService.CreateFlagAsync(userId, "habits");
        return new HealthHabitDto(entry.Id, entry.Type, entry.Name, entry.Consumes == 1, entry.Frequency, entry.Quantity, entry.StartDate, entry.Details, entry.UpdatedAt);
    }
}
