# Docker Compose 메모
# 
# MCP 서버를 docker-compose.yaml에 추가하려면 다음을 참고하세요:
#
# services:
#   mcp-server:
#     build:
#       context: ./mcp-server
#       dockerfile: Dockerfile
#     container_name: bssm-mcp-server
#     restart: unless-stopped
#     environment:
#       - DJANGO_API_URL=http://back:8000
#       - DJANGO_API_TIMEOUT=30
#       - MCP_SERVER_NAME=bssm-captive-mcp
#       - MCP_SERVER_VERSION=2.0.0
#     networks:
#       - bssm-network
#     depends_on:
#       - back
#     # MCP 서버는 stdio 통신을 사용하므로 포트 노출 불필요
#     # Claude Desktop이나 다른 MCP 클라이언트와의 연동은
#     # docker exec를 통해 수행됩니다
#     stdin_open: true
#     tty: true
#
# Claude Desktop 설정:
# {
#   "mcpServers": {
#     "bssm-captive": {
#       "command": "docker",
#       "args": [
#         "exec",
#         "-i",
#         "bssm-mcp-server",
#         ".venv/bin/python",
#         "server.py"
#       ]
#     }
#   }
# }
