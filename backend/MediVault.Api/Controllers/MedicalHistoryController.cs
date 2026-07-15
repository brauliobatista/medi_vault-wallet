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
    private int CurrentId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<bool> CanAccessPatientAsync(int userId)
    {
        if (CurrentRole == "Patient") return CurrentId == userId;
        return await accessControl.DoctorHasAccessAsync(CurrentId, userId);
    }

    // --- Surgical History ---

    [HttpGet("surgeries")]
    public async Task<IActionResult> GetSurgeries(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetSurgeriesAsync(userId));
    }

    [HttpPost("surgeries")]
    public async Task<IActionResult> AddSurgery(int userId, CreateSurgicalHistoryRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (int?)null;
        var result = await medicalHistory.AddSurgeryAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetSurgeries), new { userId }, result);
    }

    [HttpDelete("surgeries/{id}")]
    public async Task<IActionResult> DeleteSurgery(int userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.SoftDeleteSurgeryAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Medications ---

    [HttpGet("medications")]
    public async Task<IActionResult> GetMedications(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetMedicationsAsync(userId));
    }

    [HttpPost("medications")]
    public async Task<IActionResult> AddMedication(int userId, CreateChronicMedicationRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (int?)null;
        var result = await medicalHistory.AddMedicationAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetMedications), new { userId }, result);
    }

    [HttpDelete("medications/{id}")]
    public async Task<IActionResult> DeleteMedication(int userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.SoftDeleteMedicationAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Allergies ---

    [HttpGet("allergies")]
    public async Task<IActionResult> GetAllergies(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetAllergiesAsync(userId));
    }

    [HttpPost("allergies")]
    public async Task<IActionResult> AddAllergy(int userId, CreateDrugAllergyRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await medicalHistory.AddAllergyAsync(userId, req);
        return CreatedAtAction(nameof(GetAllergies), new { userId }, result);
    }

    [HttpDelete("allergies/{id}")]
    public async Task<IActionResult> DeleteAllergy(int userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await medicalHistory.DeleteAllergyAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Family History ---

    [HttpGet("family-history")]
    public async Task<IActionResult> GetFamilyHistory(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await medicalHistory.GetFamilyHistoryAsync(userId));
    }

    [HttpPost("family-history")]
    public async Task<IActionResult> UpsertFamilyHistory(int userId, UpsertFamilyHistoryRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await medicalHistory.UpsertFamilyHistoryAsync(userId, req);
        return Ok(result);
    }

    // --- Health Habits ---

    [HttpGet("habits")]
    public async Task<IActionResult> GetHabits(int userId, [FromServices] HealthHabitService habitService)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await habitService.GetHabitsAsync(userId));
    }

    [HttpPost("habits")]
    public async Task<IActionResult> UpsertHabit(int userId, UpsertHealthHabitRequest req, [FromServices] HealthHabitService habitService)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var result = await habitService.UpsertHabitAsync(userId, req);
        return Ok(result);
    }
}
