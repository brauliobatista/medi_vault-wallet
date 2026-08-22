using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class VaccinationServiceTests
{
    private static VaccinationService CreateSut(Data.MediVaultDbContext db, FakeWebHostEnvironment env) =>
        new(db, new UserService(db, env));

    private static Vaccine SeedVaccine(Data.MediVaultDbContext db, string name = "Tétano")
    {
        var vaccine = new Vaccine { Name = name };
        db.Vaccines.Add(vaccine);
        db.SaveChanges();
        return vaccine;
    }

    [Fact]
    public async Task AddVaccinationAsync_Throws_WhenVaccineNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(999, "1", "2024-01-01", null, "AB123", "Hospital", null)));
    }

    [Fact]
    public async Task AddVaccinationAsync_PersistsEntry_AndCreatesReviewFlag_WhenAddedByPatient()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var sut = CreateSut(db, env);

        var dto = await sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, "AB123", "Hospital", null));

        Assert.Equal(vaccine.Name, dto.VaccineName);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "medical_info"));
    }

    [Fact]
    public async Task AddVaccinationAsync_DoesNotCreateReviewFlag_WhenAddedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var vaccine = SeedVaccine(db);
        var sut = CreateSut(db, env);

        await sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, "AB123", "Hospital", null), doctorId: doctor.Id);

        Assert.Empty(db.PendingReviewFlags);
    }

    [Fact]
    public async Task GetVaccinationsAsync_OrdersByAdministeredAtDescending()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var sut = CreateSut(db, env);
        await sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(vaccine.Id, "1", "2023-01-01", null, null, null, null));
        await sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(vaccine.Id, "2", "2024-01-01", null, null, null, null));

        var result = await sut.GetVaccinationsAsync(user.Id);

        Assert.Equal(2, result.Count);
        Assert.Equal("2024-01-01", result[0].AdministeredAt);
    }

    [Fact]
    public async Task DeleteVaccinationAsync_RemovesEntry_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var sut = CreateSut(db, env);
        var dto = await sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, null, null, null));

        Assert.True(await sut.DeleteVaccinationAsync(dto.Id, user.Id));
        Assert.Empty(db.UserVaccinations);
    }

    [Fact]
    public async Task DeleteVaccinationAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var vaccine = SeedVaccine(db);
        var sut = CreateSut(db, env);
        var dto = await sut.AddVaccinationAsync(user.Id, new CreateVaccinationRequest(vaccine.Id, "1", "2024-01-01", null, null, null, null));

        Assert.False(await sut.DeleteVaccinationAsync(dto.Id, otherUser.Id));
    }

    [Fact]
    public async Task GetAllVaccinesAsync_ReturnsSeededVaccines()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        SeedVaccine(db, "Tétano");
        SeedVaccine(db, "Gripe");
        var sut = CreateSut(db, env);

        var result = await sut.GetAllVaccinesAsync();

        Assert.Equal(2, result.Count);
    }
}
