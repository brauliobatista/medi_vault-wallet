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
    private int DoctorId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetNotes(int userId)
    {
        if (!await accessControl.DoctorHasAccessAsync(DoctorId, userId)) return Forbid();
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
    public async Task<IActionResult> GetFlags(int userId)
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
