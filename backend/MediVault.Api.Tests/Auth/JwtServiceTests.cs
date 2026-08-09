using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using MediVault.Api.Auth;

namespace MediVault.Api.Tests.Auth;

public class JwtServiceTests
{
    private static JwtService CreateService(Dictionary<string, string?>? overrides = null)
    {
        var settings = new Dictionary<string, string?>
        {
            ["Jwt:Secret"] = "test-secret-test-secret-test-secret-1234",
            ["Jwt:Issuer"] = "medivault-tests",
            ["Jwt:ExpiryHours"] = "8",
        };
        if (overrides is not null)
            foreach (var (k, v) in overrides) settings[k] = v;

        var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new JwtService(config);
    }

    [Fact]
    public void GenerateToken_ProducesTokenWithExpectedClaims()
    {
        var sut = CreateService();

        var token = sut.GenerateToken("user-1", "Patient", "111222333");
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal("user-1", jwt.Subject);
        Assert.Equal("Patient", jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal("111222333", jwt.Claims.First(c => c.Type == "identifier").Value);
        Assert.Equal("medivault-tests", jwt.Issuer);
    }

    [Fact]
    public void GenerateToken_ProducesUniqueTokens_ForSameInputs()
    {
        var sut = CreateService();

        var token1 = sut.GenerateToken("user-1", "Patient", "111222333");
        var token2 = sut.GenerateToken("user-1", "Patient", "111222333");

        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void GenerateToken_ExpiresAroundConfiguredExpiryHours()
    {
        var sut = CreateService(new Dictionary<string, string?> { ["Jwt:ExpiryHours"] = "1" });

        var token = sut.GenerateToken("user-1", "Doctor", "OM123");
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        var expectedExpiry = DateTime.UtcNow.AddHours(1);
        Assert.True(Math.Abs((jwt.ValidTo - expectedExpiry).TotalMinutes) < 1);
    }

    [Fact]
    public void GenerateToken_DefaultsExpiryTo8Hours_WhenNotConfigured()
    {
        var sut = CreateService(new Dictionary<string, string?> { ["Jwt:ExpiryHours"] = null });

        var token = sut.GenerateToken("user-1", "Doctor", "OM123");
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        var expectedExpiry = DateTime.UtcNow.AddHours(8);
        Assert.True(Math.Abs((jwt.ValidTo - expectedExpiry).TotalMinutes) < 1);
    }

    [Fact]
    public void Constructor_Throws_WhenSecretNotConfigured()
    {
        var config = new ConfigurationBuilder().Build();

        Assert.Throws<InvalidOperationException>(() => new JwtService(config));
    }
}
