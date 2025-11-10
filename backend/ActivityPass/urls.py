"""
URL configuration for ActivityPass project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.http import HttpResponse
from pathlib import Path
from ActivityPass.health import health
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from activities.views import ActivityViewSet, ParticipationViewSet, StudentCourseEventViewSet, eligibility_check
from accounts.views import StudentProfileViewSet

router = DefaultRouter()
router.register(r'activities', ActivityViewSet)
router.register(r'participations', ParticipationViewSet)
router.register(r'course-events', StudentCourseEventViewSet)
router.register(r'student-profile', StudentProfileViewSet, basename='student-profile')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/eligibility/<int:activity_id>/', eligibility_check, name='eligibility-check'),
    # Auth (JWT)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Serve React build (if built) at root.
        # Root SPA: only serve built index.html if it exists, else show helpful message.
        path('', (TemplateView.as_view(template_name='index.html') if (Path(__file__).resolve().parent.parent.parent / 'frontend' / 'build' / 'index.html').exists() else (lambda request: HttpResponse('Frontend build not found. Run: python manage.py build_frontend or use runfullstack for dev.', status=503))), name='react-app'),
    path('health/', health, name='health'),
]
