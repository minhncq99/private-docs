$largeFiles = Get-ChildItem -Path "files" -Recurse -File | Where-Object { $_.Length -gt 25MB } | Sort-Object Length -Descending

Write-Host "Total large files (> 25MB):" $largeFiles.Count

$totalSize = (Get-ChildItem -Path "files" -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host "Total size of all files:" ([math]::Round($totalSize / 1MB, 2)) "MB"

foreach ($f in $largeFiles) {
    Write-Host ([math]::Round($f.Length / 1MB, 2)) "MB  -  " $f.FullName
}
