Get-PSDrive  -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object {
                $drive = $_.Root
                Write-Host "Scanning drive: $drive"
                Get-ChildItem -Path $drive -Directory -Recurse -Filter "xc32" -ErrorAction SilentlyContinue -Depth 4 |
                ForEach-Object {
                    Get-ChildItem -Path $_.FullName -Directory -Filter "v*" -ErrorAction SilentlyContinue |
                    Where-Object { Test-Path (Join-Path $_.FullName "bin\\xc32-gcc.exe") } |
                    Select-Object @{Name='Path';Expression={$_.FullName}}, @{Name='Version';Expression={$_.Name}}
                }
            } | Sort-Object Version -Descending | Select-Object -First 1 -ExpandProperty Path
            Sort-Object Version -Descending | Select-Object -First 1 -ExpandProperty Path