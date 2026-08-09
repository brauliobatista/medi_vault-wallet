using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class VaccinationsControllerTests
{
    private static Vaccine SeedVaccine(Data.MediVaultDbContext db) => db.Vaccines.First();

    // --- GET /api/vaccines ---

    [Fact]
    public async Task GetVaccines_ReturnsOk_WithSeededCatalogue()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/vaccines");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<Vaccine>>();
        Assert.NotEmpty(body!);
    }

    [Fact]
    public async Task GetVaccines_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/vaccines");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/patients/{userId}/vaccinations ---

    [Fact]
    public async Task GetVaccinations_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/vaccinations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetVaccinations_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/vaccinations");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- POST /api/patients/{userId}/vaccinations ---

    [Fact]
    public async Task AddVaccination_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/vaccinations",
            new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, "AB123", "Hospital", null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<VaccinationDto>();
        Assert.Equal(vaccine.Name, body!.VaccineName);
    }

    [Fact]
    public async Task AddVaccination_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/vaccinations",
            new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, "AB123", "Hospital", null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- DELETE /api/patients/{userId}/vaccinations/{id} ---

    [Fact]
    public async Task DeleteVaccination_ReturnsNoContent_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/vaccinations",
            new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, null, null, null))).Content.ReadFromJsonAsync<VaccinationDto>();

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/vaccinations/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteVaccination_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/vaccinations/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
