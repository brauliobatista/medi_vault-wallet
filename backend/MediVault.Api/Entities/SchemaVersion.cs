using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("schema_versions")]
public class SchemaVersion
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("version")] public string Version { get; set; } = null!;
    [Column("description")] public string? Description { get; set; }
    [Column("script")] public string? Script { get; set; }
    [Column("applied_at")] public string AppliedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("applied_by")] public string? AppliedBy { get; set; }
    [Column("checksum")] public string? Checksum { get; set; }
    [Column("success")] public int Success { get; set; } = 1;
}
