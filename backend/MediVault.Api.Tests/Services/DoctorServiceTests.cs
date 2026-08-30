using MediVault.Api.DTOs.Users;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class DoctorServiceTests
{
    [Fact]
    public async Task GetProfileAsync_ReturnsProfile_ForActiveDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db, speciality: "Cardiologia");
        var sut = new DoctorService(db);

        var result = await sut.GetProfileAsync(doctor.Id);

        Assert.NotNull(result);
        Assert.Equal(doctor.Id, result!.Id);
        Assert.Equal(doctor.Email, result.Email);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsInstitutionDetails()
    {
        using var db = TestDbContextFactory.Create();
        var institution = TestDataFactory.SeedInstitution(db, name: "Clínica Sul", type: "clinic", address: "Rua A, 123", phone: "212345678");
        var doctor = TestDataFactory.SeedDoctor(db, institutionId: institution.Id);
        var sut = new DoctorService(db);

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
        var sut = new DoctorService(db);

        var result = await sut.GetProfileAsync("missing-id");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsNull_WhenDoctorInactive()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db, isActive: 0);
        var sut = new DoctorService(db);

        var result = await sut.GetProfileAsync(doctor.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateProfileAsync_UpdatesEmailAndSpeciality_ReturnsTrue()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db);

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
        var sut = new DoctorService(db);

        var result = await sut.UpdateProfileAsync("missing-id", new UpdateDoctorRequest("a@b.com", null, null));

        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsTrue_WhenCurrentPasswordCorrect()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db);

        var result = await sut.ChangePasswordAsync(doctor.Id, new ChangePasswordRequest("correct-horse", "new-password"));

        Assert.True(result);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password", doctor.PasswordHash));
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsFalse_WhenCurrentPasswordWrong()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorService(db);

        var result = await sut.ChangePasswordAsync(doctor.Id, new ChangePasswordRequest("wrong-password", "new-password"));

        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsFalse_WhenDoctorNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var sut = new DoctorService(db);

        var result = await sut.ChangePasswordAsync("missing-id", new ChangePasswordRequest("x", "y"));

        Assert.False(result);
    }
}
