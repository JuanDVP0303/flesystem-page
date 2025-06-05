from .models import Provider, Order
from rest_framework import serializers
from django.utils import timezone
class ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["provider"] = {
            "name": instance.provider.name,
            "id": instance.provider.id,
        }
        representation["provider_name"] = instance.provider.name
        if instance.product:
            representation["product_name"] = instance.product.name
            representation["product"] = {
                "name": instance.product.name,
                "id": instance.product.id,
            }
        representation["due_date"] = instance.due_date
        representation["credit_days"] = instance.credit_days
        representation["consignment_status"] = instance.consignment_status
        representation["sold_quantity"] = instance.sold_quantity
        
        # Calcular días restantes para crédito
        if instance.order_type == 'CREDIT' and instance.due_date:
            today = timezone.now().date()
            representation["days_remaining"] = (instance.due_date - today).days
        
        return representation