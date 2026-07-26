using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("genders")]
public class Gender
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("code")] public string Code { get; set; } = null!;
    [Column("description")] public string? Description { get; set; }
}
