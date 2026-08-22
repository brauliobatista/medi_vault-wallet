using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MediVault.Api.Auth;
using MediVault.Api.Data;

namespace MediVault.Api.Tests.Api;

/// <summary>
/// Boots the real ASP.NET Core app (routing, model binding, [Authorize], filters — everything
/// unit tests skip) against an isolated in-memory SQLite database, so API tests exercise actual
/// HTTP requests/responses instead of calling services directly. One factory = one throwaway
/// database; create a fresh instance per test for full isolation (mirrors TestDbContextFactory).
/// </summary>
public sealed class ApiTestFactory : WebApplicationFactory<Program>
{
    public const string JwtSecret = "integration-test-secret-integration-test-secret-1234";
    public const string JwtIssuer = "medivault-api-tests";
    public const string EncryptionKey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public ApiTestFactory()
    {
        // Program.cs reads Jwt:Secret synchronously at top-level (before Build()) to configure
        // JwtBearerOptions, which runs before ConfigureAppConfiguration/ConfigureServices below
        // ever get merged in. Environment variables are the one source WebApplication.CreateBuilder
        // reads early enough (at CreateBuilder() itself) to be visible to that eager read.
        Environment.SetEnvironmentVariable("Jwt__Secret", JwtSecret);
        Environment.SetEnvironmentVariable("Jwt__Issuer", JwtIssuer);
        Environment.SetEnvironmentVariable("Jwt__ExpiryHours", "8");
        Environment.SetEnvironmentVariable("Encryption__Key", EncryptionKey);

        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<MediVaultDbContext>>();
            services.AddDbContext<MediVaultDbContext>(opt => opt.UseSqlite(_connection));
        });
    }

    /// <summary>
    /// A DbContext sharing the same in-memory database the running host uses, for arrange/assert steps.
    /// Touches <see cref="Server"/> first so the host (and its schema/seed startup logic) is guaranteed
    /// to exist before seeding — safe to call before CreateClient()/CreateAuthorizedClient().
    /// </summary>
    public MediVaultDbContext CreateDbContext()
    {
        _ = Server;
        var options = new DbContextOptionsBuilder<MediVaultDbContext>().UseSqlite(_connection).Options;
        return new MediVaultDbContext(options);
    }

    /// <summary>Mints a real JWT via the app's own JwtService, matching production claims exactly.</summary>
    public string MintToken(string id, string role, string identifier) =>
        Services.GetRequiredService<JwtService>().GenerateToken(id, role, identifier);

    /// <summary>An HttpClient with a Bearer token already attached, for testing [Authorize]-protected endpoints.</summary>
    public HttpClient CreateAuthorizedClient(string id, string role, string identifier)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", MintToken(id, role, identifier));
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}
