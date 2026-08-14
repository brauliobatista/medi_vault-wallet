using Microsoft.Extensions.Configuration;
using MediVault.Api.Auth;

namespace MediVault.Api.Tests.Auth;

public class EncryptionServiceTests
{
    private static EncryptionService CreateService(string? keyHex = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Encryption:Key"] = keyHex ?? new string('a', 64),
            })
            .Build();
        return new EncryptionService(config);
    }

    [Fact]
    public void Decrypt_ReturnsOriginalPlainText_AfterEncrypt()
    {
        var sut = CreateService();

        var cipher = sut.Encrypt("nota confidencial do médico");
        var plain = sut.Decrypt(cipher);

        Assert.Equal("nota confidencial do médico", plain);
    }

    [Fact]
    public void Encrypt_ProducesDifferentCipherText_ForSameInput_DueToRandomIv()
    {
        var sut = CreateService();

        var cipher1 = sut.Encrypt("mesma nota");
        var cipher2 = sut.Encrypt("mesma nota");

        Assert.False(cipher1.SequenceEqual(cipher2));
    }

    [Fact]
    public void Constructor_Throws_WhenKeyNotConfigured()
    {
        var config = new ConfigurationBuilder().Build();

        Assert.Throws<InvalidOperationException>(() => new EncryptionService(config));
    }

    [Fact]
    public void Constructor_Throws_WhenKeyIsWrongLength()
    {
        Assert.Throws<InvalidOperationException>(() => CreateService(keyHex: "abcd"));
    }
}
