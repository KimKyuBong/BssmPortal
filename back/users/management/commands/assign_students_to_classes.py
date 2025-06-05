import csv
from django.core.management.base import BaseCommand
from users.models import User, Class, Student

class Command(BaseCommand):
    help = 'CSV 파일에서 학생 정보를 읽어 학반에 할당합니다.'

    def handle(self, *args, **options):
        # CSV 파일 경로를 명확히 지정
        csv_path = '/app/students.csv'
        
        # CSV 파일 읽기
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                # 이메일에서 아이디 추출
                email = row['E-mail']
                student_id = email.split('@')[0]
                
                # 학년과 반 정보
                grade = int(row['학년'])
                class_number = int(row['반'])
                
                try:
                    # 해당 학반 찾기
                    class_obj = Class.objects.get(grade=grade, class_number=class_number)
                    
                    # 해당 이메일을 가진 사용자 찾기
                    user = User.objects.get(email=email)
                    
                    # Student 객체 생성 또는 업데이트
                    student, created = Student.objects.get_or_create(
                        user=user,
                        defaults={'current_class': class_obj}
                    )
                    
                    if not created:
                        student.current_class = class_obj
                        student.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'성공적으로 할당됨: {user.username} -> {grade}학년 {class_number}반')
                    )
                    
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'사용자를 찾을 수 없음: {email}')
                    )
                except Class.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'학반을 찾을 수 없음: {grade}학년 {class_number}반')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'오류 발생: {email} - {str(e)}')
                    ) 