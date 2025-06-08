from django.contrib import admin
from .models import Provider, Order


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'address', 'document', 'rif', 'created_at', 'updated_at')
    search_fields = ('name', 'email', 'phone', 'document', 'rif')
    list_filter = ('created_at',)
    ordering = ('-created_at',)
    
@admin.register(Order)

class OrderAdmin(admin.ModelAdmin):
    list_display = ('provider', 'purchase_date', 'status', 'total_cost', 'product', 'quantity', 'price_unit', 'credit_days', 'due_date')
    search_fields = ('provider__name', 'invoice_number', 'product__name')
    list_filter = ('status', 'order_type', 'compensation_type')
    ordering = ('-purchase_date',)
    date_hierarchy = 'purchase_date'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('provider', 'product')
    