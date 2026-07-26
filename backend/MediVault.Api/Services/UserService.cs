using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class UserService(MediVaultDbContext db)
{
    public async Task<UserProfileDto?> GetProfileAsync(string userId)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive == 1);
        if (u is null) return null;
        return Map(u);
    }

    public async Task<bool> UpdateProfileAsync(string userId, UpdateUserRequest req)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive == 1);
        if (u is null) return false;

        if (req.Email is not null) u.Email = req.Email;
        if (req.Phone is not null) u.Phone = req.Phone;
        if (req.Profession is not null) u.Profession = req.Profession;
        if (req.MaritalStatus is not null) u.MaritalStatus = req.MaritalStatus;
        if (req.AcceptsTransfusion.HasValue) u.AcceptsTransfusion = req.AcceptsTransfusion.Value ? 1 : 0;
        if (req.AcceptsResuscitation.HasValue) u.AcceptsResuscitation = req.AcceptsResuscitation.Value ? 1 : 0;
        if (req.EmergencyAccess.HasValue) u.EmergencyAccessCode = req.EmergencyAccess.Value ? 1 : 0;
        u.UpdatedAt = DateTime.UtcNow.ToString("o");

        await db.SaveChangesAsync();
        await CreateFlagAsync(userId, "identification");
        return true;
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest req)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive == 1);
        if (u is null || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, u.PasswordHash))
            return false;

        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        u.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<(string Name, string Id)?> GetPublicInfoAsync(string userId)
    {
        var u = await db.Users
            .Where(x => x.Id == userId && x.IsActive == 1)
            .Select(x => new { x.FirstName, x.LastName, x.Id })
            .FirstOrDefaultAsync();
        if (u is null) return null;
        return ($"{u.FirstName} {u.LastName}", u.Id);
    }

    public async Task<string?> GetQrPayloadAsync(string userId)
    {
        var u = await db.Users
            .Where(x => x.Id == userId && x.IsActive == 1)
            .Select(x => new { x.Id, x.ShareCode })
            .FirstOrDefaultAsync();
        if (u is null) return null;

        if (string.IsNullOrEmpty(u.ShareCode))
        {
            var entity = await db.Users.FindAsync(userId);
            entity!.ShareCode = Guid.NewGuid().ToString("N")[..12].ToUpper();
            await db.SaveChangesAsync();
            return $"MV:{userId}:{entity.ShareCode}";
        }

        return $"MV:{u.Id}:{u.ShareCode}";
    }

    public async Task CreateFlagAsync(string userId, string section)
    {
        db.PendingReviewFlags.Add(new PendingReviewFlag
        {
            UserId = userId,
            Section = section,
            CreatedAt = DateTime.UtcNow.ToString("o")
        });
        await db.SaveChangesAsync();
    }

    public async Task<bool> ToggleCardAsync(string userId, bool activate)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive == 1);
        if (u is null) return false;
        u.CardActive = activate ? 1 : 0;
        u.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        return true;
    }

    private static UserProfileDto Map(Entities.User u) => new(
        u.Id, u.UtentNumber, u.Email, u.FirstName, u.LastName, u.Birthday,
        u.BiologicalGender, u.Sex, u.MaritalStatus, u.BloodType,
        u.AcceptsTransfusion == 1, u.AcceptsResuscitation == 1,
        u.EmergencyAccessCode == 1, u.IsDependent == 1, u.Profession, u.Phone,
        u.CardActive == 1);
}
