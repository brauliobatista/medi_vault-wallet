using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/access-requests")]
[Authorize]
public class AccessRequestsController(AccessControlService accessControl) : ControllerBase
{
    private string CurrentId => (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"))!;
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetMyRequests()
    {
        if (CurrentRole == "Patient")
            return Ok(await accessControl.GetPatientRequestsAsync(CurrentId));
        return Ok(await accessControl.GetDoctorRequestsAsync(CurrentId));
    }

    [HttpGet("search")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> SearchPatient([FromQuery] string utentNumber)
    {
        var result = await accessControl.FindPatientByUtentNumberAsync(utentNumber);
        if (result is null) return NotFound(new { message = "Utente não encontrado." });
        return Ok(new { userId = result.Value.UserId, name = result.Value.Name, publicId = result.Value.PublicId });
    }

    [HttpPost("{userId}")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> RequestAccess(string userId)
    {
        var request = await accessControl.RequestAccessAsync(CurrentId, userId);
        return Ok(new { request.Id, request.Status, request.AccessCode });
    }

    [HttpPut("{requestId}/respond")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> Respond(int requestId, RespondAccessRequest req)
    {
        if (req.Action != "approve" && req.Action != "revoke")
            return BadRequest(new { message = "Action must be 'approve' or 'revoke'" });

        var success = await accessControl.RespondToRequestAsync(requestId, CurrentId, req.Action);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{requestId}")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> Delete(int requestId)
    {
        var success = await accessControl.DeleteRequestAsync(requestId, CurrentId);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("qr")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> ScanQr([FromBody] ScanQrRequest req)
    {
        var cardActive = await accessControl.IsQrCardActiveAsync(req.QrCode);
        if (cardActive is null) return BadRequest(new { message = "QR Code inválido ou expirado." });
        if (!cardActive.Value) return StatusCode(423, new { message = "card_suspended" });

        var result = await accessControl.GrantAccessByQrAsync(CurrentId, req.QrCode);
        if (result is null) return BadRequest(new { message = "QR Code inválido ou expirado." });
        return Ok(new
        {
            result.Value.Request.Id,
            result.Value.Request.UserId,
            result.Value.Request.Status,
            result.Value.Request.ExpiresAt,
            patientName = result.Value.PatientName,
            publicId = result.Value.PublicId
        });
    }
}
