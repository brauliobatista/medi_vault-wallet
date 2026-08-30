using Microsoft.AspNetCore.Http;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class UserServiceTests
{
    private static IFormFile CreateFormFile(string fileName, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsProfile_ForActiveUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        var result = await sut.GetProfileAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(user.Id, result!.Id);
        Assert.Equal(user.Email, result.Email);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsNull_WhenUserInactive()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db, isActive: 0);
        var sut = new UserService(db, env);

        var result = await sut.GetProfileAsync(user.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateProfileAsync_UpdatesFieldsAndCreatesReviewFlag()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        var result = await sut.UpdateProfileAsync(user.Id,
            new UpdateUserRequest("new@example.com", "912345678", "Enfermeiro", "Casado", true, false, null, null, null, "351"));

        Assert.True(result);
        var updated = await sut.GetProfileAsync(user.Id);
        Assert.Equal("new@example.com", updated!.Email);
        Assert.Equal("912345678", updated.Phone);
        Assert.Equal("351", updated.PhoneCountryCode);
        Assert.True(updated.AcceptsTransfusion);
        Assert.False(updated.AcceptsResuscitation);
        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "identification"));
    }

    [Fact]
    public async Task UpdateProfileAsync_ReturnsFalse_WhenUserNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new UserService(db, env);

        var result = await sut.UpdateProfileAsync("missing-id",
            new UpdateUserRequest(null, null, null, null, null, null, null, null, null, null));

        Assert.False(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsTrue_WhenCurrentPasswordCorrect()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        var result = await sut.ChangePasswordAsync(user.Id, new ChangePasswordRequest("correct-horse", "new-password"));

        Assert.True(result);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password", user.PasswordHash));
    }

    [Fact]
    public async Task ChangePasswordAsync_ReturnsFalse_WhenCurrentPasswordWrong()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        var result = await sut.ChangePasswordAsync(user.Id, new ChangePasswordRequest("wrong", "new-password"));

        Assert.False(result);
    }

    [Fact]
    public async Task GetPublicInfoAsync_ReturnsInfo_ForActiveUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        var result = await sut.GetPublicInfoAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal($"{user.FirstName} {user.LastName}", result!.Value.Name);
    }

    [Fact]
    public async Task GetPublicInfoAsync_ReturnsNull_WhenUserMissing()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new UserService(db, env);

        var result = await sut.GetPublicInfoAsync("missing-id");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetQrPayloadAsync_GeneratesAndPersistsShareCode_WhenMissing()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db, shareCode: "");
        var sut = new UserService(db, env);

        var payload = await sut.GetQrPayloadAsync(user.Id);

        Assert.NotNull(payload);
        Assert.StartsWith($"MV:{user.Id}:", payload);
        var persisted = db.Users.First(u => u.Id == user.Id).ShareCode;
        Assert.False(string.IsNullOrEmpty(persisted));
    }

    [Fact]
    public async Task GetQrPayloadAsync_ReusesExistingShareCode()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db, shareCode: "ABC123");
        var sut = new UserService(db, env);

        var payload = await sut.GetQrPayloadAsync(user.Id);

        Assert.Equal($"MV:{user.Id}:ABC123", payload);
    }

    [Fact]
    public async Task CreateFlagAsync_AddsPendingReviewFlag()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        await sut.CreateFlagAsync(user.Id, "habits");

        Assert.Single(db.PendingReviewFlags.Where(f => f.UserId == user.Id && f.Section == "habits"));
    }

    [Fact]
    public async Task ToggleCardAsync_ActivatesAndDeactivatesCard()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db, cardActive: 1);
        var sut = new UserService(db, env);

        var deactivated = await sut.ToggleCardAsync(user.Id, false);
        Assert.True(deactivated);
        Assert.Equal(0, db.Users.First(u => u.Id == user.Id).CardActive);

        var activated = await sut.ToggleCardAsync(user.Id, true);
        Assert.True(activated);
        Assert.Equal(1, db.Users.First(u => u.Id == user.Id).CardActive);
    }

    [Fact]
    public async Task ToggleCardAsync_ReturnsFalse_WhenUserNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new UserService(db, env);

        var result = await sut.ToggleCardAsync("missing-id", true);

        Assert.False(result);
    }

    [Fact]
    public async Task DeletePhotoAsync_ReturnsTrue_WhenNoPhotoSet()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);

        var result = await sut.DeletePhotoAsync(user.Id);

        Assert.True(result);
    }

    [Fact]
    public async Task DeletePhotoAsync_ReturnsFalse_WhenUserNotFound()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var sut = new UserService(db, env);

        var result = await sut.DeletePhotoAsync("missing-id");

        Assert.False(result);
    }

    [Fact]
    public async Task UploadPhotoAsync_ReturnsNull_ForUnsupportedExtension()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);
        var file = CreateFormFile("malware.exe", [1, 2, 3]);

        var result = await sut.UploadPhotoAsync(user.Id, file);

        Assert.Null(result);
    }

    [Fact]
    public async Task UploadPhotoAsync_StoresFile_AndReturnsUrl_ForValidImage()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);
        var file = CreateFormFile("photo.png", [1, 2, 3, 4]);

        var url = await sut.UploadPhotoAsync(user.Id, file);

        Assert.NotNull(url);
        Assert.StartsWith("/uploads/profile-photos/", url);
        var storedPath = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "profile-photos");
        Assert.Single(Directory.GetFiles(storedPath));
    }

    [Fact]
    public async Task UploadPhotoAsync_ReturnsNull_ForEmptyFile()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var sut = new UserService(db, env);
        var file = CreateFormFile("empty.png", []);

        var result = await sut.UploadPhotoAsync(user.Id, file);

        Assert.Null(result);
    }
}
