# 캡티브 포털 감지 엔드포인트

각 OS의 connectivity check 요청이 이 서버로 들어올 때, 메인(/) 페이지로 리디렉트하여 자연스러운 캡티브 포털 로그인 플로우를 제공합니다.

## 등록된 엔드포인트

| OS/플랫폼 | 원본 URL | nginx location | 리디렉트 대상 |
|-----------|----------|----------------|----------------|
| **범용** | - | `/redirect` | `/` |
| **Android/Chrome** | connectivitycheck.gstatic.com/generate_204 | `/generate_204` | `/` |
| **Android** | connectivitycheck.android.com/generate_204 | `/generate_204` | `/` |
| **iOS/macOS** | captive.apple.com/hotspot-detect.html | `/hotspot-detect.html` | `/` |
| **Windows 10+** | www.msftconnecttest.com/connecttest.txt | `/connecttest.txt` | `/` |
| **Windows 8 이하** | www.msftncsi.com/ncsi.txt | `/ncsi.txt` | `/` |
| **Linux/NetworkManager** | connectivity-check.ubuntu.com/nm 등 | `/nm` | `/` |
| **Firefox** | detectportal.firefox.com/canonical.html | `/canonical.html` | `/` |
| **Fedora** | fedoraproject.org/static/hotspot.txt | `/static/hotspot.txt` | `/` |

## 로컬에서 엔드포인트 검증

캡티브 포털 서버가 실행 중일 때, 다음 curl 명령으로 각 엔드포인트가 올바르게 리디렉트하는지 확인할 수 있습니다:

```bash
# 캡티브 포털 서버 주소 (Docker/실서버 IP로 변경)
BASE_URL="http://localhost"  # 또는 http://10.250.0.1

echo "=== 캡티브 포털 엔드포인트 검증 ==="

# 범용 리디렉트
echo -n "/redirect: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/redirect"

# Android/Chrome
echo -n "/generate_204: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/generate_204"

# iOS/macOS
echo -n "/hotspot-detect.html: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/hotspot-detect.html"

# Windows 10+
echo -n "/connecttest.txt: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/connecttest.txt"

# Windows 8 이하
echo -n "/ncsi.txt: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/ncsi.txt"

# Linux/NetworkManager
echo -n "/nm: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/nm"

# Firefox
echo -n "/canonical.html: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/canonical.html"

# Fedora
echo -n "/static/hotspot.txt: "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -L "$BASE_URL/static/hotspot.txt"

echo ""
echo "모든 엔드포인트에서 302 -> / 이어야 정상입니다."
```

## 동작 흐름

1. 사용자가 WiFi에 연결 → DNS가 모든 도메인을 캡티브 포털 IP(10.250.0.1)로 리졸브
2. OS가 자동으로 connectivity check URL 요청 (예: generate_204, hotspot-detect.html 등)
3. nginx가 해당 요청을 받아 **302 리디렉트**로 메인(/) 페이지로 보냄
4. 메인(/) 페이지 로드 → 프론트엔드에서 미인증 시 `/login`으로 클라이언트 리디렉트
5. 사용자가 로그인 화면을 보고 인증 진행

## 변경 사항 (2025)

- 리디렉트 대상: `/login` → `/` (메인으로 변경, 자연스러운 앱 진입점 경유)
- `/redirect` 범용 엔드포인트 추가
- Windows 8 ncsi.txt, Firefox canonical.html, Fedora hotspot.txt 엔드포인트 추가
- `$scheme` 사용으로 HTTP/HTTPS 환경 모두 지원
