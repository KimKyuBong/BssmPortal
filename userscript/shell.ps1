# °ü¸®ÀÚ ±ÇÇÑ È®ÀÎ ¹× ¿äÃ»
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {  
    $arguments = "& '" + $myinvocation.mycommand.definition + "' -NoExit"
    Start-Process powershell -Verb runAs -ArgumentList $arguments
    Break
}

# ¿¡·¯ Ã³¸® ÇÔ¼ö
function Write-Error {
    param (
        [string]$Message
    )
    Write-Host "¿¡·¯: $Message" -ForegroundColor Red
}

# ½Ã½ºÅÛ Á¤º¸ Ãâ·Â ÇÔ¼ö
function Write-SystemInfo {
    param (
        [string]$Title,
        [string]$Value
    )
    Write-Host "$Title : " -NoNewline -ForegroundColor Cyan
    Write-Host "$Value" -ForegroundColor White
}

# ½Ã½ºÅÛ Á¤º¸ ¼öÁý ÇÔ¼ö
function Get-SystemInfo {
    try {
        $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $processor = Get-CimInstance Win32_Processor -ErrorAction Stop
        
        # ½Ã¸®¾ó¹øÈ£ °¡Á®¿À±â (°¡»ó ÀåÄ¡ ´ëÀÀ)
        $serialNumber = $bios.SerialNumber
        if ([string]::IsNullOrEmpty($serialNumber) -or $serialNumber -eq "To be filled by O.E.M.") {
            # °¡»ó ÀåÄ¡ÀÇ °æ¿ì ´Ù¸¥ ¹æ¹ýÀ¸·Î ½Ã¸®¾ó¹øÈ£ °¡Á®¿À±â
            $baseboard = Get-CimInstance Win32_BaseBoard
            if ($baseboard -and -not [string]::IsNullOrEmpty($baseboard.SerialNumber)) {
                $serialNumber = $baseboard.SerialNumber
            } else {
                # ¸¶Áö¸· ¼ö´ÜÀ¸·Î ÇÁ·Î¼¼¼­ ID »ç¿ë
                $processorId = $processor.ProcessorId
                if (-not [string]::IsNullOrEmpty($processorId)) {
                    $serialNumber = $processorId
                } else {
                    # ¸ðµç ¹æ¹ýÀÌ ½ÇÆÐÇÑ °æ¿ì ÀÓ½Ã ID »ý¼º
                    $serialNumber = "VM-" + (Get-Date -Format "yyyyMMddHHmmss")
                }
            }
        }
        
        # MAC ÁÖ¼Ò ¼öÁý
        $macAddresses = @()
        $adapters = Get-CimInstance Win32_NetworkAdapter | 
            Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }
        
        $networkInfo = "`n[³×Æ®¿öÅ© Á¤º¸]`n"
        foreach ($adapter in $adapters) {
            $interfaceType = if ($adapter.Name -like "*Wireless*" -or $adapter.Name -like "*Wi-Fi*") {
                "WIFI"
            } else {
                "ETHERNET"
            }
            
            $macAddresses += @{
                mac_address = $adapter.MACAddress
                interface_type = $interfaceType
                equipment = $null
            }

            # ³×Æ®¿öÅ© ¼³Á¤ Á¤º¸
            $config = Get-CimInstance Win32_NetworkAdapterConfiguration | 
                Where-Object { $_.Index -eq $adapter.DeviceID }
            
            $ipInfo = if ($config.IPAddress) {
                "IP: $($config.IPAddress[0]), ¼­ºê³Ý: $($config.IPSubnet[0]), ±âº»°ÔÀÌÆ®¿þÀÌ: $($config.DefaultIPGateway[0])"
            } else {
                "IP ¼³Á¤ ¾øÀ½"
            }

            $networkInfo += "ÀÌ¸§: $($adapter.Name)`n"
            $networkInfo += "MAC: $($adapter.MACAddress) ($interfaceType)`n"
            $networkInfo += "$ipInfo`n`n"
        }

        # ½Ã½ºÅÛ ÀüÃ¼ Á¤º¸
        $description = @"
[½Ã½ºÅÛ Á¤º¸]
Á¦Á¶»ç: $($computerSystem.Manufacturer)
¸ðµ¨: $($computerSystem.Model)
½Ã¸®¾ó¹øÈ£: $serialNumber
¿î¿µÃ¼Á¦: $($os.Caption) ($($os.Version))
ÇÁ·Î¼¼¼­: $($processor.Name)
ÄÚ¾î/½º·¹µå: $($processor.NumberOfCores) ÄÚ¾î, $($processor.NumberOfLogicalProcessors) ½º·¹µå
¸Þ¸ð¸®: $([math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)) GB

$networkInfo
"@

        # ÇöÀç ³¯Â¥
        $currentDate = Get-Date -Format "yyyy-MM-dd"

        # API ¿äÃ» µ¥ÀÌÅÍ ÁØºñ
        $body = @{
            mac_addresses = $macAddresses
            name = "³ëÆ®ºÏ ÄÄÇ»ÅÍ"
            manufacturer = $computerSystem.Manufacturer
            model_name = $computerSystem.Model
            equipment_type = "LAPTOP"
            serial_number = $serialNumber
            description = $description
            status = "RENTED"
            acquisition_date = $currentDate
        }

        # JSON º¯È¯ ¹× ÀÎÄÚµù Ã³¸®
        $jsonBody = $body | ConvertTo-Json -Depth 10 -Compress
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
        $utf8Body = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)

        # PowerShell Ãâ·Â ÀÎÄÚµùÀ» EUC-KR·Î ¼³Á¤
        [Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding("euc-kr")

        try {
            # À¥ ¿äÃ» ¼³Á¤
            $webRequest = [System.Net.WebRequest]::Create("http://10.129.55.253/api/rentals/equipment/register/")
            $webRequest.Method = "POST"
            $webRequest.ContentType = "application/json; charset=utf-8"
            $webRequest.ContentLength = $utf8Bytes.Length
            
            # ¿äÃ» µ¥ÀÌÅÍ Àü¼Û
            $requestStream = $webRequest.GetRequestStream()
            $requestStream.Write($utf8Bytes, 0, $utf8Bytes.Length)
            $requestStream.Close()
            
            # ÀÀ´ä ¹Þ±â
            $response = $webRequest.GetResponse()
            $responseStream = $response.GetResponseStream()
            $streamReader = [System.IO.StreamReader]::new($responseStream, [System.Text.Encoding]::UTF8)
            $responseText = $streamReader.ReadToEnd()
            
            # ÀÀ´ä µ¥ÀÌÅÍ ÆÄ½Ì
            try {
                $responseData = $responseText | ConvertFrom-Json
                Write-Host "Àåºñ µî·ÏÀÌ ¼º°øÀûÀ¸·Î ¿Ï·áµÇ¾ú½À´Ï´Ù." -ForegroundColor Green

                # Àåºñ Á¤º¸ È®ÀÎ
                if ($responseData.rental_info -and $responseData.rental_info.user) {
                    $userInfo = $responseData.rental_info.user
                    $username = $userInfo.username
                    
                    # ÄÄÇ»ÅÍ ÀÌ¸§ º¯°æ (»ç¿ëÀÚ ÀÌ¸§ + ¸ðµ¨¸í)
                    $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9°¡-ÆR]', ''
                    $newComputerName = "$username-$modelName"
                    $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                    
                    Rename-Computer -NewName $newComputerName -Force
                    Write-Host "ÄÄÇ»ÅÍ ÀÌ¸§ÀÌ '$newComputerName'·Î º¯°æµÇ¾ú½À´Ï´Ù." -ForegroundColor Green
                    Write-Host "º¯°æ»çÇ×À» Àû¿ëÇÏ±â À§ÇØ ÄÄÇ»ÅÍ¸¦ Àç½ÃÀÛÇØ¾ß ÇÕ´Ï´Ù." -ForegroundColor Yellow
                }
            } catch {
                Write-Error "ÀÀ´ä µ¥ÀÌÅÍ ÆÄ½Ì Áß ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù: $_"
            }
            
            # ¸®¼Ò½º Á¤¸®
            $streamReader.Close()
            $responseStream.Close()
            $response.Close()
            
        } catch [System.Net.WebException] {
            # À¥ ¿¹¿Ü Ã³¸®
            if ($_.Exception.Response) {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $streamReader = [System.IO.StreamReader]::new($errorStream, [System.Text.Encoding]::UTF8)
                $errorText = $streamReader.ReadToEnd()
                
                try {
                    $errorData = $errorText | ConvertFrom-Json
                    if ($errorData.existing_equipment -and $errorData.existing_equipment.rental.user) {
                        $userInfo = $errorData.existing_equipment.rental.user
                        $username = $userInfo.username
                        
                        Write-Host "ÀÌ ÄÄÇ»ÅÍ´Â ÀÌ¹Ì µî·ÏµÇ¾î ÀÖ½À´Ï´Ù." -ForegroundColor Yellow
                        Write-Host "µî·ÏµÈ »ç¿ëÀÚ: $username" -ForegroundColor Cyan
                        
                        # ÄÄÇ»ÅÍ ÀÌ¸§ º¯°æ (»ç¿ëÀÚ ÀÌ¸§ + ¸ðµ¨¸í)
                        $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9°¡-ÆR]', ''
                        $newComputerName = "$username-$modelName"
                        $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                        
                        Rename-Computer -NewName $newComputerName -Force
                        Write-Host "ÄÄÇ»ÅÍ ÀÌ¸§ÀÌ '$newComputerName'·Î º¯°æµÇ¾ú½À´Ï´Ù." -ForegroundColor Green
                        Write-Host "º¯°æ»çÇ×À» Àû¿ëÇÏ±â À§ÇØ ÄÄÇ»ÅÍ¸¦ Àç½ÃÀÛÇØ¾ß ÇÕ´Ï´Ù." -ForegroundColor Yellow
                    } else {
                        # 400 ¿¡·¯¿¡¼­µµ »ç¿ëÀÚ Á¤º¸°¡ ÀÖ´Â °æ¿ì Ã³¸®
                        if ($errorData.user) {
                            $username = $errorData.user.username
                            
                            Write-Host "ÀÌ ÄÄÇ»ÅÍ´Â ÀÌ¹Ì µî·ÏµÇ¾î ÀÖ½À´Ï´Ù." -ForegroundColor Yellow
                            Write-Host "µî·ÏµÈ »ç¿ëÀÚ: $username" -ForegroundColor Cyan
                            
                            # ÄÄÇ»ÅÍ ÀÌ¸§ º¯°æ (»ç¿ëÀÚ ÀÌ¸§ + ¸ðµ¨¸í)
                            $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9°¡-ÆR]', ''
                            $newComputerName = "$username-$modelName"
                            $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                            
                            Rename-Computer -NewName $newComputerName -Force
                            Write-Host "ÄÄÇ»ÅÍ ÀÌ¸§ÀÌ '$newComputerName'·Î º¯°æµÇ¾ú½À´Ï´Ù." -ForegroundColor Green
                            Write-Host "º¯°æ»çÇ×À» Àû¿ëÇÏ±â À§ÇØ ÄÄÇ»ÅÍ¸¦ Àç½ÃÀÛÇØ¾ß ÇÕ´Ï´Ù." -ForegroundColor Yellow
                        } else {
                            Write-Error "ÀÌ¹Ì µî·ÏµÈ ÄÄÇ»ÅÍÀÌÁö¸¸ »ç¿ëÀÚ Á¤º¸¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù."
                        }
                    }
                } catch {
                    Write-Error "ÀÀ´ä µ¥ÀÌÅÍ Ã³¸® Áß ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù: $_"
                }
                
                # ¸®¼Ò½º Á¤¸®
                $streamReader.Close()
                $errorStream.Close()
            }
        } catch {
            Write-Error "Àåºñ µî·Ï Áß ¿¹»óÄ¡ ¸øÇÑ ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù: $_"
        }

    } catch {
        Write-Error "½Ã½ºÅÛ Á¤º¸ ¼öÁý Áß ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù: $_"
        Write-Host "¿À·ù »ó¼¼: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ½ºÅ©¸³Æ® ½ÇÇà
Get-SystemInfo

# »ó¼¼ ½Ã½ºÅÛ Á¤º¸ Ãâ·Â
try {
    Write-Host "`n=== ½Ã½ºÅÛ Á¤º¸ ===" -ForegroundColor Yellow

    # ±âº» ½Ã½ºÅÛ Á¤º¸ ¼öÁý
    $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
    $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $processor = Get-CimInstance Win32_Processor -ErrorAction Stop

    Write-SystemInfo "Á¦Á¶»ç" $computerSystem.Manufacturer
    Write-SystemInfo "¸ðµ¨" $computerSystem.Model
    Write-SystemInfo "½Ã¸®¾ó¹øÈ£" $bios.SerialNumber
    Write-SystemInfo "¿î¿µÃ¼Á¦" $os.Caption
    Write-SystemInfo "OS ¹öÀü" $os.Version
    Write-SystemInfo "ÇÁ·Î¼¼¼­" $processor.Name
    Write-SystemInfo "ÇÁ·Î¼¼¼­ ÄÚ¾î ¼ö" "$($processor.NumberOfCores) ÄÚ¾î"
    Write-SystemInfo "ÇÁ·Î¼¼¼­ ½º·¹µå ¼ö" "$($processor.NumberOfLogicalProcessors) ½º·¹µå"

    # ¸Þ¸ð¸® Á¤º¸ (GB ´ÜÀ§·Î º¯È¯)
    $totalMemoryGB = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)
    Write-SystemInfo "ÀüÃ¼ ¸Þ¸ð¸®" "$totalMemoryGB GB"

    Write-Host "`n=== ³×Æ®¿öÅ© ¾î´ðÅÍ Á¤º¸ ===" -ForegroundColor Yellow

    # ³×Æ®¿öÅ© ¾î´ðÅÍ Á¤º¸ ¼öÁý
    $adapters = Get-CimInstance Win32_NetworkAdapter | 
        Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }

    if ($adapters) {
        foreach ($adapter in $adapters) {
            Write-Host "`n³×Æ®¿öÅ© ¾î´ðÅÍ #$($adapter.DeviceID)" -ForegroundColor Green
            Write-SystemInfo "¾î´ðÅÍ ÀÌ¸§" $adapter.Name
            Write-SystemInfo "³×Æ®¿öÅ© »óÅÂ" $(if ($adapter.NetEnabled) { "È°¼ºÈ­" } else { "ºñÈ°¼ºÈ­" })
            Write-SystemInfo "MAC ÁÖ¼Ò" $adapter.MACAddress
            
            # ÇØ´ç ¾î´ðÅÍÀÇ IP ¼³Á¤ Á¤º¸
            $config = Get-CimInstance Win32_NetworkAdapterConfiguration | 
                Where-Object { $_.Index -eq $adapter.DeviceID }
            
            if ($config.IPAddress) {
                Write-SystemInfo "IP ÁÖ¼Ò" $($config.IPAddress[0])
                Write-SystemInfo "¼­ºê³Ý ¸¶½ºÅ©" $($config.IPSubnet[0])
                Write-SystemInfo "±âº» °ÔÀÌÆ®¿þÀÌ" $($config.DefaultIPGateway[0])
            }
        }
    } else {
        Write-Error "³×Æ®¿öÅ© ¾î´ðÅÍ¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù."
    }

    Write-Host "`n=== µð½ºÅ© Á¤º¸ ===" -ForegroundColor Yellow

    # µð½ºÅ© Á¤º¸ ¼öÁý
    $disks = Get-CimInstance Win32_DiskDrive

    if ($disks) {
        foreach ($disk in $disks) {
            $sizeGB = [math]::Round($disk.Size / 1GB, 2)
            Write-Host "`nµð½ºÅ©: $($disk.DeviceID)" -ForegroundColor Green
            Write-SystemInfo "¸ðµ¨" $disk.Model
            Write-SystemInfo "Å©±â" "$sizeGB GB"
            Write-SystemInfo "ÀÎÅÍÆäÀÌ½ºÅ¸ÀÔ" $disk.InterfaceType
            Write-SystemInfo "½Ã¸®¾ó¹øÈ£" $disk.SerialNumber
        }
    } else {
        Write-Error "µð½ºÅ© Á¤º¸¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù."
    }

    # ±×·¡ÇÈ Ä«µå Á¤º¸
    Write-Host "`n=== ±×·¡ÇÈ Ä«µå Á¤º¸ ===" -ForegroundColor Yellow
    $gpus = Get-CimInstance Win32_VideoController

    if ($gpus) {
        foreach ($gpu in $gpus) {
            Write-Host "`n±×·¡ÇÈ Ä«µå" -ForegroundColor Green
            Write-SystemInfo "¸ðµ¨" $gpu.Name
            Write-SystemInfo "¸Þ¸ð¸®" "$([math]::Round($gpu.AdapterRAM / 1GB, 2)) GB"
            Write-SystemInfo "µå¶óÀÌ¹ö ¹öÀü" $gpu.DriverVersion
        }
    } else {
        Write-Error "±×·¡ÇÈ Ä«µå Á¤º¸¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù."
    }

} catch {
    Write-Error "½Ã½ºÅÛ Á¤º¸¸¦ ¼öÁýÇÏ´Â Áß ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù: $_"
    Write-Host "¿À·ù »ó¼¼: $($_.Exception.Message)" -ForegroundColor Red
}

# ½ºÅ©¸³Æ® Á¾·á
Write-Host "`n½Ã½ºÅÛ Á¤º¸ ¼öÁýÀÌ ¿Ï·áµÇ¾ú½À´Ï´Ù." -ForegroundColor Green
Write-Host "`nÃ¢À» ´ÝÀ¸·Á¸é Enter Å°¸¦ ´©¸£¼¼¿ä..." -ForegroundColor Yellow
$null = Read-Host

# ÄÄÇ»ÅÍ Àç½ÃÀÛ
Restart-Computer -Force