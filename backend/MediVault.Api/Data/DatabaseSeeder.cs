using Microsoft.EntityFrameworkCore;

namespace MediVault.Api.Data;

public static class DatabaseSeeder
{
    public static void Seed(MediVaultDbContext db, string seedSqlPath)
    {
        if (db.Users.Any()) return;

        if (!File.Exists(seedSqlPath))
        {
            Console.WriteLine($"[Seeder] seed.sql não encontrado: {seedSqlPath}");
            return;
        }

        var sql = File.ReadAllText(seedSqlPath);
        var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        using var tx = db.Database.BeginTransaction();
        foreach (var stmt in statements)
        {
            var trimmed = stmt.TrimStart();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("--")) continue;
            try { db.Database.ExecuteSqlRaw(stmt); }
            catch (Exception ex) { Console.WriteLine($"[Seeder] SKIP: {ex.Message[..Math.Min(100, ex.Message.Length)]}"); }
        }
        tx.Commit();
        Console.WriteLine("[Seeder] seed.sql aplicado.");
    }
}
