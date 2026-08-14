using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class HealthHabitServiceTests
{
    private static HealthHabitService CreateSut(Data.MediVaultDbContext db, FakeWebHostEnvironment env) =>
        new(db, new UserService(db, env));

    private static HabitType SeedHabitType(Data.MediVaultDbContext db, string code)
    {
        var type = new HabitType { Code = code, Description = code };
        db.HabitTypes.Add(type);
        db.SaveChanges();
        return type;
    }

    [Fact]
    public async Task UpsertHabitAsync_CreatesNewHabit_AndReviewFlag()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var habitType = SeedHabitType(db, "tobacco");
        var sut = CreateSut(db, env);

        var dto = await sut.UpsertHabitAsync(user.Id, new UpsertHealthHabitRequest(habitType.Id, "Tabaco", true, "diário", "10 cigarros", "2020-01-01", null));

        Assert.Equal(habitType.Id, dto.TypeId);
        Assert.True(dto.Consumes);
        Assert.Single(db.HealthHabits);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "habits"));
    }

    [Fact]
    public async Task UpsertHabitAsync_UpdatesExistingHabit_ForSameType_InsteadOfDuplicating()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var habitType = SeedHabitType(db, "tobacco");
        var sut = CreateSut(db, env);
        await sut.UpsertHabitAsync(user.Id, new UpsertHealthHabitRequest(habitType.Id, "Tabaco", true, "diário", "10 cigarros", "2020-01-01", null));

        var updated = await sut.UpsertHabitAsync(user.Id, new UpsertHealthHabitRequest(habitType.Id, "Tabaco", false, null, null, null, "parou"));

        Assert.Single(db.HealthHabits);
        Assert.False(updated.Consumes);
        Assert.Equal("parou", updated.Details);
    }

    [Fact]
    public async Task GetHabitsAsync_ReturnsHabitsOrderedByType()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var tobacco = SeedHabitType(db, "tobacco");
        var alcohol = SeedHabitType(db, "alcohol");
        var sut = CreateSut(db, env);
        await sut.UpsertHabitAsync(user.Id, new UpsertHealthHabitRequest(alcohol.Id, "Álcool", true, null, null, null, null));
        await sut.UpsertHabitAsync(user.Id, new UpsertHealthHabitRequest(tobacco.Id, "Tabaco", true, null, null, null, null));

        var result = await sut.GetHabitsAsync(user.Id);

        Assert.Equal(2, result.Count);
        Assert.Equal(tobacco.Id, result[0].TypeId);
        Assert.Equal(alcohol.Id, result[1].TypeId);
    }
}
