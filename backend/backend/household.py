from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_household),
    path('join/',   views.join_household),
    path('me/',     views.get_my_household),
    path('leave/',  views.leave_household),
]