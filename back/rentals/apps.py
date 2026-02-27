from django.apps import AppConfig


class RentalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rentals'
    verbose_name = '장비 대여 관리'

    def ready(self):
        import rentals.signals  # noqa: F401 - pre_delete 시그널 등록
