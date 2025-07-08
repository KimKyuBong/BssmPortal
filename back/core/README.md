# 중앙화된 권한 관리 시스템

## 개요

기존의 분산된 권한 관리에서 중앙화된 권한 관리 시스템으로 개선했습니다. 이 시스템은 권한 매트릭스를 기반으로 하여 일관성 있고 관리하기 쉬운 권한 제어를 제공합니다.

## 주요 개선사항

### 1. 중앙화된 권한 정의
- 모든 권한이 `core/permissions.py`의 `PermissionMatrix`에 정의됨
- 앱별, 모델별, 액션별 권한을 한 곳에서 관리
- 권한 변경 시 한 곳만 수정하면 됨

### 2. 역할 기반 접근 제어 (RBAC)
- 4단계 권한 레벨: `any` < `authenticated` < `teacher` < `admin`
- 사용자 역할에 따른 자동 권한 부여
- 복잡한 권한 로직을 단순화

### 3. 일관된 권한 적용
- 모든 ViewSet에서 동일한 권한 클래스 사용
- 액션별 권한 데코레이터 제거
- `get_permissions` 메서드 불필요

## 권한 레벨

| 레벨 | 설명 | 사용자 유형 |
|------|------|-------------|
| `any` | 누구나 접근 가능 | 인증 불필요 |
| `authenticated` | 인증된 사용자만 | 로그인한 모든 사용자 |
| `teacher` | 교사 이상 | `is_staff=True` 또는 `is_superuser=True` |
| `admin` | 관리자만 | `is_superuser=True` |

## 사용법

### 1. ViewSet에서 권한 적용

```python
from core.permissions import EquipmentPermissions

class EquipmentViewSet(viewsets.ModelViewSet):
    permission_classes = [EquipmentPermissions]
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        # 권한은 자동으로 처리됨
        pass
```

### 2. 권한 매트릭스 확인

```python
from core.permissions import PermissionMatrix

# 특정 액션의 권한 확인
permissions = PermissionMatrix.get_required_permissions(
    'rentals', 'equipment', 'available'
)
print(permissions)  # ['authenticated']
```

### 3. 권한 클래스 종류

- `EquipmentPermissions`: 장비 관리
- `RentalPermissions`: 대여 관리
- `RentalRequestPermissions`: 대여 요청 관리
- `DevicePermissions`: 장치 관리
- `UserPermissions`: 사용자 관리
- `SystemPermissions`: 시스템 관리
- `BroadcastPermissions`: 방송 관리
- `DnsPermissions`: DNS 관리
- `ApiSecurityPermissions`: API 보안 관리

## 권한 매트릭스 구조

```python
PERMISSIONS = {
    'app_name': {
        'model_name': {
            'action': ['required_permission_level']
        }
    }
}
```

### 예시: 장비 관리 권한

```python
'rentals': {
    'equipment': {
        'list': ['admin'],           # 목록 조회: 관리자만
        'create': ['admin'],         # 생성: 관리자만
        'retrieve': ['authenticated'], # 상세 조회: 인증된 사용자
        'update': ['admin'],         # 수정: 관리자만
        'destroy': ['admin'],        # 삭제: 관리자만
        'available': ['authenticated'], # 사용 가능 목록: 인증된 사용자
        'export_excel': ['admin'],   # 엑셀 내보내기: 관리자만
        'register': ['any'],         # 등록: 누구나
    }
}
```

## 마이그레이션 가이드

### 기존 코드에서 변경사항

1. **Import 변경**
```python
# 기존
from users.views import IsSuperUser
from rest_framework.permissions import IsAuthenticated

# 변경 후
from core.permissions import EquipmentPermissions
```

2. **ViewSet 권한 설정**
```python
# 기존
permission_classes = [IsSuperUser]

# 변경 후
permission_classes = [EquipmentPermissions]
```

3. **액션별 권한 데코레이터 제거**
```python
# 기존
@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
def available(self, request):
    pass

# 변경 후
@action(detail=False, methods=['get'])
def available(self, request):
    pass
```

4. **get_permissions 메서드 제거**
```python
# 기존 - 제거
def get_permissions(self):
    if self.action == 'available':
        return [IsAuthenticated()]
    return [IsSuperUser()]

# 변경 후 - 불필요
```

## 장점

1. **관리 용이성**: 권한 변경 시 한 곳만 수정
2. **일관성**: 모든 앱에서 동일한 권한 체계 적용
3. **가독성**: 권한 매트릭스로 전체 권한 구조 파악 가능
4. **확장성**: 새로운 앱/모델 추가 시 쉽게 권한 정의
5. **유지보수성**: 권한 로직 중앙화로 버그 발생 가능성 감소

## 주의사항

1. 새로운 앱이나 액션 추가 시 `PermissionMatrix`에 권한 정의 필요
2. 권한 레벨 변경 시 영향받는 모든 기능 검토 필요
3. 테스트 시 권한 매트릭스 기반으로 테스트 케이스 작성 권장 