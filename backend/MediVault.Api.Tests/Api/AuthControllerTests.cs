using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Auth;

namespace MediVault.Api.Tests.Api;

public class AuthControllerTests
{
    // --- POST /api/auth/patient/login ---

    [Fact]
    public async Task PatientLogin_ReturnsOkWithToken_ForValidCredentials()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db, utentNumber: "111222333");

        var response = await client.PostAsJsonAsync("/api/auth/patient/login", new PatientLoginRequest("111222333", "correct-horse"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal("Patient", body!.Role);
        Assert.Equal(user.Id, body.Id);
        Assert.False(string.IsNullOrWhiteSpace(body.Token));
    }

    [Fact]
    public async Task PatientLogin_ReturnsUnauthorized_ForWrongPassword()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        TestDataFactory.SeedUser(db, utentNumber: "111222333");

        var response = await client.PostAsJsonAsync("/api/auth/patient/login", new PatientLoginRequest("111222333", "wrong-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PatientLogin_ReturnsUnauthorized_ForUnknownUtentNumber()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/patient/login", new PatientLoginRequest("000000000", "whatever"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PatientLogin_ReturnsUnauthorized_ForInactiveUser()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        TestDataFactory.SeedUser(db, utentNumber: "111222333", isActive: 0);

        var response = await client.PostAsJsonAsync("/api/auth/patient/login", new PatientLoginRequest("111222333", "correct-horse"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/auth/doctor/login ---

    [Fact]
    public async Task DoctorLogin_ReturnsOkWithToken_ForValidCredentials()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db, ordemMedicosId: "OM12345");

        var response = await client.PostAsJsonAsync("/api/auth/doctor/login", new DoctorLoginRequest("OM12345", "correct-horse"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal("Doctor", body!.Role);
        Assert.Equal(doctor.Id, body.Id);
    }

    [Fact]
    public async Task DoctorLogin_ReturnsUnauthorized_ForWrongPassword()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        TestDataFactory.SeedDoctor(db, ordemMedicosId: "OM12345");

        var response = await client.PostAsJsonAsync("/api/auth/doctor/login", new DoctorLoginRequest("OM12345", "wrong-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DoctorLogin_ReturnsUnauthorized_ForUnknownOrdemMedicosId()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/doctor/login", new DoctorLoginRequest("OM00000", "whatever"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DoctorLogin_ReturnsUnauthorized_ForInactiveDoctor()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        using var db = factory.CreateDbContext();
        TestDataFactory.SeedDoctor(db, ordemMedicosId: "OM12345", isActive: 0);

        var response = await client.PostAsJsonAsync("/api/auth/doctor/login", new DoctorLoginRequest("OM12345", "correct-horse"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
