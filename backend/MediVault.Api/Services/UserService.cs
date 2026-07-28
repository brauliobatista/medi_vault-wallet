using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class UserService(MediVaultDbContext db)
{
    public async Task<UserProfileDto?> GetProfileAsync(string userId)
    {
        var row = await db.Users
            .Where(x => x.Id == userId && x.IsActive == 1)
            .Select(x => new {
                x.Id, x.UtentNumber, x.Email, x.FirstName, x.LastName, x.Birthday,
                x.BiologicalGender, x.SexId,
                SexGenderDescription = x.SexGender != null ? x.SexGender.Description : null,
                x.NationalityId,
                NationalityName = x.Nationality != null ? x.Nationality.Name : null,
                x.MaritalStatus, x.BloodType,
                x.AcceptsTransfusion, x.AcceptsResuscitation, x.EmergencyAccessCode,
                x.IsDependent, x.Profession, x.Phone, x.CardActive
            })
            .FirstOrDefaultAsync();
        if (row is null) return null;
        return new UserProfileDto(
            row.Id, row.UtentNumber, row.Email, row.FirstName, row.LastName, row.Birthday,
            row.BiologicalGender, row.SexId, row.SexGenderDescription, row.NationalityId, row.NationalityName,
            row.MaritalStatus, row.BloodType,
            row.AcceptsTransfusion == 1, row.AcceptsResuscitation == 1,
            row.EmergencyAccessCode == 1, row.IsDependent == 1, row.Profession, row.Phone,
            row.CardActive == 1);
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

    public async Task<(string Name, string Id, string? SexGenderDescription, string? BloodType, string? Birthday, string? NationalityName)?> GetPublicInfoAsync(string userId)
    {
        var u = await db.Users
            .Where(x => x.Id == userId && x.IsActive == 1)
            .Select(x => new {
                x.FirstName, x.LastName, x.Id, x.BloodType, x.Birthday,
                SexGenderDescription = x.SexGender != null ? x.SexGender.Description : null,
                NationalityName = x.Nationality != null ? x.Nationality.Name : null
            })
            .FirstOrDefaultAsync();
        if (u is null) return null;
        return ($"{u.FirstName} {u.LastName}", u.Id, u.SexGenderDescription, u.BloodType, u.Birthday, u.NationalityName);
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

}
