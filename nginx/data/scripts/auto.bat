@echo off

:: Register device for maintenance
echo Registering device for maintenance...
setlocal enabledelayedexpansion

:: Collect system information - try multiple methods for PE compatibility
echo Collecting system information...
set "SERIAL="
set "MANUFACTURER="
set "MODEL="

:: Method 1: Try systeminfo command (most compatible with PE)
echo Trying systeminfo command...
systeminfo > temp_sysinfo.txt 2>nul
if exist temp_sysinfo.txt (
    for /f "tokens=2 delims=:" %%a in ('findstr /i "System Manufacturer" temp_sysinfo.txt') do (
        set "MANUFACTURER=%%a"
        set "MANUFACTURER=!MANUFACTURER: =!"
    )
    for /f "tokens=2 delims=:" %%a in ('findstr /i "System Model" temp_sysinfo.txt') do (
        set "MODEL=%%a"
        set "MODEL=!MODEL: =!"
    )
    for /f "tokens=2 delims=:" %%a in ('findstr /i "BIOS Version" temp_sysinfo.txt') do (
        set "BIOS_INFO=%%a"
    )
    del temp_sysinfo.txt 2>nul
)

:: Method 2: Try registry for BIOS serial number
echo Trying registry for BIOS serial number...
reg query "HKLM\HARDWARE\DESCRIPTION\System\BIOS" /v SystemSerialNumber >temp_reg.txt 2>nul
if exist temp_reg.txt (
    for /f "tokens=3" %%a in ('findstr /i "SystemSerialNumber" temp_reg.txt') do (
        set "SERIAL=%%a"
    )
    del temp_reg.txt 2>nul
)

:: Method 3: Try wmic if available (fallback)
if "%SERIAL%"=="" (
    echo Trying wmic as fallback...
    wmic bios get serialnumber /value >temp_wmic.txt 2>nul
    if exist temp_wmic.txt (
        for /f "tokens=2 delims==" %%a in ('findstr "SerialNumber=" temp_wmic.txt') do (
            set "SERIAL=%%a"
        )
        del temp_wmic.txt 2>nul
    )
)

:: Method 4: Try to get motherboard serial
if "%SERIAL%"=="" (
    echo Trying motherboard serial...
    reg query "HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0" /v ProcessorNameString >temp_cpu.txt 2>nul
    if exist temp_cpu.txt (
        for /f "tokens=3*" %%a in ('findstr /i "ProcessorNameString" temp_cpu.txt') do (
            set "CPU_INFO=%%a %%b"
        )
        del temp_cpu.txt 2>nul
    )
)

:: Clean up values and set defaults
if not "%SERIAL%"=="" (
    set "SERIAL=%SERIAL: =%"
    if "%SERIAL%"=="To be filled by O.E.M." set "SERIAL="
    if "%SERIAL%"=="Default string" set "SERIAL="
    if "%SERIAL%"=="Not Available" set "SERIAL="
    if "%SERIAL%"=="Not Specified" set "SERIAL="
)

if not "%MANUFACTURER%"=="" (
    set "MANUFACTURER=%MANUFACTURER: =%"
    if "%MANUFACTURER%"=="To be filled by O.E.M." set "MANUFACTURER=Unknown"
)

if not "%MODEL%"=="" (
    set "MODEL=%MODEL: =%"
    if "%MODEL%"=="To be filled by O.E.M." set "MODEL=Unknown"
)

:: If still no serial, create one based on MAC address and current time
if "%SERIAL%"=="" (
    echo No hardware serial found, generating unique identifier...
    set "TIME_HASH=%TIME::=%"
    set "TIME_HASH=%TIME_HASH:.=%"
    set "TIME_HASH=%TIME_HASH: =%"
    set "SERIAL=HW_%TIME_HASH%_%RANDOM%"
)

:: Set final defaults
if "%MANUFACTURER%"=="" set "MANUFACTURER=Unknown"
if "%MODEL%"=="" set "MODEL=Unknown"

echo Found system info:
echo   Serial: %SERIAL%
echo   Manufacturer: %MANUFACTURER%  
echo   Model: %MODEL%

:: Get MAC addresses using ipconfig /all (most compatible method)
echo Getting MAC addresses using ipconfig...
set "MAC_LIST="
set "COUNT=0"

:: Create temp file for ipconfig output
ipconfig /all > temp_ipconfig.txt

:: Parse MAC addresses from ipconfig output
for /f "tokens=*" %%a in ('findstr /i "Physical Address" temp_ipconfig.txt') do call :process_ipconfig_line "%%a"
goto :done_mac

:process_ipconfig_line
set "LINE=%~1"
:: Extract MAC address from line like "   Physical Address. . . . . . . . . : 00-11-22-33-44-55"
for /f "tokens=2 delims=:" %%b in ("%LINE%") do (
    set "MAC=%%b"
    :: Remove leading/trailing spaces
    set "MAC=!MAC: =!"
    :: Skip empty or invalid MAC addresses
    if not "!MAC!"=="" if not "!MAC!"=="00-00-00-00-00-00" (
        set /a COUNT+=1
        if !COUNT! equ 1 set "MAC_LIST={\"mac_address\":\"!MAC!\"}"
        if !COUNT! gtr 1 set "MAC_LIST=!MAC_LIST!,{\"mac_address\":\"!MAC!\"}"
        if !COUNT! geq 3 goto :done_mac
    )
)
goto :eof

:done_mac
:: Clean up temp file
del temp_ipconfig.txt 2>nul

:: If no MAC addresses found, create a unique default one based on serial
if "%MAC_LIST%"=="" (
    echo Warning: No MAC addresses found, generating from serial...
    set "HASH=%SERIAL:~-6%"
    set "MAC_LIST={\"mac_address\":\"02-!HASH:~0,2!-!HASH:~2,2!-!HASH:~4,2!-00-01\"}"
)

:: Get current date in YYYY-MM-DD format
echo Getting current date...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do (
    set "DATE_STR=%%c-%%a-%%b"
)
:: If date command failed, use a default
if "%DATE_STR%"=="" set "DATE_STR=2024-01-01"

:: Create JSON data file
echo Creating device registration data...
(
echo {
echo   "mac_addresses": [%MAC_LIST%],
echo   "serial_number": "%SERIAL%",
echo   "manufacturer": "%MANUFACTURER%",
echo   "model_name": "%MODEL%",
echo   "equipment_type": "DESKTOP",
echo   "description": "Auto-installed Windows device via PXE boot",
echo   "acquisition_date": "%DATE_STR%"
echo }
) > device_data.json

:: Show the data we're sending
echo.
echo Device registration data:
type device_data.json
echo.

:: Send data to server using curl
echo Sending device data to server...
curl -X POST "http://10.129.55.253/api/rentals/admin/equipment/register_maintenance/" -H "Content-Type: application/json" --data @device_data.json --connect-timeout 10 --max-time 30
if errorlevel 1 (
    echo Device registration failed, continuing with installation...
) else (
    echo Device registered successfully for maintenance!
)

:: Clean up
del device_data.json 2>nul

:: Map network drive (T:)
net use T: \\10.129.55.253\setup /user:bssm bssm
if errorlevel 1 (
    echo Failed to map network drive!
    exit /b 1
)

:: InitialiTe disk (diskpart.txt must be in the shared folder)
diskpart /s T:\diskpart.txt
if errorlevel 1 (
    echo Disk initialiTation failed!
    exit /b 1
)

:: Apply image (W: is the Windows partition drive assigned in diskpart.txt)
dism /Apply-Image /ImageFile:T:\bssm.wim /Index:1 /ApplyDir:W:\
if errorlevel 1 (
    echo Image application failed!
    exit /b 1
)

:: Create boot files/BCD automatically (S: is the EFI partition drive)
bcdboot W:\Windows /s S: /f UEFI
if errorlevel 1 (
    echo Boot file creation failed!
    exit /b 1
)

echo All tasks completed successfully. Rebooting in 5 seconds...
timeout /t 5
wpeutil reboot