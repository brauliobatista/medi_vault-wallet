using System.Net;
using System.Net.Http.Json;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Entities;

namespace MediVault.Api.Tests.Api;

public class ClinicalRecordsControllerTests
{
    private static CreateVitalSignRequest VitalSignRequest() =>
        new(DateTime.UtcNow.ToString("o"), 120, 80, 70, 16, 36.5m, 98, 70.5m, 1.75m, "ok");

    private static AccessRequest GrantDoctorAccess(Data.MediVaultDbContext db, string doctorId, string userId)
    {
        var request = new AccessRequest
        {
            DoctorId = doctorId, UserId = userId, Status = "approved",
            RequestedAt = DateTime.UtcNow.ToString("o"), ApprovedAt = DateTime.UtcNow.ToString("o"),
            ExpiresAt = DateTime.UtcNow.AddDays(7).ToString("o"),
        };
        db.AccessRequests.Add(request);
        db.SaveChanges();
        return request;
    }

    // --- Vital signs: access control (shared by every sub-resource in this controller) ---

    [Fact]
    public async Task GetVitalSigns_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/vital-signs");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetVitalSigns_ReturnsOk_ForDoctorWithGrantedAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/vital-signs");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetVitalSigns_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/vital-signs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetVitalSigns_ReturnsForbidden_ForUnrelatedPatient()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var otherUser = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(otherUser.Id, "Patient", otherUser.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/vital-signs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetVitalSigns_ReturnsUnauthorized_WithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/patients/some-user-id/vital-signs");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- Vital signs: CRUD ---

    [Fact]
    public async Task AddVitalSign_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/vital-signs", VitalSignRequest());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddVitalSign_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/vital-signs", VitalSignRequest());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateVitalSign_ReturnsNoContent_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/vital-signs", VitalSignRequest()))
            .Content.ReadFromJsonAsync<VitalSignDto>();

        var response = await client.PutAsJsonAsync($"/api/patients/{user.Id}/vital-signs/{created!.Id}", VitalSignRequest());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateVitalSign_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync($"/api/patients/{user.Id}/vital-signs/999", VitalSignRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteVitalSign_ReturnsNoContent_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/vital-signs", VitalSignRequest()))
            .Content.ReadFromJsonAsync<VitalSignDto>();

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/vital-signs/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteVitalSign_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/vital-signs/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Assessments ---

    [Fact]
    public async Task AddAssessment_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/assessments", new CreateAssessmentRequest("Gripe", "Repouso"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAssessments_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/assessments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAssessment_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PutAsJsonAsync($"/api/patients/{user.Id}/assessments/999", new CreateAssessmentRequest("x", "y"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAssessment_ReturnsNoContent_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/assessments", new CreateAssessmentRequest("Gripe", "Repouso")))
            .Content.ReadFromJsonAsync<ClinicalAssessmentDto>();

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/assessments/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // --- Anamnesis ---

    [Fact]
    public async Task AddAnamnesis_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/anamneses", new UpsertAnamnesisRequest("Dor de cabeça", null, null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAnamnesis_ReturnsNoContent_ForCreatingDoctorWithin24Hours()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/anamneses", new UpsertAnamnesisRequest("Dor", null, null)))
            .Content.ReadFromJsonAsync<AnamnesisDto>();

        var response = await client.PutAsJsonAsync($"/api/patients/{user.Id}/anamneses/{created!.Id}", new UpsertAnamnesisRequest("Dor forte", "hoje", null));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAnamnesis_ReturnsBadRequest_ForDifferentDoctor()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var otherDoctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        GrantDoctorAccess(db, otherDoctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);
        var created = await (await client.PostAsJsonAsync($"/api/patients/{user.Id}/anamneses", new UpsertAnamnesisRequest("Dor", null, null)))
            .Content.ReadFromJsonAsync<AnamnesisDto>();
        var otherClient = factory.CreateAuthorizedClient(otherDoctor.Id, "Doctor", otherDoctor.OrdemMedicosId);

        var response = await otherClient.PutAsJsonAsync($"/api/patients/{user.Id}/anamneses/{created!.Id}", new UpsertAnamnesisRequest("Outra", null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Consultation (draft / finish) ---

    [Fact]
    public async Task SaveConsultationDraft_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/consultation/draft", new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SaveConsultationDraft_ReturnsForbidden_ForDoctorWithoutAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/consultation/draft", new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task FinishConsultation_ReturnsOk_ForDoctorWithAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/consultation/finish", new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<ConsultationDto>();
        Assert.Equal("finished", dto!.Status);
    }

    [Fact]
    public async Task SaveConsultationDraft_ReturnsForbidden_ForPatientRole()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/consultation/draft", new SaveConsultationRequest(null, DateTime.UtcNow.ToString("o")));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- Documents ---

    [Fact]
    public async Task GetDocuments_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/documents");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UploadDocument_ReturnsOk_ForValidPdf()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        using var content = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent([1, 2, 3, 4]);
        content.Add(fileContent, "file", "exame.pdf");

        var response = await client.PostAsync($"/api/patients/{user.Id}/documents", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UploadDocument_ReturnsBadRequest_ForUnsupportedExtension()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        using var content = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent([1, 2, 3, 4]);
        content.Add(fileContent, "file", "malware.exe");

        var response = await client.PostAsync($"/api/patients/{user.Id}/documents", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteDocument_ReturnsNotFound_ForUnknownId()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.DeleteAsync($"/api/patients/{user.Id}/documents/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Team chat ---

    [Fact]
    public async Task GetChatMessages_ReturnsOk_ForOwnPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.GetAsync($"/api/patients/{user.Id}/chat-messages");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetChatMessages_ReturnsOk_ForDoctorWithFinishedConsultation_ButNoActiveAccess()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        db.Consultations.Add(new Consultation
        {
            UserId = user.Id, DoctorId = doctor.Id, Status = "finished",
            StartedAt = DateTime.UtcNow.AddMinutes(-10).ToString("o"), FinishedAt = DateTime.UtcNow.ToString("o"),
        });
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/chat-messages");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetChatMessages_ReturnsForbidden_ForDoctorWithOnlyDraftConsultation()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        db.Consultations.Add(new Consultation { UserId = user.Id, DoctorId = doctor.Id, Status = "draft", StartedAt = DateTime.UtcNow.ToString("o") });
        db.SaveChanges();
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.GetAsync($"/api/patients/{user.Id}/chat-messages");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddChatMessage_ReturnsOk_ForNonEmptyMessage()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/chat-messages", new CreateChatMessageRequest("Doente estável."));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddChatMessage_ReturnsBadRequest_ForEmptyMessage()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var doctor = TestDataFactory.SeedDoctor(db);
        GrantDoctorAccess(db, doctor.Id, user.Id);
        var client = factory.CreateAuthorizedClient(doctor.Id, "Doctor", doctor.OrdemMedicosId);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/chat-messages", new CreateChatMessageRequest("   "));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddChatMessage_ReturnsForbidden_ForPatientToken()
    {
        using var factory = new ApiTestFactory();
        using var db = factory.CreateDbContext();
        var user = TestDataFactory.SeedUser(db);
        var client = factory.CreateAuthorizedClient(user.Id, "Patient", user.UtentNumber);

        var response = await client.PostAsJsonAsync($"/api/patients/{user.Id}/chat-messages", new CreateChatMessageRequest("Olá"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
