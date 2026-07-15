using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class AccessControlService(MediVaultDbContext db)
{
    public async Task<bool> DoctorHasAccessAsync(int doctorId, int userId)
    {
        var now = DateTime.UtcNow.ToString("o");

        // Fetch candidate rows in memory to avoid SQLite translation issues with string date comparison
        var candidates = await db.AccessRequests
            .Where(r => r.DoctorId == doctorId && r.UserId == userId &&
                        (r.Status == "approved" || r.IsEmergency == 1))
            .ToListAsync();

        return candidates.Any(r => r.ExpiresAt == null || string.Compare(r.ExpiresAt, now) > 0);
    }

    public async Task<List<AccessRequestDto>> GetPatientRequestsAsync(int userId)
    {
        return await db.AccessRequests
            .Where(r => r.UserId == userId)
            .Include(r => r.Doctor)
            .Include(r => r.User)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new AccessRequestDto(
                r.Id, r.UserId, $"{r.User.FirstName} {r.User.LastName}", r.User.PublicId,
                r.DoctorId, $"{r.Doctor.FirstName} {r.Doctor.LastName}",
                r.Status, r.IsEmergency == 1, r.RequestedAt, r.ApprovedAt, r.ExpiresAt))
            .ToListAsync();
    }

    public async Task<List<AccessRequestDto>> GetDoctorRequestsAsync(int doctorId)
    {
        return await db.AccessRequests
            .Where(r => r.DoctorId == doctorId)
            .Include(r => r.User)
            .Include(r => r.Doctor)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new AccessRequestDto(
                r.Id, r.UserId, $"{r.User.FirstName} {r.User.LastName}", r.User.PublicId,
                r.DoctorId, $"{r.Doctor.FirstName} {r.Doctor.LastName}",
                r.Status, r.IsEmergency == 1, r.RequestedAt, r.ApprovedAt, r.ExpiresAt))
            .ToListAsync();
    }

    public async Task<(AccessRequest Request, string PatientName, string PublicId)?> GrantAccessByQrAsync(int doctorId, string qrCode)
    {
        var parts = qrCode.Trim().Split(':');
        if (parts.Length != 3 || parts[0] != "MV") return null;
        if (!int.TryParse(parts[1], out var userId)) return null;
        var shareCode = parts[2];

        var user = await db.Users
            .Where(u => u.Id == userId && u.IsActive == 1 && u.ShareCode == shareCode)
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.PublicId })
            .FirstOrDefaultAsync();
        if (user is null) return null;

        var expiry = DateTime.UtcNow.AddDays(7).ToString("o");

        var existing = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.DoctorId == doctorId && r.UserId == userId && r.Status == "approved");

        if (existing is not null)
        {
            existing.ExpiresAt = expiry;
            await db.SaveChangesAsync();
            return (existing, $"{user.FirstName} {user.LastName}", user.PublicId);
        }

        var request = new AccessRequest
        {
            DoctorId = doctorId,
            UserId = userId,
            Status = "approved",
            AccessCode = new Random().Next(100000, 999999).ToString(),
            IsEmergency = 0,
            RequestedAt = DateTime.UtcNow.ToString("o"),
            ApprovedAt = DateTime.UtcNow.ToString("o"),
            ExpiresAt = expiry
        };
        db.AccessRequests.Add(request);
        await db.SaveChangesAsync();
        return (request, $"{user.FirstName} {user.LastName}", user.PublicId);
    }

    public async Task<(int UserId, string Name, string PublicId)?> FindPatientByUtentNumberAsync(string utentNumber)
    {
        var user = await db.Users
            .Where(u => u.UtentNumber == utentNumber && u.IsActive == 1)
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.PublicId })
            .FirstOrDefaultAsync();

        if (user is null) return null;
        return (user.Id, $"{user.FirstName} {user.LastName}", user.PublicId);
    }

    public async Task<AccessRequest> RequestAccessAsync(int doctorId, int userId)
    {
        var existing = await db.AccessRequests.FirstOrDefaultAsync(r =>
            r.DoctorId == doctorId && r.UserId == userId && r.Status == "pending");
        if (existing is not null) return existing;

        var code = new Random().Next(100000, 999999).ToString();
        var request = new AccessRequest
        {
            DoctorId = doctorId,
            UserId = userId,
            Status = "pending",
            AccessCode = code,
            IsEmergency = 0,
            RequestedAt = DateTime.UtcNow.ToString("o")
        };
        db.AccessRequests.Add(request);
        await db.SaveChangesAsync();
        return request;
    }

    public async Task<bool> RespondToRequestAsync(int requestId, int userId, string action)
    {
        var request = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId && r.Status == "pending");
        if (request is null) return false;

        if (action == "approve")
        {
            request.Status = "approved";
            request.ApprovedAt = DateTime.UtcNow.ToString("o");
            request.ExpiresAt = DateTime.UtcNow.AddDays(30).ToString("o");
        }
        else if (action == "revoke")
        {
            request.Status = "revoked";
        }

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RevokeAccessAsync(int requestId, int userId)
    {
        var request = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId);
        if (request is null) return false;

        request.Status = "revoked";
        await db.SaveChangesAsync();
        return true;
    }
}
