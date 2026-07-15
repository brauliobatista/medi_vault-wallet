using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("user_addresses")]
public class UserAddress
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("street")] public string? Street { get; set; }
    [Column("city")] public string? City { get; set; }
    [Column("postal_code")] public string? PostalCode { get; set; }
    [Column("country")] public string? Country { get; set; }
    [Column("is_primary")] public int IsPrimary { get; set; } = 0;

    [ForeignKey("UserId")] public User User { get; set; } = null!;
}
