using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Users;

namespace MediVault.Api.Tests.Api;

public class DoctorsControllerTests
{
    // --- GET /api/doctors/me ---

    [Fact]
    public async Task GetProfile_ReturnsOwnProfile_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync("/api/doctors/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<DoctorProfileDto>();
        Assert.Equal(doctor.Id, body!.Id);
        Assert.Equal(doctor.InstitutionId, body.InstitutionId);
        Assert.False(string.IsNullOrEmpty(body.InstitutionName));
        Assert.False(string.IsNullOrEmpty(body.InstitutionType));
    }

    [Fact]
    public async Task GetProfile_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/doctors/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetProfile_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/doctors/me");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/doctors/me ---

    [Fact]
    public async Task UpdateProfile_ReturnsNoContent_AndPersistsChanges()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync("/api/doctors/me", new UpdateDoctorRequest("new@example.com", "Cardiologia"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var verifyDb = factory.CreateDbContext();
        Assert.Equal("new@example.com", verifyDb.Doctors.First(d => d.Id == doctor.Id).Email);
    }

    // --- PUT /api/doctors/me/password ---

    [Fact]
    public async Task ChangePassword_ReturnsNoContent_ForCorrectCurrentPassword()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync("/api/doctors/me/password", new ChangePasswordRequest("correct-horse", "new-password"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ReturnsBadRequest_ForWrongCurrentPassword()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync("/api/doctors/me/password", new ChangePasswordRequest("wrong-password", "new-password"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
