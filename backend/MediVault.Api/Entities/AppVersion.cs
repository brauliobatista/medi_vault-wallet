using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("app_versions")]
public class AppVersion
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("version")] public string Version { get; set; } = null!;
    [Column("release_date")] public string? ReleaseDate { get; set; }
    [Column("description")] public string? Description { get; set; }
    [Column("deployed_at")] public string DeployedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("deployed_by")] public string? DeployedBy { get; set; }
    [Column("environment")] public string Environment { get; set; } = null!;
    [Column("is_current")] public int IsCurrent { get; set; } = 0;
}
