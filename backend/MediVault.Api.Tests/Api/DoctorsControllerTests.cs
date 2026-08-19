using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Entities;

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

    // --- GET /api/doctors/me/finished-consultations ---

    [Fact]
    public async Task GetFinishedConsultations_ReturnsOnlyThisDoctorsFinishedConsultations()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        db.Consultations.Add(new Consultation
        {
            UserId = user.Id, DoctorId = doctor.Id, Status = "finished",
            StartedAt = DateTime.UtcNow.AddMinutes(-15).ToString("o"), FinishedAt = DateTime.UtcNow.ToString("o"),
        });
        db.Consultations.Add(new Consultation { UserId = user.Id, DoctorId = doctor.Id, Status = "draft", StartedAt = DateTime.UtcNow.ToString("o") });
        db.Consultations.Add(new Consultation
        {
            UserId = user.Id, DoctorId = otherDoctor.Id, Status = "finished",
            StartedAt = DateTime.UtcNow.AddMinutes(-15).ToString("o"), FinishedAt = DateTime.UtcNow.ToString("o"),
        });
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync("/api/doctors/me/finished-consultations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<FinishedConsultationDto>>();
        Assert.Single(body!);
        Assert.Equal(user.Id, body![0].UserId);
        Assert.Equal(user.Id, body[0].PatientPublicId);
        Assert.Equal(user.UtentNumber, body[0].UtentNumber);
    }
}
