using Microsoft.Extensions.Configuration;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class GoogleWalletServiceTests
{
    private static GoogleWalletService CreateSut(Data.MediVaultDbContext db, Dictionary<string, string?>? settings = null)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(settings ?? []).Build();
        return new GoogleWalletService(db, config);
    }

    [Fact]
    public void IsConfigured_IsFalse_WhenGoogleWalletSettingsMissing()
    {
        using var db = TestDbContextFactory.Create();
        var sut = CreateSut(db);

        Assert.False(sut.IsConfigured);
    }

    [Fact]
    public void IsConfigured_IsFalse_WhenServiceAccountKeyFileDoesNotExist()
    {
        using var db = TestDbContextFactory.Create();
        var sut = CreateSut(db, new Dictionary<string, string?>
        {
            ["GoogleWallet:IssuerId"] = "1234567890",
            ["GoogleWallet:ServiceAccountKeyPath"] = Path.Combine(Path.GetTempPath(), "does-not-exist-" + Guid.NewGuid() + ".json"),
        });

        Assert.False(sut.IsConfigured);
    }

    [Fact]
    public async Task GetSaveUrlAsync_ReturnsNull_WhenNotConfigured()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestDataFactory.SeedUser(db, shareCode: "ABC123");
        var sut = CreateSut(db);

        var result = await sut.GetSaveUrlAsync(user.Id);

        Assert.Null(result);
    }
}
