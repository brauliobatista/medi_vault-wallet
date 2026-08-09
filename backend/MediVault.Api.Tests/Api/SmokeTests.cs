using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Auth;

namespace MediVault.Api.Tests.Api;

public class SmokeTests
{
    [Fact]
    public async Task PatientLogin_ReturnsUnauthorized_ForUnknownUser_OverAnIsolatedTestDatabase()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/patient/login", new PatientLoginRequest("000000000", "x"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/access-requests");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_ReturnsOk_WithMintedToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();
        var token = factory.MintToken("u1", "Patient", "111222333");
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/access-requests");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
