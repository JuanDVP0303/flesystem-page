from django.urls import path
from . import views
from django.urls import include
from rest_framework import routers
router = routers.DefaultRouter()
router.register(r'admin', views.AdminViewset, basename='admin')

urlpatterns = [
    path('create-user/', views.CreateUserView.as_view(), name='create-user'),
    path('login/', views.LoginUserView.as_view(), name='login'),
    path('logout/', views.LogoutUserView.as_view(), name='login'),
    # path('countries/', views.CountryList.as_view(), name='countries'),
    path('users/', views.UsersViewset.as_view(), name='users'),
    path('token/refresh/', views.TokenRefreshCustomView.as_view(), name='token_refresh'),
    path('password_reset/', views.ResetPasswordView.as_view(), name='password_reset'),
    path('password_reset_confirm/', views.ResetPasswordConfirmView.as_view(), name='password_reset_confirm'),
    #Importar el router
    path('', include(router.urls)),
]