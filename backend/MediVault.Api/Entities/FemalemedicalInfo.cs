using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("female_medical_info")]
public class FemalemedicalInfo
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("menarche_age")] public int? MenarcheAge { get; set; }
    [Column("pregnancies")] public int Pregnancies { get; set; } = 0;
    [Column("births")] public int Births { get; set; } = 0;
    [Column("abortions")] public int Abortions { get; set; } = 0;
    [Column("menopause")] public int Menopause { get; set; } = 0;
    [Column("menopause_age")] public int? MenopauseAge { get; set; }
    [Column("contraceptive_use")] public int ContraceptiveUse { get; set; } = 0;
    [Column("intraceptive_method")] public string? IntraceptiveMethod { get; set; }
    [Column("contraceptive_reason")] public string? ContraceptiveReason { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
}
