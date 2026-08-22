---
name: recreate-db
description: Recreate the MediVault SQLite database from scratch — stops the API, deletes the DB, runs schema_sqlite.sql + seed.sql, then restarts the API.
---

Recreate the MediVault database from scratch. Follow these steps exactly, in order:

## Paths (fixed — do not ask the user)
- DB file: `C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\backend\MediVault.Api\medivault.db`
- Schema SQL: `C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\database\schema_sqlite.sql`
- Seed SQL: `C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\database\seed.sql`
- API project: `C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\backend\MediVault.Api\MediVault.Api.csproj`
- Scratchpad: `C:\Users\BRAULI~1\AppData\Local\Temp\claude\C--Users-Braulio-Batista-Documents-MediVault\`

## Step 1 — Stop the API
Use `preview_stop` if the API server is running. Also kill any dotnet process holding the DB:
```powershell
Get-Process | Where-Object { $_.Name -like "*MediVault*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process dotnet -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
```

## Step 2 — Delete the DB files
```powershell
$base = "C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\backend\MediVault.Api\medivault"
foreach ($ext in @(".db", ".db-shm", ".db-wal")) {
    $f = "$base$ext"
    if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
}
Write-Host "DB apagada: $(!(Test-Path "$base.db"))"
```

**If the file is still locked** (Visual Studio Server Explorer keeps SQLite connections open):
- In Visual Studio → View → Server Explorer → right-click the `medivault.db` connection → Close Connection
- Then repeat Step 2.

## Step 3 — Run schema + seed via a C# script
Create a temp project in the scratchpad, then run it.

Create `DbRecreate/DbRecreate.csproj`:
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net9.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup>
  <ItemGroup><PackageReference Include="Microsoft.Data.Sqlite" Version="9.0.0" /></ItemGroup>
</Project>
```

Create `DbRecreate/Program.cs`:
```csharp
using Microsoft.Data.Sqlite;

var dbPath     = @"C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\backend\MediVault.Api\medivault.db";
var schemaPath = @"C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\database\schema_sqlite.sql";
var seedPath   = @"C:\git\GitHub\medi_vault-wallet\medi_vault-wallet\database\seed.sql";

// Smart SQL splitter — respects -- line comments and string literals
static IEnumerable<string> SplitSql(string sql)
{
    var sb = new System.Text.StringBuilder();
    bool inLineComment = false, inString = false;
    char stringChar = '\0';

    for (int i = 0; i < sql.Length; i++)
    {
        char c = sql[i], next = i + 1 < sql.Length ? sql[i + 1] : '\0';
        if (inLineComment) { sb.Append(c); if (c == '\n') inLineComment = false; continue; }
        if (inString)
        {
            sb.Append(c);
            if (c == stringChar && next == stringChar) { sb.Append(next); i++; }
            else if (c == stringChar) inString = false;
            continue;
        }
        if (c == '-' && next == '-') { inLineComment = true; sb.Append(c); continue; }
        if (c == '\'' || c == '"') { inString = true; stringChar = c; sb.Append(c); continue; }
        if (c == ';') { var s = sb.ToString().Trim(); if (!string.IsNullOrWhiteSpace(s)) yield return s; sb.Clear(); continue; }
        sb.Append(c);
    }
    var last = sb.ToString().Trim();
    if (!string.IsNullOrWhiteSpace(last)) yield return last;
}

static bool IsOnlyComments(string stmt)
{
    var stripped = System.Text.RegularExpressions.Regex.Replace(stmt, @"--[^\n]*", "").Trim();
    return string.IsNullOrWhiteSpace(stripped);
}

using var conn = new SqliteConnection($"Data Source={dbPath}");
conn.Open();

// Schema — auto-commit (schema_sqlite.sql manages its own BEGIN/COMMIT)
Console.WriteLine("A criar schema...");
int ok = 0, skip = 0;
foreach (var stmt in SplitSql(File.ReadAllText(schemaPath)))
{
    if (IsOnlyComments(stmt)) continue;
    using var cmd = conn.CreateCommand();
    cmd.CommandText = stmt;
    try { cmd.ExecuteNonQuery(); ok++; }
    catch (Exception ex) { Console.WriteLine($"  SKIP: {ex.Message[..Math.Min(100, ex.Message.Length)]}"); skip++; }
}
Console.WriteLine($"Schema: {ok} OK, {skip} skipped.\n");

// Seed — single transaction
Console.WriteLine("A correr seed.sql...");
ok = 0; skip = 0;
using (var tx = conn.BeginTransaction())
{
    foreach (var stmt in SplitSql(File.ReadAllText(seedPath)))
    {
        if (IsOnlyComments(stmt)) continue;
        using var cmd = conn.CreateCommand();
        cmd.CommandText = stmt;
        cmd.Transaction = tx;
        try { cmd.ExecuteNonQuery(); ok++; }
        catch (Exception ex) { Console.WriteLine($"  SKIP: {ex.Message[..Math.Min(100, ex.Message.Length)]}"); skip++; }
    }
    tx.Commit();
}
Console.WriteLine($"Seed: {ok} OK, {skip} skipped.\n");

// Verify
Console.WriteLine("Contagem final:");
foreach (var t in new[] { "users", "doctors", "countries", "genders", "habit_types", "institutions", "subscription_plans" })
{
    using var cmd = conn.CreateCommand();
    cmd.CommandText = $"SELECT COUNT(*) FROM \"{t}\"";
    try { Console.WriteLine($"  {t}: {cmd.ExecuteScalar()}"); }
    catch { Console.WriteLine($"  {t}: ERRO"); }
}
```

Then run:
```powershell
cd "C:\Users\BRAULI~1\AppData\Local\Temp\claude\C--Users-Braulio-Batista-Documents-MediVault\DbRecreate"
dotnet run
```

Expected output: `users: 12, doctors: 11, countries: 249, genders: 3`

## Step 4 — Restart the API
Use `preview_start` with name `MediVault API` to restart the server.

## Step 5 — Verify
```powershell
Start-Sleep -Seconds 3
$body = '{"utentNumber":"678901234","password":"password123"}'
$r = Invoke-RestMethod -Uri "http://localhost:50970/api/auth/patient/login" -Method POST -Body $body -ContentType "application/json"
Write-Host "Paciente OK: $($r.name)"
$body2 = '{"ordemMedicosId":"OM-56789","password":"password123"}'
$r2 = Invoke-RestMethod -Uri "http://localhost:50970/api/auth/doctor/login" -Method POST -Body $body2 -ContentType "application/json"
Write-Host "Médico OK: $($r2.name)"
```

## Notes
- After recreating the DB, all users must log out and log in again (old JWT tokens have stale user IDs).
- The `DatabaseSeeder.cs` in the API reads `seed.sql` automatically on first startup — if the DB already has users it skips the seed entirely.
- Team member credentials (all with `password123`):
  - Patients: `678901234` (Braulio), `789012345` (Mónica), `890123456` (César), `901234567` (Tiago), `112233445` (Joaquim), `223344556` (Maria Costa), `334455667` (Diana Almeida)
  - Doctors: `OM-56789` (Braulio), `OM-67890` (Mónica), `OM-78901` (César), `OM-89012` (Tiago), `OM-90123` (Joaquim), `OM-10234` (Maria Costa), `OM-11234` (Diana Almeida)
- Fictional users (João Silva, Ana Santos, etc.) have placeholder hashes in seed.sql and cannot log in.
