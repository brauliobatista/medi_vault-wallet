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
            .OrderBy(h => h.TypeId)
            .Select(h => new HealthHabitDto(h.Id, h.TypeId, h.Name, h.Consumes == 1, h.Frequency, h.Quantity, h.StartDate, h.Details, h.UpdatedAt))
            .ToListAsync();

    public async Task<HealthHabitDto> UpsertHabitAsync(string userId, UpsertHealthHabitRequest req)
    {
        var entry = await db.HealthHabits.FirstOrDefaultAsync(h => h.UserId == userId && h.TypeId == req.TypeId);
        if (entry is null)
        {
            entry = new HealthHabit { UserId = userId };
            db.HealthHabits.Add(entry);
        }
        entry.TypeId = req.TypeId;
        entry.Name = req.Name;
        entry.Consumes = req.Consumes.HasValue ? (req.Consumes.Value ? 1 : 0) : null;
        entry.Frequency = req.Frequency;
        entry.Quantity = req.Quantity;
        entry.StartDate = req.StartDate;
        entry.Details = req.Details;
        entry.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        await userService.CreateFlagAsync(userId, "habits");
        return new HealthHabitDto(entry.Id, entry.TypeId, entry.Name, entry.Consumes == 1, entry.Frequency, entry.Quantity, entry.StartDate, entry.Details, entry.UpdatedAt);
    }
}
