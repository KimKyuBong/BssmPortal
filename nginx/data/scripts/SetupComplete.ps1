# System Setup and Auto-Registration Script
# PowerShell Version

# Set console encoding to UTF-8 to handle Korean characters properly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Running system setup and auto-registration script..." -ForegroundColor Green

# Log file settings
$LogFile = "$env:TEMP\SystemSetup_$(Get-Random).log"
try {
    "System initialization started: $(Get-Date)" | Out-File -FilePath $LogFile -Encoding UTF8
} catch {
    Write-Host "Failed to create log file, using console output only" -ForegroundColor Yellow
    $LogFile = "CON"
}

function Write-Log {
    param([string]$Message)
    if ($LogFile -eq "CON") {
        Write-Host $Message
    } else {
        $Message | Out-File -FilePath $LogFile -Append -Encoding UTF8
        Write-Host $Message
    }
}

Write-Host "===== SYSTEM SETUP AND REGISTRATION =====" -ForegroundColor Cyan
Write-Host "[Step 1/5] Setting up Wi-Fi profile..." -ForegroundColor Yellow

# Wi-Fi profile setup and connection
Write-Log "Setting up Wi-Fi profile..."
try {
    # For Sysprep, wifi.xml should be in the same directory as SetupComplete.cmd
    $WifiXmlPath = "$env:WINDIR\Setup\Scripts\wifi.xml"
    
    if (Test-Path $WifiXmlPath) {
        Write-Host "Found wifi.xml at: $WifiXmlPath" -ForegroundColor Green
        
        # Check if WiFi profile already exists and is working
        Write-Host "Checking existing WiFi profile..." -ForegroundColor Yellow
        $ExistingProfile = netsh wlan show profile name="bssm_free" 2>&1
        $IsProfileWorking = $false
        
        # Test if current connection is working
        if (Test-Connection -ComputerName "10.129.55.253" -Count 1 -Quiet) {
            Write-Host "Current WiFi connection is working, skipping profile replacement" -ForegroundColor Green
            Write-Log "Current WiFi connection is working, skipping profile replacement"
            $IsProfileWorking = $true
        } else {
            Write-Host "Current connection not working, updating WiFi profile..." -ForegroundColor Yellow
            Write-Log "Current connection not working, updating WiFi profile..."
            
            # Remove existing WiFi profile only if connection is not working
            Write-Host "Removing existing WiFi profile..." -ForegroundColor Yellow
            netsh wlan delete profile name="bssm_free" user=all 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
            netsh wlan delete profile name="bssm_free" user=current 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
        }
        
        # Add WiFi profile for all users (system-wide) - for server transmission
        Write-Host "Adding WiFi profile for all users..." -ForegroundColor Yellow
        $AddProfileResult = netsh wlan add profile filename="$WifiXmlPath" user=all 2>&1
        # Log the result without displaying it to avoid encoding issues
        $AddProfileResult | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        # Check if profile was added successfully (simplified logic)
        $IsSuccess = $false
        $IsFailure = $false
        
        # Check for success indicators
        if ($AddProfileResult -like "*successfully*" -or $AddProfileResult -like "*added*" -or $AddProfileResult -eq "") {
            $IsSuccess = $true
        }
        
        # Check for failure indicators
        if ($AddProfileResult -like "*failed*" -or $AddProfileResult -like "*error*" -or $AddProfileResult -like "*denied*") {
            $IsFailure = $true
        }
        
        # Display the actual result message
        if ($AddProfileResult -eq "") {
            Write-Host "[SUCCESS] WiFi profile added successfully for all users (no output)" -ForegroundColor Green
            Write-Log "[SUCCESS] WiFi profile added successfully for all users (no output)"
        } else {
            Write-Host "WiFi profile addition result: $AddProfileResult" -ForegroundColor Yellow
            Write-Log "WiFi profile addition result: $AddProfileResult"
        }
        
        # Note: user=all already covers current user, so no need for separate current user registration
        Write-Host "WiFi profile registration completed for all users" -ForegroundColor Green
        Write-Log "WiFi profile registration completed for all users"
        
        # Enable WiFi auto-config (for server transmission)
        Write-Host "Enabling WiFi auto-config..." -ForegroundColor Yellow
        netsh wlan set autoconfig enabled=yes 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        # Enable WiFi interface
        Write-Host "Enabling WiFi interface..." -ForegroundColor Yellow
        netsh interface set interface "Wi-Fi" admin=enable 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        # Wait briefly before connection attempt
        Start-Sleep -Seconds 3
        
        # Connect to WiFi for server transmission (required)
        Write-Host "Connecting to WiFi for server transmission..." -ForegroundColor Yellow
        Write-Log "Connecting to WiFi for server transmission..."
        
        $ConnectionResult = netsh wlan connect name="bssm_free" 2>&1
        # Log the result without displaying it to avoid encoding issues
        $ConnectionResult | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        if ($ConnectionResult -like "*successfully*" -or $ConnectionResult -like "*connected*") {
            Write-Host "WiFi connected successfully for server transmission." -ForegroundColor Green
            Write-Log "WiFi connected successfully for server transmission."
        } else {
            Write-Host "WiFi connection failed, but continuing setup process." -ForegroundColor Yellow
            Write-Log "WiFi connection failed, but continuing setup process."
            
            # Additional debugging information if connection fails (logged only)
            Write-Host "Available WiFi networks:" -ForegroundColor Cyan
            netsh wlan show networks 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
            
            Write-Host "Current WiFi profiles:" -ForegroundColor Cyan
            netsh wlan show profiles 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
        }
        
        Write-Host "Wi-Fi profile added and connection attempted for server transmission." -ForegroundColor Green
    } else {
        Write-Host "ERROR: wifi.xml not found at: $WifiXmlPath" -ForegroundColor Red
        Write-Log "ERROR: wifi.xml not found at: $WifiXmlPath"
    }
} catch {
    Write-Log "Wi-Fi setup failed: $($_.Exception.Message)"
}

# Network connection check
Write-Host "[Step 2/5] Checking network connection..." -ForegroundColor Yellow
Write-Log "Waiting for network connection..."

# Check WiFi connection status
Write-Host "Checking WiFi connection status..." -ForegroundColor Yellow

# Wait for connection for 20 seconds (5 attempts, 4 seconds interval)
$attempt = 1
$networkConnected = $false
do {
    if (Test-Connection -ComputerName "10.129.55.253" -Count 1 -Quiet) {
        Write-Host "Server connection successful!" -ForegroundColor Green
        Write-Log "Server connection successful!"
        $networkConnected = $true
        break
    } else {
        Write-Host "Attempt $attempt/5: Waiting for server connection..." -ForegroundColor Yellow
        Write-Log "Attempt $attempt/5: Waiting for server connection..."
        Start-Sleep -Seconds 4
        $attempt++
    }
} while ($attempt -le 5)

if (-not $networkConnected) {
    Write-Host "Warning: Network connection failed but continuing installation process." -ForegroundColor Yellow
    Write-Log "Warning: Network connection failed but continuing installation process."
}

# WiFi auto-connection setup
Write-Host "Setting up WiFi auto-connection..." -ForegroundColor Yellow
Write-Log "Setting up WiFi auto-connection..."

# Enable WiFi auto-config for automatic connection
netsh wlan set autoconfig enabled=yes 2>&1 | Out-File -FilePath $LogFile -Append -Encoding UTF8
Write-Host "WiFi auto-config enabled" -ForegroundColor Green
Write-Log "WiFi auto-config enabled"

# System information collection
Write-Host "[Step 3/5] Collecting system information..." -ForegroundColor Yellow
Write-Log "Collecting system information..."

# Get system information using WMI (including real serial number)
Write-Host "Getting system information..." -ForegroundColor Yellow

# Initialize variables
$Manufacturer = "Unknown"
$Model = "Unknown"
$Serial = "Unknown"

try {
    # Get basic system info
    $ComputerSystem = Get-WmiObject -Class Win32_ComputerSystem
    $Manufacturer = $ComputerSystem.Manufacturer
    $Model = $ComputerSystem.Model
    
    if ([string]::IsNullOrEmpty($Manufacturer)) { $Manufacturer = "Unknown" }
    if ([string]::IsNullOrEmpty($Model)) { $Model = "Unknown" }
    
    Write-Host "System Manufacturer: $Manufacturer" -ForegroundColor Cyan
    Write-Log "System Manufacturer: $Manufacturer"
    Write-Host "System Model: $Model" -ForegroundColor Cyan
    Write-Log "System Model: $Model"
} catch {
    Write-Log "Failed to get basic system information: $($_.Exception.Message)"
}

# Get real serial number from BIOS
Write-Host "Getting BIOS serial number..." -ForegroundColor Yellow
try {
    $Bios = Get-WmiObject -Class Win32_BIOS
    $BiosSerial = $Bios.SerialNumber
    
    # Check if BIOS serial is valid (not placeholder)
    if ($BiosSerial -and $BiosSerial -ne "To be filled by O.E.M." -and $BiosSerial -ne "Default string" -and $BiosSerial.Trim() -ne "" -and $BiosSerial -ne "System Serial Number") {
        $Serial = $BiosSerial.Trim()
        Write-Host "[SUCCESS] Using BIOS serial: $Serial" -ForegroundColor Green
        Write-Log "[SUCCESS] Using BIOS serial: $Serial"
    } else {
        Write-Host "[WARNING] BIOS serial not available or placeholder: $BiosSerial" -ForegroundColor Yellow
        Write-Log "[WARNING] BIOS serial not available or placeholder: $BiosSerial"
        
        # Don't generate fallback yet - let other methods try first
        $Serial = "NEEDS_HARDWARE_SERIAL"
        Write-Host "Marking serial for hardware-based collection..." -ForegroundColor Yellow
        Write-Log "Marking serial for hardware-based collection..."
    }
} catch {
    Write-Log "Failed to get BIOS serial: $($_.Exception.Message)"
    # Fallback: Generate unique serial number
    $ComputerName = $env:COMPUTERNAME
    if ([string]::IsNullOrEmpty($ComputerName)) { $ComputerName = "UNKNOWN" }
    $Timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
    $RandomSuffix = Get-Random -Minimum 1000 -Maximum 9999
    $Serial = "$ComputerName-$Timestamp-$RandomSuffix"
    Write-Host "Generated fallback serial (error): $Serial" -ForegroundColor Yellow
    Write-Log "Generated fallback serial (error): $Serial"
}

# MAC address collection
Write-Host "- Retrieving network adapter information..." -ForegroundColor Yellow
$MacAddresses = @()
try {
    $NetworkAdapters = Get-WmiObject -Class Win32_NetworkAdapter | Where-Object { $_.PhysicalAdapter -eq $true }
    foreach ($Adapter in $NetworkAdapters) {
        if ($Adapter.MACAddress -and $Adapter.MACAddress -ne "00:00:00:00:00:00") {
            $MacAddresses += $Adapter.MACAddress
            Write-Log "Valid MAC found: $($Adapter.MACAddress)"
        }
    }
} catch {
    Write-Log "Failed to get MAC addresses: $($_.Exception.Message)"
}

if ($MacAddresses.Count -eq 0) {
    $MacAddresses = @("00-00-00-00-00-00")
    Write-Log "No MAC addresses found, using dummy MAC"
}

# Detect if it's a laptop or desktop
Write-Host "Detecting device type..." -ForegroundColor Yellow
$EquipmentType = "DESKTOP"
try {
    $SystemEnclosure = Get-WmiObject -Class Win32_SystemEnclosure
    $ChassisTypes = @(8, 9, 10, 11, 12, 14, 30, 31, 32)  # Laptop chassis types
    if ($SystemEnclosure.ChassisTypes -in $ChassisTypes) {
        $EquipmentType = "LAPTOP"
    }
} catch {
    Write-Log "Failed to detect device type: $($_.Exception.Message)"
}

Write-Host "Equipment type detected: $EquipmentType" -ForegroundColor Cyan
Write-Log "Equipment type detected: $EquipmentType"

# If desktop, get motherboard information
if ($EquipmentType -eq "DESKTOP") {
    Write-Host "Getting motherboard information for desktop..." -ForegroundColor Yellow
    Write-Log "Getting motherboard information for desktop..."
    
    try {
        # Try multiple methods to get motherboard info
        $BaseBoard = $null
        
        # Method 1: Get-WmiObject
        try {
            $BaseBoard = Get-WmiObject -Class Win32_BaseBoard | Select-Object -First 1
            Write-Log "Method 1 (Get-WmiObject) successful"
        } catch {
            Write-Log "Method 1 failed: $($_.Exception.Message)"
        }
        
        # Method 2: Get-CimInstance if Method 1 failed
        if (-not $BaseBoard) {
            try {
                $BaseBoard = Get-CimInstance -ClassName Win32_BaseBoard | Select-Object -First 1
                Write-Log "Method 2 (Get-CimInstance) successful"
            } catch {
                Write-Log "Method 2 failed: $($_.Exception.Message)"
            }
        }
        
        # Method 3: WMI query if both failed
        if (-not $BaseBoard) {
            try {
                $BaseBoard = Get-WmiObject -Query "SELECT * FROM Win32_BaseBoard" | Select-Object -First 1
                Write-Log "Method 3 (WMI Query) successful"
            } catch {
                Write-Log "Method 3 failed: $($_.Exception.Message)"
            }
        }
        
        if ($BaseBoard) {
            $MBManufacturer = $BaseBoard.Manufacturer
            $MBProduct = $BaseBoard.Product
            $MBSerial = $BaseBoard.SerialNumber
            
            Write-Log "Raw BaseBoard data: $($BaseBoard | ConvertTo-Json)"
            
            if ([string]::IsNullOrEmpty($MBManufacturer) -or $MBManufacturer -eq "") { $MBManufacturer = "Unknown" }
            if ([string]::IsNullOrEmpty($MBProduct) -or $MBProduct -eq "") { $MBProduct = "Unknown" }
            if ([string]::IsNullOrEmpty($MBSerial) -or $MBSerial -eq "") { $MBSerial = "Unknown" }
            
            # Update manufacturer and model with motherboard info
            $Manufacturer = $MBManufacturer
            $Model = $MBProduct
            
            # Try to get more detailed model information for desktop
            try {
                # Method: Check registry for system product name (often more detailed)
                $RegModel = Get-ItemProperty -Path "HKLM:\HARDWARE\DESCRIPTION\System\BIOS" -Name "SystemProductName" -ErrorAction SilentlyContinue
                if ($RegModel -and $RegModel.SystemProductName -and $RegModel.SystemProductName.Trim() -ne "") {
                    $RegistryModel = $RegModel.SystemProductName.Trim()
                    Write-Host "Desktop model from Registry: $RegistryModel" -ForegroundColor Cyan
                    Write-Log "Desktop model from Registry: $RegistryModel"
                    
                    # Use registry model if it's more detailed than motherboard model
                    if ($RegistryModel -ne $Model -and $RegistryModel.Length -gt $Model.Length) {
                        $Model = $RegistryModel
                        Write-Host "Updated desktop model to registry model: $Model" -ForegroundColor Green
                        Write-Log "Updated desktop model to registry model: $Model"
                    }
                }
            } catch {
                Write-Log "Desktop registry model lookup failed: $($_.Exception.Message)"
            }
            
            Write-Host "Motherboard Manufacturer: $MBManufacturer" -ForegroundColor Cyan
            Write-Log "Motherboard Manufacturer: $MBManufacturer"
            Write-Host "Motherboard Product: $MBProduct" -ForegroundColor Cyan
            Write-Log "Motherboard Product: $MBProduct"
            Write-Host "Motherboard Serial: $MBSerial" -ForegroundColor Cyan
            Write-Log "Motherboard Serial: $MBSerial"
            
            # Use motherboard serial as device serial if available and valid
            if ($MBSerial -ne "Unknown" -and $MBSerial -ne "To be filled by O.E.M." -and $MBSerial -ne "Default string" -and $MBSerial.Trim() -ne "" -and $MBSerial -ne "System Serial Number") {
                # Use motherboard serial if we don't have a valid BIOS serial
                if ($Serial -eq "NEEDS_HARDWARE_SERIAL") {
                    $Serial = $MBSerial.Trim()
                    Write-Host "[SUCCESS] Using motherboard serial as device serial: $Serial" -ForegroundColor Green
                    Write-Log "[SUCCESS] Using motherboard serial as device serial: $Serial"
                } else {
                    Write-Host "[INFO] Keeping BIOS serial over motherboard serial" -ForegroundColor Cyan
                    Write-Log "[INFO] Keeping BIOS serial over motherboard serial"
                }
            } else {
                Write-Host "[WARNING] Motherboard serial not usable: $MBSerial" -ForegroundColor Yellow
                Write-Log "[WARNING] Motherboard serial not usable: $MBSerial"
            }
        } else {
            Write-Log "All methods to get motherboard info failed"
            $MBManufacturer = "Unknown"
            $MBProduct = "Unknown"
            $MBSerial = "Unknown"
        }
    } catch {
        Write-Log "Failed to get motherboard information: $($_.Exception.Message)"
    }
} else {
    Write-Host "Getting detailed laptop information..." -ForegroundColor Yellow
    Write-Log "Getting detailed laptop information..."
    
    # For laptops, try multiple methods to get the most accurate model information
    try {
        # Method 1: Win32_ComputerSystemProduct (most accurate in many cases)
        $SystemProduct = Get-WmiObject -Class Win32_ComputerSystemProduct
        if ($SystemProduct -and $SystemProduct.Name -and $SystemProduct.Name.Trim() -ne "") {
            $DetailedModel = $SystemProduct.Name.Trim()
            Write-Host "Model from ComputerSystemProduct: $DetailedModel" -ForegroundColor Cyan
            Write-Log "Model from ComputerSystemProduct: $DetailedModel"
            
            # Use the more detailed model if it's different and more informative
            if ($DetailedModel -ne $Model -and $DetailedModel.Length -gt $Model.Length) {
                $Model = $DetailedModel
                Write-Host "Updated model to: $Model" -ForegroundColor Green
                Write-Log "Updated model to: $Model"
            }
        }
        
        # Method 2: Try Win32_SystemEnclosure for chassis/model info
        $SystemEnclosure = Get-WmiObject -Class Win32_SystemEnclosure
        if ($SystemEnclosure -and $SystemEnclosure.Model -and $SystemEnclosure.Model.Trim() -ne "") {
            $EnclosureModel = $SystemEnclosure.Model.Trim()
            Write-Host "Model from SystemEnclosure: $EnclosureModel" -ForegroundColor Cyan
            Write-Log "Model from SystemEnclosure: $EnclosureModel"
            
            # Use enclosure model if it's more detailed
            if ($EnclosureModel -ne $Model -and $EnclosureModel.Length -gt $Model.Length) {
                $Model = $EnclosureModel
                Write-Host "Updated model to enclosure model: $Model" -ForegroundColor Green
                Write-Log "Updated model to enclosure model: $Model"
            }
        }
        
        # Method 3: Try BIOS information for model (sometimes contains SKU)
        $Bios = Get-WmiObject -Class Win32_BIOS
        if ($Bios -and $Bios.Version -and $Bios.Version.Trim() -ne "") {
            $BiosVersion = $Bios.Version.Trim()
            Write-Host "BIOS Version info: $BiosVersion" -ForegroundColor Cyan
            Write-Log "BIOS Version info: $BiosVersion"
            
            # Check if BIOS version contains model information (some manufacturers include it)
            if ($BiosVersion.Length -gt 10 -and ($BiosVersion.Contains($Manufacturer.Substring(0, 2).ToUpper()) -or $BiosVersion.Contains("15Z"))) {
                Write-Host "BIOS contains potential model info: $BiosVersion" -ForegroundColor Yellow
                Write-Log "BIOS contains potential model info: $BiosVersion"
            }
        }
        
        # Method 4: Try getting detailed vendor info
        if ($SystemProduct -and $SystemProduct.Vendor -and $SystemProduct.Vendor.Trim() -ne "") {
            $DetailedManufacturer = $SystemProduct.Vendor.Trim()
            Write-Host "Manufacturer from ComputerSystemProduct: $DetailedManufacturer" -ForegroundColor Cyan
            Write-Log "Manufacturer from ComputerSystemProduct: $DetailedManufacturer"
            
            # Use the more detailed manufacturer if it's different
            if ($DetailedManufacturer -ne $Manufacturer) {
                $Manufacturer = $DetailedManufacturer
                Write-Host "Updated manufacturer to: $Manufacturer" -ForegroundColor Green
                Write-Log "Updated manufacturer to: $Manufacturer"
            }
        }
        
        # Method 5: Try to get serial from SystemProduct if we still need hardware serial
        if ($Serial -eq "NEEDS_HARDWARE_SERIAL" -and $SystemProduct.UUID -and $SystemProduct.UUID.Trim() -ne "") {
            $ProductUUID = $SystemProduct.UUID.Trim()
            if ($ProductUUID -ne "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" -and $ProductUUID -ne "00000000-0000-0000-0000-000000000000") {
                $Serial = $ProductUUID
                Write-Host "[SUCCESS] Using system UUID as serial: $Serial" -ForegroundColor Green
                Write-Log "[SUCCESS] Using system UUID as serial: $Serial"
            }
        }
        
        # Method 6: Try registry for additional model information (OEM specific)
        try {
            Write-Host "Checking registry for additional model info..." -ForegroundColor Yellow
            $RegModel = Get-ItemProperty -Path "HKLM:\HARDWARE\DESCRIPTION\System\BIOS" -Name "SystemProductName" -ErrorAction SilentlyContinue
            if ($RegModel -and $RegModel.SystemProductName -and $RegModel.SystemProductName.Trim() -ne "") {
                $RegistryModel = $RegModel.SystemProductName.Trim()
                Write-Host "Model from Registry: $RegistryModel" -ForegroundColor Cyan
                Write-Log "Model from Registry: $RegistryModel"
                
                # Use registry model if it's more detailed
                if ($RegistryModel -ne $Model -and $RegistryModel.Length -gt $Model.Length) {
                    $Model = $RegistryModel
                    Write-Host "Updated model to registry model: $Model" -ForegroundColor Green
                    Write-Log "Updated model to registry model: $Model"
                }
            }
        } catch {
            Write-Log "Registry model lookup failed: $($_.Exception.Message)"
        }
        
    } catch {
        Write-Log "Failed to get detailed laptop information: $($_.Exception.Message)"
    }
    
    Write-Host "Final laptop info - Manufacturer: $Manufacturer, Model: $Model" -ForegroundColor Yellow
    Write-Log "Final laptop info - Manufacturer: $Manufacturer, Model: $Model"
}

# Current date
$DateStr = (Get-Date).ToString("yyyy-MM-dd")
Write-Host "Date set to: $DateStr" -ForegroundColor Cyan
Write-Log "Date set to: $DateStr"

# Battery status collection
Write-Host "Collecting battery status..." -ForegroundColor Yellow
Write-Log "Collecting battery status..."

$BatteryStatus = "Unknown"
$BatteryPercentage = "Unknown"
$BatteryHealth = "Unknown"
$BatteryLife = "Unknown"

try {
    # Method 1: Try Windows Battery Diagnostic Tool
    Write-Host "Running Windows battery diagnostic..." -ForegroundColor Yellow
    Write-Log "Running Windows battery diagnostic..."
    
    # Generate battery report with proper path
    $BatteryReportPath = Join-Path $env:TEMP "battery-report.html"
    try {
        # Use proper powercfg command without variables in the command line
        $PowerCfgOutput = & powercfg /batteryreport /output $BatteryReportPath 2>&1
        Start-Sleep -Seconds 3
        
        if (Test-Path $BatteryReportPath) {
            Write-Host "Battery report generated successfully" -ForegroundColor Green
            Write-Log "Battery report generated successfully"
            
            # Try to extract battery life information from the report
            $BatteryReportContent = Get-Content $BatteryReportPath -Raw -ErrorAction SilentlyContinue
            if ($BatteryReportContent) {
                Write-Host "✓ HTML report content loaded" -ForegroundColor Green
                Write-Log "✓ HTML report content loaded"
                
                # Modified regex - adapted to HTML structure
                if ($BatteryReportContent -match 'DESIGN CAPACITY.*?<td>([^<]+)</td>') {
                    $DesignCapacity = $matches[1].Trim()
                    Write-Host "Found Design Capacity: $DesignCapacity" -ForegroundColor Green
                    Write-Log "Found Design Capacity: $DesignCapacity"
                }
                
                if ($BatteryReportContent -match 'FULL CHARGE CAPACITY.*?<td>([^<]+)</td>') {
                    $FullChargeCapacity = $matches[1].Trim()
                    Write-Host "Found Full Charge Capacity: $FullChargeCapacity" -ForegroundColor Green
                    Write-Log "Found Full Charge Capacity: $FullChargeCapacity"
                }
                
                if ($BatteryReportContent -match 'CYCLE COUNT.*?<td>([^<]+)</td>') {
                    $CycleCount = $matches[1].Trim()
                    Write-Host "Found Cycle Count: $CycleCount" -ForegroundColor Green
                    Write-Log "Found Cycle Count: $CycleCount"
                }
                
                # Extract only numbers (remove commas)
                $DesignCapacityNum = ($DesignCapacity -replace '[^\d]', '') -as [int]
                $FullChargeCapacityNum = ($FullChargeCapacity -replace '[^\d]', '') -as [int]
                
                if ($DesignCapacityNum -and $FullChargeCapacityNum -and $DesignCapacityNum -gt 0) {
                    $BatteryLifePercent = [math]::Round(($FullChargeCapacityNum / $DesignCapacityNum) * 100, 1)
                    $BatteryLife = "$BatteryLifePercent% (from diagnostic report)"
                    Write-Host "Battery life from diagnostic: $BatteryLife" -ForegroundColor Green
                    Write-Log "Battery life from diagnostic: $BatteryLife"
                    
                    if ($CycleCount) {
                        $BatteryLife += " - Cycles: $CycleCount"
                        Write-Host "Battery cycles: $CycleCount" -ForegroundColor Cyan
                        Write-Log "Battery cycles: $CycleCount"
                    }
                } else {
                    Write-Host "Battery Life: Cannot calculate (missing capacity data)" -ForegroundColor Yellow
                    Write-Log "Battery Life: Cannot calculate (missing capacity data)"
                }
            }
        } else {
            Write-Host "Battery report file not found" -ForegroundColor Yellow
            Write-Log "Battery report file not found"
        }
    } catch {
        Write-Host "Battery diagnostic failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Log "Battery diagnostic failed: $($_.Exception.Message)"
    }
    
    # Method 2: Get battery information using WMI (fallback)
    $Battery = Get-WmiObject -Class Win32_Battery | Select-Object -First 1
    
    if ($Battery) {
        # Battery percentage
        if ($Battery.EstimatedChargeRemaining -ne $null) {
            $BatteryPercentage = "$($Battery.EstimatedChargeRemaining)%"
        }
        
        # Battery status
        if ($Battery.BatteryStatus -ne $null) {
            switch ($Battery.BatteryStatus) {
                1 { $BatteryStatus = "Other" }
                2 { $BatteryStatus = "Unknown" }
                3 { $BatteryStatus = "Fully Charged" }
                4 { $BatteryStatus = "Low" }
                5 { $BatteryStatus = "Critical" }
                6 { $BatteryStatus = "Charging" }
                7 { $BatteryStatus = "Charging and High" }
                8 { $BatteryStatus = "Charging and Low" }
                9 { $BatteryStatus = "Charging and Critical" }
                10 { $BatteryStatus = "Undefined" }
                11 { $BatteryStatus = "Partially Charged" }
                default { $BatteryStatus = "Unknown" }
            }
        }
        
        # Battery health (chemistry)
        if ($Battery.Chemistry -ne $null) {
            switch ($Battery.Chemistry) {
                1 { $BatteryHealth = "Other" }
                2 { $BatteryHealth = "Unknown" }
                3 { $BatteryHealth = "Lead Acid" }
                4 { $BatteryHealth = "Nickel Cadmium" }
                5 { $BatteryHealth = "Nickel Metal Hydride" }
                6 { $BatteryHealth = "Li-Ion" }
                7 { $BatteryHealth = "Zinc Air" }
                8 { $BatteryHealth = "Lithium Polymer" }
                default { $BatteryHealth = "Unknown" }
            }
        }
        
        # If diagnostic didn't provide battery life, try WMI method
        if ($BatteryLife -eq "Unknown" -or $BatteryLife -like "*Unknown*") {
            if ($Battery.DesignCapacity -ne $null -and $Battery.FullChargeCapacity -ne $null -and 
                $Battery.DesignCapacity -gt 0 -and $Battery.FullChargeCapacity -gt 0) {
                $BatteryLifePercent = [math]::Round(($Battery.FullChargeCapacity / $Battery.DesignCapacity) * 100, 1)
                $BatteryLife = "$BatteryLifePercent% (from WMI)"
            } else {
                # Alternative methods to estimate battery life
                $BatteryLife = "Not available"
                
                # Method 1: Try to get from EstimatedRunTime vs ExpectedBatteryLife
                if ($Battery.EstimatedRunTime -ne $null -and $Battery.ExpectedBatteryLife -ne $null -and 
                    $Battery.ExpectedBatteryLife -gt 0) {
                    $EstimatedLifePercent = [math]::Round(($Battery.EstimatedRunTime / $Battery.ExpectedBatteryLife) * 100, 1)
                    $BatteryLife = "Estimated $EstimatedLifePercent% from runtime"
                }
                # Method 2: Try to get from ExpectedLife
                elseif ($Battery.ExpectedLife -ne $null -and $Battery.ExpectedLife -gt 0) {
                    $BatteryLife = "Expected life: $($Battery.ExpectedLife) hours"
                }
                # Method 3: Try to get from EstimatedRunTime (if reasonable value)
                elseif ($Battery.EstimatedRunTime -ne $null -and $Battery.EstimatedRunTime -gt 0 -and $Battery.EstimatedRunTime -lt 100000) {
                    $BatteryLife = "Runtime: $($Battery.EstimatedRunTime) minutes"
                }
                # Method 4: Check if battery is old based on chemistry and other indicators
                else {
                    # Try to estimate based on battery age or other factors
                    if ($Battery.Chemistry -eq 6) { # Li-Ion
                        $BatteryLife = "Li-Ion battery (age estimation not available)"
                    } else {
                        $BatteryLife = "Battery life estimation not available"
                    }
                }
            }
        }
        
        Write-Host "Battery Status: $BatteryStatus" -ForegroundColor Cyan
        Write-Host "Battery Percentage: $BatteryPercentage" -ForegroundColor Cyan
        Write-Host "Battery Health: $BatteryHealth" -ForegroundColor Cyan
        Write-Host "Battery Life: $BatteryLife" -ForegroundColor Cyan
        Write-Log "Battery Status: $BatteryStatus, Percentage: $BatteryPercentage, Health: $BatteryHealth, Life: $BatteryLife"
    } else {
        Write-Host "No battery detected (desktop or battery not available)" -ForegroundColor Yellow
        Write-Log "No battery detected (desktop or battery not available)"
        $BatteryStatus = "No Battery"
        $BatteryPercentage = "N/A"
        $BatteryHealth = "N/A"
        $BatteryLife = "N/A"
    }
} catch {
    Write-Host "Failed to get battery information: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Log "Failed to get battery information: $($_.Exception.Message)"
    $BatteryStatus = "Error"
    $BatteryPercentage = "Error"
    $BatteryHealth = "Error"
    $BatteryLife = "Error"
}

# System specifications collection
Write-Host "Collecting system specifications..." -ForegroundColor Yellow
Write-Log "Collecting system specifications..."

$CPUInfo = "Unknown"
$RAMInfo = "Unknown"
$DiskInfo = "Unknown"
$OSInfo = "Unknown"

try {
    # CPU information
    $CPU = Get-WmiObject -Class Win32_Processor | Select-Object -First 1
    if ($CPU) {
        $CPUInfo = "$($CPU.Name) ($($CPU.NumberOfCores) cores)"
    }
    
    # RAM information
    $RAM = Get-WmiObject -Class Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
    if ($RAM.Sum -gt 0) {
        $RAMGB = [math]::Round($RAM.Sum / 1GB, 1)
        $RAMInfo = "${RAMGB}GB"
    }
    
    # Disk information
    $Disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object -First 1
    if ($Disk) {
        $DiskGB = [math]::Round($Disk.Size / 1GB, 1)
        $DiskInfo = "${DiskGB}GB"
    }
    
    # OS information
    $OS = Get-WmiObject -Class Win32_OperatingSystem | Select-Object -First 1
    if ($OS) {
        $OSInfo = "$($OS.Caption) $($OS.OSArchitecture)"
    }
    
    Write-Host "CPU: $CPUInfo" -ForegroundColor Cyan
    Write-Host "RAM: $RAMInfo" -ForegroundColor Cyan
    Write-Host "Disk: $DiskInfo" -ForegroundColor Cyan
    Write-Host "OS: $OSInfo" -ForegroundColor Cyan
    Write-Log "CPU: $CPUInfo, RAM: $RAMInfo, Disk: $DiskInfo, OS: $OSInfo"
} catch {
    Write-Host "Failed to get system specifications: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Log "Failed to get system specifications: $($_.Exception.Message)"
}

# Final check: If we still don't have a hardware serial, generate one as last resort
if ($Serial -eq "NEEDS_HARDWARE_SERIAL") {
    Write-Host "[ERROR] All hardware serial collection methods failed - generating timestamp-based serial as last resort" -ForegroundColor Red
    Write-Log "[ERROR] All hardware serial collection methods failed - generating timestamp-based serial as last resort"
    
    $ComputerName = $env:COMPUTERNAME
    if ([string]::IsNullOrEmpty($ComputerName)) { $ComputerName = "UNKNOWN" }
    $Timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
    $RandomSuffix = Get-Random -Minimum 1000 -Maximum 9999
    $Serial = "$ComputerName-$Timestamp-$RandomSuffix"
    
    Write-Host "[WARNING] Generated last resort serial: $Serial" -ForegroundColor Yellow
    Write-Log "[WARNING] Generated last resort serial: $Serial"
} else {
    Write-Host "[SUCCESS] Successfully collected hardware-based serial number" -ForegroundColor Green
    Write-Log "[SUCCESS] Successfully collected hardware-based serial number"
}

# Display final collected information
Write-Host ""
Write-Host "===== FINAL COLLECTED INFORMATION =====" -ForegroundColor Cyan
Write-Host "Equipment Type: $EquipmentType" -ForegroundColor White
Write-Host "Manufacturer: $Manufacturer" -ForegroundColor White
Write-Host "Model: $Model" -ForegroundColor White
Write-Host "Serial Number: $Serial" -ForegroundColor White
Write-Host "Acquisition Date: $DateStr" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Log "===== FINAL COLLECTED INFORMATION ====="
Write-Log "Equipment Type: $EquipmentType"
Write-Log "Manufacturer: $Manufacturer"
Write-Log "Model: $Model"
Write-Log "Serial Number: $Serial"
Write-Log "Acquisition Date: $DateStr"
Write-Log "========================================="

# JSON creation
Write-Host "[Step 4/5] Creating registration data..." -ForegroundColor Yellow

# Create JSON data
$MacAddressList = @()
for ($i = 0; $i -lt [Math]::Min($MacAddresses.Count, 3); $i++) {
    $MacAddressList += @{
        mac_address = $MacAddresses[$i]
        interface_type = "ETHERNET"
        is_primary = ($i -eq 0)
    }
}

$DeviceData = @{
    mac_addresses = $MacAddressList
    serial_number = $Serial
    manufacturer = $Manufacturer
    model_name = $Model
    equipment_type = $EquipmentType
    description = "Auto-installed Windows device - Battery: $BatteryStatus ($BatteryPercentage) - Health: $BatteryHealth - Life: $BatteryLife - CPU: $CPUInfo - RAM: $RAMInfo - Disk: $DiskInfo - OS: $OSInfo"
    acquisition_date = $DateStr
}

$JsonFile = "$env:TEMP\device_data_$(Get-Random).json"
try {
    $DeviceData | ConvertTo-Json -Depth 3 | Out-File -FilePath $JsonFile -Encoding UTF8
    Write-Host "JSON file created successfully: $JsonFile" -ForegroundColor Green
    Write-Log "JSON file created successfully: $JsonFile"
    Get-Content $JsonFile | Out-File -FilePath $LogFile -Append -Encoding UTF8
} catch {
    Write-Host "ERROR: Failed to create JSON file" -ForegroundColor Red
    Write-Log "ERROR: Failed to create JSON file"
    exit 1
}

Write-Host "Registration data created successfully." -ForegroundColor Green

# Data transmission
Write-Host "[Step 5/5] Sending data to server..." -ForegroundColor Yellow
Write-Log "Sending data to server..."
Write-Host "Connecting to registration server..." -ForegroundColor Yellow

# Log the JSON data being sent
Write-Log "===== JSON DATA BEING SENT ====="
Get-Content $JsonFile | Out-File -FilePath $LogFile -Append -Encoding UTF8
Write-Log "===== END JSON DATA ====="

# Read JSON data
$JsonContent = Get-Content $JsonFile -Raw

# Send request and capture response
try {
    $Response = Invoke-WebRequest -Uri "http://10.129.55.253/api/rentals/equipment/report-status/" `
        -Method POST `
        -Body $JsonContent `
        -ContentType "application/json" `
        -TimeoutSec 30 `
        -UseBasicParsing
    
    $HttpCode = $Response.StatusCode
    Write-Log "Executing Invoke-WebRequest successful"
} catch {
    Write-Log "Invoke-WebRequest failed: $($_.Exception.Message)"
    Write-Host "Warning: Server connection failed but continuing installation process." -ForegroundColor Yellow
    $HttpCode = "ERROR"
}

        # Log the response
        Write-Log "===== SERVER RESPONSE ====="
        Write-Log "HTTP Status Code: $HttpCode"
        if ($HttpCode -ne "ERROR") {
            $Response.Content | Out-File -FilePath $LogFile -Append -Encoding UTF8
            
            # Check for specific status codes
            if ($HttpCode -eq 409) {
                Write-Host "[SUCCESS] Equipment is already registered (duplicate prevention)" -ForegroundColor Green
                Write-Log "Equipment is already registered (duplicate prevention)"
                
                # Parse response to get existing equipment info
                try {
                    $ResponseData = $Response.Content | ConvertFrom-Json
                    if ($ResponseData.existing_equipment) {
                        $Existing = $ResponseData.existing_equipment
                        Write-Host "Existing equipment info:" -ForegroundColor Cyan
                        Write-Host "  - ID: $($Existing.id)" -ForegroundColor White
                        Write-Host "  - Asset number: $($Existing.asset_number)" -ForegroundColor White
                        Write-Host "  - Equipment type: $($Existing.equipment_type)" -ForegroundColor White
                        Write-Host "  - Status: $($Existing.status)" -ForegroundColor White
                        Write-Log "Existing equipment info: ID=$($Existing.id), Asset number=$($Existing.asset_number), Type=$($Existing.equipment_type), Status=$($Existing.status)"
                    }
                } catch {
                    Write-Log "Response parsing failed: $($_.Exception.Message)"
                }
            } elseif ($HttpCode -eq 201) {
                Write-Host "[SUCCESS] Equipment registration successful!" -ForegroundColor Green
                Write-Log "Equipment registration successful"
            } else {
                Write-Host "❌ Equipment registration failed (HTTP $HttpCode)" -ForegroundColor Red
                Write-Log "Equipment registration failed (HTTP $HttpCode)"
            }
        }
        Write-Log "===== END SERVER RESPONSE ====="

# Check if successful (HTTP 201, 200, or 409)
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($HttpCode -eq "201") {
    Write-Host "*** SUCCESS: DEVICE REGISTERED! ***" -ForegroundColor Green
    Write-Host "HTTP Status: 201 Created" -ForegroundColor Green
    Write-Host "Equipment has been successfully registered to the server!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Log "*** SUCCESS: DEVICE REGISTERED! ***"
    Write-Log "HTTP Status: 201 Created"
    Remove-Item $JsonFile -Force
    $Success = $true
} elseif ($HttpCode -eq "200") {
    Write-Host "*** SUCCESS: DEVICE REGISTERED! ***" -ForegroundColor Green
    Write-Host "HTTP Status: 200 OK" -ForegroundColor Green
    Write-Host "Equipment has been successfully registered to the server!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Log "*** SUCCESS: DEVICE REGISTERED! ***"
    Write-Log "HTTP Status: 200 OK"
    Remove-Item $JsonFile -Force
    $Success = $true
} elseif ($HttpCode -eq "409") {
    Write-Host "*** SUCCESS: DEVICE ALREADY REGISTERED! ***" -ForegroundColor Green
    Write-Host "HTTP Status: 409 Conflict" -ForegroundColor Green
    Write-Host "Equipment was already registered (duplicate prevention)" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Log "*** SUCCESS: DEVICE ALREADY REGISTERED! ***"
    Write-Log "HTTP Status: 409 Conflict"
    Remove-Item $JsonFile -Force
    $Success = $true
} else {
    Write-Host "*** FAILED: REGISTRATION ERROR! ***" -ForegroundColor Red
    Write-Host "HTTP Status: $HttpCode" -ForegroundColor Red
    Write-Host "Equipment registration failed - data saved locally" -ForegroundColor Red
    Write-Host "Check log file for details: $LogFile" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Log "*** FAILED: REGISTRATION ERROR! ***"
    Write-Log "HTTP Status: $HttpCode"
    Copy-Item $JsonFile "$env:USERPROFILE\Desktop\SystemInfoCollection.json" -Force
    $Success = $false
}
Write-Host ""

Write-Host ""
Write-Host "===== SETUP COMPLETE =====" -ForegroundColor Green
Write-Host "Automatic setup script completed: $(Get-Date)" -ForegroundColor Green
Write-Log "Automatic setup script completed: $(Get-Date)"

# WiFi auto-connection is already configured
Write-Host "WiFi auto-connection configured for automatic access" -ForegroundColor Green
Write-Log "WiFi auto-connection configured for automatic access"

if ($LogFile -ne "CON") {
    Write-Host "Detailed log available at: $LogFile" -ForegroundColor Cyan
} else {
    Write-Host "Log output was sent to console" -ForegroundColor Cyan
}
Write-Host ""

# Auto-close on success, manual close on failure
if ($Success) {
    Write-Host "===== SCRIPT COMPLETED SUCCESSFULLY =====" -ForegroundColor Green
    Write-Log "Script completed successfully"
} else {
    Write-Host "===== SCRIPT COMPLETED WITH ERRORS =====" -ForegroundColor Red
    Write-Host "Errors occurred but continuing installation process..." -ForegroundColor Yellow
    Write-Log "Script completed with errors but continuing"
} 