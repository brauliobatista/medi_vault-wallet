using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class MedicalHistoryService(MediVaultDbContext db, UserService userService)
{
    // --- Surgical History ---

    public async Task<List<SurgicalHistoryDto>> GetSurgeriesAsync(int userId) =>
        await db.SurgicalHistories
            .Where(s => s.UserId == userId && s.IsActive == 1)
            .OrderByDescending(s => s.SurgeryDate)
            .Select(s => new SurgicalHistoryDto(s.Id, s.SurgeryName, s.SurgeryDate, s.Location, s.Notes, s.IsActive == 1, s.CreatedAt))
            .ToListAsync();

    public async Task<SurgicalHistoryDto> AddSurgeryAsync(int userId, CreateSurgicalHistoryRequest req, int? doctorId = null)
    {
        var entry = new SurgicalHistory
        {
            UserId = userId,
            SurgeryName = req.SurgeryName,
            SurgeryDate = req.SurgeryDate,
            Location = req.Location,
            Notes = req.Notes,
            AddedBy = doctorId,
            IsActive = 1,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.SurgicalHistories.Add(entry);
        await db.SaveChangesAsync();
        if (doctorId is null) await userService.CreateFlagAsync(userId, "history");
        return new SurgicalHistoryDto(entry.Id, entry.SurgeryName, entry.SurgeryDate, entry.Location, entry.Notes, true, entry.CreatedAt);
    }

    public async Task<bool> SoftDeleteSurgeryAsync(int id, int userId)
    {
        var entry = await db.SurgicalHistories.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (entry is null) return false;
        entry.IsActive = 0;
        await db.SaveChangesAsync();
        return true;
    }

    // --- Chronic Medications ---

    public async Task<List<ChronicMedicationDto>> GetMedicationsAsync(int userId) =>
        await db.ChronicMedications
            .Where(m => m.UserId == userId && m.IsActive == 1)
            .OrderByDescending(m => m.StartDate)
            .Select(m => new ChronicMedicationDto(m.Id, m.ActiveSubstance, m.Dose, m.Posology, m.StartDate, m.EndDate, m.IsActive == 1, m.CreatedAt))
            .ToListAsync();

    public async Task<ChronicMedicationDto> AddMedicationAsync(int userId, CreateChronicMedicationRequest req, int? doctorId = null)
    {
        var entry = new ChronicMedication
        {
            UserId = userId,
            ActiveSubstance = req.ActiveSubstance,
            Dose = req.Dose,
            Posology = req.Posology,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            PrescribedBy = doctorId,
            IsActive = 1,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.ChronicMedications.Add(entry);
        await db.SaveChangesAsync();
        if (doctorId is null) await userService.CreateFlagAsync(userId, "medical_info");
        return new ChronicMedicationDto(entry.Id, entry.ActiveSubstance, entry.Dose, entry.Posology, entry.StartDate, entry.EndDate, true, entry.CreatedAt);
    }

    public async Task<bool> SoftDeleteMedicationAsync(int id, int userId)
    {
        var entry = await db.ChronicMedications.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
        if (entry is null) return false;
        entry.IsActive = 0;
        await db.SaveChangesAsync();
        return true;
    }

    // --- Drug Allergies ---

    public async Task<List<DrugAllergyDto>> GetAllergiesAsync(int userId) =>
        await db.DrugAllergies
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new DrugAllergyDto(a.Id, a.ActiveSubstance, a.AllergicReaction, a.Severity, a.CreatedAt))
            .ToListAsync();

    public async Task<DrugAllergyDto> AddAllergyAsync(int userId, CreateDrugAllergyRequest req)
    {
        var entry = new DrugAllergy
        {
            UserId = userId,
            ActiveSubstance = req.ActiveSubstance,
            AllergicReaction = req.AllergicReaction,
            Severity = req.Severity,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.DrugAllergies.Add(entry);
        await db.SaveChangesAsync();
        await userService.CreateFlagAsync(userId, "medical_info");
        return new DrugAllergyDto(entry.Id, entry.ActiveSubstance, entry.AllergicReaction, entry.Severity, entry.CreatedAt);
    }

    public async Task<bool> DeleteAllergyAsync(int id, int userId)
    {
        var entry = await db.DrugAllergies.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (entry is null) return false;
        db.DrugAllergies.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }

    // --- Family History ---

    public async Task<List<FamilyHistoryDto>> GetFamilyHistoryAsync(int userId) =>
        await db.FamilyHistories
            .Where(f => f.UserId == userId)
            .Select(f => new FamilyHistoryDto(f.Id, f.Condition, f.HasCondition == 1, f.KinshipDegree, f.Notes))
            .ToListAsync();

    public async Task<FamilyHistoryDto> UpsertFamilyHistoryAsync(int userId, UpsertFamilyHistoryRequest req)
    {
        var entry = await db.FamilyHistories.FirstOrDefaultAsync(f => f.UserId == userId && f.Condition == req.Condition);
        if (entry is null)
        {
            entry = new FamilyHistory { UserId = userId };
            db.FamilyHistories.Add(entry);
        }
        entry.Condition = req.Condition;
        entry.HasCondition = req.HasCondition ? 1 : 0;
        entry.KinshipDegree = req.KinshipDegree;
        entry.Notes = req.Notes;
        await db.SaveChangesAsync();
        await userService.CreateFlagAsync(userId, "medical_info");
        return new FamilyHistoryDto(entry.Id, entry.Condition, entry.HasCondition == 1, entry.KinshipDegree, entry.Notes);
    }
}
