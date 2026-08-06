using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

/// <summary>
/// End-to-end HTTP tests for AccessRequestsController: real routing, [Authorize]/[Authorize(Roles=...)]
/// wiring, model binding and status codes — the layer Service unit tests don't exercise. Every test
/// gets its own ApiTestFactory (own in-memory DB), matching the isolation the Service tests already use.
/// </summary>
public class AccessRequestsControllerTests
{
    private static void Authorize(HttpClient client, string token) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static AccessRequest SeedAccessRequest(
        Data.MediVaultDbContext db, string doctorId, string userId,
        string status = "approved", int isEmergency = 0, string? expiresAt = null)
    {
        var request = new AccessRequest
        {
            DoctorId = doctorId, UserId = userId, Status = status, IsEmergency = isEmergency,
            RequestedAt = DateTime.UtcNow.ToString("o"),
            ApprovedAt = status == "approved" ? DateTime.UtcNow.ToString("o") : null,
            ExpiresAt = expiresAt,
        };
        db.AccessRequests.Add(request);
        db.SaveChanges();
        return request;
    }

    // --- GET /api/access-requests (GetMyRequests) ---

    [Fact]
    public async Task GetMyRequests_ReturnsPatientsOwnRequests_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.GetAsync("/api/access-requests");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<AccessRequestDto>>();
        Assert.Single(body!);
    }

    [Fact]
    public async Task GetMyRequests_ReturnsDoctorsOwnRequests_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        SeedAccessRequest(db, doctor.Id, user.Id);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.GetAsync("/api/access-requests");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<AccessRequestDto>>();
        Assert.Single(body!);
    }

    [Fact]
    public async Task GetMyRequests_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/access-requests");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/access-requests/{userId} (GetRequestsFor) ---

    [Fact]
    public async Task GetRequestsFor_ReturnsOk_ForOwnUserId()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.GetAsync($"/api/access-requests/{user.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetRequestsFor_ReturnsOk_ForGuardianOfDependent()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        var relType = db.RelationshipTypes.First();
        db.FamilyGuardianships.Add(new FamilyGuardianship
        {
            GuardianUserId = guardian.Id, DependentUserId = dependent.Id,
            RelationshipTypeId = relType.Id, Status = "approved", IsActive = 1,
        });
        db.SaveChanges();
        Authorize(client, factory.MintToken(guardian.Id, "Patient", guardian.UtentNumber));

        var response = await client.GetAsync($"/api/access-requests/{dependent.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetRequestsFor_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(otherUser.Id, "Patient", otherUser.UtentNumber));

        var response = await client.GetAsync($"/api/access-requests/{user.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetRequestsFor_ReturnsForbidden_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.GetAsync($"/api/access-requests/{user.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetRequestsFor_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/access-requests/some-user-id");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- PUT /api/access-requests/{userId}/{requestId}/respond (RespondFor) ---

    [Fact]
    public async Task RespondFor_Approve_ReturnsNoContent()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{user.Id}/{request.Id}/respond", new RespondAccessRequest("approve"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task RespondFor_ReturnsBadRequest_ForInvalidAction()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{user.Id}/{request.Id}/respond", new RespondAccessRequest("banana"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RespondFor_ReturnsNotFound_ForUnknownRequestId()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{user.Id}/999/respond", new RespondAccessRequest("approve"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RespondFor_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        Authorize(client, factory.MintToken(otherUser.Id, "Patient", otherUser.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{user.Id}/{request.Id}/respond", new RespondAccessRequest("approve"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- DELETE /api/access-requests/{userId}/{requestId} (DeleteFor) ---

    [Fact]
    public async Task DeleteFor_ReturnsNoContent_WhenOwnedByUser()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.DeleteAsync($"/api/access-requests/{user.Id}/{request.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteFor_ReturnsNotFound_ForUnknownRequestId()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.DeleteAsync($"/api/access-requests/{user.Id}/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteFor_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id);
        Authorize(client, factory.MintToken(otherUser.Id, "Patient", otherUser.UtentNumber));

        var response = await client.DeleteAsync($"/api/access-requests/{user.Id}/{request.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/access-requests/search (SearchPatient) ---

    [Fact]
    public async Task SearchPatient_ReturnsOk_WhenFound()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db, utentNumber: "999888777");
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.GetAsync("/api/access-requests/search?utentNumber=999888777");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SearchPatient_ReturnsNotFound_WhenUnknownUtentNumber()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.GetAsync("/api/access-requests/search?utentNumber=000000000");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SearchPatient_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.GetAsync("/api/access-requests/search?utentNumber=999888777");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SearchPatient_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/access-requests/search?utentNumber=999888777");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/access-requests/{userId} (RequestAccess) ---

    [Fact]
    public async Task RequestAccess_ReturnsOk_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.PostAsync($"/api/access-requests/{user.Id}", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(db.AccessRequests.Where(r => r.UserId == user.Id && r.DoctorId == doctor.Id));
    }

    [Fact]
    public async Task RequestAccess_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PostAsync($"/api/access-requests/{user.Id}", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RequestAccess_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsync("/api/access-requests/some-user-id", content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/access-requests/{userId}/grant-dev (GrantAccessDev) ---

    [Fact]
    public async Task GrantAccessDev_ReturnsOk_ForExistingUser()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.PostAsync($"/api/access-requests/{user.Id}/grant-dev", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GrantAccessDev_ReturnsNotFound_ForUnknownUser()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.PostAsync("/api/access-requests/missing-user-id/grant-dev", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GrantAccessDev_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PostAsync($"/api/access-requests/{user.Id}/grant-dev", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/access-requests/{requestId}/respond (Respond, self-scoped) ---

    [Fact]
    public async Task Respond_Approve_ReturnsNoContent()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{request.Id}/respond", new RespondAccessRequest("approve"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Respond_ReturnsBadRequest_ForInvalidAction()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{request.Id}/respond", new RespondAccessRequest("banana"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Respond_ReturnsNotFound_ForRequestOwnedByAnotherPatient()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id, status: "pending");
        Authorize(client, factory.MintToken(otherUser.Id, "Patient", otherUser.UtentNumber));

        var response = await client.PutAsJsonAsync($"/api/access-requests/{request.Id}/respond", new RespondAccessRequest("approve"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/access-requests/{requestId} (Delete, self-scoped) ---

    [Fact]
    public async Task Delete_ReturnsNoContent_WhenOwnedByCaller()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var request = SeedAccessRequest(db, doctor.Id, user.Id);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.DeleteAsync($"/api/access-requests/{request.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_ForUnknownRequestId()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.DeleteAsync("/api/access-requests/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/access-requests/qr (ScanQr) ---

    [Fact]
    public async Task ScanQr_ReturnsOk_ForValidActiveCard()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123", cardActive: 1);
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.PostAsJsonAsync("/api/access-requests/qr", new ScanQrRequest($"MV:{user.Id}:REAL123"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ScanQr_ReturnsBadRequest_ForMalformedQr()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.PostAsJsonAsync("/api/access-requests/qr", new ScanQrRequest("not-a-valid-qr"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ScanQr_ReturnsLocked_ForSuspendedCard()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123", cardActive: 0);
        var doctor = TestDataFactory.SeedDoctor(db);
        Authorize(client, factory.MintToken(doctor.Id, "Doctor", doctor.OrdemMedicosId));

        var response = await client.PostAsJsonAsync("/api/access-requests/qr", new ScanQrRequest($"MV:{user.Id}:REAL123"));

        Assert.Equal((HttpStatusCode)423, response.StatusCode);
    }

    [Fact]
    public async Task ScanQr_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db, shareCode: "REAL123");
        Authorize(client, factory.MintToken(user.Id, "Patient", user.UtentNumber));

        var response = await client.PostAsJsonAsync("/api/access-requests/qr", new ScanQrRequest($"MV:{user.Id}:REAL123"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ScanQr_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/access-requests/qr", new ScanQrRequest("MV:x:y"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
