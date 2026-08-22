using Microsoft.Extensions.Caching.Memory;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class ClinicalRecordsServiceTests
{
    private static CreateVitalSignRequest VitalSignRequest(string? recordedAt = null) =>
        new(recordedAt ?? DateTime.UtcNow.ToString("o"), 120, 80, 70, 16, 36.5m, 98, 70.5m, 1.75m, "ok");

    // --- Vital signs ---

    [Fact]
    public async Task AddVitalSignAsync_PersistsEntry()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var dto = await sut.AddVitalSignAsync(user.Id, doctor.Id, VitalSignRequest());

        Assert.Equal(120, dto.BloodPressureSystolic);
        Assert.Single(db.VitalSigns);
    }

    [Fact]
    public async Task GetVitalSignsAsync_OrdersByRecordedAtDescending()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        await sut.AddVitalSignAsync(user.Id, doctor.Id, VitalSignRequest("2024-01-01T00:00:00Z"));
        await sut.AddVitalSignAsync(user.Id, doctor.Id, VitalSignRequest("2024-06-01T00:00:00Z"));

        var result = await sut.GetVitalSignsAsync(user.Id);

        Assert.Equal(2, result.Count);
        Assert.Equal("2024-06-01T00:00:00Z", result[0].RecordedAt);
    }

    [Fact]
    public async Task UpdateVitalSignAsync_UpdatesFields_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddVitalSignAsync(user.Id, doctor.Id, VitalSignRequest());

        var updated = await sut.UpdateVitalSignAsync(created.Id, user.Id, VitalSignRequest() with { HeartRate = 100 });

        Assert.True(updated);
        Assert.Equal(100, db.VitalSigns.First(v => v.Id == created.Id).HeartRate);
    }

    [Fact]
    public async Task UpdateVitalSignAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddVitalSignAsync(user.Id, doctor.Id, VitalSignRequest());

        var updated = await sut.UpdateVitalSignAsync(created.Id, otherUser.Id, VitalSignRequest());

        Assert.False(updated);
    }

    [Fact]
    public async Task DeleteVitalSignAsync_RemovesEntry_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddVitalSignAsync(user.Id, doctor.Id, VitalSignRequest());

        var result = await sut.DeleteVitalSignAsync(created.Id, user.Id);

        Assert.True(result);
        Assert.Empty(db.VitalSigns);
    }

    [Fact]
    public async Task DeleteVitalSignAsync_ReturnsFalse_WhenMissing()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        Assert.False(await sut.DeleteVitalSignAsync(999, user.Id));
    }

    // --- Clinical assessments ---

    [Fact]
    public async Task AddAssessmentAsync_PersistsEntry()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var dto = await sut.AddAssessmentAsync(user.Id, doctor.Id, new CreateAssessmentRequest("Gripe", "Repouso"));

        Assert.Equal("Gripe", dto.Hypothesis);
        Assert.Single(db.ClinicalAssessments);
    }

    [Fact]
    public async Task UpdateAssessmentAsync_UpdatesFields_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddAssessmentAsync(user.Id, doctor.Id, new CreateAssessmentRequest("Gripe", "Repouso"));

        var result = await sut.UpdateAssessmentAsync(created.Id, user.Id, new CreateAssessmentRequest("Constipação", "Antibiótico"));

        Assert.True(result);
        Assert.Equal("Constipação", db.ClinicalAssessments.First(a => a.Id == created.Id).Hypothesis);
    }

    [Fact]
    public async Task DeleteAssessmentAsync_RemovesEntry_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddAssessmentAsync(user.Id, doctor.Id, new CreateAssessmentRequest("Gripe", "Repouso"));

        Assert.True(await sut.DeleteAssessmentAsync(created.Id, user.Id));
        Assert.Empty(db.ClinicalAssessments);
    }

    // --- Anamnesis ---

    [Fact]
    public async Task GetAnamnesesAsync_MarksCanEdit_ForSameDoctorWithin24Hours()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        await sut.AddAnamnesisAsync(user.Id, doctor.Id, new UpsertAnamnesisRequest("Dor de cabeça", null, null));

        var result = await sut.GetAnamnesesAsync(user.Id, doctor.Id);

        Assert.Single(result);
        Assert.True(result[0].CanEdit);
    }

    [Fact]
    public async Task GetAnamnesesAsync_CanEditFalse_ForDifferentDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        await sut.AddAnamnesisAsync(user.Id, doctor.Id, new UpsertAnamnesisRequest("Dor de cabeça", null, null));

        var result = await sut.GetAnamnesesAsync(user.Id, otherDoctor.Id);

        Assert.Single(result);
        Assert.False(result[0].CanEdit);
    }

    [Fact]
    public async Task GetAnamnesesAsync_CanEditFalse_WhenPast24Hours()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        db.Anamneses.Add(new Anamnesis
        {
            UserId = user.Id, DoctorId = doctor.Id, ChiefComplaint = "Antiga",
            CreatedAt = DateTime.UtcNow.AddHours(-30).ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddHours(-30).ToString("o"),
        });
        db.SaveChanges();
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var result = await sut.GetAnamnesesAsync(user.Id, doctor.Id);

        Assert.False(result[0].CanEdit);
    }

    [Fact]
    public async Task UpdateAnamnesisAsync_ReturnsError_WhenNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var (success, error) = await sut.UpdateAnamnesisAsync(999, user.Id, doctor.Id, new UpsertAnamnesisRequest("x", null, null));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task UpdateAnamnesisAsync_ReturnsError_WhenDifferentDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddAnamnesisAsync(user.Id, doctor.Id, new UpsertAnamnesisRequest("Dor", null, null));

        var (success, error) = await sut.UpdateAnamnesisAsync(created.Id, user.Id, otherDoctor.Id, new UpsertAnamnesisRequest("Outra", null, null));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task UpdateAnamnesisAsync_ReturnsError_WhenPast24Hours()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        db.Anamneses.Add(new Anamnesis
        {
            UserId = user.Id, DoctorId = doctor.Id, ChiefComplaint = "Antiga",
            CreatedAt = DateTime.UtcNow.AddHours(-30).ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddHours(-30).ToString("o"),
        });
        db.SaveChanges();
        var entryId = db.Anamneses.First().Id;
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var (success, error) = await sut.UpdateAnamnesisAsync(entryId, user.Id, doctor.Id, new UpsertAnamnesisRequest("Nova", null, null));

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task UpdateAnamnesisAsync_Succeeds_WhenSameDoctorWithin24Hours()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var created = await sut.AddAnamnesisAsync(user.Id, doctor.Id, new UpsertAnamnesisRequest("Dor", null, null));

        var (success, error) = await sut.UpdateAnamnesisAsync(created.Id, user.Id, doctor.Id, new UpsertAnamnesisRequest("Dor forte", "hoje", null));

        Assert.True(success);
        Assert.Null(error);
        Assert.Equal("Dor forte", db.Anamneses.First(a => a.Id == created.Id).ChiefComplaint);
    }

    // --- Consultation (draft / finish) ---

    [Fact]
    public async Task SaveConsultationDraftAsync_CreatesNewDraft_WhenNoConsultationIdProvided()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var dto = await sut.SaveConsultationDraftAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal("draft", dto.Status);
        Assert.Null(dto.FinishedAt);
        Assert.Single(db.Consultations);
    }

    [Fact]
    public async Task SaveConsultationDraftAsync_UpdatesExistingDraft_WhenConsultationIdProvided()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var started = DateTime.UtcNow.ToString("o");
        var first = await sut.SaveConsultationDraftAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, started));

        var second = await sut.SaveConsultationDraftAsync(user.Id, doctor.Id, new SaveConsultationRequest(first.Id, started));

        Assert.Equal(first.Id, second.Id);
        Assert.Single(db.Consultations);
    }

    [Fact]
    public async Task FinishConsultationAsync_CreatesAndFinishes_WhenNoDraftExists()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        var dto = await sut.FinishConsultationAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal("finished", dto.Status);
        Assert.NotNull(dto.FinishedAt);
        Assert.Single(db.Consultations);
    }

    [Fact]
    public async Task FinishConsultationAsync_FinishesExistingDraft()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var started = DateTime.UtcNow.ToString("o");
        var draft = await sut.SaveConsultationDraftAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, started));

        var finished = await sut.FinishConsultationAsync(user.Id, doctor.Id, new SaveConsultationRequest(draft.Id, started));

        Assert.Equal(draft.Id, finished.Id);
        Assert.Equal("finished", finished.Status);
        Assert.NotNull(finished.FinishedAt);
        Assert.Single(db.Consultations);
    }

    [Fact]
    public async Task FinishConsultationAsync_RevokesDoctorsApprovedAccessRequest()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        db.AccessRequests.Add(new AccessRequest
        {
            DoctorId = doctor.Id, UserId = user.Id, Status = "approved",
            RequestedAt = DateTime.UtcNow.ToString("o"), ApprovedAt = DateTime.UtcNow.ToString("o"),
            ExpiresAt = DateTime.UtcNow.AddDays(7).ToString("o"),
        });
        db.SaveChanges();
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));

        await sut.FinishConsultationAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal("finished", db.AccessRequests.First().Status);
    }

    [Fact]
    public async Task GetFinishedConsultationsForDoctorAsync_ReturnsOnlyFinishedWithDuration()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new ClinicalRecordsService(db, new AccessControlService(db, new MemoryCache(new MemoryCacheOptions())));
        var start = DateTime.UtcNow.AddMinutes(-30);
        await sut.FinishConsultationAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, start.ToString("o")));
        await sut.SaveConsultationDraftAsync(user.Id, doctor.Id, new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        var result = await sut.GetFinishedConsultationsForDoctorAsync(doctor.Id);

        Assert.Single(result);
        Assert.Equal(user.Id, result[0].UserId);
        Assert.True(result[0].DurationMinutes >= 29 && result[0].DurationMinutes <= 31);
    }
}
