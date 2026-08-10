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
        var statements = SplitStatements(sql);

        // Each statement runs in its own implicit transaction (no shared BeginTransaction):
        // on Postgres, one failed statement poisons the rest of an explicit transaction until
        // rollback, which would silently wipe out all the seed rows that came before it.
        foreach (var stmt in statements)
        {
            if (!HasSqlContent(stmt)) continue;
            try { db.Database.ExecuteSqlRaw(stmt); }
            catch (Exception ex) { Console.WriteLine($"[Seeder] SKIP: {ex.Message[..Math.Min(100, ex.Message.Length)]}"); }
        }
        Console.WriteLine("[Seeder] seed.sql aplicado.");
    }

    // Splits a SQL script into individual statements on ';', ignoring semicolons that
    // appear inside a '-- line comment' or a 'single-quoted string' — a plain
    // sql.Split(';') breaks as soon as a comment contains a semicolon (e.g.
    // "-- sex_id references GENDERS.id; nationality_id references COUNTRIES.id"),
    // which silently corrupts the statement that follows.
    private static IEnumerable<string> SplitStatements(string sql)
    {
        var statements = new List<string>();
        var current = new System.Text.StringBuilder();
        var inString = false;
        var inLineComment = false;

        for (var i = 0; i < sql.Length; i++)
        {
            var c = sql[i];

            if (inLineComment)
            {
                if (c == '\n') inLineComment = false;
                current.Append(c);
                continue;
            }

            if (c == '\'')
            {
                inString = !inString;
                current.Append(c);
                continue;
            }

            if (!inString && c == '-' && i + 1 < sql.Length && sql[i + 1] == '-')
            {
                inLineComment = true;
                current.Append(c);
                continue;
            }

            if (!inString && c == ';')
            {
                statements.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(c);
        }

        if (current.Length > 0) statements.Add(current.ToString());
        return statements;
    }

    // A statement is worth executing if at least one of its lines has real content once
    // that line's own '-- ...' comment (if any) is stripped — a chunk made up entirely of
    // banner/header comments (no actual SQL) is skipped, but a statement that merely
    // *starts* with descriptive comment lines above real SQL is not.
    private static bool HasSqlContent(string stmt)
    {
        foreach (var line in stmt.Split('\n'))
        {
            var codePart = line.Split("--", 2)[0].Trim();
            if (codePart.Length > 0) return true;
        }
        return false;
    }
}
