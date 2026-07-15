using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace MediVault.Api.Auth;

public class JwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly int _expiryHours;

    public JwtService(IConfiguration config)
    {
        _secret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret not configured");
        _issuer = config["Jwt:Issuer"] ?? "medivault";
        _expiryHours = int.TryParse(config["Jwt:ExpiryHours"], out var h) ? h : 8;
    }

    public string GenerateToken(int id, string role, string identifier)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, id.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim("identifier", identifier),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_expiryHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
