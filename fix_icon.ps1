Add-Type -AssemblyName System.Drawing

function Convert-ToIcon {
    param (
        [string]$InputPath,
        [string]$OutputPath
    )
    $image = [System.Drawing.Image]::FromFile($InputPath)
    $bitmap = New-Object System.Drawing.Bitmap($image, 256, 256)
    $hIcon = $bitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    
    $fileStream = New-Object System.IO.FileStream($OutputPath, [System.IO.FileMode]::Create)
    $icon.Save($fileStream)
    $fileStream.Close()
    
    $icon.Dispose()
    [System.Runtime.InteropServices.Marshal]::Release($hIcon)
    $bitmap.Dispose()
    $image.Dispose()
}

$IconJpg = "c:\Users\ASUS\Desktop\Procast\icon.jpg"
$IconIco = "c:\Users\ASUS\Desktop\Procast\icon.ico"

Write-Host "Converting icon to .ico format..." -ForegroundColor Cyan
Convert-ToIcon -InputPath $IconJpg -OutputPath $IconIco

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop")
$ShortcutPath = [System.IO.Path]::Combine($DesktopPath, "Procast.lnk")

if (Test-Path $ShortcutPath) {
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.IconLocation = $IconIco
    $Shortcut.Save()
    Write-Host "Shortcut icon updated!" -ForegroundColor Green
} else {
    Write-Host "Shortcut not found on Desktop. Please run create_shortcut.ps1 first." -ForegroundColor Red
}
