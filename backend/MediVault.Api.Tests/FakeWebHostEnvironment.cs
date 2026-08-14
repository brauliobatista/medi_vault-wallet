using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace MediVault.Api.Tests;

/// <summary>
/// Minimal IWebHostEnvironment backed by a fresh temp directory, so services that read/write
/// under env.ContentRootPath (UserService photos, MedicalFileService documents) can be exercised
/// against a real (throwaway) filesystem instead of mocking File/Directory.
/// </summary>
public sealed class FakeWebHostEnvironment : IWebHostEnvironment, IDisposable
{
    public FakeWebHostEnvironment()
    {
        ContentRootPath = Path.Combine(Path.GetTempPath(), "medivault-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(ContentRootPath);
        ContentRootFileProvider = new PhysicalFileProvider(ContentRootPath);
    }

    public string EnvironmentName { get; set; } = "Testing";
    public string ApplicationName { get; set; } = "MediVault.Api.Tests";
    public string WebRootPath { get; set; } = string.Empty;
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string ContentRootPath { get; set; }
    public IFileProvider ContentRootFileProvider { get; set; }

    public void Dispose()
    {
        try { Directory.Delete(ContentRootPath, recursive: true); } catch { /* best-effort cleanup */ }
    }
}
