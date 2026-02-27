#!/bin/bash
# 캡티브 포털 감지 엔드포인트 검증 스크립트
# 사용법: ./verify-captive-endpoints.sh [BASE_URL]
# 예: ./verify-captive-endpoints.sh http://localhost
# 예: ./verify-captive-endpoints.sh http://10.250.0.1

BASE_URL="${1:-http://localhost}"

echo "=== BSSM 캡티브 포털 엔드포인트 검증 ==="
echo "대상: $BASE_URL"
echo ""

endpoints=(
  "/redirect:범용"
  "/generate_204:Android/Chrome"
  "/hotspot-detect.html:iOS/macOS"
  "/connecttest.txt:Windows 10+"
  "/ncsi.txt:Windows 8 이하"
  "/nm:Linux/NetworkManager"
  "/canonical.html:Firefox"
  "/static/hotspot.txt:Fedora"
)

all_ok=true
for item in "${endpoints[@]}"; do
  path="${item%%:*}"
  name="${item##*:}"
  result=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" 2>/dev/null)
  redirect=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE_URL$path" 2>/dev/null)
  
  if [[ "$result" == "302" ]] && [[ "$redirect" == *"/" ]]; then
    printf "  ✓ %-25s (%s)\n" "$path" "$name"
  else
    printf "  ✗ %-25s (%s) - HTTP %s\n" "$path" "$name" "$result"
    all_ok=false
  fi
done

echo ""
if $all_ok; then
  echo "모든 엔드포인트가 정상적으로 302 리디렉트합니다."
  exit 0
else
  echo "일부 엔드포인트 검증 실패. nginx 설정 및 서버 상태를 확인하세요."
  exit 1
fi
