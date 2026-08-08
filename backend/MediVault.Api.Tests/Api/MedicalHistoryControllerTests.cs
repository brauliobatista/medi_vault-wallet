using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class MedicalHistoryControllerTests
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

    private static Icpc2Code SeedIcpc2Code(Data.MediVaultDbContext db) => db.Icpc2Codes.First();

    // --- GET /api/patients/{userId}/access-status ---

    [Fact]
    public async Task GetAccessStatus_ReturnsOk_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/access-status");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAccessStatus_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/access-status");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/patients/{userId}/summary ---

    [Fact]
    public async Task GetSummary_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetSummary_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/summary");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/patients/{userId}/blood-type ---

    [Fact]
    public async Task UpdateBloodType_ReturnsNoContent_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync($"/api/patients/{user.Id}/blood-type", new UpdateBloodTypeRequest("O+"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateBloodType_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync($"/api/patients/{user.Id}/blood-type", new UpdateBloodTypeRequest("O+"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/icpc2-codes ---

    [Fact]
    public async Task GetIcpc2Codes_ReturnsOk_WithSeededCodes()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/icpc2-codes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<Icpc2CodeDto>>();
        Assert.NotEmpty(body!);
    }

    [Fact]
    public async Task GetIcpc2Codes_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/icpc2-codes");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- Pathologies (Doctor-only writes) ---

    [Fact]
    public async Task AddPathology_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var icpc2 = SeedIcpc2Code(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/pathologies",
            new CreatePathologyRequest(icpc2.Id, "chronic", "2024-01-01", null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddPathology_ReturnsBadRequest_ForInvalidIcpc2Id()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/pathologies",
            new CreatePathologyRequest(999999, "chronic", "2024-01-01", null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddPathology_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var icpc2 = SeedIcpc2Code(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/pathologies",
            new CreatePathologyRequest(icpc2.Id, "chronic", "2024-01-01", null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeletePathology_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/pathologies/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Surgeries (patient can self-report) ---

    [Fact]
    public async Task AddSurgery_ReturnsCreated_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/surgeries",
            new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", "Hospital X", null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddSurgery_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/surgeries",
            new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", "Hospital X", null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSurgery_ReturnsNoContent_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/surgeries",
            new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", null, null))).Content.ReadFromJsonAsync<SurgicalHistoryDto>();

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/surgeries/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSurgery_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/surgeries/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Medications ---

    [Fact]
    public async Task AddMedication_ReturnsCreated_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/medications",
            new CreateChronicMedicationRequest("Ibuprofeno", "400mg", "1x/dia", "2024-01-01", null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMedication_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/medications/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Allergies ---

    [Fact]
    public async Task AddAllergy_ReturnsCreated_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/allergies",
            new CreateDrugAllergyRequest("Penicilina", "Urticária", "moderada"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAllergy_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/allergies/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Family history ---

    [Fact]
    public async Task UpsertFamilyHistory_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/family-history",
            new UpsertFamilyHistoryRequest("Diabetes", true, "pai", null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetFamilyHistory_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/family-history");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- Health habits ---

    [Fact]
    public async Task UpsertHabit_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var habitType = db.HabitTypes.FirstOrDefault();
        Assert.NotNull(habitType);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/habits",
            new UpsertHealthHabitRequest(habitType!.Id, "Tabaco", true, "diário", "10 cigarros", "2020-01-01", null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetHabits_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/habits");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
