using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("icpc2_codes")]
public class Icpc2Code
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("code")] public string Code { get; set; } = null!;
    [Column("description")] public string Description { get; set; } = null!;
    [Column("chapter")] public string? Chapter { get; set; }

    public ICollection<UserPathology> UserPathologies { get; set; } = [];
}
