using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("drug_allergies")]
public class DrugAllergy
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("active_substance")] public string ActiveSubstance { get; set; } = null!;
    [Column("allergic_reaction")] public string? AllergicReaction { get; set; }
    [Column("severity")] public string? Severity { get; set; }
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
}
