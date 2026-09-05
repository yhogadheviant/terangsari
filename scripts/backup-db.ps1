$ErrorActionPreference = "Stop"

$ProjectDir = "C:\rt11-digital-v1"
$BackupDir = "C:\rt11-backups"
$EnvFile = Join-Path $ProjectDir ".env"

New-Item -ItemType Directory -Force $BackupDir | Out-Null

$line = Get-Content $EnvFile |
    Where-Object { $_ -match "^DATABASE_URL=" } |
    Select-Object -First 1

if (-not $line) {
    throw "DATABASE_URL tidak ditemukan di .env"
}

$DatabaseUrl = $line -replace "^DATABASE_URL=", ""

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = Join-Path $BackupDir "rt11_$Timestamp.dump"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SMART RT - DATABASE BACKUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Waktu   : $(Get-Date)"
Write-Host "Tujuan  : $BackupFile"
Write-Host ""

pg_dump "$DatabaseUrl" `
    --format=custom `
    --no-owner `
    --file="$BackupFile"

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump gagal."
}

$File = Get-Item $BackupFile

Write-Host ""
Write-Host "BACKUP BERHASIL" -ForegroundColor Green
Write-Host "File    : $($File.FullName)"
Write-Host "Ukuran  : $($File.Length) byte"
Write-Host ""

# Hapus backup yang lebih tua dari 30 hari
$Expired = Get-ChildItem $BackupDir -Filter "rt11_*.dump" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }

foreach ($OldFile in $Expired) {
    Remove-Item $OldFile.FullName -Force
    Write-Host "Backup lama dihapus: $($OldFile.Name)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Selesai." -ForegroundColor Green
