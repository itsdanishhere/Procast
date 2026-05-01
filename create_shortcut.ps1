$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop")
$ShortcutPath = [System.IO.Path]::Combine($DesktopPath, "Procast.lnk")
$TargetPath = "c:\Users\ASUS\Desktop\Procast\launch.bat"
$IconPath = "c:\Users\ASUS\Desktop\Procast\icon.jpg"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = "c:\Users\ASUS\Desktop\Procast"
$Shortcut.IconLocation = $IconPath
$Shortcut.Description = "Launch Procast Platform"
$Shortcut.Save()

Write-Host "✨ Procast shortcut created on your Desktop!" -ForegroundColor Cyan
