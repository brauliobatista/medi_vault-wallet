using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Services;

public class ExamService(MediVaultDbContext db, UserService userService)
{
    // --- Analytical Exams ---

    public async Task<List<AnalyticalExamDto>> GetAnalyticalExamsAsync(int userId) =>
        await db.AnalyticalExams
            .Where(e => e.UserId == userId && e.IsActive == 1)
            .Include(e => e.Parameters)
            .OrderByDescending(e => e.ExamDate)
            .Select(e => new AnalyticalExamDto(
                e.Id, e.ExamDate, e.Laboratory, e.Notes, e.IsActive == 1, e.CreatedAt,
                e.Parameters.Select(p => new AnalyticalExamParameterDto(
                    p.Id, p.ParameterName, p.Value, p.Unit, p.ReferenceMin, p.ReferenceMax, p.IsAbnormal == 1))
                .ToList()))
            .ToListAsync();

    public async Task<AnalyticalExamDto> AddAnalyticalExamAsync(int userId, CreateAnalyticalExamRequest req, int? doctorId = null)
    {
        var exam = new AnalyticalExam
        {
            UserId = userId,
            ExamDate = req.ExamDate,
            Laboratory = req.Laboratory,
            Notes = req.Notes,
            AddedBy = doctorId,
            IsActive = 1,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            Parameters = req.Parameters.Select(p => new AnalyticalExamParameter
            {
                ParameterName = p.ParameterName,
                Value = p.Value,
                Unit = p.Unit,
                ReferenceMin = p.ReferenceMin,
                ReferenceMax = p.ReferenceMax,
                IsAbnormal = p.Value.HasValue && p.ReferenceMin.HasValue && p.ReferenceMax.HasValue &&
                             (p.Value < p.ReferenceMin || p.Value > p.ReferenceMax) ? 1 : 0
            }).ToList()
        };
        db.AnalyticalExams.Add(exam);
        await db.SaveChangesAsync();
        if (doctorId is null) await userService.CreateFlagAsync(userId, "mcdts");
        return new AnalyticalExamDto(exam.Id, exam.ExamDate, exam.Laboratory, exam.Notes, true, exam.CreatedAt,
            exam.Parameters.Select(p => new AnalyticalExamParameterDto(p.Id, p.ParameterName, p.Value, p.Unit, p.ReferenceMin, p.ReferenceMax, p.IsAbnormal == 1)).ToList());
    }

    public async Task<bool> SoftDeleteAnalyticalExamAsync(int id, int userId)
    {
        var exam = await db.AnalyticalExams.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (exam is null) return false;
        exam.IsActive = 0;
        await db.SaveChangesAsync();
        return true;
    }

    // --- Imaging Exams ---

    public async Task<List<ImagingExamDto>> GetImagingExamsAsync(int userId) =>
        await db.ImagingExams
            .Where(e => e.UserId == userId && e.IsActive == 1)
            .OrderByDescending(e => e.ExamDate)
            .Select(e => new ImagingExamDto(e.Id, e.ExamType, e.BodyArea, e.ExamDate, e.Institution, e.ReportText, e.IsActive == 1, e.CreatedAt))
            .ToListAsync();

    public async Task<ImagingExamDto> AddImagingExamAsync(int userId, CreateImagingExamRequest req, int? doctorId = null)
    {
        var exam = new ImagingExam
        {
            UserId = userId,
            ExamType = req.ExamType,
            BodyArea = req.BodyArea,
            ExamDate = req.ExamDate,
            Institution = req.Institution,
            ReportText = req.ReportText,
            AddedBy = doctorId,
            IsActive = 1,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.ImagingExams.Add(exam);
        await db.SaveChangesAsync();
        if (doctorId is null) await userService.CreateFlagAsync(userId, "mcdts");
        return new ImagingExamDto(exam.Id, exam.ExamType, exam.BodyArea, exam.ExamDate, exam.Institution, exam.ReportText, true, exam.CreatedAt);
    }

    public async Task<bool> SoftDeleteImagingExamAsync(int id, int userId)
    {
        var exam = await db.ImagingExams.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (exam is null) return false;
        exam.IsActive = 0;
        await db.SaveChangesAsync();
        return true;
    }

    // --- Optometry Exams ---

    public async Task<List<OptometryExamDto>> GetOptometryExamsAsync(int userId) =>
        await db.OptometryExams
            .Where(e => e.UserId == userId && e.IsActive == 1)
            .OrderByDescending(e => e.ExamDate)
            .Select(e => new OptometryExamDto(e.Id, e.ExamDate, e.RightSphere, e.RightCylinder, e.RightAxis,
                e.LeftSphere, e.LeftCylinder, e.LeftAxis, e.DiseaseReport, e.IsActive == 1, e.CreatedAt))
            .ToListAsync();

    public async Task<OptometryExamDto> AddOptometryExamAsync(int userId, CreateOptometryExamRequest req, int? doctorId = null)
    {
        var exam = new OptometryExam
        {
            UserId = userId,
            ExamDate = req.ExamDate,
            RightSphere = req.RightSphere,
            RightCylinder = req.RightCylinder,
            RightAxis = req.RightAxis,
            LeftSphere = req.LeftSphere,
            LeftCylinder = req.LeftCylinder,
            LeftAxis = req.LeftAxis,
            DiseaseReport = req.DiseaseReport,
            AddedBy = doctorId,
            IsActive = 1,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        db.OptometryExams.Add(exam);
        await db.SaveChangesAsync();
        if (doctorId is null) await userService.CreateFlagAsync(userId, "mcdts");
        return new OptometryExamDto(exam.Id, exam.ExamDate, exam.RightSphere, exam.RightCylinder, exam.RightAxis,
            exam.LeftSphere, exam.LeftCylinder, exam.LeftAxis, exam.DiseaseReport, true, exam.CreatedAt);
    }
}
