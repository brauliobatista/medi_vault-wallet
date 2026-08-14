using Microsoft.EntityFrameworkCore;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Database;

/// <summary>
/// Exercises the real EF Core model (same one EnsureCreated builds at app
/// startup) to confirm constraints are actually enforced by the runtime schema.
/// </summary>
public class DatabaseConstraintsTests
{
    private static (Gender gender, Country country) SeedReferenceData(Data.MediVaultDbContext db)
    {
        var gender = new Gender { Code = "M", Description = "Masculino" };
        var country = new Country { Code = "PT", Name = "Portugal" };
        db.Genders.Add(gender);
        db.Countries.Add(country);
        db.SaveChanges();
        return (gender, country);
    }

    private static User BuildUser(Gender gender, Country country, string utentNumber, string email) => new()
    {
        Id = Guid.NewGuid().ToString(),
        UtentNumber = utentNumber,
        FiscalNumber = Guid.NewGuid().ToString("N")[..9],
        CitizenNumber = Guid.NewGuid().ToString("N")[..8],
        Email = email,
        PasswordHash = "hash",
        FirstName = "Ana",
        LastName = "Silva",
        Birthday = "1990-01-01",
        BiologicalGender = "F",
        SexId = gender.Id,
        NationalityId = country.Id,
    };

    [Fact]
    public void Users_RejectsDuplicateEmail()
    {
        using var db = TestDbContextFactory.Create();
        var (gender, country) = SeedReferenceData(db);
        db.Users.Add(BuildUser(gender, country, "111111111", "duplicate@example.com"));
        db.SaveChanges();

        db.Users.Add(BuildUser(gender, country, "222222222", "duplicate@example.com"));

        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void Users_RejectsUnknownSexId_ForeignKeyViolation()
    {
        using var db = TestDbContextFactory.Create();
        var (_, country) = SeedReferenceData(db);
        var user = BuildUser(new Gender { Id = 9999 }, country, "111111111", "fk@example.com");
        db.Users.Add(user);

        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void Doctors_RejectsDuplicateOrdemMedicosId()
    {
        using var db = TestDbContextFactory.Create();
        var institution = new Institution { Id = Guid.NewGuid().ToString(), Name = "Hospital Central", Type = "hospital" };
        var country = new Country { Code = "PT", Name = "Portugal" };
        db.Institutions.Add(institution);
        db.Countries.Add(country);
        db.SaveChanges();

        Doctor BuildDoctor(string email) => new()
        {
            Id = Guid.NewGuid().ToString(),
            OrdemMedicosId = "OM-12345",
            FirstName = "Carlos",
            LastName = "Mendes",
            Email = email,
            PasswordHash = "hash",
            InstitutionId = institution.Id,
            NationalityId = country.Id,
        };

        db.Doctors.Add(BuildDoctor("doctor1@example.com"));
        db.SaveChanges();

        db.Doctors.Add(BuildDoctor("doctor2@example.com"));

        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }
}
