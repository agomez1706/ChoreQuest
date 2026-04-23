from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/household/', include('api.urls_household')),
    path('api/tasks/', include('api.urls_tasks')),
]
