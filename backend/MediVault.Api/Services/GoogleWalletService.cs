using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;

namespace MediVault.Api.Services;

// Generates "Save to Google Wallet" links for the patient's MediCard.
// Requires a Google Wallet Issuer account (https://pay.google.com/business/console) and a
// service account JSON key with the "Wallet Object Issuer" role. Until GoogleWallet:IssuerId
// and GoogleWallet:ServiceAccountKeyPath are set in config, IsConfigured is false and callers
// should treat the feature as unavailable rather than fail.
//
// The referenced generic pass class (IssuerId.ClassId) must be created once in the Google Pay &
// Wallet Console (or via a one-off POST to the genericClass API) before saved passes will work.
public class GoogleWalletService(MediVaultDbContext db, IConfiguration config)
{
    public bool IsConfigured =>
        !string.IsNullOrEmpty(config["GoogleWallet:IssuerId"]) &&
        !string.IsNullOrEmpty(config["GoogleWallet:ServiceAccountKeyPath"]) &&
        File.Exists(config["GoogleWallet:ServiceAccountKeyPath"]);

    public async Task<string?> GetSaveUrlAsync(string userId)
    {
        if (!IsConfigured) return null;

        var u = await db.Users
            .Where(x => x.Id == userId && x.IsActive == 1)
            .Select(x => new { x.Id, x.ShareCode, x.FirstName, x.LastName })
            .FirstOrDefaultAsync();
        if (u is null || string.IsNullOrEmpty(u.ShareCode)) return null;

        var issuerId = config["GoogleWallet:IssuerId"]!;
        var classSuffix = config["GoogleWallet:ClassId"] ?? "medivault_card";
        var classId = $"{issuerId}.{classSuffix}";
        var objectId = $"{issuerId}.{u.Id}";
        var qrPayload = $"MV:{u.Id}:{u.ShareCode}";

        var (serviceAccountEmail, privateKeyPem) = LoadServiceAccountKey(config["GoogleWallet:ServiceAccountKeyPath"]!);

        var genericObject = new Dictionary<string, object?>
        {
            ["id"] = objectId,
            ["classId"] = classId,
            ["state"] = "ACTIVE",
            ["cardTitle"] = new { defaultValue = new { language = "pt-PT", value = "MediVault" } },
            ["subheader"] = new { defaultValue = new { language = "pt-PT", value = "Cartão de Saúde" } },
            ["header"] = new { defaultValue = new { language = "pt-PT", value = $"{u.FirstName} {u.LastName}" } },
            ["barcode"] = new { type = "QR_CODE", value = qrPayload },
            ["hexBackgroundColor"] = "#0d6efd",
        };

        var payload = new Dictionary<string, object>
        {
            ["iss"] = serviceAccountEmail,
            ["aud"] = "google",
            ["typ"] = "savetowallet",
            ["iat"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["origins"] = config.GetSection("GoogleWallet:Origins").Get<string[]>() ?? [],
            ["payload"] = new Dictionary<string, object>
            {
                ["genericObjects"] = new[] { genericObject },
            },
        };

        var jwt = SignJwt(payload, privateKeyPem);
        return $"https://pay.google.com/gp/v/save/{jwt}";
    }

    private static (string Email, string PrivateKeyPem) LoadServiceAccountKey(string path)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var root = doc.RootElement;
        return (root.GetProperty("client_email").GetString()!, root.GetProperty("private_key").GetString()!);
    }

    private static string SignJwt(Dictionary<string, object> payload, string privateKeyPem)
    {
        var header = new Dictionary<string, object> { ["alg"] = "RS256", ["typ"] = "JWT" };
        var unsigned = $"{Base64UrlEncode(JsonSerializer.Serialize(header))}.{Base64UrlEncode(JsonSerializer.Serialize(payload))}";

        using var rsa = RSA.Create();
        rsa.ImportFromPem(privateKeyPem);
        var signature = rsa.SignData(Encoding.UTF8.GetBytes(unsigned), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        return $"{unsigned}.{Base64UrlEncode(signature)}";
    }

    private static string Base64UrlEncode(string s) => Base64UrlEncode(Encoding.UTF8.GetBytes(s));
    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
