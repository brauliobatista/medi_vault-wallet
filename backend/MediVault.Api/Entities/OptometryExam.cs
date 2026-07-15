using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("optometry_exams")]
public class OptometryExam
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; }
    [Column("exam_date")] public string ExamDate { get; set; } = null!;
    [Column("right_sphere")] public double? RightSphere { get; set; }
    [Column("right_cylinder")] public double? RightCylinder { get; set; }
    [Column("right_axis")] public int? RightAxis { get; set; }
    [Column("left_sphere")] public double? LeftSphere { get; set; }
    [Column("left_cylinder")] public double? LeftCylinder { get; set; }
    [Column("left_axis")] public int? LeftAxis { get; set; }
    [Column("disease_report")] public string? DiseaseReport { get; set; }
    [Column("added_by")] public string? AddedBy { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("AddedBy")] public Doctor? AddedByDoctor { get; set; }
}
