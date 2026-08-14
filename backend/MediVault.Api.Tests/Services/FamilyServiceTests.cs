using MediVault.Api.DTOs.Family;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class FamilyServiceTests
{
    private static RelationshipType SeedRelationshipType(Data.MediVaultDbContext db, string code = "parent")
    {
        var rel = new RelationshipType { Code = code, Description = code };
        db.RelationshipTypes.Add(rel);
        db.SaveChanges();
        return rel;
    }

    private static FamilyGuardianship SeedGuardianship(
        Data.MediVaultDbContext db, string guardianId, string dependentId, int relationshipTypeId,
        string status = "approved", int isActive = 1)
    {
        var g = new FamilyGuardianship
        {
            GuardianUserId = guardianId, DependentUserId = dependentId,
            RelationshipTypeId = relationshipTypeId, Status = status, IsActive = isActive,
        };
        db.FamilyGuardianships.Add(g);
        db.SaveChanges();
        return g;
    }

    [Fact]
    public async Task GetRelationshipTypesAsync_ReturnsSeededTypes()
    {
        using var db = TestDbContextFactory.Create();
        SeedRelationshipType(db, "parent");
        SeedRelationshipType(db, "sibling");
        var sut = new FamilyService(db);

        var result = await sut.GetRelationshipTypesAsync();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetFamilyAsync_ReturnsActiveDependentsForGuardian()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        var relType = SeedRelationshipType(db);
        SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id);
        var sut = new FamilyService(db);

        var result = await sut.GetFamilyAsync(guardian.Id);

        Assert.Single(result);
        Assert.Equal(dependent.Id, result[0].UserId);
        Assert.Equal("guardian", result[0].Direction);
    }

    [Fact]
    public async Task GetFamilyAsync_ExcludesInactiveGuardianships()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        var relType = SeedRelationshipType(db);
        SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id, isActive: 0);
        var sut = new FamilyService(db);

        var result = await sut.GetFamilyAsync(guardian.Id);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPendingInvitationsForMeAsync_ReturnsPendingInvitationsForDependent()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id, status: "pending");
        var sut = new FamilyService(db);

        var result = await sut.GetPendingInvitationsForMeAsync(dependent.Id);

        Assert.Single(result);
        Assert.Equal(guardian.Id, result[0].UserId);
        Assert.Equal("dependent", result[0].Direction);
    }

    [Fact]
    public async Task FindUserByEmailAsync_ReturnsUser_WhenEligible()
    {
        using var db = TestDbContextFactory.Create();
        var caller = TestDataFactory.SeedUser(db);
        var target = TestDataFactory.SeedUser(db, email: "target@example.com");
        var sut = new FamilyService(db);

        var result = await sut.FindUserByEmailAsync(caller.Id, "target@example.com");

        Assert.NotNull(result);
        Assert.Equal(target.Id, result!.UserId);
    }

    [Fact]
    public async Task FindUserByEmailAsync_ReturnsNull_WhenTargetIsCaller()
    {
        using var db = TestDbContextFactory.Create();
        var caller = TestDataFactory.SeedUser(db, email: "self@example.com");
        var sut = new FamilyService(db);

        var result = await sut.FindUserByEmailAsync(caller.Id, "self@example.com");

        Assert.Null(result);
    }

    [Fact]
    public async Task FindUserByEmailAsync_ReturnsNull_WhenTargetIsDependent()
    {
        using var db = TestDbContextFactory.Create();
        var caller = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedUser(db, email: "dep@example.com", isDependent: 1);
        var sut = new FamilyService(db);

        var result = await sut.FindUserByEmailAsync(caller.Id, "dep@example.com");

        Assert.Null(result);
    }

    [Fact]
    public async Task InviteByEmailAsync_ReturnsError_WhenTargetNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var sut = new FamilyService(db);

        var (success, error) = await sut.InviteByEmailAsync(guardian.Id, new InviteByEmailRequest("nobody@example.com", relType.Id));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task InviteByEmailAsync_ReturnsError_WhenInvitingSelf()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db, email: "self@example.com");
        var relType = SeedRelationshipType(db);
        var sut = new FamilyService(db);

        var (success, error) = await sut.InviteByEmailAsync(guardian.Id, new InviteByEmailRequest("self@example.com", relType.Id));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task InviteByEmailAsync_ReturnsError_WhenTargetIsDependent()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedUser(db, email: "dep@example.com", isDependent: 1);
        var relType = SeedRelationshipType(db);
        var sut = new FamilyService(db);

        var (success, error) = await sut.InviteByEmailAsync(guardian.Id, new InviteByEmailRequest("dep@example.com", relType.Id));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task InviteByEmailAsync_ReturnsError_WhenRelationshipTypeInvalid()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedUser(db, email: "target@example.com");
        var sut = new FamilyService(db);

        var (success, error) = await sut.InviteByEmailAsync(guardian.Id, new InviteByEmailRequest("target@example.com", 999));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task InviteByEmailAsync_CreatesPendingGuardianship_WhenValid()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var target = TestDataFactory.SeedUser(db, email: "target@example.com");
        var relType = SeedRelationshipType(db);
        var sut = new FamilyService(db);

        var (success, error) = await sut.InviteByEmailAsync(guardian.Id, new InviteByEmailRequest("target@example.com", relType.Id));

        Assert.True(success);
        Assert.Null(error);
        var created = Assert.Single(db.FamilyGuardianships);
        Assert.Equal(target.Id, created.DependentUserId);
        Assert.Equal("pending", created.Status);
    }

    [Fact]
    public async Task InviteByEmailAsync_IsIdempotent_WhenActiveGuardianshipAlreadyExists()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var target = TestDataFactory.SeedUser(db, email: "target@example.com");
        var relType = SeedRelationshipType(db);
        SeedGuardianship(db, guardian.Id, target.Id, relType.Id);
        var sut = new FamilyService(db);

        var (success, error) = await sut.InviteByEmailAsync(guardian.Id, new InviteByEmailRequest("target@example.com", relType.Id));

        Assert.True(success);
        Assert.Null(error);
        Assert.Single(db.FamilyGuardianships);
    }

    [Fact]
    public async Task RespondToInvitationAsync_Approve_UpdatesStatus()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id, status: "pending");
        var sut = new FamilyService(db);

        var result = await sut.RespondToInvitationAsync(dependent.Id, guardianship.Id, "approve");

        Assert.True(result);
        Assert.Equal("approved", db.FamilyGuardianships.First(g => g.Id == guardianship.Id).Status);
    }

    [Fact]
    public async Task RespondToInvitationAsync_Decline_DeactivatesGuardianship()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id, status: "pending");
        var sut = new FamilyService(db);

        var result = await sut.RespondToInvitationAsync(dependent.Id, guardianship.Id, "decline");

        Assert.True(result);
        Assert.Equal(0, db.FamilyGuardianships.First(g => g.Id == guardianship.Id).IsActive);
    }

    [Fact]
    public async Task RespondToInvitationAsync_ReturnsFalse_ForInvalidAction()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id, status: "pending");
        var sut = new FamilyService(db);

        var result = await sut.RespondToInvitationAsync(dependent.Id, guardianship.Id, "banana");

        Assert.False(result);
    }

    [Fact]
    public async Task RemoveGuardianshipAsync_DeactivatesGuardianship_WhenOwnedByGuardian()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id);
        var sut = new FamilyService(db);

        var result = await sut.RemoveGuardianshipAsync(guardian.Id, guardianship.Id);

        Assert.True(result);
        Assert.Equal(0, db.FamilyGuardianships.First(g => g.Id == guardianship.Id).IsActive);
    }

    [Fact]
    public async Task RemoveGuardianshipAsync_ReturnsFalse_WhenNotOwnedByGuardian()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var otherGuardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, relType.Id);
        var sut = new FamilyService(db);

        var result = await sut.RemoveGuardianshipAsync(otherGuardian.Id, guardianship.Id);

        Assert.False(result);
    }

    [Fact]
    public async Task CreateDependentAsync_ReturnsError_WhenRelationshipTypeInvalid()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedGender(db, code: "M");
        TestDataFactory.SeedCountry(db, code: "PRT", name: "Portugal");
        var sut = new FamilyService(db);

        var (success, error, member) = await sut.CreateDependentAsync(guardian.Id,
            new CreateDependentRequest("João", "Pequeno", "2020-01-01", "M", "M", 999));

        Assert.False(success);
        Assert.NotNull(error);
        Assert.Null(member);
    }

    [Fact]
    public async Task CreateDependentAsync_ReturnsError_WhenSexInvalid()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        TestDataFactory.SeedCountry(db, code: "PRT", name: "Portugal");
        var sut = new FamilyService(db);

        var (success, error, member) = await sut.CreateDependentAsync(guardian.Id,
            new CreateDependentRequest("João", "Pequeno", "2020-01-01", "M", "X", relType.Id));

        Assert.False(success);
        Assert.NotNull(error);
        Assert.Null(member);
    }

    [Fact]
    public async Task CreateDependentAsync_CreatesDependentAndApprovedGuardianship_WhenValid()
    {
        using var db = TestDbContextFactory.Create();
        var guardian = TestDataFactory.SeedUser(db);
        var relType = SeedRelationshipType(db);
        var gender = TestDataFactory.SeedGender(db, code: "M");
        TestDataFactory.SeedCountry(db, code: "PRT", name: "Portugal");
        var sut = new FamilyService(db);

        var (success, error, member) = await sut.CreateDependentAsync(guardian.Id,
            new CreateDependentRequest("João", "Pequeno", "2020-01-01", "M", gender.Code, relType.Id));

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(member);
        Assert.Equal("approved", member!.Status);
        Assert.True(member.IsDependent);
        var dependentUser = db.Users.First(u => u.Id == member.UserId);
        Assert.Equal(1, dependentUser.IsDependent);
    }
}
