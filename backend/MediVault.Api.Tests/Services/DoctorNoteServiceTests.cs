using Microsoft.Extensions.Configuration;
using MediVault.Api.Auth;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class DoctorNoteServiceTests
{
    private static EncryptionService CreateEncryption()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Encryption:Key"] = new string('a', 64) })
            .Build();
        return new EncryptionService(config);
    }

    [Fact]
    public async Task CreateNoteAsync_EncryptsTextAtRest_ButReturnsPlainText()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());

        var dto = await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "nota secreta"));

        Assert.Equal("nota secreta", dto.NoteText);
        var stored = db.DoctorNotes.First(n => n.Id == dto.Id);
        Assert.NotEqual("nota secreta", System.Text.Encoding.UTF8.GetString(stored.NoteText!));
    }

    [Fact]
    public async Task CreateNoteAsync_Throws_WhenDoctorNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var sut = new DoctorNoteService(db, CreateEncryption());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateNoteAsync("missing-doctor", new CreateDoctorNoteRequest(user.Id, "confidential", "nota")));
    }

    [Fact]
    public async Task GetNotesForDoctorAsync_DecryptsStoredNotes()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());
        await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "nota secreta"));

        var notes = await sut.GetNotesForDoctorAsync(doctor.Id, user.Id);

        Assert.Single(notes);
        Assert.Equal("nota secreta", notes[0].NoteText);
    }

    [Fact]
    public async Task GetNotesForDoctorAsync_OnlyReturnsNotesForThatDoctorAndUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());
        await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "nota 1"));
        await sut.CreateNoteAsync(otherDoctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "nota 2"));
        await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(otherUser.Id, "confidential", "nota 3"));

        var notes = await sut.GetNotesForDoctorAsync(doctor.Id, user.Id);

        Assert.Single(notes);
        Assert.Equal("nota 1", notes[0].NoteText);
    }

    [Fact]
    public async Task UpdateNoteAsync_ReEncryptsText_WhenOwnedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());
        var created = await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "original"));

        var result = await sut.UpdateNoteAsync(created.Id, doctor.Id, "atualizada");

        Assert.True(result);
        var notes = await sut.GetNotesForDoctorAsync(doctor.Id, user.Id);
        Assert.Equal("atualizada", notes[0].NoteText);
    }

    [Fact]
    public async Task UpdateNoteAsync_ReturnsFalse_WhenNotOwnedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());
        var created = await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "original"));

        var result = await sut.UpdateNoteAsync(created.Id, otherDoctor.Id, "hacked");

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteNoteAsync_RemovesNote_WhenOwnedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());
        var created = await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "original"));

        Assert.True(await sut.DeleteNoteAsync(created.Id, doctor.Id));
        Assert.Empty(db.DoctorNotes);
    }

    [Fact]
    public async Task DeleteNoteAsync_ReturnsFalse_WhenNotOwnedByDoctor()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());
        var created = await sut.CreateNoteAsync(doctor.Id, new CreateDoctorNoteRequest(user.Id, "confidential", "original"));

        Assert.False(await sut.DeleteNoteAsync(created.Id, otherDoctor.Id));
        Assert.Single(db.DoctorNotes);
    }

    [Fact]
    public async Task GetFlagsAsync_ReturnsOnlyUnreviewedFlags()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        db.PendingReviewFlags.Add(new PendingReviewFlag { UserId = user.Id, Section = "identification", CreatedAt = DateTime.UtcNow.ToString("o") });
        db.PendingReviewFlags.Add(new PendingReviewFlag { UserId = user.Id, Section = "habits", CreatedAt = DateTime.UtcNow.ToString("o"), ReviewedAt = DateTime.UtcNow.ToString("o") });
        db.SaveChanges();
        var sut = new DoctorNoteService(db, CreateEncryption());

        var flags = await sut.GetFlagsAsync(user.Id);

        Assert.Single(flags);
        Assert.Equal("identification", flags[0].Section);
    }

    [Fact]
    public async Task MarkFlagReviewedAsync_SetsReviewedAtAndReviewer()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var flag = new PendingReviewFlag { UserId = user.Id, Section = "habits", CreatedAt = DateTime.UtcNow.ToString("o") };
        db.PendingReviewFlags.Add(flag);
        db.SaveChanges();
        var sut = new DoctorNoteService(db, CreateEncryption());

        var result = await sut.MarkFlagReviewedAsync(flag.Id, doctor.Id);

        Assert.True(result);
        var updated = db.PendingReviewFlags.First(f => f.Id == flag.Id);
        Assert.NotNull(updated.ReviewedAt);
        Assert.Equal(doctor.Id, updated.ReviewedBy);
    }

    [Fact]
    public async Task MarkFlagReviewedAsync_ReturnsFalse_WhenFlagNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new DoctorNoteService(db, CreateEncryption());

        Assert.False(await sut.MarkFlagReviewedAsync(999, doctor.Id));
    }
}
