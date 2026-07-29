using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Family;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/family")]
[Authorize(Roles = "Patient")]
public class FamilyController(FamilyService familyService) : ControllerBase
{
    private string CurrentId => (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"))!;

    [HttpGet]
    public async Task<IActionResult> GetMyFamily()
    {
        return Ok(await familyService.GetFamilyAsync(CurrentId));
    }

    [HttpGet("invitations")]
    public async Task<IActionResult> GetPendingInvitations()
    {
        return Ok(await familyService.GetPendingInvitationsForMeAsync(CurrentId));
    }

    [HttpGet("relationship-types")]
    public async Task<IActionResult> GetRelationshipTypes()
    {
        return Ok(await familyService.GetRelationshipTypesAsync());
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchByEmail([FromQuery] string email)
    {
        var result = await familyService.FindUserByEmailAsync(CurrentId, email);
        if (result is null) return NotFound(new { message = "Utilizador não encontrado." });
        return Ok(result);
    }

    [HttpPost("invite")]
    public async Task<IActionResult> InviteByEmail(InviteByEmailRequest req)
    {
        var (success, error) = await familyService.InviteByEmailAsync(CurrentId, req);
        if (!success) return BadRequest(new { message = error });
        return Ok();
    }

    [HttpPost("dependent")]
    public async Task<IActionResult> CreateDependent(CreateDependentRequest req)
    {
        var (success, error, member) = await familyService.CreateDependentAsync(CurrentId, req);
        if (!success) return BadRequest(new { message = error });
        return Ok(member);
    }

    [HttpPut("{guardianshipId}/respond")]
    public async Task<IActionResult> Respond(int guardianshipId, RespondGuardianshipRequest req)
    {
        if (req.Action != "approve" && req.Action != "decline")
            return BadRequest(new { message = "Action must be 'approve' or 'decline'" });

        var success = await familyService.RespondToInvitationAsync(CurrentId, guardianshipId, req.Action);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{guardianshipId}")]
    public async Task<IActionResult> Remove(int guardianshipId)
    {
        var success = await familyService.RemoveGuardianshipAsync(CurrentId, guardianshipId);
        if (!success) return NotFound();
        return NoContent();
    }
}
