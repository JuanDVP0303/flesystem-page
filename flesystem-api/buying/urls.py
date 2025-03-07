from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuyingRecordsViewsets

router = DefaultRouter()
router.register(r'records', BuyingRecordsViewsets, basename='buying-records')

urlpatterns = [
    path('', include(router.urls)),
]
