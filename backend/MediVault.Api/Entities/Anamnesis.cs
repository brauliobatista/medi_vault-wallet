using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("anamneses")]
public class Anamnesis
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("doctor_id")] public string DoctorId { get; set; } = null!;
    [Column("chief_complaint")] public string? ChiefComplaint { get; set; }
    [Column("illness_history")] public string? IllnessHistory { get; set; }
    [Column("personal_history")] public string? PersonalHistory { get; set; }
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("updated_at")] public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("DoctorId")] public Doctor Doctor { get; set; } = null!;
}
