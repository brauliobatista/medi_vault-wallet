using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class TeamChatServiceTests
{
    [Fact]
    public async Task AddMessageAsync_PersistsMessage_WithAuthorName()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new TeamChatService(db);

        var dto = await sut.AddMessageAsync(user.Id, doctor.Id, "Doente estável.");

        Assert.Equal("Doente estável.", dto.Message);
        Assert.Equal($"{doctor.FirstName} {doctor.LastName}", dto.AuthorName);
        Assert.Single(db.TeamChatMessages);
    }

    [Fact]
    public async Task GetMessagesAsync_OrdersByCreatedAtAscending()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new TeamChatService(db);
        await sut.AddMessageAsync(user.Id, doctor.Id, "primeira");
        await sut.AddMessageAsync(user.Id, doctor.Id, "segunda");

        var result = await sut.GetMessagesAsync(user.Id);

        Assert.Equal(2, result.Count);
        Assert.Equal("primeira", result[0].Message);
        Assert.Equal("segunda", result[1].Message);
    }

    [Fact]
    public async Task GetMessagesAsync_OnlyReturnsMessagesForThatUser()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var sut = new TeamChatService(db);
        await sut.AddMessageAsync(user.Id, doctor.Id, "para user");
        await sut.AddMessageAsync(otherUser.Id, doctor.Id, "para otherUser");

        var result = await sut.GetMessagesAsync(user.Id);

        Assert.Single(result);
        Assert.Equal("para user", result[0].Message);
    }
}
