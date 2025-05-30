#!/bin/bash

# 컴퓨터 등록 스크립트
# 버전: 1.0
# 최종 업데이트: 2024-03-21

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 스크립트 경로 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DATA_DIR="$SCRIPT_DIR/data"

# 로그 파일 설정
LOG_FILE="$SCRIPT_DIR/logs/computer_registration_$(date +%Y%m%d_%H%M%S).log"

# API 설정
API_URL="http://10.129.55.253/api/rentals/equipment/register/"

# 로그 디렉토리 생성
mkdir -p "$SCRIPT_DIR/logs"

# 로그 함수
log() {
    echo -e "$1"
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# 에러 처리 함수
handle_error() {
    log "${RED}오류 발생: $1${NC}"
    exit 1
}

# API 요청 함수
send_to_server() {
    local json_data="$1"
    
    log "${CYAN}서버로 데이터 전송 중...${NC}"
    
    # curl을 사용하여 POST 요청 전송
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json; charset=utf-8" \
        -d "$json_data" \
        "$API_URL")
    
    # HTTP 상태 코드 추출
    http_code=$(echo "$response" | tail -n1)
    # 응답 본문 추출
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        log "${GREEN}서버 전송 성공${NC}"
        log "응답: $body"
        return 0
    else
        log "${RED}서버 전송 실패 (HTTP $http_code)${NC}"
        log "응답: $body"
        return 1
    fi
}

# 컴퓨터 정보 수집 함수
collect_computer_info() {
    log "${CYAN}컴퓨터 정보 수집 중...${NC}"
    
    # Mac 모델 정보
    MODEL=$(sysctl hw.model | awk '{print $2}')
    
    # 시리얼 번호
    SERIAL=$(ioreg -l | grep IOPlatformSerialNumber | awk -F'"' '{print $4}')
    
    # OS 버전
    OS_VERSION=$(sw_vers -productVersion)
    
    # 호스트명
    HOSTNAME=$(scutil --get ComputerName)
    
    # 사용자 정보
    USERNAME=$(whoami)
    FULL_NAME=$(id -F)
    
    # 네트워크 정보
    IP_ADDRESS=$(ipconfig getifaddr en0)
    MAC_ADDRESS=$(ifconfig en0 | grep ether | awk '{print $2}')
    
    # 하드웨어 정보
    CPU_INFO=$(sysctl -n machdep.cpu.brand_string)
    MEMORY_SIZE=$(sysctl hw.memsize | awk '{print $2/1024/1024/1024 " GB"}')
    DISK_SIZE=$(df -h / | awk 'NR==2 {print $2}')
    
    # 정보 출력
    log "${GREEN}수집된 정보:${NC}"
    log "모델: $MODEL"
    log "시리얼 번호: $SERIAL"
    log "OS 버전: $OS_VERSION"
    log "호스트명: $HOSTNAME"
    log "사용자: $USERNAME ($FULL_NAME)"
    log "IP 주소: $IP_ADDRESS"
    log "MAC 주소: $MAC_ADDRESS"
    log "CPU: $CPU_INFO"
    log "메모리: $MEMORY_SIZE"
    log "디스크: $DISK_SIZE"
    
    # 현재 날짜
    CURRENT_DATE=$(date '+%Y-%m-%d')
    
    # 시스템 설명 생성 (줄바꿈을 공백으로 대체)
    DESCRIPTION="[시스템 정보] 제조사: Apple 모델: $MODEL 시리얼번호: $SERIAL 운영체제: macOS $OS_VERSION 프로세서: $CPU_INFO 메모리: $MEMORY_SIZE 디스크: $DISK_SIZE [네트워크 정보] 이름: en0 MAC: $MAC_ADDRESS (ETHERNET) IP: $IP_ADDRESS"
    
    # JSON 데이터 생성 (한 줄로)
    json_data="{\"mac_addresses\":[{\"mac_address\":\"$MAC_ADDRESS\",\"interface_type\":\"ETHERNET\",\"equipment\":null}],\"name\":\"노트북 컴퓨터\",\"manufacturer\":\"Apple\",\"model_name\":\"$MODEL\",\"equipment_type\":\"LAPTOP\",\"serial_number\":\"$SERIAL\",\"description\":\"$DESCRIPTION\",\"status\":\"RENTED\",\"acquisition_date\":\"$CURRENT_DATE\"}"
    
    # 서버로 데이터 전송
    if send_to_server "$json_data"; then
        # CSV 파일에 저장 (백업용)
        CSV_FILE="$DATA_DIR/computer_info.csv"
        echo "날짜,모델,시리얼번호,OS버전,호스트명,사용자,IP주소,MAC주소,CPU,메모리,디스크" > "$CSV_FILE"
        echo "$(date '+%Y-%m-%d %H:%M:%S'),$MODEL,$SERIAL,$OS_VERSION,$HOSTNAME,$USERNAME,$IP_ADDRESS,$MAC_ADDRESS,$CPU_INFO,$MEMORY_SIZE,$DISK_SIZE" >> "$CSV_FILE"
        
        log "${GREEN}컴퓨터 정보가 성공적으로 저장되었습니다: $CSV_FILE${NC}"
    else
        handle_error "서버 전송 실패"
    fi
}

# 메인 함수
main() {
    log "${CYAN}컴퓨터 등록을 시작합니다...${NC}"
    
    # 데이터 디렉토리 확인
    if [ ! -d "$DATA_DIR" ]; then
        mkdir -p "$DATA_DIR"
        log "${YELLOW}데이터 디렉토리가 생성되었습니다: $DATA_DIR${NC}"
    fi
    
    # 컴퓨터 정보 수집
    collect_computer_info
    
    log "${GREEN}컴퓨터 등록이 완료되었습니다.${NC}"
}

# 스크립트 실행
main 