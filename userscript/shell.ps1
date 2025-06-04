# ������ ���� Ȯ�� �� ��û
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {  
    $arguments = "& '" + $myinvocation.mycommand.definition + "' -NoExit"
    Start-Process powershell -Verb runAs -ArgumentList $arguments
    Break
}

# ���� ó�� �Լ�
function Write-Error {
    param (
        [string]$Message
    )
    Write-Host "����: $Message" -ForegroundColor Red
}

# �ý��� ���� ��� �Լ�
function Write-SystemInfo {
    param (
        [string]$Title,
        [string]$Value
    )
    Write-Host "$Title : " -NoNewline -ForegroundColor Cyan
    Write-Host "$Value" -ForegroundColor White
}

# �ý��� ���� ���� �Լ�
function Get-SystemInfo {
    try {
        $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $processor = Get-CimInstance Win32_Processor -ErrorAction Stop
        
        # �ø����ȣ �������� (���� ��ġ ����)
        $serialNumber = $bios.SerialNumber
        if ([string]::IsNullOrEmpty($serialNumber) -or $serialNumber -eq "To be filled by O.E.M.") {
            # ���� ��ġ�� ��� �ٸ� ������� �ø����ȣ ��������
            $baseboard = Get-CimInstance Win32_BaseBoard
            if ($baseboard -and -not [string]::IsNullOrEmpty($baseboard.SerialNumber)) {
                $serialNumber = $baseboard.SerialNumber
            } else {
                # ������ �������� ���μ��� ID ���
                $processorId = $processor.ProcessorId
                if (-not [string]::IsNullOrEmpty($processorId)) {
                    $serialNumber = $processorId
                } else {
                    # ��� ����� ������ ��� �ӽ� ID ����
                    $serialNumber = "VM-" + (Get-Date -Format "yyyyMMddHHmmss")
                }
            }
        }
        
        # MAC �ּ� ����
        $macAddresses = @()
        $adapters = Get-CimInstance Win32_NetworkAdapter | 
            Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }
        
        $networkInfo = "`n[��Ʈ��ũ ����]`n"
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

            # ��Ʈ��ũ ���� ����
            $config = Get-CimInstance Win32_NetworkAdapterConfiguration | 
                Where-Object { $_.Index -eq $adapter.DeviceID }
            
            $ipInfo = if ($config.IPAddress) {
                "IP: $($config.IPAddress[0]), �����: $($config.IPSubnet[0]), �⺻����Ʈ����: $($config.DefaultIPGateway[0])"
            } else {
                "IP ���� ����"
            }

            $networkInfo += "�̸�: $($adapter.Name)`n"
            $networkInfo += "MAC: $($adapter.MACAddress) ($interfaceType)`n"
            $networkInfo += "$ipInfo`n`n"
        }

        # �ý��� ��ü ����
        $description = @"
[�ý��� ����]
������: $($computerSystem.Manufacturer)
��: $($computerSystem.Model)
�ø����ȣ: $serialNumber
�ü��: $($os.Caption) ($($os.Version))
���μ���: $($processor.Name)
�ھ�/������: $($processor.NumberOfCores) �ھ�, $($processor.NumberOfLogicalProcessors) ������
�޸�: $([math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)) GB

$networkInfo
"@

        # ���� ��¥
        $currentDate = Get-Date -Format "yyyy-MM-dd"

        # API ��û ������ �غ�
        $body = @{
            mac_addresses = $macAddresses
            name = "��Ʈ�� ��ǻ��"
            manufacturer = $computerSystem.Manufacturer
            model_name = $computerSystem.Model
            equipment_type = "LAPTOP"
            serial_number = $serialNumber
            description = $description
            status = "RENTED"
            acquisition_date = $currentDate
        }

        # JSON ��ȯ �� ���ڵ� ó��
        $jsonBody = $body | ConvertTo-Json -Depth 10 -Compress
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
        $utf8Body = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)

        # PowerShell ��� ���ڵ��� EUC-KR�� ����
        [Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding("euc-kr")

        try {
            # �� ��û ����
            $webRequest = [System.Net.WebRequest]::Create("http://10.129.55.253/api/rentals/equipment/register/")
            $webRequest.Method = "POST"
            $webRequest.ContentType = "application/json; charset=utf-8"
            $webRequest.ContentLength = $utf8Bytes.Length
            
            # ��û ������ ����
            $requestStream = $webRequest.GetRequestStream()
            $requestStream.Write($utf8Bytes, 0, $utf8Bytes.Length)
            $requestStream.Close()
            
            # ���� �ޱ�
            $response = $webRequest.GetResponse()
            $responseStream = $response.GetResponseStream()
            $streamReader = [System.IO.StreamReader]::new($responseStream, [System.Text.Encoding]::UTF8)
            $responseText = $streamReader.ReadToEnd()
            
            # ���� ������ �Ľ�
            try {
                $responseData = $responseText | ConvertFrom-Json
                Write-Host "��� ����� ���������� �Ϸ�Ǿ����ϴ�." -ForegroundColor Green

                # ��� ���� Ȯ��
                if ($responseData.rental_info -and $responseData.rental_info.user) {
                    $userInfo = $responseData.rental_info.user
                    $username = $userInfo.username
                    
                    # ��ǻ�� �̸� ���� (����� �̸� + �𵨸�)
                    $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9��-�R]', ''
                    $newComputerName = "$username-$modelName"
                    $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                    
                    Rename-Computer -NewName $newComputerName -Force
                    Write-Host "��ǻ�� �̸��� '$newComputerName'�� ����Ǿ����ϴ�." -ForegroundColor Green
                    Write-Host "��������� �����ϱ� ���� ��ǻ�͸� ������ؾ� �մϴ�." -ForegroundColor Yellow
                }
            } catch {
                Write-Error "���� ������ �Ľ� �� ������ �߻��߽��ϴ�: $_"
            }
            
            # ���ҽ� ����
            $streamReader.Close()
            $responseStream.Close()
            $response.Close()
            
        } catch [System.Net.WebException] {
            # �� ���� ó��
            if ($_.Exception.Response) {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $streamReader = [System.IO.StreamReader]::new($errorStream, [System.Text.Encoding]::UTF8)
                $errorText = $streamReader.ReadToEnd()
                
                try {
                    $errorData = $errorText | ConvertFrom-Json
                    if ($errorData.existing_equipment -and $errorData.existing_equipment.rental.user) {
                        $userInfo = $errorData.existing_equipment.rental.user
                        $username = $userInfo.username
                        
                        Write-Host "�� ��ǻ�ʹ� �̹� ��ϵǾ� �ֽ��ϴ�." -ForegroundColor Yellow
                        Write-Host "��ϵ� �����: $username" -ForegroundColor Cyan
                        
                        # ��ǻ�� �̸� ���� (����� �̸� + �𵨸�)
                        $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9��-�R]', ''
                        $newComputerName = "$username-$modelName"
                        $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                        
                        Rename-Computer -NewName $newComputerName -Force
                        Write-Host "��ǻ�� �̸��� '$newComputerName'�� ����Ǿ����ϴ�." -ForegroundColor Green
                        Write-Host "��������� �����ϱ� ���� ��ǻ�͸� ������ؾ� �մϴ�." -ForegroundColor Yellow
                    } else {
                        # 400 ���������� ����� ������ �ִ� ��� ó��
                        if ($errorData.user) {
                            $username = $errorData.user.username
                            
                            Write-Host "�� ��ǻ�ʹ� �̹� ��ϵǾ� �ֽ��ϴ�." -ForegroundColor Yellow
                            Write-Host "��ϵ� �����: $username" -ForegroundColor Cyan
                            
                            # ��ǻ�� �̸� ���� (����� �̸� + �𵨸�)
                            $modelName = $computerSystem.Model -replace '[^a-zA-Z0-9��-�R]', ''
                            $newComputerName = "$username-$modelName"
                            $newComputerName = $newComputerName.Substring(0, [Math]::Min($newComputerName.Length, 15))
                            
                            Rename-Computer -NewName $newComputerName -Force
                            Write-Host "��ǻ�� �̸��� '$newComputerName'�� ����Ǿ����ϴ�." -ForegroundColor Green
                            Write-Host "��������� �����ϱ� ���� ��ǻ�͸� ������ؾ� �մϴ�." -ForegroundColor Yellow
                        } else {
                            Write-Error "�̹� ��ϵ� ��ǻ�������� ����� ������ ã�� �� �����ϴ�."
                        }
                    }
                } catch {
                    Write-Error "���� ������ ó�� �� ������ �߻��߽��ϴ�: $_"
                }
                
                # ���ҽ� ����
                $streamReader.Close()
                $errorStream.Close()
            }
        } catch {
            Write-Error "��� ��� �� ����ġ ���� ������ �߻��߽��ϴ�: $_"
        }

    } catch {
        Write-Error "�ý��� ���� ���� �� ������ �߻��߽��ϴ�: $_"
        Write-Host "���� ��: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ��ũ��Ʈ ����
Get-SystemInfo

# �� �ý��� ���� ���
try {
    Write-Host "`n=== �ý��� ���� ===" -ForegroundColor Yellow

    # �⺻ �ý��� ���� ����
    $computerSystem = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
    $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $processor = Get-CimInstance Win32_Processor -ErrorAction Stop

    Write-SystemInfo "������" $computerSystem.Manufacturer
    Write-SystemInfo "��" $computerSystem.Model
    Write-SystemInfo "�ø����ȣ" $bios.SerialNumber
    Write-SystemInfo "�ü��" $os.Caption
    Write-SystemInfo "OS ����" $os.Version
    Write-SystemInfo "���μ���" $processor.Name
    Write-SystemInfo "���μ��� �ھ� ��" "$($processor.NumberOfCores) �ھ�"
    Write-SystemInfo "���μ��� ������ ��" "$($processor.NumberOfLogicalProcessors) ������"

    # �޸� ���� (GB ������ ��ȯ)
    $totalMemoryGB = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)
    Write-SystemInfo "��ü �޸�" "$totalMemoryGB GB"

    Write-Host "`n=== ��Ʈ��ũ ����� ���� ===" -ForegroundColor Yellow

    # ��Ʈ��ũ ����� ���� ����
    $adapters = Get-CimInstance Win32_NetworkAdapter | 
        Where-Object { $_.PhysicalAdapter -eq $true -and $_.MACAddress -ne $null }

    if ($adapters) {
        foreach ($adapter in $adapters) {
            Write-Host "`n��Ʈ��ũ ����� #$($adapter.DeviceID)" -ForegroundColor Green
            Write-SystemInfo "����� �̸�" $adapter.Name
            Write-SystemInfo "��Ʈ��ũ ����" $(if ($adapter.NetEnabled) { "Ȱ��ȭ" } else { "��Ȱ��ȭ" })
            Write-SystemInfo "MAC �ּ�" $adapter.MACAddress
            
            # �ش� ������� IP ���� ����
            $config = Get-CimInstance Win32_NetworkAdapterConfiguration | 
                Where-Object { $_.Index -eq $adapter.DeviceID }
            
            if ($config.IPAddress) {
                Write-SystemInfo "IP �ּ�" $($config.IPAddress[0])
                Write-SystemInfo "����� ����ũ" $($config.IPSubnet[0])
                Write-SystemInfo "�⺻ ����Ʈ����" $($config.DefaultIPGateway[0])
            }
        }
    } else {
        Write-Error "��Ʈ��ũ ����͸� ã�� �� �����ϴ�."
    }

    Write-Host "`n=== ��ũ ���� ===" -ForegroundColor Yellow

    # ��ũ ���� ����
    $disks = Get-CimInstance Win32_DiskDrive

    if ($disks) {
        foreach ($disk in $disks) {
            $sizeGB = [math]::Round($disk.Size / 1GB, 2)
            Write-Host "`n��ũ: $($disk.DeviceID)" -ForegroundColor Green
            Write-SystemInfo "��" $disk.Model
            Write-SystemInfo "ũ��" "$sizeGB GB"
            Write-SystemInfo "�������̽�Ÿ��" $disk.InterfaceType
            Write-SystemInfo "�ø����ȣ" $disk.SerialNumber
        }
    } else {
        Write-Error "��ũ ������ ã�� �� �����ϴ�."
    }

    # �׷��� ī�� ����
    Write-Host "`n=== �׷��� ī�� ���� ===" -ForegroundColor Yellow
    $gpus = Get-CimInstance Win32_VideoController

    if ($gpus) {
        foreach ($gpu in $gpus) {
            Write-Host "`n�׷��� ī��" -ForegroundColor Green
            Write-SystemInfo "��" $gpu.Name
            Write-SystemInfo "�޸�" "$([math]::Round($gpu.AdapterRAM / 1GB, 2)) GB"
            Write-SystemInfo "����̹� ����" $gpu.DriverVersion
        }
    } else {
        Write-Error "�׷��� ī�� ������ ã�� �� �����ϴ�."
    }

} catch {
    Write-Error "�ý��� ������ �����ϴ� �� ������ �߻��߽��ϴ�: $_"
    Write-Host "���� ��: $($_.Exception.Message)" -ForegroundColor Red
}

# ��ũ��Ʈ ����
Write-Host "`n�ý��� ���� ������ �Ϸ�Ǿ����ϴ�." -ForegroundColor Green
Write-Host "`nâ�� �������� Enter Ű�� ��������..." -ForegroundColor Yellow
$null = Read-Host

# ��ǻ�� �����
Restart-Computer -Force