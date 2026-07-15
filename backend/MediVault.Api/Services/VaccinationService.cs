using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class VaccinationService(MediVaultDbContext db, UserService userService)
{
    public async Task<List<VaccinationDto>> GetVaccinationsAsync(int userId) =>
        await db.UserVaccinations
            .Where(v => v.UserId == userId)
            .Include(v => v.Vaccine)
            .OrderByDescending(v => v.AdministeredAt)
            .Select(v => new VaccinationDto(v.Id, v.Vaccine.Name, v.DoseNumber, v.AdministeredAt,
                v.NextDueDate, v.BatchNumber, v.Institution, v.Notes))
            .ToListAsync();

    public async Task<VaccinationDto> AddVaccinationAsync(int userId, CreateVaccinationRequest req, int? doctorId = null)
    {
        var vaccine = await db.Vaccines.FindAsync(req.VaccineId)
            ?? throw new InvalidOperationException("Vaccine not found");

        var entry = new UserVaccination
        {
            UserId = userId,
            VaccineId = req.VaccineId,
            DoseNumber = req.DoseNumber,
            AdministeredAt = req.AdministeredAt,
            NextDueDate = req.NextDueDate,
            BatchNumber = req.BatchNumber,
            Institution = req.Institution,
            Notes = req.Notes,
            AddedBy = doctorId
        };
        db.UserVaccinations.Add(entry);
        await db.SaveChangesAsync();
        if (doctorId is null) await userService.CreateFlagAsync(userId, "medical_info");
        return new VaccinationDto(entry.Id, vaccine.Name, entry.DoseNumber, entry.AdministeredAt,
            entry.NextDueDate, entry.BatchNumber, entry.Institution, entry.Notes);
    }

    public async Task<bool> DeleteVaccinationAsync(int id, int userId)
    {
        var entry = await db.UserVaccinations.FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId);
        if (entry is null) return false;
        db.UserVaccinations.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<Vaccine>> GetAllVaccinesAsync() => await db.Vaccines.ToListAsync();
}
