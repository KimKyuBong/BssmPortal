# 스타일 컴포넌트 사용 가이드

이 프로젝트에서는 재사용 가능한 스타일 컴포넌트를 사용하여 일관된 UI를 제공합니다.

## 사용 가능한 컴포넌트

### 1. Card (카드)
기본 카드 컨테이너입니다.

```tsx
import { Card } from '@/components/ui/StyledComponents';

// 기본 카드
<Card>
  <p>카드 내용</p>
</Card>

// 호버 효과가 있는 카드
<Card variant="hover">
  <p>호버 가능한 카드</p>
</Card>

// 컴팩트한 카드
<Card variant="compact">
  <p>작은 패딩의 카드</p>
</Card>
```

### 2. CardLink (카드 링크)
링크로 사용되는 카드입니다.

```tsx
import { CardLink } from '@/components/ui/StyledComponents';

<CardLink href="/dashboard">
  <div>
    <h3>대시보드</h3>
    <p>홈 화면으로 이동</p>
  </div>
</CardLink>
```

### 3. Heading (제목)
다양한 크기의 제목을 제공합니다.

```tsx
import { Heading } from '@/components/ui/StyledComponents';

<Heading level={1}>큰 제목</Heading>
<Heading level={2}>중간 제목</Heading>
<Heading level={3}>작은 제목</Heading>
<Heading level={4}>가장 작은 제목</Heading>
```

### 4. Text (텍스트)
기본 텍스트 컴포넌트입니다.

```tsx
import { Text } from '@/components/ui/StyledComponents';

<Text>일반 텍스트</Text>
<Text className="text-sm text-gray-500">작은 회색 텍스트</Text>
```

### 5. Input (입력 필드)
라벨과 에러 처리가 포함된 입력 필드입니다.

```tsx
import { Input } from '@/components/ui/StyledComponents';

<Input
  label="사용자 이름"
  placeholder="이름을 입력하세요"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>

<Input
  label="이메일"
  type="email"
  error="올바른 이메일을 입력해주세요"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### 6. Textarea (텍스트 영역)
여러 줄 텍스트 입력 필드입니다.

```tsx
import { Textarea } from '@/components/ui/StyledComponents';

<Textarea
  label="설명"
  placeholder="설명을 입력하세요"
  rows={4}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

### 7. Select (선택 필드)
드롭다운 선택 필드입니다.

```tsx
import { Select } from '@/components/ui/StyledComponents';

<Select
  label="카테고리"
  options={[
    { value: 'tech', label: '기술' },
    { value: 'design', label: '디자인' }
  ]}
  value={category}
  onChange={(e) => setCategory(e.target.value)}
/>
```

### 8. Button (버튼)
다양한 스타일의 버튼입니다.

```tsx
import { Button } from '@/components/ui/StyledComponents';

// 기본 버튼 (primary)
<Button>저장</Button>

// 다른 스타일
<Button variant="secondary">취소</Button>
<Button variant="danger">삭제</Button>
<Button variant="success">확인</Button>
<Button variant="warning">경고</Button>

// 크기 조절
<Button size="sm">작은 버튼</Button>
<Button size="md">중간 버튼</Button>
<Button size="lg">큰 버튼</Button>
```

### 9. Badge (배지)
상태나 카테고리를 표시하는 배지입니다.

```tsx
import { Badge } from '@/components/ui/StyledComponents';

<Badge>기본</Badge>
<Badge variant="success">성공</Badge>
<Badge variant="warning">경고</Badge>
<Badge variant="danger">위험</Badge>
<Badge variant="info">정보</Badge>
```

### 10. Divider (구분선)
수평 또는 수직 구분선입니다.

```tsx
import { Divider } from '@/components/ui/StyledComponents';

<Divider /> {/* 수평 구분선 */}
<Divider orientation="vertical" /> {/* 수직 구분선 */}
```

### 11. Spinner (로딩 스피너)
로딩 상태를 표시하는 스피너입니다.

```tsx
import { Spinner } from '@/components/ui/StyledComponents';

<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
```

### 12. Modal (모달)
모달 다이얼로그입니다.

```tsx
import { Modal } from '@/components/ui/StyledComponents';

<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  size="md"
>
  <h2>모달 제목</h2>
  <p>모달 내용</p>
</Modal>
```

## 사용 예시

### 대시보드 카드
```tsx
import { CardLink, Heading, Text } from '@/components/ui/StyledComponents';

<CardLink href="/dashboard/user">
  <User className="icon-large text-indigo-500 mr-4" />
  <div>
    <Heading level={3}>내 정보</Heading>
    <Text className="text-sm text-gray-500 dark:text-gray-400">
      사용자 정보 관리
    </Text>
  </div>
</CardLink>
```

### 폼 컴포넌트
```tsx
import { Card, Heading, Input, Button } from '@/components/ui/StyledComponents';

<Card>
  <Heading level={2}>사용자 등록</Heading>
  <form className="space-y-4">
    <Input
      label="사용자 이름"
      placeholder="이름을 입력하세요"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
    />
    <Input
      label="이메일"
      type="email"
      placeholder="이메일을 입력하세요"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
    <Button type="submit">등록</Button>
  </form>
</Card>
```

## 장점

1. **일관성**: 모든 컴포넌트가 동일한 디자인 시스템을 따릅니다.
2. **재사용성**: 한 번 정의된 스타일을 여러 곳에서 사용할 수 있습니다.
3. **유지보수성**: 스타일 변경 시 한 곳에서만 수정하면 됩니다.
4. **다크모드 지원**: 모든 컴포넌트가 다크모드를 자동으로 지원합니다.
5. **접근성**: 기본적인 접근성 기능이 포함되어 있습니다.

## 주의사항

- 모든 컴포넌트는 `className` prop을 통해 추가 스타일을 적용할 수 있습니다.
- 다크모드 스타일은 자동으로 적용되므로 별도로 지정할 필요가 없습니다.
- 컴포넌트의 기본 스타일을 오버라이드하려면 `className`을 사용하세요.

# SelectableTable 컴포넌트

다중 선택 기능이 있는 재사용 가능한 테이블 컴포넌트입니다.

## 기능

- **다중 선택**: Ctrl/⌘ + 클릭으로 개별 선택/해제 토글
- **범위 선택**: Shift + 클릭으로 마지막 선택한 항목과 현재 항목 사이의 모든 항목 선택
- **단일 선택**: 일반 클릭으로 단일 항목 선택
- **행 하이라이트**: 선택된 행은 시각적으로 구분됨
- **타입 안전성**: TypeScript 제네릭을 사용한 타입 안전성 보장

## 사용법

### 기본 사용법

```tsx
import SelectableTable from '@/components/ui/SelectableTable';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  return (
    <SelectableTable
      data={users}
      selectedItems={selectedUsers}
      onSelectionChange={setSelectedUsers}
      headers={[
        { key: 'username', label: '아이디' },
        { key: 'name', label: '이름' },
        { key: 'email', label: '이메일' },
        { key: 'actions', label: '작업' }
      ]}
      getItemId={(item) => item.id}
      renderRow={(user, isSelected, onClick) => (
        <>
          <BaseTableCell>{user.username}</BaseTableCell>
          <BaseTableCell>{user.name}</BaseTableCell>
          <BaseTableCell>{user.email}</BaseTableCell>
          <BaseTableCell>
            <Button onClick={(e) => {
              e.stopPropagation(); // 행 클릭 이벤트 방지
              handleEdit(user);
            }}>
              수정
            </Button>
          </BaseTableCell>
        </>
      )}
    />
  );
}
```

### 고급 사용법 (관리자 대시보드 예시)

```tsx
// 교사 관리 테이블
<SelectableTable
  data={teachers}
  selectedItems={selectedTeachers}
  onSelectionChange={setSelectedTeachers}
  headers={[
    { key: 'username', label: '아이디' },
    { key: 'user_name', label: '이름' },
    { key: 'email', label: '이메일' },
    { key: 'device_limit', label: '기기 제한' },
    { key: 'ip_count', label: 'IP 대여' },
    { key: 'rental_count', label: '장비 대여' },
    { key: 'created_at', label: '가입일' },
    { key: 'actions', label: '작업' }
  ]}
  getItemId={(item) => item.id}
  renderRow={(teacher, isSelected, onClick) => (
    <>
      <BaseTableCell>{teacher.username}</BaseTableCell>
      <BaseTableCell>{teacher.user_name || '-'}</BaseTableCell>
      <BaseTableCell>{teacher.email || '-'}</BaseTableCell>
      <BaseTableCell>{teacher.device_limit || 0}</BaseTableCell>
      <BaseTableCell>{teacher.ip_count || 0}</BaseTableCell>
      <BaseTableCell>{teacher.rental_count || 0}</BaseTableCell>
      <BaseTableCell>
        {teacher.created_at ? format(new Date(teacher.created_at), 'yyyy-MM-dd', { locale: ko }) : '-'}
      </BaseTableCell>
      <BaseTableCell>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(teacher);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(teacher.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </BaseTableCell>
    </>
  )}
/>
```

## Props

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `data` | `T[]` | ✅ | 테이블에 표시할 데이터 배열 |
| `selectedItems` | `number[]` | ✅ | 현재 선택된 항목들의 ID 배열 |
| `onSelectionChange` | `(selectedIds: number[]) => void` | ✅ | 선택 상태가 변경될 때 호출되는 콜백 |
| `renderRow` | `(item: T, isSelected: boolean, onClick: (event: React.MouseEvent<HTMLTableRowElement>) => void) => React.ReactNode` | ✅ | 각 행을 렌더링하는 함수 |
| `headers` | `Array<{ key: string; label: string }>` | ✅ | 테이블 헤더 정의 |
| `getItemId` | `(item: T) => number` | ✅ | 각 항목의 고유 ID를 반환하는 함수 |
| `className` | `string` | ❌ | 추가 CSS 클래스 |
| `emptyMessage` | `string` | ❌ | 데이터가 없을 때 표시할 메시지 (기본값: '데이터가 없습니다.') |

## 주의사항

1. **이벤트 전파 방지**: 행 내부의 버튼 클릭 시 `e.stopPropagation()`을 호출하여 행 선택 이벤트를 방지해야 합니다.

2. **타입 정의**: 제네릭 타입 `T`를 명시적으로 정의하여 타입 안전성을 보장합니다.

3. **ID 고유성**: `getItemId` 함수는 각 항목에 대해 고유한 숫자 ID를 반환해야 합니다.

4. **스타일링**: 선택된 행의 스타일링은 `BaseTableRow` 컴포넌트의 `isSelected` prop을 통해 처리됩니다.

## 사용 가능한 곳

- 관리자 대시보드 (교사/학생 관리)
- 장비 관리 페이지
- 대여 내역 페이지
- 기타 다중 선택이 필요한 테이블

## 예시 페이지

- `/dashboard/admin` - 교사/학생 관리 테이블
- 향후 추가될 장비 관리, 대여 관리 등 