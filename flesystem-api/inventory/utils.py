from inventory.models import ProductVariants, ProductBatch, Inventory
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
def calculate_price_unit(instance, representation):
    batches = ProductBatch.objects.filter(product=instance)
    if batches.count() > 0:
        total_price = 0
        total_quantity = 0
        for batch in batches:
            if not batch.price_unit:
                continue
            if not batch.quantity:
                continue
            total_price += batch.price_unit * batch.quantity
            total_quantity += batch.quantity
        if total_quantity == 0:
            total_price = 0
        else:        
            total_price = total_price / total_quantity
        print("TOTAL PRICE", total_price, total_quantity)
        representation["price_unit"] = total_price
        # if representation["price_unit"] != instance.price_unit:
        #     instance.price_unit = representation["price_unit"]
        #     instance.save()
        
    # if batches.count() > 0:
    #     total_price = 0
    #     for batch in batches:
    #         total_price += batch.price_unit
    #     representation["price_unit"] = total_price / batches.count()
    #     if representation["price_unit"] != instance.price_unit:
    #         instance.price_unit = representation["price_unit"]
    #         instance.save()
    return representation

def calculate_quantity(instance, representation):
    batches = ProductBatch.objects.filter(product=instance)
    if batches.count() > 0:
        total_quantity = 0
        for batch in batches:
            if not batch.quantity:
                continue
            total_quantity += batch.quantity
        representation["quantity"] = total_quantity
        # if representation["quantity"] != instance.quantity:
        #     instance.quantity = representation["quantity"]
        #     instance.save()
    return representation


def generate_random_id(length=12):
    import random
    import string
    # Define the characters that can be used in the ID
    characters = string.ascii_letters + string.digits + "#@"
    
    # Generate a random ID
    random_id = ''.join(random.choice(characters) for _ in range(length))
    
    if ProductBatch.objects.filter(batch=random_id).exists():
        return generate_random_id()
    
    return random_id


def get_operator_and_validate(operatorId, user):
    operator = get_object_or_404(Operator, id=operatorId)
    operator_branch_office = BranchOffice.objects.filter(operators=operator).first()
    if not operator.user.is_pf and not operator_branch_office:
        return "", "", PermissionDenied("Este operador no tiene una branch office asignada")
    if user != operator.management_user and not user == operator.user and not user.is_superuser:
        return "", "", PermissionDenied("You do not have permission to access this operator")
    if operator.user.is_pf:
        inventory = get_object_or_404(Inventory, user=operator.user)
    else:
        inventory = get_object_or_404(Inventory, branch_office=operator_branch_office)
    return operator, inventory, None


def divide_batches(batch, quantity, location):
    quantity = float(quantity)
    batch = get_object_or_404(ProductBatch, batch=batch)
    if batch.quantity < quantity:
        raise ValidationError({"quantity": "No hay suficiente cantidad de este producto"})
    
    batch.quantity -= quantity
    new_batch = ProductBatch.objects.create(
        product=batch.product,
        product_variant=batch.product_variant,
        quantity=quantity,
        initial_quantity=batch.initial_quantity,  # Mantener la cantidad inicial
        price_unit=batch.price_unit,
        sell_price=batch.sell_price,
        location=location,
        batch=generate_random_id(),
        waste=batch.waste,
        safety_stock=batch.safety_stock,
        unit_of_measure=batch.unit_of_measure,
        description=batch.description
    )
    batch.save()
    return new_batch
    
    
def create_batch(product, product_variant, data, is_an_existing_product=False):
    batch_data = data
    new_batch = ProductBatch.objects.create(
        product=product,
        product_variant=product_variant,
        quantity=batch_data.get("quantity"),
        initial_quantity=batch_data.get("quantity", batch_data.get("quantity")),  # Mantener la cantidad inicial
        price_unit=batch_data.get("price_unit"),
        sell_price=batch_data.get("sell_price"),
        location=batch_data.get("location"),
        batch=generate_random_id(),
        waste=batch_data.get("waste"),
        safety_stock=batch_data.get("safety_stock"),
        unit_of_measure=batch_data.get("unit_of_measure"),
        description=batch_data.get("description")
    )
    return new_batch