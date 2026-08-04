using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("family_guardianships")]
public class FamilyGuardianship
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("guardian_user_id")] public string GuardianUserId { get; set; } = null!;
    [Column("dependent_user_id")] public string DependentUserId { get; set; } = null!;
    [Column("relationship_type_id")] public int RelationshipTypeId { get; set; }
    [Column("status")] public string Status { get; set; } = "pending";
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("GuardianUserId")] public User Guardian { get; set; } = null!;
    [ForeignKey("DependentUserId")] public User Dependent { get; set; } = null!;
    [ForeignKey("RelationshipTypeId")] public RelationshipType RelationshipType { get; set; } = null!;
}
