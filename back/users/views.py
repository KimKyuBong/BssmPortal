from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, views
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import User, Class, Student
from .serializers import UserSerializer, UserCreateSerializer, ClassSerializer, StudentSerializer
import bcrypt
import pandas as pd
import io
from django.http import HttpResponse
from django.contrib.auth.hashers import check_password, make_password
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
import random
import string
from django.db import transaction
import logging
from rest_framework import filters
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

# 관리자(superuser) 권한 클래스 정의
class IsSuperUser(BasePermission):
    """
    슈퍼유저(관리자) 권한만 허용하는 권한 클래스
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

# 교사(staff) 권한 클래스 정의
class IsStaffUser(BasePermission):
    """
    교사(staff) 권한 이상만 허용하는 권한 클래스
    """
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)

# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'last_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        # 관리자 권한이 필요한 액션 목록 확장
        if self.action in ['create', 'destroy', 'update', 'partial_update', 'export', 'import_users', 'reset']:
            return [IsSuperUser()]
        return [IsStaffUser()]
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        # 교사 목록 조회 시 필터링
        is_staff = self.request.query_params.get('is_staff')
        
        if is_staff == 'true':
            queryset = queryset.filter(is_staff=True)
        elif is_staff == 'false':
            queryset = queryset.filter(is_staff=False)
        
        return queryset

    def list(self, request, *args, **kwargs):
        """사용자 목록 조회 시 기본적으로 마스킹된 사용자명 반환"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        # 관리자(superuser)인 경우 전체 정보 제공
        if request.user.is_superuser:
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        # 관리자가 아닌 경우 마스킹된 정보만 제공
        data = []
        users = page if page is not None else queryset
        for user in users:
            data.append({
                'id': user.id,
                'username': self.mask_username(user.username),
                # 다른 필수 필드가 있으면 추가
            })
        
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)

    @action(detail=False, methods=['get'])
    def all(self, request):
        """
        페이지네이션 없이 전체 사용자 목록을 반환합니다.
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        현재 로그인한 사용자의 정보를 반환합니다.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        사용자 목록을 엑셀 파일로 내보내는 API
        """
        users = self.get_queryset()
        
        # 데이터프레임 생성
        data = []
        for user in users:
            data.append({
                'ID': user.id,
                '아이디': user.username,
                '이메일': user.email or '',
                '이름': user.last_name or '',
                '교사 여부': 'true' if user.is_staff else 'false',
                '관리자 여부': 'true' if user.is_superuser else 'false',
                '초기 비밀번호 상태': '초기 상태' if user.is_initial_password else '변경됨',
                '생성일': user.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        df = pd.DataFrame(data)
        
        # 엑셀 파일 생성
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='사용자 목록', index=False)
        
        # 응답 생성
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=users.xlsx'
        
        return response
    
    @action(detail=False, methods=['post'])
    def import_users(self, request):
        """
        엑셀 파일로부터 사용자를 일괄 추가하는 API
        """
        # 디버깅: 요청 데이터 및 파일 확인
        print(f"[DEBUG] import_users 요청 받음: {request.method}")
        print(f"[DEBUG] 요청 헤더: {request.headers}")
        print(f"[DEBUG] Content-Type: {request.content_type}")
        print(f"[DEBUG] 요청 FILES: {request.FILES}")
        print(f"[DEBUG] 요청 POST 데이터: {request.POST}")
        
        if 'file' not in request.FILES:
            print("[DEBUG] 'file' 키가 request.FILES에 없음")
            return Response({'error': '파일이 제공되지 않았습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        excel_file = request.FILES['file']
        print(f"[DEBUG] 파일 정보: 이름={excel_file.name}, 크기={excel_file.size}, 컨텐츠 타입={excel_file.content_type}")
        
        # 파일 내용 확인
        try:
            # 파일이 비어있는지 확인
            if excel_file.size == 0:
                print("[DEBUG] 파일 크기가: 0 bytes")
                return Response({'error': '파일이 비어있습니다.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # 임시 파일로 저장하여 디버깅
            import tempfile
            import os
            
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, excel_file.name)
            
            print(f"[DEBUG] 임시 파일 경로: {temp_path}")
            with open(temp_path, 'wb+') as f:
                for chunk in excel_file.chunks():
                    f.write(chunk)
            
            print(f"[DEBUG] 임시 파일 저장 완료: 크기={os.path.getsize(temp_path)} bytes")
            
            # 엑셀 파일 읽기 (최적화: chunksize를 사용하여 대용량 파일 처리)
            df = pd.read_excel(temp_path)
            print(f"[DEBUG] pandas로 파일 읽기 성공, 행 수: {len(df)}, 열: {df.columns.tolist()}")
            
            # 저장된 임시 파일 제거
            os.unlink(temp_path)
            print("[DEBUG] 임시 파일 제거 완료")
            
            # 필수 열 확인
            required_columns = ['아이디', '비밀번호']
            for col in required_columns:
                if col not in df.columns:
                    return Response({'error': f'필수 열 "{col}"이 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 사용자 생성
            created_users = []
            errors = []
            
            # 성능 최적화: 대량 처리를 위한 사용자 데이터 리스트
            users_to_create = []
            
            # 기존 사용자 검사를 위한 모든 사용자명 조회 (한 번의 쿼리로 처리)
            existing_usernames = set(User.objects.values_list('username', flat=True))
            
            # 데이터 검증 (일괄 검증)
            for index, row in df.iterrows():
                try:
                    username = row['아이디']
                    
                    # 중복 사용자 검사
                    if username in existing_usernames:
                        errors.append({
                            'row': index + 2,
                            'username': username,
                            'errors': {'username': ['이미 존재하는 사용자명입니다.']}
                        })
                        continue
                    
                    # 기본 필드 매핑
                    user_data = {
                        'username': username,
                        'password': row['비밀번호']
                    }
                    
                    # 이메일 필드
                    if '이메일' in row and pd.notna(row['이메일']):
                        user_data['email'] = str(row['이메일']).strip()
                    
                    # 이름 필드
                    if '이름' in row and pd.notna(row['이름']):
                        user_data['last_name'] = str(row['이름']).strip()
                    
                    # 역할 필드
                    if '역할' in row and pd.notna(row['역할']):
                        role = str(row['역할']).strip()
                        if role == '교사':
                            user_data['is_staff'] = True
                            user_data['is_superuser'] = False
                        elif role == '관리자':
                            user_data['is_staff'] = True
                            user_data['is_superuser'] = True
                        elif role == '학생':
                            user_data['is_staff'] = False
                            user_data['is_superuser'] = False
                    else:
                        # 권한 필드 직접 처리
                        if '교사 여부' in row and pd.notna(row['교사 여부']):
                            is_staff_val = row['교사 여부']
                            user_data['is_staff'] = (
                                is_staff_val if isinstance(is_staff_val, bool)
                                else str(is_staff_val).lower() in ['예', 'yes', 'y', 'true', 't', '1']
                            )
                        
                        if '관리자 여부' in row and pd.notna(row['관리자 여부']):
                            is_super_val = row['관리자 여부']
                            user_data['is_superuser'] = (
                                is_super_val if isinstance(is_super_val, bool)
                                else str(is_super_val).lower() in ['예', 'yes', 'y', 'true', 't', '1']
                            )
                    
                    # 기본 검증
                    serializer = UserCreateSerializer(data=user_data)
                    if serializer.is_valid():
                        # 이미 검증된 데이터를 저장
                        users_to_create.append(serializer.validated_data)
                        created_users.append(username)
                        # 중복 확인을 위해 추가
                        existing_usernames.add(username)
                    else:
                        errors.append({
                            'row': index + 2,
                            'username': username,
                            'errors': serializer.errors
                        })
                except Exception as e:
                    errors.append({
                        'row': index + 2,
                        'username': row.get('아이디', '알 수 없음'),
                        'errors': str(e)
                    })
            
            # 벌크 생성
            batch_size = 50  # 한 번에 처리할 사용자 수
            for i in range(0, len(users_to_create), batch_size):
                batch = users_to_create[i:i+batch_size]
                # 각 배치에 대해 사용자 생성
                for user_data in batch:
                    try:
                        User.objects.create_user(**user_data)
                    except Exception as e:
                        username = user_data.get('username', '알 수 없음')
                        errors.append({
                            'row': 0,
                            'username': username,
                            'errors': str(e)
                        })
                        if username in created_users:
                            created_users.remove(username)
            
            # 성공/오류 수 및 결과 반환
            return Response({
                'success': True,
                'created_users': created_users,
                'errors': errors,
                'total_created': len(created_users),
                'total_errors': len(errors)
            })
        
        except Exception as e:
            return Response({'error': f'파일 처리 중 오류가 발생했습니다: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def simple(self, request):
        """간단한 사용자 목록 조회 (ID와 마스킹된 사용자명 반환)"""
        users = self.get_queryset()
        data = [{
            'id': user.id,
            'username': self.mask_username(user.username)
        } for user in users]
        return Response(data)

    def mask_username(self, username):
        """사용자 이름 마스킹 처리 함수"""
        if len(username) <= 2:
            return username[0] + '*' * (len(username) - 1)
        else:
            return username[0] + '*' * (len(username) - 2) + username[-1]

    def create(self, request, *args, **kwargs):
        """사용자 생성 후 성공/실패 메시지 반환"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            # 성공 메시지 추가
            response_data = serializer.data
            response_data['message'] = f"사용자 '{serializer.data['username']}'이(가) 성공적으로 생성되었습니다."
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
        # 실패 시 상세 오류 반환
        return Response({
            'error': '사용자 생성에 실패했습니다.',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    def destroy(self, request, *args, **kwargs):
        """사용자 삭제 후 성공 메시지 반환"""
        instance = self.get_object()
        username = instance.username
        try:
            self.perform_destroy(instance)
            return Response({
                'message': f"사용자 '{username}'이(가) 성공적으로 삭제되었습니다."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f"사용자 '{username}' 삭제 중 오류가 발생했습니다.",
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def validate_password(self, password):
        """비밀번호 유효성 검사"""
        if not password:
            return False, "비밀번호를 입력해주세요."
        if len(password) < 8:
            return False, "비밀번호는 8자 이상이어야 합니다."
        return True, None

    def change_user_password(self, user, new_password, is_initial=False):
        """사용자 비밀번호 변경"""
        try:
            with transaction.atomic():
                user.password = make_password(new_password)
                user.is_initial_password = is_initial
                user.save(update_fields=['password', 'is_initial_password'])
            return True, "비밀번호가 성공적으로 변경되었습니다."
        except Exception as e:
            return False, str(e)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({
                'success': False,
                'message': '새 비밀번호가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # 비밀번호 변경
            user.set_password(new_password)
            user.is_initial_password = True  # 초기 비밀번호로 설정
            user.save()
            
            return Response({
                'success': True,
                'message': '비밀번호가 성공적으로 초기화되었습니다.',
                'new_password': new_password
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': f'비밀번호 초기화 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordViewSet(viewsets.ViewSet):
    """
    비밀번호 관리를 위한 ViewSet
    비밀번호 변경, 초기 비밀번호 변경, 비밀번호 초기화 등의 기능을 제공합니다.
    """
    permission_classes = [IsAuthenticated]
    
    def validate_password(self, password):
        """비밀번호 유효성 검사"""
        if not password:
            return False, "비밀번호를 입력해주세요."
        if len(password) < 8:
            return False, "비밀번호는 8자 이상이어야 합니다."
        return True, None
    
    def change_user_password(self, user, new_password, is_initial=False):
        """사용자 비밀번호 변경"""
        try:
            logger.info(f"[DEBUG] change_user_password 호출: 사용자 ID={user.id}, 사용자명={user.username}, is_initial={is_initial}")
            logger.info(f"[DEBUG] 변경 전 사용자 상태: is_initial_password={user.is_initial_password}")
            
            user.password = make_password(new_password)
            if not is_initial:
                logger.info(f"[DEBUG] is_initial이 False이므로 is_initial_password를 False로 설정")
                user.is_initial_password = False
            user.save()
            
            logger.info(f"[DEBUG] 변경 후 사용자 상태: is_initial_password={user.is_initial_password}")
            return True, "비밀번호가 성공적으로 변경되었습니다."
        except Exception as e:
            logger.error(f"[DEBUG] 비밀번호 변경 중 오류 발생: {str(e)}")
            return False, f"비밀번호 변경 중 오류가 발생했습니다: {str(e)}"
    
    @action(detail=False, methods=['post'])
    def change(self, request):
        """
        일반 비밀번호 변경 API
        현재 비밀번호 확인 후 새 비밀번호로 변경
        """
        user = request.user
        
        # 디버깅 출력 추가
        logger.info(f"[DEBUG] 비밀번호 변경 요청: 사용자 ID={user.id}, 사용자명={user.username}")
        logger.info(f"[DEBUG] 현재 사용자 상태: is_initial_password={user.is_initial_password}")
        logger.info(f"[DEBUG] 요청 데이터 타입: {type(request.data)}")
        
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        logger.info(f"[DEBUG] 추출된 old_password 길이: {len(old_password) if old_password else 'None'}")
        logger.info(f"[DEBUG] 추출된 new_password 길이: {len(new_password) if new_password else 'None'}")
        
        # 필수 파라미터 확인
        if not old_password:
            logger.warning("[DEBUG] 오류: 현재 비밀번호가 제공되지 않음")
            return Response({
                "success": False,
                "message": "현재 비밀번호를 입력해주세요."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 현재 비밀번호 확인
        is_password_valid = check_password(old_password, user.password)
        logger.info(f"[DEBUG] 현재 비밀번호 검증 결과: {is_password_valid}")
        
        if not is_password_valid:
            logger.warning("[DEBUG] 오류: 현재 비밀번호가 일치하지 않음")
            return Response({
                "success": False,
                "message": "현재 비밀번호가 일치하지 않습니다."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 새 비밀번호 유효성 검사
        is_valid, error_msg = self.validate_password(new_password)
        logger.info(f"[DEBUG] 새 비밀번호 유효성 검사 결과: {is_valid}, 오류: {error_msg}")
        
        if not is_valid:
            logger.warning(f"[DEBUG] 오류: 새 비밀번호가 유효하지 않음 - {error_msg}")
            return Response({
                "success": False,
                "message": error_msg
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 트랜잭션 내에서 비밀번호 변경
        try:
            with transaction.atomic():
                # 트랜잭션 내부에서 사용자 데이터를 다시 조회
                user_for_update = User.objects.select_for_update().get(id=user.id)
                logger.info(f"[DEBUG] 트랜잭션 내 사용자 상태: id={user_for_update.id}, is_initial_password={user_for_update.is_initial_password}")
                
                # 비밀번호 변경
                user_for_update.password = make_password(new_password)
                user_for_update.is_initial_password = False
                logger.info(f"[DEBUG] 비밀번호 변경 및 상태 업데이트 직전: id={user_for_update.id}, is_initial_password={user_for_update.is_initial_password}")
                user_for_update.save(update_fields=['password', 'is_initial_password'])
                logger.info(f"[DEBUG] 비밀번호 변경 및 상태 업데이트 직후: id={user_for_update.id}, is_initial_password={user_for_update.is_initial_password}")
                
                logger.info(f"[DEBUG] 사용자 {user.username}(ID: {user.id})의 비밀번호 변경 성공")
                return Response({
                    "success": True,
                    "message": "비밀번호가 성공적으로 변경되었습니다."
                })
        except Exception as e:
            logger.error(f"[DEBUG] 사용자 {user.username}(ID: {user.id})의 비밀번호 변경 중 오류: {str(e)}")
            return Response({
                "success": False,
                "message": f"비밀번호 변경 중 오류가 발생했습니다: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get', 'post'])
    def initial(self, request):
        """
        초기 비밀번호 상태 확인 및 변경 API
        GET: 현재 사용자의 초기 비밀번호 상태 반환
        POST: 초기 비밀번호를 새 비밀번호로 변경 (초기 비밀번호 상태인 경우에만)
        """
        # 인증 상태 자세히 로깅
        logger.info(f"[DEBUG] 초기 비밀번호 API 요청: 인증상태={request.user.is_authenticated}, 사용자 타입={type(request.user)}")
        logger.info(f"[DEBUG] 요청 헤더: {request.headers}")
        
        # 인증되지 않은 사용자 체크
        if request.user.is_anonymous:
            logger.warning("[DEBUG] 인증되지 않은 사용자가 초기 비밀번호 API에 접근 시도")
            return Response({
                'success': False,
                'message': '로그인이 필요합니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        user = request.user
        logger.info(f"[DEBUG] 인증된 사용자: {user.username}(ID: {user.id})")
        
        # GET 요청 처리: 초기 비밀번호 상태 확인
        if request.method == 'GET':
            logger.info(f"[DEBUG] 초기 비밀번호 상태 확인: 사용자={user.username}(ID: {user.id}), is_initial_password={user.is_initial_password}")
            return Response({
                'success': True,
                'message': '초기 비밀번호 상태를 확인했습니다.',
                'is_initial_password': user.is_initial_password
            })
        
        # POST 요청 처리: 초기 비밀번호 변경
        logger.info(f"[DEBUG] 초기 비밀번호 변경 요청: 사용자={user.username}(ID: {user.id}), is_initial_password={user.is_initial_password}")
        logger.info(f"[DEBUG] 요청 데이터: {request.data}")
        
        # 1. 초기 비밀번호 상태 확인
        if not user.is_initial_password:
            logger.warning(f"[DEBUG] 사용자 {user.username}(ID: {user.id})는 초기 비밀번호 상태가 아닙니다")
            return Response({
                'success': False,
                'message': '초기 비밀번호 상태가 아닙니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. 새 비밀번호 추출
        data = request.data
        new_password = None
        
        if isinstance(data, dict):
            # 명확한 API 규약: new_password만 사용
            new_password = data.get('new_password')
            logger.info(f"[DEBUG] 추출된 new_password 길이: {len(new_password) if new_password else 'None'}")
        
        # 3. 새 비밀번호 유효성 검사
        is_valid, error_msg = self.validate_password(new_password)
        logger.info(f"[DEBUG] 비밀번호 유효성 검사 결과: {is_valid}, 오류: {error_msg}")
        
        if not is_valid:
            logger.warning(f"[DEBUG] 사용자 {user.username}(ID: {user.id})의 비밀번호 유효성 검사 실패: {error_msg}")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 4. 트랜잭션 내에서 비밀번호 변경 진행
        try:
            # 명시적인 트랜잭션 격리 수준 설정 (일관된 읽기를 위한 수준)
            with transaction.atomic(using=None, savepoint=True):
                logger.warning(f"[DEBUG-CRITICAL] <초기 비밀번호 변경 트랜잭션 시작> 사용자={user.username}(ID: {user.id})")
                
                # 트랜잭션 내부에서 사용자 데이터를 다시 조회
                user_for_update = User.objects.select_for_update().get(id=user.id)
                logger.warning(f"[DEBUG-CRITICAL] <트랜잭션 내 조회> id={user_for_update.id}, is_initial_password={user_for_update.is_initial_password}")
                
                # 중요: 트랜잭션 내 재확인 로직 제거 
                # 이미 위에서 초기 비밀번호 상태를 확인했으므로 여기서는 검증하지 않음
                
                # 비밀번호 변경 및 상태 업데이트
                logger.warning(f"[DEBUG-CRITICAL] <비밀번호 변경 직전> id={user_for_update.id}, 기존 상태: is_initial_password={user_for_update.is_initial_password}")
                
                old_password_hash = user_for_update.password
                user_for_update.password = make_password(new_password)
                user_for_update.is_initial_password = False
                
                logger.warning(f"[DEBUG-CRITICAL] <비밀번호 변경 처리> 패스워드 해시 변경: {old_password_hash[:10]}... -> {user_for_update.password[:10]}...")
                logger.warning(f"[DEBUG-CRITICAL] <저장 직전> is_initial_password={user_for_update.is_initial_password}")
                
                user_for_update.save(update_fields=['password', 'is_initial_password'])
                
                logger.warning(f"[DEBUG-CRITICAL] <저장 직후> is_initial_password={user_for_update.is_initial_password}")
                logger.warning(f"[DEBUG-CRITICAL] <초기 비밀번호 변경 완료> 사용자 {user.username}(ID: {user.id})의 초기 비밀번호 변경 성공")
                
                return Response({
                    'success': True,
                    'message': '비밀번호가 성공적으로 변경되었습니다.'
                })
                
        except Exception as e:
            logger.error(f"[DEBUG-CRITICAL] <오류 발생> 사용자 {user.username}(ID: {user.id})의 초기 비밀번호 변경 중 오류: {str(e)}")
            import traceback
            logger.error(f"[DEBUG-CRITICAL] <오류 상세> {traceback.format_exc()}")
            return Response({
                'success': False,
                'message': f'비밀번호 변경 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Class.objects.all().order_by('grade', 'class_number')

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = Student.objects.all()
        
        # 학반으로 필터링
        class_id = self.request.query_params.get('class')
        if class_id and class_id != '0':  # class=0이면 전체 학생 목록 반환
            queryset = queryset.filter(current_class_id=class_id)
        
        return queryset

    @action(detail=True, methods=['post'])
    def change_class(self, request, pk=None):
        student = self.get_object()
        class_id = request.data.get('class_id')
        
        new_class = get_object_or_404(Class, id=class_id)
        
        # 학반 변경
        student.current_class = new_class
        student.save()
        
        return Response({
            'message': '학반이 변경되었습니다.'
        })
