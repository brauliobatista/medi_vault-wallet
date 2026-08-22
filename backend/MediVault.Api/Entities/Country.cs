using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("countries")]
public class Country
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("code")] public string Code { get; set; } = null!;
    [Column("name")] public string Name { get; set; } = null!;
}
