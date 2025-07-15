# PXE 자동 Windows 설치 시스템 가이드

## 개요

이 시스템은 PXE 부팅을 통해 컴퓨터를 자동으로 백엔드에 등록하고, Windows 이미지를 자동으로 설치하는 시스템입니다.

## 시스템 구성

### 1. 부팅 메뉴 옵션
- **Exit to Normal Boot**: 일반 부팅
- **Boot WinPE**: 수동 WinPE 부팅
- **Auto Install Windows**: 자동 Windows 설치 (새로 추가)
- **Boot Ubuntu**: Ubuntu 부팅
- **Reboot**: 재부팅

### 2. 자동 설치 프로세스

#### 2.1 시스템 정보 수집
- 컴퓨터 제조사, 모델명, 시리얼번호
- MAC 주소 (이더넷, WiFi)
- 프로세서, 메모리 정보
- 운영체제 정보

#### 2.2 백엔드 등록
- 수집된 정보를 백엔드(10.250.0.1)로 전송
- 장비를 '유지보수' 상태로 등록
- API 엔드포인트: `/api/rentals/equipment/register_maintenance/`

#### 2.3 디스크 초기화
- diskpart 스크립트 실행
- GPT 파티션 테이블 생성
- EFI 시스템 파티션 (100MB)
- Microsoft Reserved 파티션 (16MB)
- Windows 파티션 (나머지 공간)

#### 2.4 Windows 이미지 설치
- WIM 파일 다운로드: `http://10.250.1.1:8080/images/bssm.wim`
- DISM을 통한 이미지 적용
- 부트로더 복구

## 사용 방법

### 1. PXE 부팅
1. 컴퓨터를 PXE 부팅으로 설정
2. 네트워크 부팅 선택
3. 부팅 메뉴에서 **Auto Install Windows** 선택
4. 5초 대기 후 자동 설치 시작

### 2. 설치 과정 모니터링
- 설치 과정은 콘솔에 실시간으로 표시
- 로그 파일: `X:\auto-install.log`
- 오류 발생 시 30초 대기 후 재부팅

### 3. 설치 완료
- 설치 완료 후 자동 재부팅
- Windows 정상 부팅 확인

## 파일 구조

```
nginx/data/
├── boot.ipxe                    # 부팅 메뉴 (수정됨)
├── scripts/
│   ├── auto-install.ps1        # 자동 설치 PowerShell 스크립트
│   ├── diskpart.txt            # 디스크 초기화 스크립트
│   └── startup.cmd             # WinPE 시작 스크립트
└── images/
    └── bssm.wim                # Windows 이미지 파일 (사용자가 추가)
```

## 백엔드 API

### 장비 등록 API (자동 설치용)
- **URL**: `POST /api/rentals/equipment/register_maintenance/`
- **기능**: 장비를 유지보수 상태로 등록
- **인증**: 불필요 (PXE 부팅 시 자동 등록)

### 요청 예시
```json
{
    "mac_addresses": [
        {
            "mac_address": "00:11:22:33:44:55",
            "interface_type": "ETHERNET"
        }
    ],
    "name": "자동 설치 컴퓨터",
    "manufacturer": "Dell Inc.",
    "model_name": "Latitude 5520",
    "equipment_type": "LAPTOP",
    "serial_number": "ABC123456",
    "description": "자동 설치된 컴퓨터",
    "status": "MAINTENANCE",
    "acquisition_date": "2024-01-01"
}
```

## 설정 및 커스터마이징

### 1. Windows 이미지 준비
1. `bssm.wim` 파일을 `nginx/data/images/` 디렉토리에 배치
2. 이미지 크기 확인 (네트워크 전송 시간 고려)

### 2. 네트워크 설정
- 백엔드 서버: `10.250.0.1`
- PXE 서버: `10.250.1.1:8080`
- 네트워크 연결 확인 필요

### 3. 디스크 파티션 설정
- `nginx/data/scripts/diskpart.txt` 파일 수정
- 파티션 크기 및 레이아웃 조정 가능

## 문제 해결

### 1. 네트워크 연결 실패
- 백엔드 서버(10.250.0.1) 연결 확인
- DHCP 설정 확인
- 방화벽 설정 확인

### 2. 이미지 다운로드 실패
- WIM 파일 존재 확인
- HTTP 서버 상태 확인
- 네트워크 대역폭 확인

### 3. 디스크 초기화 실패
- 디스크 상태 확인
- diskpart 스크립트 수정
- 하드웨어 호환성 확인

### 4. 부트로더 복구 실패
- UEFI/BIOS 설정 확인
- 파티션 레이아웃 확인
- 수동 부트로더 복구 시도

## 로그 확인

### 1. 실시간 로그
- WinPE 콘솔에서 실시간 확인
- 설치 과정 진행 상황 표시

### 2. 로그 파일
- 위치: `X:\auto-install.log`
- 설치 완료 후 확인 가능
- 오류 발생 시 상세 정보 포함

## 보안 고려사항

1. **네트워크 보안**: PXE 부팅은 네트워크를 통해 이루어지므로 보안 설정 필요
2. **이미지 무결성**: WIM 파일의 무결성 검증 권장
3. **접근 제어**: 자동 설치 기능은 신뢰할 수 있는 네트워크에서만 사용

## 향후 개선 사항

1. **다중 이미지 지원**: 여러 Windows 버전 지원
2. **드라이버 자동 설치**: 하드웨어별 드라이버 자동 설치
3. **설치 후 스크립트**: Windows 설치 후 추가 설정 자동화
4. **진행률 표시**: 설치 진행률을 백엔드로 전송
5. **원격 모니터링**: 웹 인터페이스를 통한 설치 과정 모니터링 