using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/patients/{userId}")]
[Authorize]
public class ClinicalRecordsController(ClinicalRecordsService records, AccessControlService accessControl) : ControllerBase
{
    private string CurrentId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<bool> CanAccessPatientAsync(string userId)
    {
        if (CurrentRole == "Patient") return CurrentId == userId;
        return await accessControl.DoctorHasAccessAsync(CurrentId, userId);
    }

    // --- Vital signs ---

    [HttpGet("vital-signs")]
    public async Task<IActionResult> GetVitalSigns(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await records.GetVitalSignsAsync(userId));
    }

    [HttpPost("vital-signs")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> AddVitalSign(string userId, CreateVitalSignRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await records.AddVitalSignAsync(userId, CurrentId, req));
    }

    [HttpPut("vital-signs/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> UpdateVitalSign(string userId, int id, CreateVitalSignRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await records.UpdateVitalSignAsync(id, userId, req);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("vital-signs/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> DeleteVitalSign(string userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await records.DeleteVitalSignAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Clinical assessments ---

    [HttpGet("assessments")]
    public async Task<IActionResult> GetAssessments(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await records.GetAssessmentsAsync(userId));
    }

    [HttpPost("assessments")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> AddAssessment(string userId, CreateAssessmentRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await records.AddAssessmentAsync(userId, CurrentId, req));
    }

    [HttpPut("assessments/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> UpdateAssessment(string userId, int id, CreateAssessmentRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await records.UpdateAssessmentAsync(id, userId, req);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("assessments/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> DeleteAssessment(string userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await records.DeleteAssessmentAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Anamnesis ---

    [HttpGet("anamneses")]
    public async Task<IActionResult> GetAnamneses(string userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var currentDoctorId = CurrentRole == "Doctor" ? CurrentId : "";
        return Ok(await records.GetAnamnesesAsync(userId, currentDoctorId));
    }

    [HttpPost("anamneses")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> AddAnamnesis(string userId, UpsertAnamnesisRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await records.AddAnamnesisAsync(userId, CurrentId, req));
    }

    [HttpPut("anamneses/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> UpdateAnamnesis(string userId, int id, UpsertAnamnesisRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var (success, error) = await records.UpdateAnamnesisAsync(id, userId, CurrentId, req);
        if (!success) return BadRequest(new { message = error });
        return NoContent();
    }

    // --- Documents ---

    [HttpGet("documents")]
    public async Task<IActionResult> GetDocuments(string userId, [FromServices] MedicalFileService files)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await files.GetDocumentsAsync(userId));
    }

    [HttpPost("documents")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> UploadDocument(string userId, IFormFile file, [FromServices] MedicalFileService files)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var (dto, error) = await files.UploadAsync(userId, CurrentId, file);
        if (dto is null) return BadRequest(new { message = error });
        return Ok(dto);
    }

    [HttpDelete("documents/{id}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> DeleteDocument(string userId, int id, [FromServices] MedicalFileService files)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await files.DeleteAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Team chat ---

    [HttpGet("chat-messages")]
    public async Task<IActionResult> GetChatMessages(string userId, [FromServices] TeamChatService chat)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await chat.GetMessagesAsync(userId));
    }

    [HttpPost("chat-messages")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> AddChatMessage(string userId, CreateChatMessageRequest req, [FromServices] TeamChatService chat)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Message)) return BadRequest(new { message = "Mensagem vazia." });
        return Ok(await chat.AddMessageAsync(userId, CurrentId, req.Message));
    }
}
