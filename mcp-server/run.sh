#!/bin/bash
# MCP Server 실행 스크립트

cd "$(dirname "$0")"

# 가상 환경 활성화 및 서버 실행
.venv/bin/python server.py
