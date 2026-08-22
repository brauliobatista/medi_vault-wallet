using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MediVault.Api.Auth;
using MediVault.Api.Data;
using MediVault.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Load locally-set `dotnet user-secrets` unconditionally, instead of relying on
// ASPNETCORE_ENVIRONMENT=Development being threaded through correctly by every
// launch method (Visual Studio's launch-profile selection, `dotnet run`, etc.).
// No-ops harmlessly if no secrets file exists for this project's UserSecretsId.
builder.Configuration.AddUserSecrets<Program>(optional: true);

// wwwroot must exist before Build() runs, or IWebHostEnvironment.WebRootFileProvider
// resolves to a NullFileProvider and UseStaticFiles() will 404 everything forever.
Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads", "profile-photos"));
var documentsDir = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads", "documents");
Directory.CreateDirectory(documentsDir);

// Database
// Set ConnectionStrings:Postgres (e.g. via the ConnectionStrings__Postgres env var) to
// deploy against a managed Postgres instance (Neon, etc.); otherwise falls back to the
// local SQLite file used for development.
var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
builder.Services.AddDbContext<MediVaultDbContext>(opt =>
{
    if (!string.IsNullOrWhiteSpace(postgresConnectionString))
        opt.UseNpgsql(postgresConnectionString);
    else
        opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddMemoryCache();

// Auth
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException(
        "Jwt:Secret not configured. Run: dotnet user-secrets set \"Jwt:Secret\" \"<random string>\" in backend/MediVault.Api " +
        "(if running from Visual Studio, make sure ASPNETCORE_ENVIRONMENT=Development and the selected launch profile is \"MediVault.Api\", not IIS Express).");
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
builder.Services.AddScoped<GoogleWalletService>();
builder.Services.AddScoped<AccessControlService>();
builder.Services.AddScoped<MedicalHistoryService>();
builder.Services.AddScoped<ExamService>();
builder.Services.AddScoped<HealthHabitService>();
builder.Services.AddScoped<VaccinationService>();
builder.Services.AddScoped<DoctorNoteService>();
builder.Services.AddScoped<DoctorService>();
builder.Services.AddScoped<AgendaService>();
builder.Services.AddScoped<FamilyService>();
builder.Services.AddScoped<ClinicalRecordsService>();
builder.Services.AddScoped<MedicalFileService>();
builder.Services.AddScoped<TeamChatService>();

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

// Extra origins (e.g. the deployed Vercel URL) come from config — set via the
// Cors__AllowedOrigins__0, Cors__AllowedOrigins__1, ... env vars in production.
var extraOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt => opt.AddPolicy("Frontend", policy =>
    policy.WithOrigins([
                       "http://localhost:5173", "https://localhost:5173",
                       "http://localhost:5174", "https://localhost:5174",
                       "http://192.168.1.77:5173",
                       "http://192.168.1.189:5173", "https://192.168.1.189:5173",
                       "http://192.168.1.135:5173", "https://192.168.1.135:5173",
                       .. extraOrigins,
                       ])
          .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Migrate DB and seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MediVaultDbContext>();
    var dbJustCreated = db.Database.EnsureCreated();

    // Migrations for columns added after initial schema (SQLite dev DB only — a fresh
    // Postgres database is always created by EnsureCreated with the current model already,
    // and this raw SQL uses SQLite-only syntax like AUTOINCREMENT).
    if (db.Database.IsSqlite())
    {
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN card_active INTEGER NOT NULL DEFAULT 1"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN share_code TEXT NOT NULL DEFAULT ''"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN sex_id INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN nationality_id INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE doctors ADD COLUMN nationality_id INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE health_habits ADD COLUMN type_id INTEGER NOT NULL DEFAULT 0"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS countries (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, name TEXT NOT NULL)"); }
        catch { /* table already exists */ }
        try { db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS genders (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, description TEXT)"); }
        catch { /* table already exists */ }
        try { db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS habit_types (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, description TEXT)"); }
        catch { /* table already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN photo_path TEXT"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'pt'"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE doctors ADD COLUMN language TEXT NOT NULL DEFAULT 'pt'"); }
        catch { /* column already exists */ }
        try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN phone_country_code TEXT NOT NULL DEFAULT '351'"); }
        catch { /* column already exists */ }
        try
        {
            db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS consultations (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT    NOT NULL,
                doctor_id   TEXT    NOT NULL,
                status      TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finished')),
                started_at  TEXT    NOT NULL,
                finished_at TEXT,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (doctor_id) REFERENCES doctors(id)
            )");
        }
        catch { /* table already exists */ }
    }

    var seedPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "database", "seed.sql"));
    DatabaseSeeder.Seed(db, seedPath);

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

    // Backfill missing share codes (must run after seeding: seed.sql's raw INSERT
    // statements don't set share_code, and a fresh DB's column has no SQL-level default)
    var usersToBackfill = db.Users.Where(u => u.ShareCode == null || u.ShareCode == "").ToList();
    foreach (var u in usersToBackfill)
        if (string.IsNullOrEmpty(u.ShareCode)) u.ShareCode = Guid.NewGuid().ToString("N")[..12].ToUpper();
    if (usersToBackfill.Count > 0) db.SaveChanges();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Exposes the top-level Program for WebApplicationFactory<Program> in integration tests.
public partial class Program { }
