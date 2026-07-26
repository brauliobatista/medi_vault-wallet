using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("analytical_exam_parameters")]
public class AnalyticalExamParameter
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("exam_id")] public int ExamId { get; set; }
    [Column("parameter_name")] public string ParameterName { get; set; } = null!;
    [Column("value")] public double? Value { get; set; }
    [Column("unit")] public string? Unit { get; set; }
    [Column("reference_min")] public double? ReferenceMin { get; set; }
    [Column("reference_max")] public double? ReferenceMax { get; set; }
    [Column("is_abnormal")] public int IsAbnormal { get; set; } = 0;

    [ForeignKey("ExamId")] public AnalyticalExam Exam { get; set; } = null!;
}
