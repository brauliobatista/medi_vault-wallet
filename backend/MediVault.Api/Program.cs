using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MediVault.Api.Auth;
using MediVault.Api.Data;
using MediVault.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// wwwroot must exist before Build() runs, or IWebHostEnvironment.WebRootFileProvider
// resolves to a NullFileProvider and UseStaticFiles() will 404 everything forever.
Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads", "profile-photos"));

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
builder.Services.AddScoped<FamilyService>();

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
                       "http://192.168.1.77:5173")
          .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Migrate DB and seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MediVaultDbContext>();
    var dbJustCreated = db.Database.EnsureCreated();

    // Add card_active column if this DB pre-dates the feature
    try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN card_active INTEGER NOT NULL DEFAULT 1"); }
    catch { /* column already exists */ }

    // Add photo_path column if this DB pre-dates the feature
    try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN photo_path TEXT"); }
    catch { /* column already exists */ }

    // Create family-guardianship tables + seed relationship_types if this DB pre-dates the feature
    // (KAN-33 + Agregado Familiar). Skipped on a brand-new DB: EnsureCreated() already built these
    // tables from the current EF model, and DatabaseSeeder.Seed() below populates relationship_types
    // for it — running both would double-insert and violate the unique constraint on code.
    if (!dbJustCreated)
    {
        try
        {
            db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS relationship_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, description TEXT)");
            db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS family_guardianships (
                id INTEGER PRIMARY KEY AUTOINCREMENT, guardian_user_id TEXT NOT NULL, dependent_user_id TEXT NOT NULL,
                relationship_type_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
                is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (guardian_user_id) REFERENCES users(id), FOREIGN KEY (dependent_user_id) REFERENCES users(id),
                FOREIGN KEY (relationship_type_id) REFERENCES relationship_types(id), CHECK (guardian_user_id <> dependent_user_id))");
            db.Database.ExecuteSqlRaw("INSERT OR IGNORE INTO relationship_types (code, description) VALUES ('parent','Pai / mãe')");
            db.Database.ExecuteSqlRaw("INSERT OR IGNORE INTO relationship_types (code, description) VALUES ('legal_guardian','Tutor legal nomeado por tribunal (pessoa incapacitada)')");
            db.Database.ExecuteSqlRaw("INSERT OR IGNORE INTO relationship_types (code, description) VALUES ('tutor','Tutor de menor sem tutela parental')");
            db.Database.ExecuteSqlRaw("INSERT OR IGNORE INTO relationship_types (code, description) VALUES ('other','Outro tipo de responsável')");
        }
        catch { /* tables already exist */ }
    }

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
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
