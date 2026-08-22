using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class ClinicalRecordsService(MediVaultDbContext db, AccessControlService accessControl)
{
    // --- Vital signs ---

    public async Task<List<VitalSignDto>> GetVitalSignsAsync(string userId) =>
        await db.VitalSigns
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.RecordedAt)
            .Select(v => new VitalSignDto(v.Id, v.RecordedAt, v.BloodPressureSystolic, v.BloodPressureDiastolic,
                v.HeartRate, v.RespiratoryRate, v.Temperature, v.Spo2, v.Weight, v.Height, v.Notes))
            .ToListAsync();

    public async Task<VitalSignDto> AddVitalSignAsync(string userId, string doctorId, CreateVitalSignRequest req)
    {
        var entry = new VitalSign
        {
            UserId = userId, DoctorId = doctorId, RecordedAt = req.RecordedAt,
            BloodPressureSystolic = req.BloodPressureSystolic, BloodPressureDiastolic = req.BloodPressureDiastolic,
            HeartRate = req.HeartRate, RespiratoryRate = req.RespiratoryRate, Temperature = req.Temperature,
            Spo2 = req.Spo2, Weight = req.Weight, Height = req.Height, Notes = req.Notes,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.VitalSigns.Add(entry);
        await db.SaveChangesAsync();
        return new VitalSignDto(entry.Id, entry.RecordedAt, entry.BloodPressureSystolic, entry.BloodPressureDiastolic,
            entry.HeartRate, entry.RespiratoryRate, entry.Temperature, entry.Spo2, entry.Weight, entry.Height, entry.Notes);
    }

    public async Task<bool> UpdateVitalSignAsync(int id, string userId, CreateVitalSignRequest req)
    {
        var entry = await db.VitalSigns.FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId);
        if (entry is null) return false;
        entry.RecordedAt = req.RecordedAt;
        entry.BloodPressureSystolic = req.BloodPressureSystolic;
        entry.BloodPressureDiastolic = req.BloodPressureDiastolic;
        entry.HeartRate = req.HeartRate;
        entry.RespiratoryRate = req.RespiratoryRate;
        entry.Temperature = req.Temperature;
        entry.Spo2 = req.Spo2;
        entry.Weight = req.Weight;
        entry.Height = req.Height;
        entry.Notes = req.Notes;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteVitalSignAsync(int id, string userId)
    {
        var entry = await db.VitalSigns.FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId);
        if (entry is null) return false;
        db.VitalSigns.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }

    // --- Clinical assessments ---

    public async Task<List<ClinicalAssessmentDto>> GetAssessmentsAsync(string userId) =>
        await db.ClinicalAssessments
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new ClinicalAssessmentDto(a.Id, a.Hypothesis, a.Plan, a.CreatedAt, a.UpdatedAt))
            .ToListAsync();

    public async Task<ClinicalAssessmentDto> AddAssessmentAsync(string userId, string doctorId, CreateAssessmentRequest req)
    {
        var now = DateTime.UtcNow.ToString("o");
        var entry = new ClinicalAssessment { UserId = userId, DoctorId = doctorId, Hypothesis = req.Hypothesis, Plan = req.Plan, CreatedAt = now, UpdatedAt = now };
        db.ClinicalAssessments.Add(entry);
        await db.SaveChangesAsync();
        return new ClinicalAssessmentDto(entry.Id, entry.Hypothesis, entry.Plan, entry.CreatedAt, entry.UpdatedAt);
    }

    public async Task<bool> UpdateAssessmentAsync(int id, string userId, CreateAssessmentRequest req)
    {
        var entry = await db.ClinicalAssessments.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (entry is null) return false;
        entry.Hypothesis = req.Hypothesis;
        entry.Plan = req.Plan;
        entry.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAssessmentAsync(int id, string userId)
    {
        var entry = await db.ClinicalAssessments.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (entry is null) return false;
        db.ClinicalAssessments.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }

    // --- Anamnesis (historical; edit only by the creating doctor, within 24h) ---

    private static bool CanEditAnamnesis(Anamnesis a, string currentDoctorId) =>
        a.DoctorId == currentDoctorId &&
        DateTime.UtcNow - DateTime.Parse(a.CreatedAt).ToUniversalTime() <= TimeSpan.FromHours(24);

    public async Task<List<AnamnesisDto>> GetAnamnesesAsync(string userId, string currentDoctorId)
    {
        var rows = await db.Anamneses
            .Include(a => a.Doctor)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return rows.Select(a => new AnamnesisDto(
            a.Id, a.DoctorId, $"{a.Doctor.FirstName} {a.Doctor.LastName}", a.ChiefComplaint, a.IllnessHistory,
            a.PersonalHistory, a.CreatedAt, a.UpdatedAt, CanEditAnamnesis(a, currentDoctorId))).ToList();
    }

    public async Task<AnamnesisDto> AddAnamnesisAsync(string userId, string doctorId, UpsertAnamnesisRequest req)
    {
        var now = DateTime.UtcNow.ToString("o");
        var entry = new Anamnesis
        {
            UserId = userId, DoctorId = doctorId, ChiefComplaint = req.ChiefComplaint,
            IllnessHistory = req.IllnessHistory, PersonalHistory = req.PersonalHistory,
            CreatedAt = now, UpdatedAt = now
        };
        db.Anamneses.Add(entry);
        await db.SaveChangesAsync();
        var doctor = await db.Doctors.FindAsync(doctorId);
        return new AnamnesisDto(entry.Id, doctorId, $"{doctor!.FirstName} {doctor.LastName}", entry.ChiefComplaint, entry.IllnessHistory, entry.PersonalHistory, entry.CreatedAt, entry.UpdatedAt, true);
    }

    public async Task<(bool Success, string? Error)> UpdateAnamnesisAsync(int id, string userId, string currentDoctorId, UpsertAnamnesisRequest req)
    {
        var entry = await db.Anamneses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (entry is null) return (false, "Registo não encontrado.");
        if (entry.DoctorId != currentDoctorId) return (false, "Só o médico que criou este registo o pode editar.");
        if (DateTime.UtcNow - DateTime.Parse(entry.CreatedAt).ToUniversalTime() > TimeSpan.FromHours(24))
            return (false, "Este registo já não pode ser editado — o prazo de 24h expirou.");

        entry.ChiefComplaint = req.ChiefComplaint;
        entry.IllnessHistory = req.IllnessHistory;
        entry.PersonalHistory = req.PersonalHistory;
        entry.UpdatedAt = DateTime.UtcNow.ToString("o");
        await db.SaveChangesAsync();
        return (true, null);
    }

    // --- Consultation (draft / finish) ---

    public async Task<ConsultationDto> SaveConsultationDraftAsync(string userId, string doctorId, SaveConsultationRequest req)
    {
        var entry = req.ConsultationId is int id
            ? await db.Consultations.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId && c.DoctorId == doctorId)
            : null;

        var now = DateTime.UtcNow.ToString("o");
        if (entry is null)
        {
            entry = new Consultation { UserId = userId, DoctorId = doctorId, Status = "draft", StartedAt = req.StartedAt, CreatedAt = now, UpdatedAt = now };
            db.Consultations.Add(entry);
        }
        else
        {
            entry.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
        return new ConsultationDto(entry.Id, entry.Status, entry.StartedAt, entry.FinishedAt, entry.UpdatedAt);
    }

    public async Task<ConsultationDto> FinishConsultationAsync(string userId, string doctorId, SaveConsultationRequest req)
    {
        var entry = req.ConsultationId is int id
            ? await db.Consultations.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId && c.DoctorId == doctorId)
            : null;

        var now = DateTime.UtcNow.ToString("o");
        if (entry is null)
        {
            entry = new Consultation { UserId = userId, DoctorId = doctorId, StartedAt = req.StartedAt, CreatedAt = now };
            db.Consultations.Add(entry);
        }
        entry.Status = "finished";
        entry.FinishedAt = now;
        entry.UpdatedAt = now;
        await db.SaveChangesAsync();
        await accessControl.FinishAccessForConsultationAsync(doctorId, userId);
        return new ConsultationDto(entry.Id, entry.Status, entry.StartedAt, entry.FinishedAt, entry.UpdatedAt);
    }

    public async Task<List<FinishedConsultationDto>> GetFinishedConsultationsForDoctorAsync(string doctorId)
    {
        var rows = await db.Consultations
            .Include(c => c.User)
            .Where(c => c.DoctorId == doctorId && c.Status == "finished")
            .OrderByDescending(c => c.FinishedAt)
            .ToListAsync();

        return rows.Select(c =>
        {
            var started = DateTime.Parse(c.StartedAt).ToUniversalTime();
            var finished = DateTime.Parse(c.FinishedAt!).ToUniversalTime();
            var minutes = (int)Math.Round((finished - started).TotalMinutes);
            return new FinishedConsultationDto(
                c.Id, c.UserId, $"{c.User.FirstName} {c.User.LastName}", c.User.Id, c.User.UtentNumber,
                c.StartedAt, c.FinishedAt!, minutes);
        }).ToList();
    }
}
