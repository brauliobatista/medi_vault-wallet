using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class MedicalHistoryServiceTests
{
    private static MedicalHistoryService CreateSut(Data.MediVaultDbContext db, FakeWebHostEnvironment env) =>
        new(db, new UserService(db, env));

    private static Icpc2Code SeedIcpc2Code(Data.MediVaultDbContext db, string code = "A01", string description = "Dor generalizada")
    {
        var entry = new Icpc2Code { Code = code, Description = description };
        db.Icpc2Codes.Add(entry);
        db.SaveChanges();
        return entry;
    }

    // --- Surgical history ---

    [Fact]
    public async Task AddSurgeryAsync_PersistsEntry_AndCreatesReviewFlag_WhenAddedByPatient()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var dto = await sut.AddSurgeryAsync(user.Id, new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", "Hospital X", null));

        Assert.Equal("Apendicectomia", dto.SurgeryName);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "history"));
    }

    [Fact]
    public async Task AddSurgeryAsync_DoesNotCreateReviewFlag_WhenAddedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = CreateSut(db, env);

        await sut.AddSurgeryAsync(user.Id, new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", "Hospital X", null), doctorId: doctor.Id);

        Assert.Empty(db.PendingReviewFlags);
    }

    [Fact]
    public async Task GetSurgeriesAsync_ExcludesSoftDeletedEntries()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var created = await sut.AddSurgeryAsync(user.Id, new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", null, null));
        await sut.SoftDeleteSurgeryAsync(created.Id, user.Id);

        var result = await sut.GetSurgeriesAsync(user.Id);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SoftDeleteSurgeryAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var created = await sut.AddSurgeryAsync(user.Id, new CreateSurgicalHistoryRequest("Apendicectomia", "2020-01-01", null, null));

        Assert.False(await sut.SoftDeleteSurgeryAsync(created.Id, otherUser.Id));
    }

    // --- Chronic medications ---

    [Fact]
    public async Task AddMedicationAsync_PersistsEntry_AndCreatesReviewFlag_WhenAddedByPatient()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var dto = await sut.AddMedicationAsync(user.Id, new CreateChronicMedicationRequest("Ibuprofeno", "400mg", "1x/dia", "2024-01-01", null));

        Assert.Equal("Ibuprofeno", dto.ActiveSubstance);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "medical_info"));
    }

    [Fact]
    public async Task GetMedicationsAsync_ExcludesSoftDeletedEntries()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var created = await sut.AddMedicationAsync(user.Id, new CreateChronicMedicationRequest("Ibuprofeno", "400mg", "1x/dia", "2024-01-01", null));
        await sut.SoftDeleteMedicationAsync(created.Id, user.Id);

        var result = await sut.GetMedicationsAsync(user.Id);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SoftDeleteMedicationAsync_ReturnsFalse_WhenMissing()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        Assert.False(await sut.SoftDeleteMedicationAsync(999, user.Id));
    }

    // --- Drug allergies ---

    [Fact]
    public async Task AddAllergyAsync_PersistsEntry_AndCreatesReviewFlag()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var dto = await sut.AddAllergyAsync(user.Id, new CreateDrugAllergyRequest("Penicilina", "Urticária", "moderada"));

        Assert.Equal("Penicilina", dto.ActiveSubstance);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "medical_info"));
    }

    [Fact]
    public async Task DeleteAllergyAsync_RemovesEntry_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var created = await sut.AddAllergyAsync(user.Id, new CreateDrugAllergyRequest("Penicilina", "Urticária", "moderada"));

        Assert.True(await sut.DeleteAllergyAsync(created.Id, user.Id));
        Assert.Empty(db.DrugAllergies);
    }

    [Fact]
    public async Task DeleteAllergyAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var created = await sut.AddAllergyAsync(user.Id, new CreateDrugAllergyRequest("Penicilina", "Urticária", "moderada"));

        Assert.False(await sut.DeleteAllergyAsync(created.Id, otherUser.Id));
    }

    // --- Family history ---

    [Fact]
    public async Task UpsertFamilyHistoryAsync_CreatesNewEntry_AndReviewFlag()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var dto = await sut.UpsertFamilyHistoryAsync(user.Id, new UpsertFamilyHistoryRequest("Diabetes", true, "pai", null));

        Assert.True(dto.HasCondition);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "medical_info"));
    }

    [Fact]
    public async Task UpsertFamilyHistoryAsync_UpdatesExisting_ForSameCondition_InsteadOfDuplicating()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        await sut.UpsertFamilyHistoryAsync(user.Id, new UpsertFamilyHistoryRequest("Diabetes", true, "pai", null));

        var updated = await sut.UpsertFamilyHistoryAsync(user.Id, new UpsertFamilyHistoryRequest("Diabetes", false, null, "resolvido"));

        Assert.Single(db.FamilyHistories);
        Assert.False(updated.HasCondition);
    }

    // --- Patient summary / blood type ---

    [Fact]
    public async Task GetPatientSummaryAsync_ReturnsSummary_ForActiveUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var result = await sut.GetPatientSummaryAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(user.Id, result!.UserId);
    }

    [Fact]
    public async Task GetPatientSummaryAsync_ReturnsNull_WhenUserInactive()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db, isActive: 0);
        var sut = CreateSut(db, env);

        Assert.Null(await sut.GetPatientSummaryAsync(user.Id));
    }

    [Fact]
    public async Task UpdateBloodTypeAsync_UpdatesBloodType_WhenUserExists()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var result = await sut.UpdateBloodTypeAsync(user.Id, "O+");

        Assert.True(result);
        Assert.Equal("O+", db.Users.First(u => u.Id == user.Id).BloodType);
    }

    [Fact]
    public async Task UpdateBloodTypeAsync_ReturnsFalse_WhenUserNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = CreateSut(db, env);

        Assert.False(await sut.UpdateBloodTypeAsync("missing-id", "O+"));
    }

    // --- Pathologies ---

    [Fact]
    public async Task AddPathologyAsync_ReturnsNull_WhenIcpc2CodeInvalid()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        var result = await sut.AddPathologyAsync(user.Id, new CreatePathologyRequest(999, "active", "2024-01-01", null));

        Assert.Null(result);
    }

    [Fact]
    public async Task AddPathologyAsync_PersistsEntry_WhenIcpc2CodeValid()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var icpc2 = SeedIcpc2Code(db);
        var sut = CreateSut(db, env);

        var result = await sut.AddPathologyAsync(user.Id, new CreatePathologyRequest(icpc2.Id, "active", "2024-01-01", null));

        Assert.NotNull(result);
        Assert.Equal(icpc2.Description, result!.Icpc2Description);
    }

    [Fact]
    public async Task DeletePathologyAsync_RemovesEntry_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var icpc2 = SeedIcpc2Code(db);
        var sut = CreateSut(db, env);
        var created = await sut.AddPathologyAsync(user.Id, new CreatePathologyRequest(icpc2.Id, "active", "2024-01-01", null));

        Assert.True(await sut.DeletePathologyAsync(created!.Id, user.Id));
        Assert.Empty(db.UserPathologies);
    }

    [Fact]
    public async Task GetIcpc2CodesAsync_ReturnsCodesOrderedByDescription()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        SeedIcpc2Code(db, "B01", "Zebra");
        SeedIcpc2Code(db, "A01", "Alpha");
        var sut = CreateSut(db, env);

        var result = await sut.GetIcpc2CodesAsync();

        Assert.Equal("Alpha", result[0].Description);
        Assert.Equal("Zebra", result[1].Description);
    }
}
