#!/usr/bin/env python3
"""
API Key Generator for BSSM MCP Server
MCP 서버용 API 키 생성 도구
"""
import secrets
import hashlib
import json
from datetime import datetime

def generate_api_key():
    """강력한 API 키 생성 (64자)"""
    return secrets.token_urlsafe(48)

def hash_api_key(api_key):
    """API 키 해시 (저장용)"""
    return hashlib.sha256(api_key.encode()).hexdigest()

def main():
    print("=" * 60)
    print("BSSM MCP Server - API Key Generator")
    print("=" * 60)
    print()
    
    # API 키 생성
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)
    
    print("✓ 새로운 API 키가 생성되었습니다:")
    print()
    print(f"API Key: {api_key}")
    print()
    print("⚠️  이 키를 안전한 곳에 보관하세요! 다시 표시되지 않습니다.")
    print()
    
    # .env 파일 업데이트 안내
    print("=" * 60)
    print(".env 파일에 다음 내용을 추가하세요:")
    print("=" * 60)
    print()
    print(f"MCP_API_KEY={api_key}")
    print()
    
    # API 키 정보 저장
    key_info = {
        "generated_at": datetime.now().isoformat(),
        "key_hash": api_key_hash,
        "key_prefix": api_key[:10] + "...",
    }
    
    with open(".api_keys.json", "w") as f:
        json.dump({"keys": [key_info]}, f, indent=2)
    
    print("=" * 60)
    print("클라이언트에서 사용 방법:")
    print("=" * 60)
    print()
    print("HTTP 헤더에 추가:")
    print(f"X-API-Key: {api_key}")
    print()
    print("또는 쿼리 파라미터:")
    print(f"?api_key={api_key}")
    print()
    print("✓ API 키 정보가 .api_keys.json에 저장되었습니다.")
    print()

if __name__ == "__main__":
    main()
