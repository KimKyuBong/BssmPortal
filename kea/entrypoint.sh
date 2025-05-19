#!/bin/bash

# 템플릿에서 실제 설정 파일 생성
envsubst < /etc/kea/kea-dhcp4.conf.template > /etc/kea/kea-dhcp4.conf

# 설정 파일 권한 설정
chmod 644 /etc/kea/kea-dhcp4.conf

# KEA DHCP 서버 실행
exec kea-dhcp4 -d -c /etc/kea/kea-dhcp4.conf 