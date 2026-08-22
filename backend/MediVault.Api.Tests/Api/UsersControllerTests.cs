using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class UsersControllerTests
{
    // --- GET /api/users/{userId}/profile ---

    [Fact]
    public async Task GetProfileFor_ReturnsOk_ForOwnUserId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/users/{user.Id}/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<UserProfileDto>();
        Assert.Equal(user.Id, body!.Id);
    }

    [Fact]
    public async Task GetProfileFor_ReturnsOk_ForGuardianOfDependent()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var guardian = TestDataFactory.SeedUser(db);
        var dependent = TestDataFactory.SeedUser(db, isDependent: 1);
        var relType = db.RelationshipTypes.First();
        db.FamilyGuardianships.Add(new FamilyGuardianship
        {
            GuardianUserId = guardian.Id, DependentUserId = dependent.Id,
            RelationshipTypeId = relType.Id, Status = "approved", IsActive = 1,
        });
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(guardian.Id, "Patient", guardian.UtentNumber);

        var response = await client.GetAsync($"/api/users/{dependent.Id}/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetProfileFor_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/users/{user.Id}/profile");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProfileFor_ReturnsForbidden_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/users/{user.Id}/profile");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProfileFor_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/users/some-user-id/profile");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/users/{userId}/qr ---

    [Fact]
    public async Task GetQrCodeFor_ReturnsOk_ForOwnUserId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/users/{user.Id}/qr");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetQrCodeFor_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/users/{user.Id}/qr");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/users/{userId}/card ---

    [Fact]
    public async Task ToggleCardFor_ReturnsNoContent_ForOwnUserId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync($"/api/users/{user.Id}/card", new ToggleCardRequest(false));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ToggleCardFor_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.PutAsJsonAsync($"/api/users/{user.Id}/card", new ToggleCardRequest(false));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/users/{userId}/public-info ---

    [Fact]
    public async Task GetPublicInfo_ReturnsOk_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        db.AccessRequests.Add(new AccessRequest
        {
            DoctorId = doctor.Id, UserId = user.Id, Status = "approved",
            RequestedAt = DateTime.UtcNow.ToString("o"), ApprovedAt = DateTime.UtcNow.ToString("o"),
        });
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/users/{user.Id}/public-info");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetPublicInfo_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/users/{user.Id}/public-info");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetPublicInfo_ReturnsForbidden_ForUnknownUserId()
    {
        // No approved access request can exist for a user id that doesn't exist,
        // so the access check rejects it before existence is even considered.
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync("/api/users/missing-user-id/public-info");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/users/me ---

    [Fact]
    public async Task GetProfile_ReturnsOwnProfile_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/users/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetProfile_ReturnsForbidden_ForDoctorToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync("/api/users/me");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/users/me ---

    [Fact]
    public async Task UpdateProfile_ReturnsNoContent_AndPersistsChanges()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync("/api/users/me",
            new UpdateUserRequest("new@example.com", "912345678", null, null, null, null, null, null, null));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var verifyDb = factory.CreateDbContext();
        Assert.Equal("new@example.com", verifyDb.Users.First(u => u.Id == user.Id).Email);
    }

    // --- PUT /api/users/me/password ---

    [Fact]
    public async Task ChangePassword_ReturnsNoContent_ForCorrectCurrentPassword()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync("/api/users/me/password", new ChangePasswordRequest("correct-horse", "new-password"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ReturnsBadRequest_ForWrongCurrentPassword()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync("/api/users/me/password", new ChangePasswordRequest("wrong", "new-password"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/users/me/card ---

    [Fact]
    public async Task ToggleCard_ReturnsNoContent()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PutAsJsonAsync("/api/users/me/card", new ToggleCardRequest(false));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // --- GET /api/users/me/qr ---

    [Fact]
    public async Task GetQrCode_ReturnsOk()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/users/me/qr");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // --- GET /api/users/me/wallet/google ---

    [Fact]
    public async Task GetGoogleWalletLink_ReturnsNotImplemented_WhenNotConfigured()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync("/api/users/me/wallet/google");

        Assert.Equal((HttpStatusCode)501, response.StatusCode);
    }

    // --- POST /api/users/me/photo ---

    [Fact]
    public async Task UploadPhoto_ReturnsOk_ForValidImage()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);
        using var content = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent([1, 2, 3, 4]);
        content.Add(fileContent, "photo", "avatar.png");

        var response = await client.PostAsync("/api/users/me/photo", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UploadPhoto_ReturnsBadRequest_ForUnsupportedExtension()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);
        using var content = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent([1, 2, 3, 4]);
        content.Add(fileContent, "photo", "malware.exe");

        var response = await client.PostAsync("/api/users/me/photo", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- DELETE /api/users/me/photo ---

    [Fact]
    public async Task DeletePhoto_ReturnsNoContent_WhenNoPhotoSet()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.DeleteAsync("/api/users/me/photo");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
