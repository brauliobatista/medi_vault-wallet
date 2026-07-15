using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("surgical_history")]
public class SurgicalHistory
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("surgery_name")] public string SurgeryName { get; set; } = null!;
    [Column("surgery_date")] public string? SurgeryDate { get; set; }
    [Column("location")] public string? Location { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("report_file_id")] public int? ReportFileId { get; set; }
    [Column("added_by")] public string? AddedBy { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("ReportFileId")] public MedicalFile? ReportFile { get; set; }
    [ForeignKey("AddedBy")] public Doctor? AddedByDoctor { get; set; }
}
