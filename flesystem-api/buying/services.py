from inventory.models import ProductBatch, Movement
from django.utils import timezone
def update_product_batches(product, quantity_needed):
    batches = ProductBatch.objects.filter(product=product, active=True).order_by('expiration_date')
    quantity_left = quantity_needed
    print("quantity_left", quantity_left, product.name, batches)
    for batch in batches:
        if quantity_left <= 0:
            break

        if batch.quantity >= quantity_left:
            batch.quantity -= quantity_left
            Movement.objects.create(
                product=product,
                product_variant=None,
                quantity=quantity_left,
                movement_type='outcome',
                date=timezone.now()
            )
            quantity_left = 0
            print("ESTE BATCHE TIENE SUFICIENTE CANTIDAD")
        else:
            quantity_left -= batch.quantity
            Movement.objects.create(
                product=product,
                product_variant=None,
                quantity=batch.quantity,
                movement_type='outcome',
                date=timezone.now()
            )
            batch.quantity = 0
            print("ESTE BATCHE NO TIENE SUFICIENTE CANTIDAD", quantity_left)

        if batch.quantity == 0:
            batch.active = False
        
        batch.save()

    if quantity_left > 0:
        raise ValueError(f"No hay suficiente stock para el producto {product.name}")
