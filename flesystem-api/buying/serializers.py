from .models import BuyingRecords, BuyingRecordsProducts, PaymentDetail
from rest_framework import serializers
from django.db.models import Sum, F
from inventory.models import ProductBatch
class PaymentDetailSerializer(serializers.ModelSerializer):
    proof = serializers.SerializerMethodField()
    def get_proof(self, obj):
        if obj.proof:
            return obj.proof.url
        return None
    class Meta:
        model = PaymentDetail
        fields = '__all__'

class BuyingRecordsProductsSerializer(serializers.ModelSerializer): 
    batches_quantity = serializers.SerializerMethodField()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["product"] = {
            "name": instance.product.name,
            "id": instance.product.id,
        }
        representation["sell_price"] = instance.product.sell_price
        return representation

    def get_batches_quantity(self, obj):
        total_quantity = ProductBatch.objects.filter(
            product=obj.product, 
            active=True
        ).aggregate(total=Sum('quantity'))['total'] or 0
        return total_quantity


    class Meta:
        model = BuyingRecordsProducts
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["product"] = {
            "name": instance.product.name,
            "id": instance.product.id,
        }
        representation["sell_price"] = instance.product.sell_price
        return representation

class BuyingRecordsSerializer(serializers.ModelSerializer):
    payment_details = PaymentDetailSerializer(many=True, read_only=True)
    payment_proof = serializers.SerializerMethodField()
    
    def get_payment_proof(self, obj):
        if obj.payment_proof:
            return obj.payment_proof.url
        return None
    class Meta:
        model = BuyingRecords
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        products = BuyingRecordsProducts.objects.filter(buying_record=instance)
        representation['products'] = BuyingRecordsProductsSerializer(products, many=True).data
        if instance.user:
            representation['user'] = {
                "id": instance.user.id,
                "email": instance.user.email,
                "document": instance.user.document,
            }
        if not instance.total_cost:
            # Calculamos el total_cost sumando el producto de quantity y sell_price para cada item
            total_cost = products.aggregate(
                total=Sum(F('quantity') * F('product__sell_price'))
            )['total'] or 0
            
            # Actualizamos el total_cost en la instancia y en la representación
            instance.total_cost = total_cost
            instance.save()
            representation['total_cost'] = total_cost
        
             
        return representation
