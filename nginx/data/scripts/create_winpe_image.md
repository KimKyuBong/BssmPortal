# WinPE 이미지 생성 및 자동 실행 설정 가이드

## 1. WinPE 이미지 생성

### 1.1 Windows ADK 설치
```powershell
# Windows ADK 다운로드 및 설치
# https://docs.microsoft.com/en-us/windows-hardware/get-started/adk-install
```

### 1.2 WinPE 이미지 생성
```powershell
# WinPE 이미지 생성
copype amd64 C:\WinPE

# WinPE 이미지 마운트
dism /mount-wim /wimfile:C:\WinPE\media\sources\boot.wim /index:1 /mountdir:C:\WinPE\mount

# 스크립트 파일 복사
copy "startnet.cmd" "C:\WinPE\mount\Windows\System32\"
copy "startup.cmd" "C:\WinPE\mount\"

# WinPE 이미지 언마운트 및 커밋
dism /unmount-wim /mountdir:C:\WinPE\mount /commit
```

## 2. 자동 실행 설정 방법

### 2.1 startnet.cmd 방법 (권장)
- `startnet.cmd` 파일을 WinPE 이미지의 `Windows\System32\` 폴더에 복사
- WinPE 부팅 시 자동으로 실행됨

### 2.2 unattend.xml 방법
- `unattend.xml` 파일에 FirstLogonCommands 섹션 추가
- Windows 설치 완료 후 자동 실행

### 2.3 레지스트리 방법
```cmd
# 레지스트리에 자동 실행 등록
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "AutoInstall" /t REG_SZ /d "X:\auto_install.bat" /f
```

## 3. 파일 구조

```
WinPE 이미지/
├── Windows\System32\
│   └── startnet.cmd          # 네트워크 초기화 후 실행
├── startup.cmd               # 메인 시작 스크립트
└── auto_install.bat          # 실제 설치 스크립트
```

## 4. 네트워크 부팅 설정

### 4.1 PXE 서버 설정
```bash
# boot.wim 파일을 PXE 서버에 업로드
cp C:\WinPE\media\sources\boot.wim /var/lib/tftpboot/winpe/
```

### 4.2 iPXE 설정
```ipxe
# boot.ipxe 파일에 WinPE 부팅 옵션 추가
:winpe
kernel http://${gateway}:8080/wimboot gui
initrd -n bootx64.efi http://${gateway}:8080/winpe/efi/boot/bootx64.efi bootx64.efi
initrd -n bcd http://${gateway}:8080/winpe/boot/bcd bcd
initrd -n boot.sdi http://${gateway}:8080/winpe/boot/boot.sdi boot.sdi
initrd -n boot.wim http://${gateway}:8080/winpe/sources/boot.wim boot.wim
imgargs wimboot gui
boot
```

## 5. 테스트 방법

### 5.1 USB 부팅 테스트
```cmd
# WinPE USB 생성
makewinpemedia /ufd C:\WinPE F:

# USB로 부팅하여 자동 실행 확인
```

### 5.2 네트워크 부팅 테스트
```cmd
# PXE 부팅으로 자동 실행 확인
# 컴퓨터를 PXE 부팅으로 설정하고 네트워크 부팅 선택
```

## 6. 문제 해결

### 6.1 스크립트가 실행되지 않는 경우
- WinPE 이미지에 스크립트 파일이 포함되었는지 확인
- 파일 경로가 올바른지 확인
- 네트워크 연결 상태 확인

### 6.2 네트워크 다운로드 실패
- HTTP 서버 상태 확인
- 방화벽 설정 확인
- DNS 설정 확인

### 6.3 USB 인식 실패
- USB 드라이브 포맷 확인 (FAT32 권장)
- USB 부팅 우선순위 확인
- UEFI/BIOS 설정 확인 