from django.urls import path
from . import views_tasks

urlpatterns = [
    path('create/', views_tasks.create_task),
    path('household/', views_tasks.get_household_tasks),
    path('<str:task_id>/complete/', views_tasks.complete_task),
    path('<str:task_id>/update/', views_tasks.update_task),
    path('<str:task_id>/delete/', views_tasks.delete_task),
]