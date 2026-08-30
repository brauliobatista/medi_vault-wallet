using Microsoft.AspNetCore.Http;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class DoctorServiceTests
{
    private static IFormFile CreateFormFile(string fileName, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsProfile_ForActiveDoctor()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db, speciality: "Cardiologia");
        var sut = new DoctorService(db, env);

        var result = await sut.GetProfileAsync(doctor.Id);

        Assert.NotNull(result);
        Assert.Equal(doctor.Id, result!.Id);
        Assert.Equal(doctor.Email, result.Email);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsInstitutionDetails()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var institution = TestDataFactory.SeedInstitution(db, name: "Clínica Sul", type: "clinic", address: "Rua A, 123", phone: "212345678");
        var doctor = TestDataFactory.SeedDoctor(db, institutionId: institution.Id);
        var sut = new DoctorService(db, env);

        var result = await sut.GetProfileAsync(doctor.Id);

        Assert.NotNull(result);
        Assert.Equal("Clínica Sul", result!.InstitutionName);
        Assert.Equal("clinic", result.InstitutionType);
        Assert.Equal("Rua A, 123", result.InstitutionAddress);
        Assert.Equal("212345678", result.InstitutionPhone);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsNull_WhenDoctorNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new DoctorService(db, env);

        var result = await sut.GetProfileAsync("missing-id");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsNull_WhenDoctorInactive()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db, isActive: 0);
        var sut = new DoctorService(db, env);

        var result = await sut.GetProfileAsync(doctor.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateProfileAsync_UpdatesEmailAndSpeciality_ReturnsTrue()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);

        var result = await sut.UpdateProfileAsync(doctor.Id, new UpdateDoctorRequest("new@example.com", "Pediatria", null));

        Assert.True(result);
        var updated = await sut.GetProfileAsync(doctor.Id);
        Assert.Equal("new@example.com", updated!.Email);
        Assert.Equal("Pediatria", updated.Speciality);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReturnsFalse_WhenDoctorNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new DoctorService(db, env);

        var result = await sut.UpdateProfileAsync("missing-id", new UpdateDoctorRequest("a@b.com", null, null));

        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsTrue_WhenCurrentPasswordCorrect()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);

        var result = await sut.ChangePasswordAsync(doctor.Id, new ChangePasswordRequest("correct-horse", "new-password"));

        Assert.True(result);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password", doctor.PasswordHash));
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsFalse_WhenCurrentPasswordWrong()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);

        var result = await sut.ChangePasswordAsync(doctor.Id, new ChangePasswordRequest("wrong-password", "new-password"));

        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsFalse_WhenDoctorNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new DoctorService(db, env);

        var result = await sut.ChangePasswordAsync("missing-id", new ChangePasswordRequest("x", "y"));

        Assert.False(result);
    }

    [Fact]
    public async Task UploadPhotoAsync_ReturnsNull_ForUnsupportedExtension()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);
        var file = CreateFormFile("malware.exe", [1, 2, 3]);

        var result = await sut.UploadPhotoAsync(doctor.Id, file);

        Assert.Null(result);
    }

    [Fact]
    public async Task UploadPhotoAsync_StoresFile_AndReturnsUrl_ForValidImage()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);
        var file = CreateFormFile("photo.png", [1, 2, 3, 4]);

        var url = await sut.UploadPhotoAsync(doctor.Id, file);

        Assert.NotNull(url);
        Assert.StartsWith("/uploads/doctor-photos/", url);
        var storedPath = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "doctor-photos");
        Assert.Single(Directory.GetFiles(storedPath));
    }

    [Fact]
    public async Task UploadPhotoAsync_ReturnsNull_ForEmptyFile()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);
        var file = CreateFormFile("empty.png", []);

        var result = await sut.UploadPhotoAsync(doctor.Id, file);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeletePhotoAsync_ReturnsTrue_WhenNoPhotoSet()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db, env);

        var result = await sut.DeletePhotoAsync(doctor.Id);

        Assert.True(result);
    }

    [Fact]
    public async Task DeletePhotoAsync_ReturnsFalse_WhenDoctorNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new DoctorService(db, env);

        var result = await sut.DeletePhotoAsync("missing-id");

        Assert.False(result);
    }
}
