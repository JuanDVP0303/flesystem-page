from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductsViewset, MovementsViewset,InventoryReportsViewset

router = DefaultRouter()
router.register(r'products', ProductsViewset)
router.register(r'movements', MovementsViewset)
router.register(r'reports', InventoryReportsViewset, basename='inventory-reports')
# inventory/urls.py

urlpatterns = [
    path('', include(router.urls)),
]