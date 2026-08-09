using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class ExamServiceTests
{
    private static ExamService CreateSut(Data.MediVaultDbContext db, FakeWebHostEnvironment env) =>
        new(db, new UserService(db, env));

    // --- Analytical exams ---

    [Fact]
    public async Task AddAnalyticalExamAsync_FlagsParameterAsAbnormal_WhenOutOfReferenceRange()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var req = new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null,
            [new CreateParameterRequest("Glicose", 250, "mg/dL", 70, 110)]);

        var dto = await sut.AddAnalyticalExamAsync(user.Id, req);

        Assert.True(dto.Parameters[0].IsAbnormal);
    }

    [Fact]
    public async Task AddAnalyticalExamAsync_DoesNotFlagParameter_WhenWithinReferenceRange()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var req = new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null,
            [new CreateParameterRequest("Glicose", 90, "mg/dL", 70, 110)]);

        var dto = await sut.AddAnalyticalExamAsync(user.Id, req);

        Assert.False(dto.Parameters[0].IsAbnormal);
    }

    [Fact]
    public async Task AddAnalyticalExamAsync_CreatesReviewFlag_WhenAddedByPatient()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var req = new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []);

        await sut.AddAnalyticalExamAsync(user.Id, req, doctorId: null);

        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "mcdts"));
    }

    [Fact]
    public async Task AddAnalyticalExamAsync_DoesNotCreateReviewFlag_WhenAddedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = CreateSut(db, env);
        var req = new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []);

        await sut.AddAnalyticalExamAsync(user.Id, req, doctorId: doctor.Id);

        Assert.Empty(db.PendingReviewFlags);
    }

    [Fact]
    public async Task GetAnalyticalExamsAsync_ExcludesInactiveExams()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var exam = await sut.AddAnalyticalExamAsync(user.Id, new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []));
        await sut.SoftDeleteAnalyticalExamAsync(exam.Id, user.Id);

        var result = await sut.GetAnalyticalExamsAsync(user.Id);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SoftDeleteAnalyticalExamAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var exam = await sut.AddAnalyticalExamAsync(user.Id, new CreateAnalyticalExamRequest("2024-01-01", "Lab X", null, []));

        Assert.False(await sut.SoftDeleteAnalyticalExamAsync(exam.Id, otherUser.Id));
    }

    // --- Imaging exams ---

    [Fact]
    public async Task AddImagingExamAsync_CreatesReviewFlag_WhenAddedByPatient()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var req = new CreateImagingExamRequest("RX", "Torax", "2024-01-01", "Hospital", null);

        await sut.AddImagingExamAsync(user.Id, req);

        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "mcdts"));
    }

    [Fact]
    public async Task GetImagingExamsAsync_ExcludesInactiveExams()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var exam = await sut.AddImagingExamAsync(user.Id, new CreateImagingExamRequest("RX", "Torax", "2024-01-01", "Hospital", null));
        await sut.SoftDeleteImagingExamAsync(exam.Id, user.Id);

        var result = await sut.GetImagingExamsAsync(user.Id);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SoftDeleteImagingExamAsync_ReturnsFalse_WhenMissing()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);

        Assert.False(await sut.SoftDeleteImagingExamAsync(999, user.Id));
    }

    // --- Optometry exams ---

    [Fact]
    public async Task AddOptometryExamAsync_PersistsAndCreatesReviewFlag_WhenAddedByPatient()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        var req = new CreateOptometryExamRequest("2024-01-01", -1.5, -0.5, 90, -1.0, -0.25, 85, null);

        var dto = await sut.AddOptometryExamAsync(user.Id, req);

        Assert.Equal(-1.5, dto.RightSphere);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "mcdts"));
    }

    [Fact]
    public async Task GetOptometryExamsAsync_ReturnsSeededExams()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = CreateSut(db, env);
        await sut.AddOptometryExamAsync(user.Id, new CreateOptometryExamRequest("2024-01-01", -1.5, -0.5, 90, -1.0, -0.25, 85, null));

        var result = await sut.GetOptometryExamsAsync(user.Id);

        Assert.Single(result);
    }
}
