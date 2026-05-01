# Procast Launch Script

Write-Host "Starting Procast Application..." -ForegroundColor Cyan

# 1. Start Docker Containers
Write-Host "Starting Docker containers (Postgres & Redis)..." -ForegroundColor Blue
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker containers. Please make sure Docker Desktop is running."
    exit $LASTEXITCODE
}

# 2. Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# 3. Start Worker
Write-Host "Starting Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run worker" -WindowStyle Normal

# 4. Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

# 5. Open Browser
Write-Host "Waiting for Frontend to start and opening browser..." -ForegroundColor Green
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"

Write-Host "Procast is launching! Keep the terminal windows open to keep the services running." -ForegroundColor Cyan
