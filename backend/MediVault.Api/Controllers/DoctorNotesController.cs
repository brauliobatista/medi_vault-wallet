using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/doctor-notes")]
[Authorize(Roles = "Doctor")]
public class DoctorNotesController(DoctorNoteService noteService, AccessControlService accessControl) : ControllerBase
{
    private string DoctorId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetNotes(string userId)
    {
        // Read-only carve-out (KAN-67): a doctor keeps access to their own notes for a patient
        // even after the consultation that granted full access has finished.
        if (!await accessControl.DoctorHasAccessAsync(DoctorId, userId) &&
            !await accessControl.DoctorHadFinishedConsultationAsync(DoctorId, userId))
            return Forbid();
        return Ok(await noteService.GetNotesForDoctorAsync(DoctorId, userId));
    }

    [HttpPost]
    public async Task<IActionResult> CreateNote(CreateDoctorNoteRequest req)
    {
        if (!await accessControl.DoctorHasAccessAsync(DoctorId, req.UserId)) return Forbid();
        var result = await noteService.CreateNoteAsync(DoctorId, req);
        return Ok(result);
    }

    [HttpPut("{noteId}")]
    public async Task<IActionResult> UpdateNote(int noteId, [FromBody] string noteText)
    {
        var success = await noteService.UpdateNoteAsync(noteId, DoctorId, noteText);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{noteId}")]
    public async Task<IActionResult> DeleteNote(int noteId)
    {
        var success = await noteService.DeleteNoteAsync(noteId, DoctorId);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("flags/{userId}")]
    public async Task<IActionResult> GetFlags(string userId)
    {
        if (!await accessControl.DoctorHasAccessAsync(DoctorId, userId)) return Forbid();
        return Ok(await noteService.GetFlagsAsync(userId));
    }

    [HttpPut("flags/{flagId}/review")]
    public async Task<IActionResult> MarkReviewed(int flagId)
    {
        var success = await noteService.MarkFlagReviewedAsync(flagId, DoctorId);
        if (!success) return NotFound();
        return NoContent();
    }
}
