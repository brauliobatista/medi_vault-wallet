using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("user_specialty_followups")]
public class UserSpecialtyFollowup
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; }
    [Column("specialty_id")] public int SpecialtyId { get; set; }
    [Column("institution")] public string? Institution { get; set; }
    [Column("start_date")] public string? StartDate { get; set; }
    [Column("notes")] public string? Notes { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("SpecialtyId")] public MedicalSpecialty Specialty { get; set; } = null!;
}
