using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("chronic_medications")]
public class ChronicMedication
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; }
    [Column("active_substance")] public string ActiveSubstance { get; set; } = null!;
    [Column("dose")] public string? Dose { get; set; }
    [Column("posology")] public string? Posology { get; set; }
    [Column("start_date")] public string? StartDate { get; set; }
    [Column("end_date")] public string? EndDate { get; set; }
    [Column("prescribed_by")] public string? PrescribedBy { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("PrescribedBy")] public Doctor? PrescribedByDoctor { get; set; }
}
