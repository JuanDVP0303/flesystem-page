from .models import Provider, Order
from rest_framework import serializers

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
        
        return representation