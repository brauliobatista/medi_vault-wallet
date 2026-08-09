using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class ExamsControllerTests
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

    // --- Analytical exams ---

    [Fact]
    public async Task GetAnalytical_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/exams/analytical");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAnalytical_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/exams/analytical");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAnalytical_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/exams/analytical");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAnalytical_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/patients/some-user-id/exams/analytical");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AddAnalytical_ReturnsCreated_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);
        var req = new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null,
            [new CreateParameterRequest("Glicose", 250, "mg/dL", 70, 110)]);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/analytical", req);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AnalyticalExamDto>();
        Assert.True(body!.Parameters[0].IsAbnormal);
    }

    [Fact]
    public async Task AddAnalytical_ReturnsCreated_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/analytical",
            new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddAnalytical_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/analytical",
            new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAnalytical_ReturnsNoContent_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/analytical",
            new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []))).Content.ReadFromJsonAsync<AnalyticalExamDto>();

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/exams/analytical/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAnalytical_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/exams/analytical/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Imaging exams ---

    [Fact]
    public async Task GetImaging_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/exams/imaging");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddImaging_ReturnsCreated_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/imaging",
            new CreateImagingExamRequest("RX", "Torax", "2024-01-01", "Hospital", null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddImaging_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/imaging",
            new CreateImagingExamRequest("RX", "Torax", "2024-01-01", "Hospital", null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteImaging_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/exams/imaging/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Optometry exams ---

    [Fact]
    public async Task GetOptometry_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/exams/optometry");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddOptometry_ReturnsCreated_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/optometry",
            new CreateOptometryExamRequest("2024-01-01", -1.5, -0.5, 90, -1.0, -0.25, 85, null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddOptometry_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/exams/optometry",
            new CreateOptometryExamRequest("2024-01-01", -1.5, -0.5, 90, -1.0, -0.25, 85, null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
