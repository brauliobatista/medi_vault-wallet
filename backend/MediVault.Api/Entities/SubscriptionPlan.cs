using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("subscription_plans")]
public class SubscriptionPlan
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("name")] public string Name { get; set; } = null!;
    [Column("storage_limit_mb")] public int StorageLimitMb { get; set; }
    [Column("price_annual")] public decimal PriceAnnual { get; set; }
    [Column("price_monthly")] public decimal PriceMonthly { get; set; }

    public ICollection<UserSubscription> UserSubscriptions { get; set; } = [];
}
