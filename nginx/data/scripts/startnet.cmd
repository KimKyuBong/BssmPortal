@echo off
echo ========================================
echo WinPE Network Startup
echo ========================================
echo.

REM Initialize network with wpeinit
echo Initializing WinPE environment...
wpeinit

REM Wait for network to be fully ready
echo Waiting for network initialization to complete...
timeout /t 10 /nobreak >nul

REM Check network connectivity
echo Checking network connectivity...
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 (
    echo Network not ready, waiting additional time...
    timeout /t 15 /nobreak >nul
    ping -n 1 8.8.8.8 >nul 2>&1
    if %errorlevel% neq 0 (
        echo Warning: Network connectivity issues detected
    )
)

REM Run startup script after wpeinit
echo Network initialization completed.
echo Starting automatic installation process...
echo.

REM Check if auto_install.bat exists on USB drive first
for %%d in (A B C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist %%d:\auto_install.bat (
        echo Found auto_install.bat on %%d: drive
        echo Starting automatic installation...
        %%d:\auto_install.bat
        goto :end
    )
)

REM If not found on USB, download from network
echo Auto installation script not found on USB drives.
echo Attempting to download from network...
echo.

REM Download auto_install.bat from network
curl -L -o "X:\auto_install.bat" "http://10.129.55.253:8080/scripts/auto_install.bat"
if %errorlevel% equ 0 (
    echo Downloaded auto_install.bat successfully
    echo Starting automatic installation...
    X:\auto_install.bat
) else (
    echo Failed to download auto_install.bat
    echo Please check network connection or insert USB drive with auto_install.bat
    echo.
    echo Available drives:
    for %%d in (A B C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
        if exist %%d:\ echo - %%d:\
    )
    pause
)

:end
echo Network startup and auto-installation completed. 