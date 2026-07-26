using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("family_history")]
public class FamilyHistory
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; }
    [Column("condition")] public string Condition { get; set; } = null!;
    [Column("has_condition")] public int HasCondition { get; set; } = 0;
    [Column("kinship_degree")] public string? KinshipDegree { get; set; }
    [Column("notes")] public string? Notes { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
}

