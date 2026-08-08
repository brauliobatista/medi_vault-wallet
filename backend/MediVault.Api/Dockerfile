# Build context is the repo root (see render.yaml: dockerContext: .), because
# Program.cs reads database/seed.sql via a path relative to ContentRootPath that
# mirrors the repo's backend/MediVault.Api + database folder layout.

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY backend/MediVault.Api/MediVault.Api.csproj backend/MediVault.Api/
RUN dotnet restore backend/MediVault.Api/MediVault.Api.csproj
COPY backend/MediVault.Api/ backend/MediVault.Api/
RUN dotnet publish backend/MediVault.Api/MediVault.Api.csproj -c Release -o /app/backend/MediVault.Api --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app/backend/MediVault.Api
COPY --from=build /app/backend/MediVault.Api .
# ContentRootPath/../../database/seed.sql must resolve to /app/database/seed.sql
COPY database /app/database

EXPOSE 8080

# Render injects its own $PORT; default to 8080 for other hosts / local `docker run`.
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet MediVault.Api.dll"]
