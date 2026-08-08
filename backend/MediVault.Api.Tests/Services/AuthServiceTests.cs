using Microsoft.Extensions.Configuration;
using MediVault.Api.Auth;
using MediVault.Api.DTOs.Auth;
using MediVault.Api.Entities;
using MediVault.Api.Services;

namespace MediVault.Api.Tests.Services;

public class AuthServiceTests
{
    private static JwtService CreateJwtService()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-secret-test-secret-test-secret-1234",
                ["Jwt:Issuer"] = "medivault-tests",
                ["Jwt:ExpiryHours"] = "8",
            })
            .Build();
        return new JwtService(config);
    }

    private static User SeedPatient(Data.MediVaultDbContext db, string utentNumber, string plainPassword)
    {
        var gender = new Gender { Code = "M", Description = "Masculino" };
        var country = new Country { Code = "PT", Name = "Portugal" };
        db.Genders.Add(gender);
        db.Countries.Add(country);
        db.SaveChanges();

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            UtentNumber = utentNumber,
            FiscalNumber = "123456789",
            CitizenNumber = "12345678",
            Email = $"{utentNumber}@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword),
            FirstName = "Ana",
            LastName = "Silva",
            Birthday = "1990-01-01",
            BiologicalGender = "F",
            SexId = gender.Id,
            NationalityId = country.Id,
            IsActive = 1,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task LoginPatientAsync_ReturnsToken_WhenCredentialsAreValid()
    {
        using var db = TestDbContextFactory.Create();
        SeedPatient(db, utentNumber: "111222333", plainPassword: "correct-horse");
        var sut = new AuthService(db, CreateJwtService());

        var result = await sut.LoginPatientAsync(new PatientLoginRequest("111222333", "correct-horse"));

        Assert.NotNull(result);
        Assert.Equal("Patient", result!.Role);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
    }

    [Fact]
    public async Task LoginPatientAsync_ReturnsNull_WhenPasswordIsWrong()
    {
        using var db = TestDbContextFactory.Create();
        SeedPatient(db, utentNumber: "111222333", plainPassword: "correct-horse");
        var sut = new AuthService(db, CreateJwtService());

        var result = await sut.LoginPatientAsync(new PatientLoginRequest("111222333", "wrong-password"));

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginPatientAsync_ReturnsNull_WhenUserIsInactive()
    {
        using var db = TestDbContextFactory.Create();
        var user = SeedPatient(db, utentNumber: "111222333", plainPassword: "correct-horse");
        user.IsActive = 0;
        db.SaveChanges();
        var sut = new AuthService(db, CreateJwtService());

        var result = await sut.LoginPatientAsync(new PatientLoginRequest("111222333", "correct-horse"));

        Assert.Null(result);
    }
}
