@echo off
echo PowerShell 실행 정책을 변경합니다...
powershell -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Unrestricted -Force"

echo 스크립트를 실행합니다...
powershell -File "%~dp0shell.ps1"

exit 