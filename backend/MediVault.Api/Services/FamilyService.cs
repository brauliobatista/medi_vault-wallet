using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Family;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class FamilyService(MediVaultDbContext db)
{
    public async Task<List<RelationshipTypeDto>> GetRelationshipTypesAsync()
    {
        return await db.RelationshipTypes
            .Select(r => new RelationshipTypeDto(r.Id, r.Code, r.Description))
            .ToListAsync();
    }

    public async Task<List<GenderDto>> GetGendersAsync()
    {
        return await db.Genders
            .Select(g => new GenderDto(g.Id, g.Code, g.Description))
            .ToListAsync();
    }

    public async Task<List<FamilyMemberDto>> GetFamilyAsync(string guardianUserId)
    {
        return await db.FamilyGuardianships
            .Where(f => f.GuardianUserId == guardianUserId && f.IsActive == 1)
            .Include(f => f.Dependent)
            .Include(f => f.RelationshipType)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new FamilyMemberDto(
                f.Id, f.DependentUserId, f.Dependent.FirstName + " " + f.Dependent.LastName, f.Dependent.Id,
                f.RelationshipType.Code, f.Status, f.Dependent.IsDependent == 1, f.CreatedAt, "guardian"))
            .ToListAsync();
    }

    public async Task<List<FamilyMemberDto>> GetPendingInvitationsForMeAsync(string userId)
    {
        return await db.FamilyGuardianships
            .Where(f => f.DependentUserId == userId && f.IsActive == 1 && f.Status == "pending")
            .Include(f => f.Guardian)
            .Include(f => f.RelationshipType)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new FamilyMemberDto(
                f.Id, f.GuardianUserId, f.Guardian.FirstName + " " + f.Guardian.LastName, f.Guardian.Id,
                f.RelationshipType.Code, f.Status, false, f.CreatedAt, "dependent"))
            .ToListAsync();
    }

    public async Task<SearchUserByEmailResult?> FindUserByEmailAsync(string callerUserId, string email)
    {
        var user = await db.Users
            .Where(u => u.Email == email && u.IsActive == 1 && u.IsDependent == 0 && u.Id != callerUserId)
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .FirstOrDefaultAsync();
        if (user is null) return null;
        return new SearchUserByEmailResult(user.Id, $"{user.FirstName} {user.LastName}", user.Id);
    }

    public async Task<(bool Success, string? Error)> InviteByEmailAsync(string guardianUserId, InviteByEmailRequest req)
    {
        var target = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive == 1);
        if (target is null) return (false, "Utilizador não encontrado.");
        if (target.Id == guardianUserId) return (false, "Não pode adicionar-se a si próprio.");
        if (target.IsDependent == 1) return (false, "Este perfil não pode ser convidado diretamente.");

        var relationshipExists = await db.RelationshipTypes.AnyAsync(r => r.Id == req.RelationshipTypeId);
        if (!relationshipExists) return (false, "Tipo de relação inválido.");

        var existing = await db.FamilyGuardianships.AnyAsync(f =>
            f.GuardianUserId == guardianUserId && f.DependentUserId == target.Id && f.IsActive == 1);
        if (existing) return (true, null);

        db.FamilyGuardianships.Add(new FamilyGuardianship
        {
            GuardianUserId = guardianUserId,
            DependentUserId = target.Id,
            RelationshipTypeId = req.RelationshipTypeId,
            Status = "pending",
            IsActive = 1
        });
        await db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<bool> RespondToInvitationAsync(string dependentUserId, int guardianshipId, string action)
    {
        var guardianship = await db.FamilyGuardianships.FirstOrDefaultAsync(f =>
            f.Id == guardianshipId && f.DependentUserId == dependentUserId && f.IsActive == 1 && f.Status == "pending");
        if (guardianship is null) return false;

        if (action == "approve")
        {
            guardianship.Status = "approved";
        }
        else if (action == "decline")
        {
            guardianship.IsActive = 0;
        }
        else
        {
            return false;
        }

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveGuardianshipAsync(string guardianUserId, int guardianshipId)
    {
        var guardianship = await db.FamilyGuardianships.FirstOrDefaultAsync(f =>
            f.Id == guardianshipId && f.GuardianUserId == guardianUserId && f.IsActive == 1);
        if (guardianship is null) return false;

        guardianship.IsActive = 0;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<(bool Success, string? Error, FamilyMemberDto? Member)> CreateDependentAsync(
        string guardianUserId, CreateDependentRequest req)
    {
        var relationshipType = await db.RelationshipTypes.FirstOrDefaultAsync(r => r.Id == req.RelationshipTypeId);
        if (relationshipType is null) return (false, "Tipo de relação inválido.", null);

        var syntheticId = Guid.NewGuid().ToString("N");
        var dependent = new User
        {
            Id = Guid.NewGuid().ToString(),
            UtentNumber = $"DEP-{syntheticId[..12]}",
            FiscalNumber = $"DEP-{syntheticId[12..24]}",
            CitizenNumber = $"DEP-{syntheticId[24..]}",
            Email = $"dependent-{syntheticId}@no-login.medivault.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            FirstName = req.FirstName,
            LastName = req.LastName,
            Birthday = req.Birthday,
            BiologicalGender = req.BiologicalGender,
            Sex = req.Sex,
            IsDependent = 1,
            IsActive = 1,
            CardActive = 1,
            ShareCode = Guid.NewGuid().ToString("N")[..12].ToUpper(),
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        db.Users.Add(dependent);

        var guardianship = new FamilyGuardianship
        {
            GuardianUserId = guardianUserId,
            DependentUserId = dependent.Id,
            RelationshipTypeId = req.RelationshipTypeId,
            Status = "approved",
            IsActive = 1
        };
        db.FamilyGuardianships.Add(guardianship);

        await db.SaveChangesAsync();

        return (true, null, new FamilyMemberDto(
            guardianship.Id, dependent.Id, $"{dependent.FirstName} {dependent.LastName}", dependent.Id,
            relationshipType.Code, guardianship.Status, true, guardianship.CreatedAt, "guardian"));
    }
}
