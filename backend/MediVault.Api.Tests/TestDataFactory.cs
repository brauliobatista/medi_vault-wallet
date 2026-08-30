using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests;

/// <summary>
/// Shared seeding helpers for service tests. Each method inserts the minimal valid row(s)
/// needed to satisfy FK/NOT NULL constraints on the real EF model, reusing an existing
/// gender/country/institution row when one is already present in the given context.
/// </summary>
public static class TestDataFactory
{
    public static Gender SeedGender(MediVaultDbContext db, string code = "F", string? description = "Feminino")
    {
        var g = new Gender { Code = code, Description = description };
        db.Genders.Add(g);
        db.SaveChanges();
        return g;
    }

    public static Country SeedCountry(MediVaultDbContext db, string code = "PT", string name = "Portugal")
    {
        var c = new Country { Code = code, Name = name };
        db.Countries.Add(c);
        db.SaveChanges();
        return c;
    }

    public static Institution SeedInstitution(
        MediVaultDbContext db,
        string? id = null,
        string name = "Hospital Central",
        string type = "hospital",
        string? address = null,
        string? phone = null)
    {
        var i = new Institution { Id = id ?? Guid.NewGuid().ToString(), Name = name, Type = type, Address = address, Phone = phone };
        db.Institutions.Add(i);
        db.SaveChanges();
        return i;
    }

    public static User SeedUser(
        MediVaultDbContext db,
        string? id = null,
        string? utentNumber = null,
        string? email = null,
        string firstName = "Ana",
        string lastName = "Silva",
        int isActive = 1,
        int isDependent = 0,
        int cardActive = 1,
        string? shareCode = null)
    {
        var gender = db.Genders.FirstOrDefault() ?? SeedGender(db);
        var country = db.Countries.FirstOrDefault() ?? SeedCountry(db);
        var suffix = Guid.NewGuid().ToString("N");
        var user = new User
        {
            Id = id ?? Guid.NewGuid().ToString(),
            UtentNumber = utentNumber ?? suffix[..9],
            FiscalNumber = suffix[9..18],
            CitizenNumber = suffix[18..26],
            Email = email ?? $"{suffix[..8]}@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct-horse"),
            FirstName = firstName,
            LastName = lastName,
            Birthday = "1990-01-01",
            BiologicalGender = "F",
            SexId = gender.Id,
            NationalityId = country.Id,
            IsActive = isActive,
            IsDependent = isDependent,
            CardActive = cardActive,
            ShareCode = shareCode ?? string.Empty,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    public static Doctor SeedDoctor(
        MediVaultDbContext db,
        string? id = null,
        string? ordemMedicosId = null,
        string? institutionId = null,
        string firstName = "João",
        string lastName = "Costa",
        string? speciality = null,
        int isActive = 1)
    {
        var institution = institutionId is not null
            ? db.Institutions.First(i => i.Id == institutionId)
            : db.Institutions.FirstOrDefault() ?? SeedInstitution(db);
        var country = db.Countries.FirstOrDefault() ?? SeedCountry(db);
        var suffix = Guid.NewGuid().ToString("N");
        var doctor = new Doctor
        {
            Id = id ?? Guid.NewGuid().ToString(),
            OrdemMedicosId = ordemMedicosId ?? suffix[..8],
            FirstName = firstName,
            LastName = lastName,
            Email = $"{suffix[..8]}@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct-horse"),
            Speciality = speciality,
            InstitutionId = institution.Id,
            NationalityId = country.Id,
            IsActive = isActive,
        };
        db.Doctors.Add(doctor);
        db.SaveChanges();
        return doctor;
    }
}
