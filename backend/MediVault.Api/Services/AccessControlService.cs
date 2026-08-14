using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class AccessControlService(MediVaultDbContext db, IMemoryCache cache)
{
    // A single patient page load fires ~11 independent requests that each re-check the same
    // doctor/patient access pair; a short cache collapses those into one DB round trip without
    // meaningfully delaying revocation (RespondToRequestAsync/DeleteRequestAsync bust it immediately).
    private static readonly TimeSpan AccessCacheTtl = TimeSpan.FromSeconds(15);

    private static string DoctorAccessCacheKey(string doctorId, string userId) => $"doctor-access:{doctorId}:{userId}";
    // Returns null = QR invalid, false = card suspended, true = card active
    public async Task<bool?> IsQrCardActiveAsync(string qrCode)
    {
        var parts = qrCode.Trim().Split(':');
        if (parts.Length != 3 || parts[0] != "MV") return null;
        var user = await db.Users
            .Where(u => u.Id == parts[1] && u.IsActive == 1 && u.ShareCode == parts[2])
            .Select(u => new { u.CardActive })
            .FirstOrDefaultAsync();
        if (user is null) return null;
        return user.CardActive == 1;
    }

    public async Task<(bool HasAccess, string Reason)> GetAccessStatusAsync(string doctorId, string userId)
    {
        var cardActive = await db.Users
            .AnyAsync(u => u.Id == userId && u.IsActive == 1 && u.CardActive == 1);
        if (!cardActive) return (false, "card_suspended");

        var now = DateTime.UtcNow.ToString("o");
        var candidates = await db.AccessRequests
            .Where(r => r.DoctorId == doctorId && r.UserId == userId &&
                        (r.Status == "approved" || r.IsEmergency == 1))
            .ToListAsync();

        bool has = candidates.Any(r => r.ExpiresAt == null || string.Compare(r.ExpiresAt, now) > 0);
        return has ? (true, "granted") : (false, "no_access");
    }

    public async Task<bool> GuardianHasAccessAsync(string guardianUserId, string dependentUserId)
    {
        return await db.FamilyGuardianships.AnyAsync(f =>
            f.GuardianUserId == guardianUserId && f.DependentUserId == dependentUserId &&
            f.IsActive == 1 && f.Status == "approved");
    }

    public async Task<bool> DoctorHasAccessAsync(string doctorId, string userId)
    {
        var cacheKey = DoctorAccessCacheKey(doctorId, userId);
        if (cache.TryGetValue(cacheKey, out bool cached)) return cached;

        var cardActive = await db.Users
            .AnyAsync(u => u.Id == userId && u.IsActive == 1 && u.CardActive == 1);
        if (!cardActive)
        {
            cache.Set(cacheKey, false, AccessCacheTtl);
            return false;
        }

        var now = DateTime.UtcNow.ToString("o");

        // Fetch candidate rows in memory to avoid SQLite translation issues with string date comparison
        var candidates = await db.AccessRequests
            .Where(r => r.DoctorId == doctorId && r.UserId == userId &&
                        (r.Status == "approved" || r.IsEmergency == 1))
            .ToListAsync();

        var hasAccess = candidates.Any(r => r.ExpiresAt == null || string.Compare(r.ExpiresAt, now) > 0);
        cache.Set(cacheKey, hasAccess, AccessCacheTtl);
        return hasAccess;
    }

    public async Task<List<AccessRequestDto>> GetPatientRequestsAsync(string userId)
    {
        var now = DateTime.UtcNow.ToString("o");
        var rows = await db.AccessRequests
            .Where(r => r.UserId == userId)
            .Include(r => r.Doctor)
            .Include(r => r.User)
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        return rows.Select(r => new AccessRequestDto(
            r.Id, r.UserId, $"{r.User.FirstName} {r.User.LastName}", r.User.Id, r.User.UtentNumber,
            r.DoctorId, $"{r.Doctor.FirstName} {r.Doctor.LastName}",
            EffectiveStatus(r, now), r.IsEmergency == 1, r.RequestedAt, r.ApprovedAt, r.ExpiresAt)).ToList();
    }

    public async Task<List<AccessRequestDto>> GetDoctorRequestsAsync(string doctorId)
    {
        var now = DateTime.UtcNow.ToString("o");
        var rows = await db.AccessRequests
            .Where(r => r.DoctorId == doctorId)
            .Include(r => r.User)
            .Include(r => r.Doctor)
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        return rows.Select(r => new AccessRequestDto(
            r.Id, r.UserId, $"{r.User.FirstName} {r.User.LastName}", r.User.Id, r.User.UtentNumber,
            r.DoctorId, $"{r.Doctor.FirstName} {r.Doctor.LastName}",
            EffectiveStatus(r, now), r.IsEmergency == 1, r.RequestedAt, r.ApprovedAt, r.ExpiresAt)).ToList();
    }

    // An "approved" request whose expiry has passed reads as "expired" without needing a stored/scheduled status flip.
    private static string EffectiveStatus(AccessRequest r, string now) =>
        r.Status == "approved" && r.ExpiresAt is not null && string.Compare(r.ExpiresAt, now) <= 0
            ? "expired"
            : r.Status;

    public async Task<(AccessRequest Request, string PatientName, string PublicId)?> GrantAccessByQrAsync(string doctorId, string qrCode)
    {
        var parts = qrCode.Trim().Split(':');
        if (parts.Length != 3 || parts[0] != "MV") return null;
        var userId = parts[1];
        var shareCode = parts[2];

        var user = await db.Users
            .Where(u => u.Id == userId && u.IsActive == 1 && u.ShareCode == shareCode)
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .FirstOrDefaultAsync();
        if (user is null) return null;

        var expiry = DateTime.UtcNow.AddDays(7).ToString("o");

        var existing = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.DoctorId == doctorId && r.UserId == userId && r.Status == "approved");

        if (existing is not null)
        {
            existing.ExpiresAt = expiry;
            await db.SaveChangesAsync();
            cache.Remove(DoctorAccessCacheKey(doctorId, userId));
            return (existing, $"{user.FirstName} {user.LastName}", user.Id);
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
        cache.Remove(DoctorAccessCacheKey(doctorId, userId));
        return (request, $"{user.FirstName} {user.LastName}", user.Id);
    }

    public async Task<(string UserId, string Name, string PublicId)?> FindPatientByUtentNumberAsync(string utentNumber)
    {
        var user = await db.Users
            .Where(u => u.UtentNumber == utentNumber && u.IsActive == 1)
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .FirstOrDefaultAsync();

        if (user is null) return null;
        return (user.Id, $"{user.FirstName} {user.LastName}", user.Id);
    }

    public async Task<AccessRequest> RequestAccessAsync(string doctorId, string userId)
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

    public async Task<bool> RespondToRequestAsync(int requestId, string userId, string action)
    {
        var request = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId && r.Status != "revoked");
        if (request is null) return false;

        if (action == "approve")
        {
            request.Status = "approved";
            request.ApprovedAt = DateTime.UtcNow.ToString("o");
            request.ExpiresAt = DateTime.UtcNow.AddDays(7).ToString("o");
        }
        else if (action == "revoke")
        {
            request.Status = "revoked";
        }

        await db.SaveChangesAsync();
        cache.Remove(DoctorAccessCacheKey(request.DoctorId, request.UserId));
        return true;
    }

    // Keeps the row (marked "rejected"/"revoked" instead of deleted) so the doctor's request history/filters stay accurate.
    public async Task<bool> DeleteRequestAsync(int requestId, string userId)
    {
        var request = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId);
        if (request is null) return false;

        request.Status = request.Status == "pending" ? "rejected" : "revoked";
        await db.SaveChangesAsync();
        cache.Remove(DoctorAccessCacheKey(request.DoctorId, request.UserId));
        return true;
    }
}
