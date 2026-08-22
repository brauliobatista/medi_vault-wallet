using MediVault.Api.Entities;
using MediVault.Api.Services;
using Microsoft.Extensions.Caching.Memory;

namespace MediVault.Api.Tests.Services;

public class AccessControlServiceTests
{
    private static AccessRequest SeedAccessRequest(
        Data.MediVaultDbContext db, string doctorId, string userId,
        string status = "approved", int isEmergency = 0, string? expiresAt = null)
    {
        var request = new AccessRequest
        {
            DoctorId = doctorId,
            UserId = userId,
            Status = status,
            IsEmergency = isEmergency,
            RequestedAt = DateTime.UtcNow.ToString("o"),
            ApprovedAt = status == "approved" ? DateTime.UtcNow.ToString("o") : null,
            ExpiresAt = expiresAt,
        };
        db.AccessRequests.Add(request);
        db.SaveChanges();
        return request;
    }

    // --- QR card status ---

    [Fact]
    public async Task IsQrCardActiveAsync_ReturnsNull_ForMalformedQr()
    {
        using var db = TestDbContextFactory.Create();
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.Null(await sut.IsQrCardActiveAsync("not-a-valid-qr"));
    }

    [Fact]
    public async Task IsQrCardActiveAsync_ReturnsNull_WhenShareCodeDoesNotMatch()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123");
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.Null(await sut.IsQrCardActiveAsync($"MV:{user.Id}:WRONGCODE"));
    }

    [Fact]
    public async Task IsQrCardActiveAsync_ReturnsTrue_WhenCardActive()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123", cardActive: 1);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.True(await sut.IsQrCardActiveAsync($"MV:{user.Id}:REAL123"));
    }

    [Fact]
    public async Task IsQrCardActiveAsync_ReturnsFalse_WhenCardSuspended()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123", cardActive: 0);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.False(await sut.IsQrCardActiveAsync($"MV:{user.Id}:REAL123"));
    }

    // --- GetAccessStatusAsync / DoctorHasAccessAsync ---

    [Fact]
    public async Task GetAccessStatusAsync_ReturnsCardSuspended_WhenCardInactive()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, cardActive: 0);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var (hasAccess, reason) = await sut.GetAccessStatusAsync(doctor.Id, user.Id);

        Assert.False(hasAccess);
        Assert.Equal("card_suspended", reason);
    }

    [Fact]
    public async Task GetAccessStatusAsync_ReturnsNoAccess_WhenNoApprovedRequest()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var (hasAccess, reason) = await sut.GetAccessStatusAsync(doctor.Id, user.Id);

        Assert.False(hasAccess);
        Assert.Equal("no_access", reason);
    }

    [Fact]
    public async Task GetAccessStatusAsync_ReturnsGranted_ForApprovedNonExpiredRequest()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id, expiresAt: DateTime.UtcNow.AddDays(1).ToString("o"));
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var (hasAccess, reason) = await sut.GetAccessStatusAsync(doctor.Id, user.Id);

        Assert.True(hasAccess);
        Assert.Equal("granted", reason);
    }

    [Fact]
    public async Task GetAccessStatusAsync_ReturnsNoAccess_ForExpiredApprovedRequest()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id, expiresAt: DateTime.UtcNow.AddDays(-1).ToString("o"));
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var (hasAccess, reason) = await sut.GetAccessStatusAsync(doctor.Id, user.Id);

        Assert.False(hasAccess);
        Assert.Equal("no_access", reason);
    }

    [Fact]
    public async Task DoctorHasAccessAsync_ReturnsTrue_ForEmergencyRequest_RegardlessOfStatus()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id, status: "pending", isEmergency: 1);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.True(await sut.DoctorHasAccessAsync(doctor.Id, user.Id));
    }

    [Fact]
    public async Task DoctorHasAccessAsync_ReturnsFalse_WhenCardSuspended()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, cardActive: 0);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.False(await sut.DoctorHasAccessAsync(doctor.Id, user.Id));
    }

    // --- Guardian access ---

    [Fact]
    public async Task GuardianHasAccessAsync_ReturnsTrue_ForApprovedActiveGuardianship()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        var relType = new RelationshipType { Code = "parent", Description = "Pai/Mãe" };
        db.RelationshipTypes.Add(relType);
        db.SaveChanges();
        db.FamilyGuardianships.Add(new FamilyGuardianship
        {
            GuardianUserId = guardian.Id, DependentUserId = dependent.Id,
            RelationshipTypeId = relType.Id, Status = "approved", IsActive = 1,
        });
        db.SaveChanges();
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.True(await sut.GuardianHasAccessAsync(guardian.Id, dependent.Id));
    }

    [Fact]
    public async Task GuardianHasAccessAsync_ReturnsFalse_WhenNoGuardianship()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.False(await sut.GuardianHasAccessAsync(guardian.Id, dependent.Id));
    }

    // --- Requests listing ---

    [Fact]
    public async Task GetPatientRequestsAsync_ReturnsRequestsForUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var results = await sut.GetPatientRequestsAsync(user.Id);

        Assert.Single(results);
        Assert.Equal(doctor.Id, results[0].DoctorId);
    }

    [Fact]
    public async Task GetDoctorRequestsAsync_ReturnsRequestsForDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var results = await sut.GetDoctorRequestsAsync(doctor.Id);

        Assert.Single(results);
        Assert.Equal(user.Id, results[0].UserId);
    }

    // --- Grant by QR ---

    [Fact]
    public async Task GrantAccessByQrAsync_ReturnsNull_ForMalformedQr()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.Null(await sut.GrantAccessByQrAsync(doctor.Id, "bad-qr"));
    }

    [Fact]
    public async Task GrantAccessByQrAsync_CreatesApprovedRequest_ForValidQr()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123");
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var result = await sut.GrantAccessByQrAsync(doctor.Id, $"MV:{user.Id}:REAL123");

        Assert.NotNull(result);
        Assert.Equal("approved", result!.Value.Request.Status);
        Assert.Equal(user.Id, result.Value.PublicId);
    }

    [Fact]
    public async Task GrantAccessByQrAsync_ExtendsExpiry_WhenApprovedRequestAlreadyExists()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123");
        var doctor = TestDataFactory.SeedDoctor(db);
        var existing = SeedAccessRequest(db, doctor.Id, user.Id, expiresAt: DateTime.UtcNow.AddDays(-1).ToString("o"));
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var result = await sut.GrantAccessByQrAsync(doctor.Id, $"MV:{user.Id}:REAL123");

        Assert.NotNull(result);
        Assert.Equal(existing.Id, result!.Value.Request.Id);
        Assert.True(string.Compare(result.Value.Request.ExpiresAt, DateTime.UtcNow.ToString("o")) > 0);
        Assert.Single(db.AccessRequests.Where(r => r.DoctorId == doctor.Id && r.UserId == user.Id));
    }

    // --- Patient lookup ---

    [Fact]
    public async Task FindPatientByUtentNumberAsync_ReturnsPatient_WhenFound()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, utentNumber: "999888777");
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var result = await sut.FindPatientByUtentNumberAsync("999888777");

        Assert.NotNull(result);
        Assert.Equal(user.Id, result!.Value.UserId);
    }

    [Fact]
    public async Task FindPatientByUtentNumberAsync_ReturnsNull_WhenNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.Null(await sut.FindPatientByUtentNumberAsync("000000000"));
    }

    // --- Request lifecycle ---

    [Fact]
    public async Task RequestAccessAsync_CreatesPendingRequest()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var request = await sut.RequestAccessAsync(doctor.Id, user.Id);

        Assert.Equal("pending", request.Status);
        Assert.Single(db.AccessRequests);
    }

    [Fact]
    public async Task RequestAccessAsync_ReturnsExistingPendingRequest_InsteadOfDuplicating()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var first = await sut.RequestAccessAsync(doctor.Id, user.Id);
        var second = await sut.RequestAccessAsync(doctor.Id, user.Id);

        Assert.Equal(first.Id, second.Id);
        Assert.Single(db.AccessRequests);
    }

    [Fact]
    public async Task RespondToRequestAsync_Approve_SetsApprovedStatusAndExpiry()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var result = await sut.RespondToRequestAsync(request.Id, user.Id, "approve");

        Assert.True(result);
        var updated = db.AccessRequests.First(r => r.Id == request.Id);
        Assert.Equal("approved", updated.Status);
        Assert.NotNull(updated.ExpiresAt);
    }

    [Fact]
    public async Task RespondToRequestAsync_Revoke_RemovesRequest()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        var result = await sut.RespondToRequestAsync(request.Id, user.Id, "revoke");

        Assert.True(result);
        Assert.Equal("revoked", db.AccessRequests.Single().Status);
    }

    [Fact]
    public async Task RespondToRequestAsync_ReturnsFalse_WhenRequestNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.False(await sut.RespondToRequestAsync(999, user.Id, "approve"));
    }

    [Fact]
    public async Task DeleteRequestAsync_MarksRequestRevoked_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.True(await sut.DeleteRequestAsync(request.Id, user.Id));
        Assert.Equal("revoked", db.AccessRequests.Single().Status);
    }

    [Fact]
    public async Task DeleteRequestAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id);
        var sut = new AccessControlService(db, new MemoryCache(new MemoryCacheOptions()));

        Assert.False(await sut.DeleteRequestAsync(request.Id, otherUser.Id));
        Assert.Single(db.AccessRequests);
    }
}
