using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Family;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class FamilyControllerTests
{
    private static FamilyGuardianship SeedGuardianship(
        Data.MediVaultDbContext db, string guardianId, string dependentId, string status = "approved")
    {
        var relType = db.RelationshipTypes.First();
        var g = new FamilyGuardianship
        {
            GuardianUserId = guardianId, DependentUserId = dependentId,
            RelationshipTypeId = relType.Id, Status = status, IsActive = 1,
        };
        db.FamilyGuardianships.Add(g);
        db.SaveChanges();
        return g;
    }

    // --- GET /api/family ---

    [Fact]
    public async Task GetMyFamily_ReturnsOk_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        SeedGuardianship(db, guardian.Id, dependent.Id);
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.GetAsync("/api/family");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<FamilyMemberDto>>();
        Assert.Single(body!);
    }

    [Fact]
    public async Task GetMyFamily_ReturnsForbidden_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync("/api/family");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetMyFamily_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/family");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/family/invitations ---

    [Fact]
    public async Task GetPendingInvitations_ReturnsOk_WithPendingInvitation()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        SeedGuardianship(db, guardian.Id, dependent.Id, status: "pending");
        var client = factory.CreateAuthorizedClient(dependent.Id, "Patient", dependent.UtentNumber);

        var response = await client.GetAsync("/api/family/invitations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<FamilyMemberDto>>();
        Assert.Single(body!);
    }

    // --- GET /api/family/relationship-types ---

    [Fact]
    public async Task GetRelationshipTypes_ReturnsOk_WithSeededTypes()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/family/relationship-types");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<RelationshipTypeDto>>();
        Assert.NotEmpty(body!);
    }

    // --- GET /api/genders ---

    [Fact]
    public async Task GetGenders_ReturnsOk_WithSeededGenders()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/genders");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<GenderDto>>();
        Assert.NotEmpty(body!);
    }

    // --- GET /api/family/search ---

    [Fact]
    public async Task SearchByEmail_ReturnsOk_WhenFound()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var caller = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedUser(db, email: "target@example.com");
        var client = factory.CreateAuthorizedClient(caller.Id, "Patient", caller.UtentNumber);

        var response = await client.GetAsync("/api/family/search?email=target@example.com");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SearchByEmail_ReturnsNotFound_WhenUnknown()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var caller = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(caller.Id, "Patient", caller.UtentNumber);

        var response = await client.GetAsync("/api/family/search?email=nobody@example.com");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/family/invite ---

    [Fact]
    public async Task InviteByEmail_ReturnsOk_ForEligibleTarget()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedUser(db, email: "target@example.com");
        var relType = db.RelationshipTypes.First();
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.PostAsJsonAsync("/api/family/invite", new InviteByEmailRequest("target@example.com", relType.Id));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task InviteByEmail_ReturnsBadRequest_WhenTargetNotFound()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var relType = db.RelationshipTypes.First();
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.PostAsJsonAsync("/api/family/invite", new InviteByEmailRequest("nobody@example.com", relType.Id));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task InviteByEmail_ReturnsBadRequest_ForInvalidRelationshipType()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        TestDataFactory.SeedUser(db, email: "target@example.com");
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.PostAsJsonAsync("/api/family/invite", new InviteByEmailRequest("target@example.com", 999999));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- POST /api/family/dependent ---

    [Fact]
    public async Task CreateDependent_ReturnsOk_ForValidRequest()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var relType = db.RelationshipTypes.First();
        var gender = db.Genders.First(g => g.Code == "M");
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.PostAsJsonAsync("/api/family/dependent",
            new CreateDependentRequest("João", "Pequeno", "2020-01-01", "M", gender.Code, relType.Id));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateDependent_ReturnsBadRequest_ForInvalidRelationshipType()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var gender = db.Genders.First(g => g.Code == "M");
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.PostAsJsonAsync("/api/family/dependent",
            new CreateDependentRequest("João", "Pequeno", "2020-01-01", "M", gender.Code, 999999));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateDependent_ReturnsBadRequest_ForInvalidSex()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var relType = db.RelationshipTypes.First();
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.PostAsJsonAsync("/api/family/dependent",
            new CreateDependentRequest("João", "Pequeno", "2020-01-01", "M", "does-not-exist", relType.Id));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/family/{guardianshipId}/respond ---

    [Fact]
    public async Task Respond_Approve_ReturnsNoContent()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, status: "pending");
        var client = factory.CreateAuthorizedClient(dependent.Id, "Patient", dependent.UtentNumber);

        var response = await client.PutAsJsonAsync($"/api/family/{guardianship.Id}/respond", new RespondGuardianshipRequest("approve"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Respond_ReturnsBadRequest_ForInvalidAction()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id, status: "pending");
        var client = factory.CreateAuthorizedClient(dependent.Id, "Patient", dependent.UtentNumber);

        var response = await client.PutAsJsonAsync($"/api/family/{guardianship.Id}/respond", new RespondGuardianshipRequest("banana"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Respond_ReturnsNotFound_ForUnknownGuardianshipId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync("/api/family/999/respond", new RespondGuardianshipRequest("approve"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/family/{guardianshipId} ---

    [Fact]
    public async Task Remove_ReturnsNoContent_WhenOwnedByGuardian()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db);
        var guardianship = SeedGuardianship(db, guardian.Id, dependent.Id);
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.DeleteAsync($"/api/family/{guardianship.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Remove_ReturnsNotFound_ForUnknownGuardianshipId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync("/api/family/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
