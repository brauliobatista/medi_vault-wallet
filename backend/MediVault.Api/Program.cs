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
var documentsDir = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads", "documents");
Directory.CreateDirectory(documentsDir);

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

    // Migrations for columns added after initial schema
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

    // Backfill missing share codes
    var usersToBackfill = db.Users.Where(u => u.ShareCode == null || u.ShareCode == "").ToList();
    foreach (var u in usersToBackfill)
        if (string.IsNullOrEmpty(u.ShareCode)) u.ShareCode = Guid.NewGuid().ToString("N")[..12].ToUpper();
    if (usersToBackfill.Count > 0) db.SaveChanges();

    var seedPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "database", "seed.sql"));
    DatabaseSeeder.Seed(db, seedPath);
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
