@echo off
echo ========================================
echo    BSSM 자동 Windows 설치 시스템
echo ========================================
echo.
echo 네트워크 연결을 확인합니다...

REM 네트워크 연결 확인
ping -n 3 10.250.0.1 > nul
if errorlevel 1 (
    echo 오류: 백엔드 서버(10.250.0.1)에 연결할 수 없습니다.
    echo 네트워크 설정을 확인하세요.
    pause
    exit /b 1
)

echo 네트워크 연결 확인 완료.
echo.
echo 시스템 정보를 수집하고 백엔드에 등록합니다...
echo.

REM PowerShell 실행 정책 변경
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Force"

REM PowerShell 스크립트 실행
powershell -File X:\auto-install.ps1

REM 스크립트 실행 결과 확인
if errorlevel 1 (
    echo.
    echo 오류: 자동 설치 프로세스에서 오류가 발생했습니다.
    echo 로그 파일을 확인하세요: X:\auto-install.log
    echo.
    echo 30초 후 재부팅합니다...
    timeout /t 30 /nobreak
) else (
    echo.
    echo 자동 설치 프로세스가 성공적으로 완료되었습니다.
    echo 10초 후 재부팅합니다...
    timeout /t 10 /nobreak
)

REM 재부팅
shutdown /r /t 0 