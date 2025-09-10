@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Windows Auto Installation Script
echo ========================================
echo.

echo 1. Setting up disk partitions...
echo Setting Windows partition to 150GB, remaining space for Data...
echo.

REM Fixed Windows partition size: 150GB
set "windows_partition_size=153600"
set "has_data_partition=1"

REM Create diskpart script
(
echo list disk
echo select disk 0
echo clean
echo convert gpt
echo create partition efi size=260
echo format quick fs=fat32 label="System"
echo assign letter=S
echo create partition primary size=!windows_partition_size!
echo format quick fs=ntfs label="Windows"
echo assign letter=T
echo create partition primary
echo format quick fs=ntfs label="Data"
echo assign letter=U
echo list partition
echo list disk
echo exit
) > "%temp%\diskpart_script.txt"

echo Running diskpart script...
diskpart /s "%temp%\diskpart_script.txt" > "%temp%\diskpart_output.txt" 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Disk partition setup failed.
    echo Diskpart output:
    type "%temp%\diskpart_output.txt"
    del "%temp%\diskpart_script.txt"
    del "%temp%\diskpart_output.txt"
    pause
    exit /b 1
)

echo Diskpart completed successfully!
del "%temp%\diskpart_output.txt"

del "%temp%\diskpart_script.txt"

echo.
echo 2. Copying WIM file...

REM Find USB drive automatically
echo Searching for USB drive...
for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist %%d:\ (
        echo Found drive %%d:
        if exist "%%d:\bssm.wim" (
            copy "%%d:\bssm.wim" "U:\bssm.wim"
            echo bssm.wim file copy completed to U drive!
            goto :wim_copied
        ) else if exist "%%d:\sources\bssm.wim" (
            copy "%%d:\sources\bssm.wim" "U:\bssm.wim"
            echo bssm.wim file copy completed to U drive!
            goto :wim_copied
        ) else if exist "%%d:\custom\bssm.wim" (
            copy "%%d:\custom\bssm.wim" "U:\bssm.wim"
            echo bssm.wim file copy completed to U drive!
            goto :wim_copied
        )
    )
)

REM If not found on any drive, try current directory
if exist "%~dp0bssm.wim" (
    copy "%~dp0bssm.wim" "U:\bssm.wim"
    echo bssm.wim file copy completed to U drive!
    goto :wim_copied
) else if exist "%~dp0sources\bssm.wim" (
    copy "%~dp0sources\bssm.wim" "U:\bssm.wim"
    echo bssm.wim file copy completed to U drive!
    goto :wim_copied
) else if exist "%~dp0custom\bssm.wim" (
    copy "%~dp0custom\bssm.wim" "U:\bssm.wim"
    echo bssm.wim file copy completed to U drive!
    goto :wim_copied
) else (
    echo [INFO] bssm.wim file not found on USB.
    echo Attempting to download from network to U drive...
    echo.
    
            echo Downloading bssm.wim file from network...
        echo Download URL: http://10.129.55.253:8080/images/bssm.wim
        echo.
        
        curl -L -o "U:\bssm.wim" "http://10.129.55.253:8080/images/bssm.wim"
        
        if %errorlevel% neq 0 (
            echo [ERROR] Network download failed.
            echo.
            echo Please place bssm.wim file in one of the following USB locations:
            echo - Root directory: USB:\bssm.wim
            echo - sources folder: USB:\sources\bssm.wim
            echo - custom folder: USB:\custom\bssm.wim
            echo.
            echo Or check network connection and try again.
            pause
            exit /b 1
        )
    
    echo bssm.wim file download completed to U drive!
)

:wim_copied
echo.
echo 3. Applying Windows installation image...
echo Starting WinNTSetup...

REM Start WinNTSetup with RunAfter option to delete WIM file before reboot
start /b "" "X:\BRPlus\WinNTSetup.exe" NT6 -source:"U:\bssm.wim" -wimindex:1 -syspart:S: -tempdrive:T: -setup -reboot /RunAfter:"X:\Windows\System32\cmd.exe /c del /f /q U:\bssm.wim"

echo WinNTSetup started with automatic cleanup.
echo Installation will complete and reboot automatically.
echo WIM file will be deleted before reboot.
echo.
echo ========================================
echo Windows installation in progress...
echo ========================================
echo.
echo Please wait for the installation to complete.
echo The system will reboot automatically when finished.
echo. 