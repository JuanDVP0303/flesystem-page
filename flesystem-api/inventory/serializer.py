from rest_framework import serializers
from .models import Inventory, Product, ProductVariants, Movement, ProductBatch
from purchase.models import Provider
# from operators.models import BranchOffice
from .utils import calculate_price_unit, calculate_quantity
class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = '__all__'
      
class ProductBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductBatch
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # representation["product"] = {
        #     "id": instance.product.id,
        #     "name": instance.product.name,
        #     "sku": instance.product.sku,
        #     "category": instance.product.category,
        #     "safety_stock": instance.product.safety_stock,
        #     "unit_of_measure": instance.product.unit_of_measure,
        #     "description": instance.product.description,
        # }
        # representation["product_variant_name"] = instance.product_variant.name if instance.product_variant else None
        representation["product_id"] = instance.product.id
        representation["category"] = instance.product.category
        return representation      
        
class ProductSerializer(serializers.ModelSerializer):
    variants = serializers.SerializerMethodField()
    providers = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Provider.objects.all(),
        required=False
    )
    def get_variants(self, obj):
        try:
            variants = ProductVariants.objects.filter(product=obj)
            serializer = ProductVariantsSerializer(variants, many=True)
            return serializer.data
        except Exception as e:
            print("ERROR", e)
            print("OBJ", obj)
            return []
    class Meta:
        model = Product
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation = calculate_price_unit(instance, representation)
        representation = calculate_quantity(instance, representation)
        representation["batches"] = ProductBatchSerializer(ProductBatch.objects.filter(product=instance), many=True).data
        
        context = self.context
        if context.get("currency"):
            currency_str = context.get("currency").lower()
            # branch_office = BranchOffice.objects.filter(operators=instance.office).first()   
            # if branch_office:
            #     main_currency = branch_office.company.country
            #     if main_currency.lower() != currency_str:
            #         representation["price_unit"] = convert_amount_to_dollar(main_currency, representation["price_unit"], currency_str)
            #         representation["sell_price"] = convert_amount_to_dollar(main_currency, representation["sell_price"], currency_str)
            #         if representation.get("batches"):
            #             for batch in representation["batches"]:
            #                 batch["price_unit"] = convert_amount_to_dollar(main_currency, batch["price_unit"], currency_str)
            #                 batch["sell_price"] = convert_amount_to_dollar(main_currency, batch["sell_price"], currency_str)
      
        
        return representation
        
class ProductVariantsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariants
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["is_variant"] = True
        representation["unit_of_measure"] = instance.product.unit_of_measure
        representation["category"] = instance.product.category
        return representation
        
class MovementSerializer(serializers.ModelSerializer):
    product = ProductSerializer()
    product_variant = ProductVariantsSerializer()
    class Meta:
        model = Movement
        fields = '__all__'
        