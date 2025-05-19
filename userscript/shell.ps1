# 관리자 권한 확인 및 요청
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {  
    $arguments = "& '" + $myinvocation.mycommand.definition + "' -NoExit"
    Start-Process powershell -Verb runAs -ArgumentList $arguments
    Break
}

# 에러 처리 함수
function Write-Error {
    param (
        [string]$Message
    )
    Write-Host "에러: $Message" -ForegroundColor Red
}

# 시스템 정보 출력 함수
function Write-SystemInfo {
    param (
        [string]$Title,
        [string]$Value
    )
    Write-Host "$Title : " -NoNewline -ForegroundColor Cyan
    Write-Host "$Value" -ForegroundColor White
}

# 시스템 정보 수집 함수
function Get-SystemInfo {
    try {
        $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $processor = Get-CimInstance Win32_Processor -ErrorAction Stop
        
        # 시리얼번호 가져오기 (가상 장치 대응)
        $serialNumber = $bios.SerialNumber
        if ([string]::IsNullOrEmpty($serialNumber) -or $serialNumber -eq "To be filled by O.E.M.") {
            # 가상 장치의 경우 다른 방법으로 시리얼번호 가져오기
            $baseboard = Get-CimInstance Win32_BaseBoard
            if ($baseboard -and -not [string]::IsNullOrEmpty($baseboard.SerialNumber)) {
                $serialNumber = $baseboard.SerialNumber
            } else {
                # 마지막 수단으로 프로세서 ID 사용
                $processorId = $processor.ProcessorId
                if (-not [string]::IsNullOrEmpty($processorId)) {
                    $serialNumber = $processorId
                } else {
                    # 모든 방법이 실패한 경우 임시 ID 생성
                    $serialNumber = "VM-" + (Get-Date -Format "yyyyMMddHHmmss")
                }
            }
        }
        
        # MAC 주소 수집
        $macAddresses = @()
        $adapters = Get-CimInstance Win32_NetworkAdapter | 
            Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }
        
        $networkInfo = "`n[네트워크 정보]`n"
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

            # 네트워크 설정 정보
            $config = Get-CimInstance Win32_NetworkAdapterConfiguration | 
                Where-Object { $_.Index -eq $adapter.DeviceID }
            
            $ipInfo = if ($config.IPAddress) {
                "IP: $($config.IPAddress[0]), 서브넷: $($config.IPSubnet[0]), 기본게이트웨이: $($config.DefaultIPGateway[0])"
            } else {
                "IP 설정 없음"
            }

            $networkInfo += "이름: $($adapter.Name)`n"
            $networkInfo += "MAC: $($adapter.MACAddress) ($interfaceType)`n"
            $networkInfo += "$ipInfo`n`n"
        }

        # 시스템 전체 정보
        $description = @"
[시스템 정보]
제조사: $($computerSystem.Manufacturer)
모델: $($computerSystem.Model)
시리얼번호: $serialNumber
운영체제: $($os.Caption) ($($os.Version))
프로세서: $($processor.Name)
코어/스레드: $($processor.NumberOfCores) 코어, $($processor.NumberOfLogicalProcessors) 스레드
메모리: $([math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)) GB

$networkInfo
"@

        # 현재 날짜
        $currentDate = Get-Date -Format "yyyy-MM-dd"

        # API 요청 데이터 준비
        $body = @{
            mac_addresses = $macAddresses
            name = "노트북 컴퓨터"
            manufacturer = $computerSystem.Manufacturer
            model_name = $computerSystem.Model
            equipment_type = "LAPTOP"
            serial_number = $serialNumber
            description = $description
            status = "RENTED"
            acquisition_date = $currentDate
        }

        # JSON 변환 및 인코딩 처리
        $jsonBody = $body | ConvertTo-Json -Depth 10 -Compress
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
        $utf8Body = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)

        # PowerShell 출력 인코딩을 EUC-KR로 설정
        [Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding("euc-kr")

        try {
            # 웹 요청 설정
            $webRequest = [System.Net.WebRequest]::Create("http://10.129.55.253/api/rentals/equipment/register/")
            $webRequest.Method = "POST"
            $webRequest.ContentType = "application/json; charset=utf-8"
            $webRequest.ContentLength = $utf8Bytes.Length
            
            # 요청 데이터 전송
            $requestStream = $webRequest.GetRequestStream()
            $requestStream.Write($utf8Bytes, 0, $utf8Bytes.Length)
            $requestStream.Close()
            
            # 응답 받기
            $response = $webRequest.GetResponse()
            $responseStream = $response.GetResponseStream()
            $streamReader = [System.IO.StreamReader]::new($responseStream, [System.Text.Encoding]::UTF8)
            $responseText = $streamReader.ReadToEnd()
            
            # 응답 데이터 파싱
            try {
                $responseData = $responseText | ConvertFrom-Json
                Write-Host "장비 등록이 성공적으로 완료되었습니다." -ForegroundColor Green

                # 장비 정보 확인
                if ($responseData.rental_info -and $responseData.rental_info.user) {
                    $userInfo = $responseData.rental_info.user
                    $username = $userInfo.username
                    
                    # 컴퓨터 이름 변경 (특수문자 제거)
                    $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9가-힣]', ''
                    $newComputerName = "$username-$modelName"
                    $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                    
                    Rename-Computer -NewName $newComputerName -Force
                    Write-Host "컴퓨터 이름이 '$newComputerName'로 변경되었습니다." -ForegroundColor Green
                    Write-Host "변경사항을 적용하기 위해 컴퓨터를 재시작해야 합니다." -ForegroundColor Yellow
                }
            } catch {
                Write-Error "응답 데이터 파싱 중 오류가 발생했습니다: $_"
            }
            
            # 리소스 정리
            $streamReader.Close()
            $responseStream.Close()
            $response.Close()
            
        } catch [System.Net.WebException] {
            # 웹 예외 처리
            if ($_.Exception.Response) {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $streamReader = [System.IO.StreamReader]::new($errorStream, [System.Text.Encoding]::UTF8)
                $errorText = $streamReader.ReadToEnd()
                
                try {
                    $errorData = $errorText | ConvertFrom-Json
                    if ($errorData.existing_equipment -and $errorData.existing_equipment.rental.user) {
                        $userInfo = $errorData.existing_equipment.rental.user
                        $username = $userInfo.username
                        
                        Write-Host "이 컴퓨터는 이미 등록되어 있습니다." -ForegroundColor Yellow
                        Write-Host "등록된 사용자: $username" -ForegroundColor Cyan
                        
                        # 컴퓨터 이름 변경 (특수문자 제거)
                        $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9가-힣]', ''
                        $newComputerName = "$username-$modelName"
                        $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                        
                        Rename-Computer -NewName $newComputerName -Force
                        Write-Host "컴퓨터 이름이 '$newComputerName'로 변경되었습니다." -ForegroundColor Green
                        Write-Host "변경사항을 적용하기 위해 컴퓨터를 재시작해야 합니다." -ForegroundColor Yellow
                    } else {
                        # 400 에러에서도 사용자 정보가 있는 경우 처리
                        if ($errorData.user) {
                            $username = $errorData.user.username
                            
                            Write-Host "이 컴퓨터는 이미 등록되어 있습니다." -ForegroundColor Yellow
                            Write-Host "등록된 사용자: $username" -ForegroundColor Cyan
                            
                            # 컴퓨터 이름 변경 (특수문자 제거)
                            $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9가-힣]', ''
                            $newComputerName = "$username-$modelName"
                            $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                            
                            Rename-Computer -NewName $newComputerName -Force
                            Write-Host "컴퓨터 이름이 '$newComputerName'로 변경되었습니다." -ForegroundColor Green
                            Write-Host "변경사항을 적용하기 위해 컴퓨터를 재시작해야 합니다." -ForegroundColor Yellow
                        } else {
                            Write-Error "이미 등록된 컴퓨터이지만 사용자 정보를 찾을 수 없습니다."
                        }
                    }
                } catch {
                    Write-Error "응답 데이터 처리 중 오류가 발생했습니다: $_"
                }
                
                # 리소스 정리
                $streamReader.Close()
                $errorStream.Close()
            }
        } catch {
            Write-Error "장비 등록 중 예상치 못한 오류가 발생했습니다: $_"
        }

    } catch {
        Write-Error "시스템 정보 수집 중 오류가 발생했습니다: $_"
        Write-Host "오류 상세: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 스크립트 실행
Get-SystemInfo

# 상세 시스템 정보 출력
try {
    Write-Host "`n=== 시스템 정보 ===" -ForegroundColor Yellow

    # 기본 시스템 정보 수집
    $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
    $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $processor = Get-CimInstance Win32_Processor -ErrorAction Stop

    Write-SystemInfo "제조사" $computerSystem.Manufacturer
    Write-SystemInfo "모델" $computerSystem.Model
    Write-SystemInfo "시리얼번호" $bios.SerialNumber
    Write-SystemInfo "운영체제" $os.Caption
    Write-SystemInfo "OS 버전" $os.Version
    Write-SystemInfo "프로세서" $processor.Name
    Write-SystemInfo "프로세서 코어 수" "$($processor.NumberOfCores) 코어"
    Write-SystemInfo "프로세서 스레드 수" "$($processor.NumberOfLogicalProcessors) 스레드"

    # 메모리 정보 (GB 단위로 변환)
    $totalMemoryGB = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)
    Write-SystemInfo "전체 메모리" "$totalMemoryGB GB"

    Write-Host "`n=== 네트워크 어댑터 정보 ===" -ForegroundColor Yellow

    # 네트워크 어댑터 정보 수집
    $adapters = Get-CimInstance Win32_NetworkAdapter | 
        Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }

    if ($adapters) {
        foreach ($adapter in $adapters) {
            Write-Host "`n네트워크 어댑터 #$($adapter.DeviceID)" -ForegroundColor Green
            Write-SystemInfo "어댑터 이름" $adapter.Name
            Write-SystemInfo "네트워크 상태" $(if ($adapter.NetEnabled) { "활성화" } else { "비활성화" })
            Write-SystemInfo "MAC 주소" $adapter.MACAddress
            
            # 해당 어댑터의 IP 설정 정보
            $config = Get-CimInstance Win32_NetworkAdapterConfiguration | 
                Where-Object { $_.Index -eq $adapter.DeviceID }
            
            if ($config.IPAddress) {
                Write-SystemInfo "IP 주소" $($config.IPAddress[0])
                Write-SystemInfo "서브넷 마스크" $($config.IPSubnet[0])
                Write-SystemInfo "기본 게이트웨이" $($config.DefaultIPGateway[0])
            }
        }
    } else {
        Write-Error "네트워크 어댑터를 찾을 수 없습니다."
    }

    Write-Host "`n=== 디스크 정보 ===" -ForegroundColor Yellow

    # 디스크 정보 수집
    $disks = Get-CimInstance Win32_DiskDrive

    if ($disks) {
        foreach ($disk in $disks) {
            $sizeGB = [math]::Round($disk.Size / 1GB, 2)
            Write-Host "`n디스크: $($disk.DeviceID)" -ForegroundColor Green
            Write-SystemInfo "모델" $disk.Model
            Write-SystemInfo "크기" "$sizeGB GB"
            Write-SystemInfo "인터페이스타입" $disk.InterfaceType
            Write-SystemInfo "시리얼번호" $disk.SerialNumber
        }
    } else {
        Write-Error "디스크 정보를 찾을 수 없습니다."
    }

    # 그래픽 카드 정보
    Write-Host "`n=== 그래픽 카드 정보 ===" -ForegroundColor Yellow
    $gpus = Get-CimInstance Win32_VideoController

    if ($gpus) {
        foreach ($gpu in $gpus) {
            Write-Host "`n그래픽 카드" -ForegroundColor Green
            Write-SystemInfo "모델" $gpu.Name
            Write-SystemInfo "메모리" "$([math]::Round($gpu.AdapterRAM / 1GB, 2)) GB"
            Write-SystemInfo "드라이버 버전" $gpu.DriverVersion
        }
    } else {
        Write-Error "그래픽 카드 정보를 찾을 수 없습니다."
    }

} catch {
    Write-Error "시스템 정보를 수집하는 중 오류가 발생했습니다: $_"
    Write-Host "오류 상세: $($_.Exception.Message)" -ForegroundColor Red
}

# 스크립트 종료
Write-Host "`n시스템 정보 수집이 완료되었습니다." -ForegroundColor Green
Write-Host "`n창을 닫으려면 Enter 키를 누르세요..." -ForegroundColor Yellow
$null = Read-Host

# 컴퓨터 재시작
Restart-Computer -Force