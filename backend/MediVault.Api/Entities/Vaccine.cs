using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("vaccines")]
public class Vaccine
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("name")] public string Name { get; set; } = null!;
    [Column("description")] public string? Description { get; set; }

    public ICollection<UserVaccination> UserVaccinations { get; set; } = [];
}
