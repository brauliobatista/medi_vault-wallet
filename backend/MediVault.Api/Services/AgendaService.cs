using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Agenda;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class AgendaService(MediVaultDbContext db)
{
    public async Task<List<ScheduleEventDto>> GetDoctorScheduleEventsAsync(string doctorId, string? typeCode)
    {
        var query = db.DoctorScheduleEvents
            .Include(e => e.EventType)
            .Where(e => e.DoctorId == doctorId);

        if (!string.IsNullOrWhiteSpace(typeCode))
            query = query.Where(e => e.EventType.Code == typeCode);

        return await query
            .OrderBy(e => e.StartDate)
            .Select(e => new ScheduleEventDto(
                e.Id, e.EventType.Code, e.EventType.Description ?? "",
                e.Title, e.Location, e.StartDate, e.EndDate, e.Notes))
            .ToListAsync();
    }

    public async Task<List<PatientAppointmentDto>> GetDailyAppointmentsAsync(string doctorId, string date)
    {
        // Fetch candidate rows in memory to avoid SQLite translation issues with string date comparison
        var candidates = await db.PatientAppointments
            .Include(a => a.User)
            .Include(a => a.AppointmentType)
            .Where(a => a.DoctorId == doctorId)
            .ToListAsync();

        return candidates
            .Where(a => a.ScheduledAt.StartsWith(date))
            .OrderBy(a => a.ScheduledAt)
            .Select(a => new PatientAppointmentDto(
                a.Id, $"{a.User.FirstName} {a.User.LastName}",
                a.AppointmentType.Description ?? "", a.Modality, a.ScheduledAt, a.Status))
            .ToList();
    }

    public async Task<List<InstitutionContactDto>> GetInstitutionContactsAsync(string doctorId)
    {
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.Id == doctorId);
        if (doctor is null) return [];

        return await db.InstitutionContacts
            .Where(c => c.InstitutionId == doctor.InstitutionId && c.IsActive == 1)
            .OrderBy(c => c.ServiceName)
            .Select(c => new InstitutionContactDto(c.Id, c.ServiceName, c.Extension))
            .ToListAsync();
    }

    // --- Reference lists (for form dropdowns) ---

    public async Task<List<ScheduleEventTypeDto>> GetScheduleEventTypesAsync() =>
        await db.ScheduleEventTypes
            .Select(t => new ScheduleEventTypeDto(t.Id, t.Code, t.Description ?? ""))
            .ToListAsync();

    public async Task<List<AppointmentTypeDto>> GetAppointmentTypesAsync() =>
        await db.AppointmentTypes
            .Select(t => new AppointmentTypeDto(t.Id, t.Code, t.Description ?? ""))
            .ToListAsync();

    // --- Doctor schedule events CRUD ---

    public async Task<ScheduleEventDto?> CreateScheduleEventAsync(string doctorId, CreateScheduleEventRequest req)
    {
        var type = await db.ScheduleEventTypes.FirstOrDefaultAsync(t => t.Code == req.EventTypeCode);
        if (type is null) return null;

        var entry = new DoctorScheduleEvent
        {
            DoctorId = doctorId, EventTypeId = type.Id, Title = req.Title, Location = req.Location,
            StartDate = req.StartDate, EndDate = req.EndDate, Notes = req.Notes,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.DoctorScheduleEvents.Add(entry);
        await db.SaveChangesAsync();
        return new ScheduleEventDto(entry.Id, type.Code, type.Description ?? "", entry.Title, entry.Location, entry.StartDate, entry.EndDate, entry.Notes);
    }

    public async Task<bool> UpdateScheduleEventAsync(string doctorId, int id, UpdateScheduleEventRequest req)
    {
        var entry = await db.DoctorScheduleEvents.FirstOrDefaultAsync(e => e.Id == id && e.DoctorId == doctorId);
        if (entry is null) return false;
        var type = await db.ScheduleEventTypes.FirstOrDefaultAsync(t => t.Code == req.EventTypeCode);
        if (type is null) return false;

        entry.EventTypeId = type.Id;
        entry.Title = req.Title;
        entry.Location = req.Location;
        entry.StartDate = req.StartDate;
        entry.EndDate = req.EndDate;
        entry.Notes = req.Notes;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteScheduleEventAsync(string doctorId, int id)
    {
        var entry = await db.DoctorScheduleEvents.FirstOrDefaultAsync(e => e.Id == id && e.DoctorId == doctorId);
        if (entry is null) return false;
        db.DoctorScheduleEvents.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }

    // --- Patient appointments CRUD ---

    public async Task<List<PatientAppointmentDto>> GetAllAppointmentsAsync(string doctorId) =>
        await db.PatientAppointments
            .Include(a => a.User)
            .Include(a => a.AppointmentType)
            .Where(a => a.DoctorId == doctorId)
            .OrderByDescending(a => a.ScheduledAt)
            .Select(a => new PatientAppointmentDto(
                a.Id, $"{a.User.FirstName} {a.User.LastName}",
                a.AppointmentType.Description ?? "", a.Modality, a.ScheduledAt, a.Status))
            .ToListAsync();

    public async Task<PatientAppointmentDto?> CreateAppointmentAsync(string doctorId, CreateAppointmentRequest req)
    {
        var type = await db.AppointmentTypes.FirstOrDefaultAsync(t => t.Code == req.AppointmentTypeCode);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == req.UserId && u.IsActive == 1);
        if (type is null || user is null) return null;

        var entry = new PatientAppointment
        {
            UserId = req.UserId, DoctorId = doctorId, AppointmentTypeId = type.Id,
            Modality = req.Modality, ScheduledAt = req.ScheduledAt, Status = req.Status,
            CreatedByRole = "doctor", CreatedByDoctorId = doctorId, Notes = req.Notes,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.PatientAppointments.Add(entry);
        await db.SaveChangesAsync();
        return new PatientAppointmentDto(entry.Id, $"{user.FirstName} {user.LastName}", type.Description ?? "", entry.Modality, entry.ScheduledAt, entry.Status);
    }

    public async Task<bool> UpdateAppointmentAsync(string doctorId, int id, UpdateAppointmentRequest req)
    {
        var entry = await db.PatientAppointments.FirstOrDefaultAsync(a => a.Id == id && a.DoctorId == doctorId);
        if (entry is null) return false;
        var type = await db.AppointmentTypes.FirstOrDefaultAsync(t => t.Code == req.AppointmentTypeCode);
        if (type is null) return false;

        entry.AppointmentTypeId = type.Id;
        entry.Modality = req.Modality;
        entry.ScheduledAt = req.ScheduledAt;
        entry.Status = req.Status;
        entry.Notes = req.Notes;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAppointmentAsync(string doctorId, int id)
    {
        var entry = await db.PatientAppointments.FirstOrDefaultAsync(a => a.Id == id && a.DoctorId == doctorId);
        if (entry is null) return false;
        db.PatientAppointments.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }
}
