$dirs = Get-ChildItem "files/English" -Directory
foreach ($d in $dirs) {
    $files = Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue
    $sum = ($files | Measure-Object -Property Length -Sum).Sum
    Write-Host ([math]::Round($sum / 1MB, 2)) "MB  -  " $d.Name
}
