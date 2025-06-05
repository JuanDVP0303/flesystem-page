from inventory.models import ProductBatch, Movement
from purchase.models import Order
from django.utils import timezone
from django.db import transaction

def update_product_batches(product, quantity_needed):
    # Ordenar lotes: consignación primero, luego por fecha de expiración
    batches = ProductBatch.objects.filter(
        product=product, 
        active=True
    ).order_by('-is_consignment', 'expiration_date')
    
    quantity_left = quantity_needed
    print(f"Inicio venta: Producto: {product.name} | Cantidad necesaria: {quantity_left}")
    
    # Usamos transacción atómica para asegurar consistencia
    with transaction.atomic():
        for batch in batches:
            if quantity_left <= 0:
                break
                
            print(f"Procesando lote: {batch.id} | Tipo: {'Consignación' if batch.is_consignment else 'Normal'} | Stock: {batch.quantity} | Vendido: {batch.sold_quantity}")
            
            # Determinar cantidad disponible
            if batch.is_consignment:
                # Para consignación: disponible = total - vendido
                available = batch.quantity - batch.sold_quantity
            else:
                available = batch.quantity
            
            if available <= 0:
                continue  # Saltar lotes sin stock disponible
                
            # Calcular cuánto podemos tomar de este lote
            take = min(available, quantity_left)
            
            if batch.is_consignment:
                # Actualizar cantidad vendida en consignación
                batch.sold_quantity += take
                batch.quantity -= take
                
                
                print(f"Venta consignación: +{take} | Nuevo vendido: {batch.sold_quantity}")
                
                # Actualizar orden de compra asociada
                if batch.consignment_order:
                    order = batch.consignment_order
                    order = Order.objects.get(id=order.id)
                    order.sold_quantity += take
                    order.save()
                    print(f"Actualizada orden consignación #{order.id}: Vendido total: {order.sold_quantity}")
                    
                    # Verificar si se completó la consignación
                    if order.sold_quantity >= order.real_quantity:
                        order.consignment_status = 'COMPLETED'
                        order.save()
                        print(f"¡Consignación #{order.id} completada!")
                    else:
                        order.consignment_status = 'PARTIAL'
                        order.save()
                        print(f"Consignación #{order.id} parcial: Vendido {order.sold_quantity}/{order.quantity}")
            else:
                # Actualizar stock normal
                batch.quantity -= take
            
            # Registrar movimiento
            Movement.objects.create(
                product=product,
                movement_type='outcome',
                date=timezone.now(),
                quantity=take,
            )
            
            # Actualizar estado del lote
            if batch.is_consignment:
                if batch.sold_quantity >= batch.quantity:
                    batch.active = False
            else:
                if batch.quantity <= 0:
                    batch.active = False
            
            batch.save()
            quantity_left -= take
            print(f"Tomadas {take} unidades | Restante: {quantity_left}")
    
    if quantity_left > 0:
        raise ValueError(f"No hay suficiente stock para {product.name}. Faltan: {quantity_left} unidades")
    
    print("Venta completada exitosamente")