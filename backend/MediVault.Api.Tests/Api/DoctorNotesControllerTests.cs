using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class DoctorNotesControllerTests
{
    private static AccessRequest GrantDoctorAccess(Data.MediVaultDbContext db, string doctorId, string userId)
    {
        var request = new AccessRequest
        {
            DoctorId = doctorId, UserId = userId, Status = "approved",
            RequestedAt = DateTime.UtcNow.ToString("o"), ApprovedAt = DateTime.UtcNow.ToString("o"),
            ExpiresAt = DateTime.UtcNow.AddDays(7).ToString("o"),
        };
        db.AccessRequests.Add(request);
        db.SaveChanges();
        return request;
    }

    // --- GET /api/doctor-notes/{userId} ---

    [Fact]
    public async Task GetNotes_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/doctor-notes/{user.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetNotes_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/doctor-notes/{user.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetNotes_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/doctor-notes/{user.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetNotes_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/doctor-notes/some-user-id");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/doctor-notes ---

    [Fact]
    public async Task CreateNote_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync("/api/doctor-notes", new CreateDoctorNoteRequest(user.Id, "confidential", "nota secreta"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<DoctorNoteDto>();
        Assert.Equal("nota secreta", body!.NoteText);
    }

    [Fact]
    public async Task CreateNote_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync("/api/doctor-notes", new CreateDoctorNoteRequest(user.Id, "confidential", "nota secreta"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/doctor-notes/{noteId} ---

    [Fact]
    public async Task UpdateNote_ReturnsNoContent_WhenOwnedByDoctor()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync("/api/doctor-notes", new CreateDoctorNoteRequest(user.Id, "confidential", "original")))
            .Content.ReadFromJsonAsync<DoctorNoteDto>();

        var response = await client.PutAsJsonAsync($"/api/doctor-notes/{created!.Id}", "atualizada");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateNote_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync("/api/doctor-notes/999", "atualizada");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateNote_ReturnsNotFound_WhenOwnedByAnotherDoctor()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync("/api/doctor-notes", new CreateDoctorNoteRequest(user.Id, "confidential", "original")))
            .Content.ReadFromJsonAsync<DoctorNoteDto>();
        var otherClient = factory.CreateAuthorizedClient(otherDoctor.Id, "Doctor", otherDoctor.OrdemMedicosId);

        var response = await otherClient.PutAsJsonAsync($"/api/doctor-notes/{created!.Id}", "hacked");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/doctor-notes/{noteId} ---

    [Fact]
    public async Task DeleteNote_ReturnsNoContent_WhenOwnedByDoctor()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync("/api/doctor-notes", new CreateDoctorNoteRequest(user.Id, "confidential", "original")))
            .Content.ReadFromJsonAsync<DoctorNoteDto>();

        var response = await client.DeleteAsync($"/api/doctor-notes/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteNote_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.DeleteAsync("/api/doctor-notes/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/doctor-notes/flags/{userId} ---

    [Fact]
    public async Task GetFlags_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        db.PendingReviewFlags.Add(new PendingReviewFlag { UserId = user.Id, Section = "habits", CreatedAt = DateTime.UtcNow.ToString("o") });
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/doctor-notes/flags/{user.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<PendingReviewFlagDto>>();
        Assert.Single(body!);
    }

    [Fact]
    public async Task GetFlags_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/doctor-notes/flags/{user.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/doctor-notes/flags/{flagId}/review ---

    [Fact]
    public async Task MarkReviewed_ReturnsNoContent_WhenFlagExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var flag = new PendingReviewFlag { UserId = user.Id, Section = "habits", CreatedAt = DateTime.UtcNow.ToString("o") };
        db.PendingReviewFlags.Add(flag);
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsync($"/api/doctor-notes/flags/{flag.Id}/review", content: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task MarkReviewed_ReturnsNotFound_ForUnknownFlagId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsync("/api/doctor-notes/flags/999/review", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
