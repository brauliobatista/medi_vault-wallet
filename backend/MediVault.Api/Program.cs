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
    db.Database.EnsureCreated();

    // Schema evolution: add new columns if missing
    try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN share_code TEXT NOT NULL DEFAULT ''"); }
    catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE users ADD COLUMN public_id TEXT NOT NULL DEFAULT ''"); }
    catch { }

    // Backfill missing share codes and public IDs
    var usersToBackfill = db.Users.Where(u => u.ShareCode == null || u.ShareCode == "" || u.PublicId == null || u.PublicId == "").ToList();
    foreach (var u in usersToBackfill)
    {
        if (string.IsNullOrEmpty(u.ShareCode)) u.ShareCode = Guid.NewGuid().ToString("N")[..12].ToUpper();
        if (string.IsNullOrEmpty(u.PublicId)) u.PublicId = Guid.NewGuid().ToString();
    }
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
