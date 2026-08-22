using Microsoft.AspNetCore.Http;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class MedicalFileServiceTests
{
    private static IFormFile CreateFormFile(string fileName, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName);
    }

    [Fact]
    public async Task UploadAsync_ReturnsError_ForUnsupportedExtension()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new MedicalFileService(db, env);
        var file = CreateFormFile("virus.exe", [1, 2, 3]);

        var (dto, error) = await sut.UploadAsync(user.Id, doctor.Id, file);

        Assert.Null(dto);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task UploadAsync_ReturnsError_WhenFileTooLarge()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new MedicalFileService(db, env);
        var file = CreateFormFile("big.pdf", new byte[11 * 1024 * 1024]);

        var (dto, error) = await sut.UploadAsync(user.Id, doctor.Id, file);

        Assert.Null(dto);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task UploadAsync_StoresFileOnDisk_AndPersistsRecord_ForValidFile()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new MedicalFileService(db, env);
        var file = CreateFormFile("exame.pdf", [1, 2, 3, 4]);

        var (dto, error) = await sut.UploadAsync(user.Id, doctor.Id, file);

        Assert.Null(error);
        Assert.NotNull(dto);
        Assert.Equal("exame.pdf", dto!.FileName);
        Assert.Equal($"{doctor.FirstName} {doctor.LastName}", dto.UploadedByName);
        var storedDir = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "documents");
        Assert.Single(Directory.GetFiles(storedDir));
    }

    [Fact]
    public async Task GetDocumentsAsync_OrdersByUploadedAtDescending()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new MedicalFileService(db, env);
        await sut.UploadAsync(user.Id, doctor.Id, CreateFormFile("a.pdf", [1]));
        await Task.Delay(10);
        await sut.UploadAsync(user.Id, doctor.Id, CreateFormFile("b.pdf", [1]));

        var result = await sut.GetDocumentsAsync(user.Id);

        Assert.Equal(2, result.Count);
        Assert.Equal("b.pdf", result[0].FileName);
    }

    [Fact]
    public async Task DeleteAsync_RemovesRecordAndFile_WhenOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new MedicalFileService(db, env);
        var (dto, _) = await sut.UploadAsync(user.Id, doctor.Id, CreateFormFile("exame.pdf", [1, 2, 3]));
        var storedDir = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "documents");

        var result = await sut.DeleteAsync(dto!.Id, user.Id);

        Assert.True(result);
        Assert.Empty(db.MedicalFiles);
        Assert.Empty(Directory.GetFiles(storedDir));
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotOwnedByUser()
    {
        using var db = TestDbContextFactory.Create();
        using var env = new FakeWebHostEnvironment();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new MedicalFileService(db, env);
        var (dto, _) = await sut.UploadAsync(user.Id, doctor.Id, CreateFormFile("exame.pdf", [1, 2, 3]));

        Assert.False(await sut.DeleteAsync(dto!.Id, otherUser.Id));
        Assert.Single(db.MedicalFiles);
    }
}
