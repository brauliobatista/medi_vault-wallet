using System.Security.Cryptography;

namespace MediVault.Api.Auth;

public class EncryptionService
{
    private readonly byte[] _key;

    public EncryptionService(IConfiguration config)
    {
        var keyHex = config["Encryption:Key"]
            ?? throw new InvalidOperationException("Encryption:Key not configured");
        _key = Convert.FromHexString(keyHex);
        if (_key.Length != 32)
            throw new InvalidOperationException("Encryption:Key must be 64 hex chars (256 bits)");
    }

    public byte[] Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();

        using var ms = new MemoryStream();
        ms.Write(aes.IV, 0, aes.IV.Length);
        using (var cs = new CryptoStream(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
            sw.Write(plainText);

        return ms.ToArray();
    }

    public string Decrypt(byte[] cipherData)
    {
        using var aes = Aes.Create();
        aes.Key = _key;

        var iv = new byte[16];
        Array.Copy(cipherData, 0, iv, 0, 16);
        aes.IV = iv;

        using var ms = new MemoryStream(cipherData, 16, cipherData.Length - 16);
        using var cs = new CryptoStream(ms, aes.CreateDecryptor(), CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        return sr.ReadToEnd();
    }
}
