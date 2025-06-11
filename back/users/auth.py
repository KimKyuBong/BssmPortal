from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    print(f"[DEBUG] 로그인 시도: username={username}")

    if not username or not password:
        return Response({'error': '아이디와 비밀번호를 모두 입력해주세요.'}, 
                      status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)

    if not user:
        print(f"[DEBUG] 인증 실패: username={username}")
        return Response({'error': '아이디 또는 비밀번호가 잘못되었습니다.'}, 
                      status=status.HTTP_401_UNAUTHORIZED)

    print(f"[DEBUG] 인증 성공: username={username}, is_staff={user.is_staff}, is_superuser={user.is_superuser}")

    refresh = RefreshToken.for_user(user)
    
    response_data = {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    }
    
    print(f"[DEBUG] 응답 데이터: {response_data}")
    
    return Response(response_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'success': True, 'message': '로그아웃되었습니다.'})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token is required'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
        })
    except Exception as e:
        return Response({'error': 'Invalid refresh token'}, 
                      status=status.HTTP_401_UNAUTHORIZED) 