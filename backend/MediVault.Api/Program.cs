using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MediVault.Api.Auth;
using MediVault.Api.Data;
using MediVault.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<MediVaultDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Auth
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Issuer"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });
builder.Services.AddAuthorization();

// Services
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<EncryptionService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AccessControlService>();
builder.Services.AddScoped<MedicalHistoryService>();
builder.Services.AddScoped<ExamService>();
builder.Services.AddScoped<HealthHabitService>();
builder.Services.AddScoped<VaccinationService>();
builder.Services.AddScoped<DoctorNoteService>();
builder.Services.AddScoped<DoctorService>();
builder.Services.AddScoped<AgendaService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MediVault API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

builder.Services.AddCors(opt => opt.AddPolicy("Frontend", policy =>
    policy.WithOrigins("http://localhost:5173", "https://localhost:5173",
                       "http://localhost:5174", "https://localhost:5174",
                       "http://192.168.1.77:5173",
                       "http://192.168.1.189:5173", "https://192.168.1.189:5173",
                       "http://192.168.1.135:5173", "https://192.168.1.135:5173")
          .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Migrate DB and seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MediVaultDbContext>();
    db.Database.EnsureCreated();

    // EnsureCreated() only creates tables/columns from the EF model — triggers aren't
    // part of that model, so the two overlap-prevention triggers (see database/schema_sqlite.sql)
    // are created here with raw SQL, mirroring that file exactly.
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_doctor_schedule_events_no_overlap_insert
        BEFORE INSERT ON doctor_schedule_events
        FOR EACH ROW
        WHEN EXISTS (
            SELECT 1 FROM doctor_schedule_events
            WHERE doctor_id = NEW.doctor_id
              AND NEW.start_date <= end_date
              AND NEW.end_date >= start_date
        )
        BEGIN
            SELECT RAISE(ABORT, 'doctor_schedule_events: overlapping date range for this doctor');
        END
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_doctor_schedule_events_no_overlap_update
        BEFORE UPDATE ON doctor_schedule_events
        FOR EACH ROW
        WHEN EXISTS (
            SELECT 1 FROM doctor_schedule_events
            WHERE doctor_id = NEW.doctor_id
              AND id <> NEW.id
              AND NEW.start_date <= end_date
              AND NEW.end_date >= start_date
        )
        BEGIN
            SELECT RAISE(ABORT, 'doctor_schedule_events: overlapping date range for this doctor');
        END
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_patient_appointments_no_overlap_insert
        BEFORE INSERT ON patient_appointments
        FOR EACH ROW
        WHEN NEW.status <> 'cancelada' AND EXISTS (
            SELECT 1 FROM patient_appointments
            WHERE doctor_id = NEW.doctor_id
              AND scheduled_at = NEW.scheduled_at
              AND status <> 'cancelada'
        )
        BEGIN
            SELECT RAISE(ABORT, 'patient_appointments: doctor already has an appointment at this time');
        END
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_patient_appointments_no_overlap_update
        BEFORE UPDATE ON patient_appointments
        FOR EACH ROW
        WHEN NEW.status <> 'cancelada' AND EXISTS (
            SELECT 1 FROM patient_appointments
            WHERE doctor_id = NEW.doctor_id
              AND scheduled_at = NEW.scheduled_at
              AND status <> 'cancelada'
              AND id <> NEW.id
        )
        BEGIN
            SELECT RAISE(ABORT, 'patient_appointments: doctor already has an appointment at this time');
        END
        """);

    // Prevent a doctor's own schedule (congress/training/vacation) from silently conflicting with
    // their patient appointments — see database/schema_sqlite.sql for the documented pair.
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_patient_appointments_no_schedule_conflict_insert
        BEFORE INSERT ON patient_appointments
        FOR EACH ROW
        WHEN NEW.status <> 'cancelada' AND EXISTS (
            SELECT 1 FROM doctor_schedule_events
            WHERE doctor_id = NEW.doctor_id
              AND date(NEW.scheduled_at) BETWEEN start_date AND end_date
        )
        BEGIN
            SELECT RAISE(ABORT, 'patient_appointments: doctor has a schedule event covering this date');
        END
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_patient_appointments_no_schedule_conflict_update
        BEFORE UPDATE ON patient_appointments
        FOR EACH ROW
        WHEN NEW.status <> 'cancelada' AND EXISTS (
            SELECT 1 FROM doctor_schedule_events
            WHERE doctor_id = NEW.doctor_id
              AND date(NEW.scheduled_at) BETWEEN start_date AND end_date
        )
        BEGIN
            SELECT RAISE(ABORT, 'patient_appointments: doctor has a schedule event covering this date');
        END
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_doctor_schedule_events_no_appointment_conflict_insert
        BEFORE INSERT ON doctor_schedule_events
        FOR EACH ROW
        WHEN EXISTS (
            SELECT 1 FROM patient_appointments
            WHERE doctor_id = NEW.doctor_id
              AND status <> 'cancelada'
              AND date(scheduled_at) BETWEEN NEW.start_date AND NEW.end_date
        )
        BEGIN
            SELECT RAISE(ABORT, 'doctor_schedule_events: doctor already has an appointment within this date range');
        END
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TRIGGER IF NOT EXISTS trg_doctor_schedule_events_no_appointment_conflict_update
        BEFORE UPDATE ON doctor_schedule_events
        FOR EACH ROW
        WHEN EXISTS (
            SELECT 1 FROM patient_appointments
            WHERE doctor_id = NEW.doctor_id
              AND status <> 'cancelada'
              AND date(scheduled_at) BETWEEN NEW.start_date AND NEW.end_date
        )
        BEGIN
            SELECT RAISE(ABORT, 'doctor_schedule_events: doctor already has an appointment within this date range');
        END
        """);

    // Backfill missing share codes
    var usersToBackfill = db.Users.Where(u => u.ShareCode == null || u.ShareCode == "").ToList();
    foreach (var u in usersToBackfill)
        if (string.IsNullOrEmpty(u.ShareCode)) u.ShareCode = Guid.NewGuid().ToString("N")[..12].ToUpper();
    if (usersToBackfill.Count > 0) db.SaveChanges();

    DatabaseSeeder.Seed(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
