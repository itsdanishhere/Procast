Add-Type -AssemblyName System.Drawing

function Convert-ToPng {
    param ([string]$InputPath, [string]$OutputPath)
    $image = [System.Drawing.Image]::FromFile($InputPath)
    $image.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $image.Dispose()
}

$IconJpg = "c:\Users\ASUS\Desktop\Procast\icon.jpg"
$PublicDir = "c:\Users\ASUS\Desktop\Procast\frontend\public"

Write-Host "Ensuring all icon formats exist in $PublicDir..." -ForegroundColor Cyan

# Copy original JPG
Copy-Item $IconJpg (Join-Path $PublicDir "logo.jpg") -Force

# Convert to PNG for better compatibility in UI
Convert-ToPng -InputPath $IconJpg -OutputPath (Join-Path $PublicDir "logo.png")

# Use the ICO for favicon
Copy-Item "c:\Users\ASUS\Desktop\Procast\icon.ico" (Join-Path $PublicDir "favicon.ico") -Force

Write-Host "All icons updated in public directory!" -ForegroundColor Green
