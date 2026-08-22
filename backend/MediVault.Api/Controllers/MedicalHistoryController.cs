using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/patients/{userId}")]
[Authorize]
public class MedicalHistoryController(
    MedicalHistoryService medicalHistory,
    AccessControlService accessControl) : ControllerBase
{
    private string CurrentId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<bool> CanAccessPatientAsync(string userId)
    {
        if (CurrentRole == "Patient")
            return CurrentId == userId || await accessControl.GuardianHasAccessAsync(CurrentId, userId);
        return await accessControl.DoctorHasAccessAsync(CurrentId, userId);
    }

    [HttpGet("access-status")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> GetAccessStatus(string userId)
    {
        var (hasAccess, reason) = await accessControl.GetAccessStatusAsync(CurrentId, userId);
        return Ok(new { hasAccess, reason });
    }

    // --- Patient summary ---

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var summary = await medicalHistory.GetPatientSummaryAsync(userId);
        if (summary is null) return NotFound();
        return Ok(summary);
    }

    [HttpPut("blood-type")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> UpdateBloodType(string userId, UpdateBloodTypeRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.UpdateBloodTypeAsync(userId, req.BloodType);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Active pathologies ---

    [HttpGet("/api/icpc2-codes")]
    public async Task<IActionResult> GetIcpc2Codes() => Ok(await medicalHistory.GetIcpc2CodesAsync());

    [HttpGet("pathologies")]
    public async Task<IActionResult> GetPathologies(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetPathologiesAsync(userId));
    }

    [HttpPost("pathologies")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> AddPathology(string userId, CreatePathologyRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await medicalHistory.AddPathologyAsync(userId, req);
        if (result is null) return BadRequest(new { message = "Código ICPC-2 inválido." });
        return Ok(result);
    }

    [HttpDelete("pathologies/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> DeletePathology(string userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.DeletePathologyAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Surgical History ---

    [HttpGet("surgeries")]
    public async Task<IActionResult> GetSurgeries(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetSurgeriesAsync(userId));
    }

    [HttpPost("surgeries")]
    public async Task<IActionResult> AddSurgery(string userId, CreateSurgicalHistoryRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (string?)null;
        var result = await medicalHistory.AddSurgeryAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetSurgeries), new { userId }, result);
    }

    [HttpDelete("surgeries/{id}")]
    public async Task<IActionResult> DeleteSurgery(string userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.SoftDeleteSurgeryAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Medications ---

    [HttpGet("medications")]
    public async Task<IActionResult> GetMedications(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetMedicationsAsync(userId));
    }

    [HttpPost("medications")]
    public async Task<IActionResult> AddMedication(string userId, CreateChronicMedicationRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (string?)null;
        var result = await medicalHistory.AddMedicationAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetMedications), new { userId }, result);
    }

    [HttpDelete("medications/{id}")]
    public async Task<IActionResult> DeleteMedication(string userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.SoftDeleteMedicationAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Allergies ---

    [HttpGet("allergies")]
    public async Task<IActionResult> GetAllergies(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetAllergiesAsync(userId));
    }

    [HttpPost("allergies")]
    public async Task<IActionResult> AddAllergy(string userId, CreateDrugAllergyRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await medicalHistory.AddAllergyAsync(userId, req);
        return CreatedAtAction(nameof(GetAllergies), new { userId }, result);
    }

    [HttpDelete("allergies/{id}")]
    public async Task<IActionResult> DeleteAllergy(string userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.DeleteAllergyAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Family History ---

    [HttpGet("family-history")]
    public async Task<IActionResult> GetFamilyHistory(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetFamilyHistoryAsync(userId));
    }

    [HttpPost("family-history")]
    public async Task<IActionResult> UpsertFamilyHistory(string userId, UpsertFamilyHistoryRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await medicalHistory.UpsertFamilyHistoryAsync(userId, req);
        return Ok(result);
    }

    // --- Family circle (agregado familiar) ---

    [HttpGet("family")]
    public async Task<IActionResult> GetFamily(string userId, [FromServices] FamilyService familyService)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await familyService.GetFamilyCircleAsync(userId));
    }

    // --- Health Habits ---

    [HttpGet("habits")]
    public async Task<IActionResult> GetHabits(string userId, [FromServices] HealthHabitService habitService)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await habitService.GetHabitsAsync(userId));
    }

    [HttpPost("habits")]
    public async Task<IActionResult> UpsertHabit(string userId, UpsertHealthHabitRequest req, [FromServices] HealthHabitService habitService)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await habitService.UpsertHabitAsync(userId, req);
        return Ok(result);
    }
}
