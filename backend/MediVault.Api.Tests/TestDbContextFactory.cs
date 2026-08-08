using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MediVault.Api.Data;

namespace MediVault.Api.Tests;

/// <summary>
/// Creates a fresh in-memory SQLite database per test, built from the same
/// EF Core model the real app uses (via EnsureCreated), so constraint tests
/// exercise the actual runtime schema rather than the reference SQL files.
/// </summary>
public static class TestDbContextFactory
{
    public static MediVaultDbContext Create()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<MediVaultDbContext>()
            .UseSqlite(connection)
            .Options;

        var db = new MediVaultDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }
}
