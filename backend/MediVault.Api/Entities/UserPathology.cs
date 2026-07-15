using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("user_pathologies")]
public class UserPathology
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("icpc2_id")] public int Icpc2Id { get; set; }
    [Column("type")] public string Type { get; set; } = null!;
    [Column("diagnosed_at")] public string? DiagnosedAt { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("added_by")] public int? AddedBy { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("Icpc2Id")] public Icpc2Code Icpc2Code { get; set; } = null!;
    [ForeignKey("AddedBy")] public Doctor? AddedByDoctor { get; set; }
}
