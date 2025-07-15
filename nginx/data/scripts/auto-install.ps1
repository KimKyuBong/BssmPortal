# 자동 Windows 설치 스크립트
# PXE 부팅 후 WinPE에서 실행됨

# 로그 함수
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
    Add-Content -Path "X:\auto-install.log" -Value "[$timestamp] $Message"
}

# 시스템 정보 수집 함수
function Get-SystemInfo {
    try {
        Write-Log "시스템 정보 수집 시작..."
        
        $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $processor = Get-CimInstance Win32_Processor -ErrorAction Stop
        
        # 시리얼 번호 추출 (우선순위: BIOS > BaseBoard > Processor ID)
        $serialNumber = $bios.SerialNumber
        if ([string]::IsNullOrEmpty($serialNumber) -or $serialNumber -eq "To be filled by O.E.M.") {
            $baseboard = Get-CimInstance Win32_BaseBoard
            if ($baseboard -and -not [string]::IsNullOrEmpty($baseboard.SerialNumber)) {
                $serialNumber = $baseboard.SerialNumber
            } else {
                $processorId = $processor.ProcessorId
                if (-not [string]::IsNullOrEmpty($processorId)) {
                    $serialNumber = $processorId
                } else {
                    $serialNumber = "VM-" + (Get-Date -Format "yyyyMMddHHmmss")
                }
            }
        }
        
        # MAC 주소 수집
        $macAddresses = @()
        $adapters = Get-CimInstance Win32_NetworkAdapter | 
            Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }
        
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
        }
        
        # 시스템 정보 구성
        $systemInfo = @{
            mac_addresses = $macAddresses
            name = "자동 설치 컴퓨터"
            manufacturer = $computerSystem.Manufacturer
            model_name = $computerSystem.Model
            equipment_type = "LAPTOP"
            serial_number = $serialNumber
            description = @"
[장비 정보]
제조사: $($computerSystem.Manufacturer)
모델: $($computerSystem.Model)
시리얼번호: $serialNumber
운영체제: $($os.Caption) ($($os.Version))
프로세서: $($processor.Name)
코어/스레드: $($processor.NumberOfCores) 코어, $($processor.NumberOfLogicalProcessors) 스레드
메모리: $([math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)) GB

[네트워크 어댑터]
$($macAddresses | ForEach-Object { "MAC: $($_.mac_address) ($($_.interface_type))" } | Out-String)
"@
            status = "MAINTENANCE"
            acquisition_date = (Get-Date -Format "yyyy-MM-dd")
        }
        
        Write-Log "시스템 정보 수집 완료"
        return $systemInfo
        
    } catch {
        Write-Log "시스템 정보 수집 실패: $($_.Exception.Message)"
        throw
    }
}

# 백엔드에 장비 등록 함수
function Register-Equipment {
    param([hashtable]$SystemInfo)
    
    try {
        Write-Log "백엔드에 장비 등록 시작..."
        
        # JSON 변환 및 인코딩 처리
        $jsonBody = $SystemInfo | ConvertTo-Json -Depth 10 -Compress
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
        
        # HTTP 요청 생성 (자동 설치용 유지보수 상태 등록)
        $webRequest = [System.Net.WebRequest]::Create("http://10.250.0.1/api/rentals/equipment/register_maintenance/")
        $webRequest.Method = "POST"
        $webRequest.ContentType = "application/json; charset=utf-8"
        $webRequest.ContentLength = $utf8Bytes.Length
        
        # 요청 데이터 전송
        $requestStream = $webRequest.GetRequestStream()
        $requestStream.Write($utf8Bytes, 0, $utf8Bytes.Length)
        $requestStream.Close()
        
        # 응답 수신
        $response = $webRequest.GetResponse()
        $responseStream = $response.GetResponseStream()
        $streamReader = [System.IO.StreamReader]::new($responseStream, [System.Text.Encoding]::UTF8)
        $responseText = $streamReader.ReadToEnd()
        
        # 응답 처리
        $responseData = $responseText | ConvertFrom-Json
        Write-Log "장비 등록 성공: $($responseData.message)"
        
        $streamReader.Close()
        $responseStream.Close()
        $response.Close()
        
        return $responseData
        
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $streamReader = [System.IO.StreamReader]::new($errorStream, [System.Text.Encoding]::UTF8)
            $errorText = $streamReader.ReadToEnd()
            
            try {
                $errorData = $errorText | ConvertFrom-Json
                if ($errorData.existing_equipment) {
                    Write-Log "장비가 이미 등록되어 있음: $($errorData.existing_equipment.rental.user.username)"
                    return $errorData
                }
            } catch {
                Write-Log "응답 파싱 실패: $errorText"
            }
            
            $streamReader.Close()
        }
        Write-Log "장비 등록 실패: $($_.Exception.Message)"
        throw
    }
}

# 디스크 초기화 함수
function Initialize-Disk {
    try {
        Write-Log "디스크 초기화 시작..."
        
        # diskpart 스크립트 실행
        $diskpartScript = Get-Content "X:\diskpart.txt" -Raw
        $diskpartScript | diskpart
        
        Write-Log "디스크 초기화 완료"
        
    } catch {
        Write-Log "디스크 초기화 실패: $($_.Exception.Message)"
        throw
    }
}

# WIM 이미지 설치 함수
function Install-WindowsImage {
    try {
        Write-Log "Windows 이미지 설치 시작..."
        
        # WIM 파일 다운로드
        $wimUrl = "http://10.250.1.1:8080/images/bssm.wim"
        $wimPath = "X:\bssm.wim"
        
        Write-Log "WIM 파일 다운로드 중: $wimUrl"
        Invoke-WebRequest -Uri $wimUrl -OutFile $wimPath
        
        # 이미지 정보 확인
        $imageInfo = Get-WindowsImage -ImagePath $wimPath -Index 1
        Write-Log "이미지 정보: $($imageInfo.ImageName)"
        
        # 이미지 적용
        Write-Log "이미지를 C: 드라이브에 적용 중..."
        Expand-WindowsImage -ImagePath $wimPath -Index 1 -ApplyPath "C:\" -CheckIntegrity
        
        Write-Log "Windows 이미지 설치 완료"
        
    } catch {
        Write-Log "Windows 이미지 설치 실패: $($_.Exception.Message)"
        throw
    }
}

# 부트로더 복구 함수
function Repair-Bootloader {
    try {
        Write-Log "부트로더 복구 시작..."
        
        # BCD 부트로더 복구
        bcdboot C:\Windows /s C: /f UEFI
        
        Write-Log "부트로더 복구 완료"
        
    } catch {
        Write-Log "부트로더 복구 실패: $($_.Exception.Message)"
        throw
    }
}

# 메인 실행 함수
function Start-AutoInstall {
    try {
        Write-Log "=== 자동 Windows 설치 프로세스 시작 ==="
        
        # 1. 시스템 정보 수집
        $systemInfo = Get-SystemInfo
        
        # 2. 백엔드에 장비 등록 (유지보수 상태)
        $registrationResult = Register-Equipment -SystemInfo $systemInfo
        
        # 3. 디스크 초기화
        Initialize-Disk
        
        # 4. Windows 이미지 설치
        Install-WindowsImage
        
        # 5. 부트로더 복구
        Repair-Bootloader
        
        Write-Log "=== 자동 Windows 설치 프로세스 완료 ==="
        Write-Log "컴퓨터를 재부팅합니다..."
        
        # 재부팅
        Start-Sleep -Seconds 5
        Restart-Computer -Force
        
    } catch {
        Write-Log "=== 자동 Windows 설치 프로세스 실패 ==="
        Write-Log "오류: $($_.Exception.Message)"
        Write-Log "로그 파일을 확인하세요: X:\auto-install.log"
        
        # 오류 발생 시 30초 대기 후 재부팅
        Write-Log "30초 후 재부팅합니다..."
        Start-Sleep -Seconds 30
        Restart-Computer -Force
    }
}

# 스크립트 실행
Start-AutoInstall 