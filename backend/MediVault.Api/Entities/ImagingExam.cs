using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("imaging_exams")]
public class ImagingExam
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("exam_type")] public string ExamType { get; set; } = null!;
    [Column("body_area")] public string? BodyArea { get; set; }
    [Column("exam_date")] public string ExamDate { get; set; } = null!;
    [Column("institution")] public string? Institution { get; set; }
    [Column("file_id")] public int? FileId { get; set; }
    [Column("report_text")] public string? ReportText { get; set; }
    [Column("added_by")] public int? AddedBy { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("FileId")] public MedicalFile? File { get; set; }
    [ForeignKey("AddedBy")] public Doctor? AddedByDoctor { get; set; }
}
