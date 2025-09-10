@echo off
setlocal enabledelayedexpansion

echo Running system setup and auto-registration script...
echo ===== SYSTEM SETUP AND REGISTRATION =====

:: Check if PowerShell is available
where powershell >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is not available
    echo Please ensure PowerShell is installed and accessible
    pause
    exit /b 1
)

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%SetupComplete.ps1"

:: Check if PowerShell script exists
if not exist "%PS_SCRIPT%" (
    echo ERROR: PowerShell script not found at: %PS_SCRIPT%
    echo Please ensure SetupComplete.ps1 is in the same directory
    pause
    exit /b 1
)

echo Found PowerShell script: %PS_SCRIPT%
echo Starting PowerShell execution...

:: Execute PowerShell script with bypass execution policy for Sysprep
powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "%PS_SCRIPT%"

:: Check if PowerShell execution was successful
if errorlevel 1 (
    echo.
    echo ===== POWERSHELL EXECUTION FAILED =====
    echo PowerShell script execution failed with error code: %errorlevel%
    echo Please check the PowerShell script for errors
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ===== POWERSHELL EXECUTION COMPLETED =====
    echo PowerShell script execution completed successfully
    echo.
)

exit /b 0 