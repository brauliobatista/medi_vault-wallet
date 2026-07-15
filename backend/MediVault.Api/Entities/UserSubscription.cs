using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("user_subscriptions")]
public class UserSubscription
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("plan_id")] public int PlanId { get; set; }
    [Column("card_type")] public string CardType { get; set; } = null!;
    [Column("start_date")] public string StartDate { get; set; } = null!;
    [Column("end_date")] public string? EndDate { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("PlanId")] public SubscriptionPlan Plan { get; set; } = null!;
}
