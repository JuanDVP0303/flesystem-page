from rest_framework import viewsets
from .models import Provider, Order,OrderItem
from .serializers import ProviderSerializer, OrderSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from inventory.models import Product, ProductBatch, Movement
from inventory.serializer import ProductSerializer
from inventory.utils import generate_random_id
from datetime import datetime
import pandas as pd
from inventory.reports import generate_pdf_response, generate_excel_response, generate_csv_response
from django.db import models
from django.db.models import Count, Sum, F
from rest_framework.response import Response
from django.http import HttpResponse
from users.services import log_user_action
class PurchaseViewset(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class =OrderSerializer
    lookup_field = 'id' 

    def get_queryset(self):
        return Provider.objects.all()
    
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    

    
    @action(detail=False, methods=['post'], url_path='create-order')
    def create_order(self, request):
        """
        Crea una orden de compra, vincula los productos con sus cantidades
        y costos unitarios, y actualiza el stock en el inventario.
        """
        provider_id = request.data.get("provider")
        purchase_date = request.data.get("purchase_date")
        product_id = request.data.get("product")
        if not provider_id or not purchase_date or not product_id:
            return Response(
                {"error": "Proveedor, fecha de compra y productos son requeridos."},
                status=400,
            )

        # Validar si el proveedor existe
        try:
            provider = Provider.objects.get(id=provider_id)
        except Provider.DoesNotExist:
            return Response({"error": "El proveedor no existe."}, status=404)

        # Crear la orden de compra

        # Procesar los productos
        quantity = request.data.get("quantity")
        price_unit = request.data.get("price_unit")
        print("TOTAL",float(request.data.get("total_cost",0)))
        if not product_id or not quantity or not price_unit:
            return Response(
                {"error": "Cada producto debe incluir ID, cantidad y precio unitario."},
                status=400,
            )

        # Validar si el producto existe
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": f"Producto con ID {product_id} no encontrado."}, status=404)
        order = Order.objects.create(
            invoice_number=request.data.get("invoice_number"),
            provider=provider,
            purchase_date=purchase_date,
            status = "PENDING",
            total_cost = float(request.data.get("total_cost",0)) if request.data.get("total_cost") else float(quantity) * float(price_unit),
            product=product,
            quantity=quantity,
            price_unit=price_unit,
        )
        
        log_user_action(request.user, "orden", None, f"Se ha creado la orden: #{order.id}")
        
        # Crear el lote del producto
    
            
        Movement.objects.create(
                product=product,
                movement_type="income",
                date=datetime.now(),
                quantity = quantity 
            )
            

        return Response(
            {"message": "Orden de compra creada exitosamente.", "data" : OrderSerializer(order).data},
            status=201,
        )
        
    
    @action(detail=False, methods=['post'], url_path='order-status')
    def order_status(self, request):
        order_id = request.data.get("order_id")
        status = request.data.get("status")
        real_quantity = request.data.get("real_quantity")
        if not order_id or not status:
            return Response(
                {"error": "ID de orden y estado son requeridos."},
                status=400,
            )

        # Validar si la orden existe
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "La orden no existe."}, status=404)

        if status == "COMPLETED":
            batch = ProductBatch.objects.create(
                product=order.product,
                purchase_order=order,
                quantity=real_quantity,
                price_unit=order.price_unit,
                sell_price=order.product.sell_price,
                batch=generate_random_id(),
                description=order.product.description,
                unit_of_measure=order.product.unit_of_measure,            
            )
        order.real_quantity = real_quantity
        order.status = status
        order.save()
        log_user_action(request.user, "orden", None, f"Se han actualizado el estado de la orden de ID: {order.id} a: {order.get_status_display() }")
        

        return Response(
            {"message": "Estado de la orden actualizado exitosamente.", "data" : OrderSerializer(order).data},
            status=200,
        )    
    
    @action(detail=False, methods=['get'], url_path='get-orders')
    def get_orders(self, request):
        orders = Order.objects.all().order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
    

        
class ProviderViewset(viewsets.ModelViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    lookup_field = 'id' 

    def get_queryset(self):
        return Provider.objects.all()
    
    def create(self, request, *args, **kwargs):
        provider = super().create(request, *args, **kwargs)
        log_user_action(request.user, "crear proveedor", None, f"Se ha creado el proveedor {provider.id}")
        return provider
    def update(self, request, *args, **kwargs):
        provider = self.get_object()
        log_user_action(request.user, "actualizar proveedor", None, f"Se ha actualizado el proveedor {provider.id}")
        
        return super().update(request, *args, **kwargs)
    

    @action(detail=False, methods=['get'], url_path='get-providers')
    def get_providers(self, request):
        query = request.query_params.get('name', None)
        providers = Provider.objects.filter(name__icontains=query)
        serializer = ProviderSerializer(providers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='reports/completed-purchases')
    def completed_purchases_report(self, request):
        format = request.query_params.get('format', 'json')
        providers = Provider.objects.annotate(
            completed_orders=Count('orders', filter=models.Q(orders__status='COMPLETED')),
            total_spent=Sum('orders__total_cost', filter=models.Q(orders__status='COMPLETED'))
        )
        
        data = [{
            "Proveedor": p.name,
            "Ordenes Completadas": p.completed_orders,
            "Total Gastado": p.total_spent
        } for p in providers]
        
        if format in ['pdf', 'excel', 'csv']:
            df = pd.DataFrame(data)
            filename = f"compras_completadas_{datetime.now().strftime('%Y%m%d')}"
            
            if format == 'pdf':
                return generate_pdf_response(data, filename)
            elif format == 'excel':
                return generate_excel_response(df, filename)
            elif format == 'csv':
                return generate_csv_response(df, filename)
        
        return Response(data)
    
    @action(detail=False, methods=['get'], url_path='providers-products')
    def providers_products(self, request):
        provider_id = request.query_params.get('provider_id')
        provider = Provider.objects.get(id=provider_id)
        products = Product.objects.filter(provider=provider)
        data = ProductSerializer(products, many=True).data
        return Response(data)
    
    @action(detail=True, methods=['get'], url_path='export-completed-orders')
    def export_completed_orders(self, request, id=None):
        print("ID", id)
        log_user_action(request.user, "exportar ordenes", None, f"Se han exportado las ordenes del proveedor con id: {id}")
        
        """
        Exporta las compras completadas de un proveedor en formato Excel.
        """
        try:
            # Filtrar las órdenes completadas para el proveedor especificado
            orders = Order.objects.filter(provider__id=id, status='COMPLETED').annotate(
                product_name=F('product__name')
            ).values(
                'id', 'product_name', 'quantity', 'price_unit', 'total_cost', 'purchase_date'            )

            # Crear un DataFrame con los datos
            df = pd.DataFrame(list(orders))

            # Verificar si hay datos para exportar
            # if df.empty:
            #     return Response({"detail": "No hay compras completadas para este proveedor."}, status=404)

            # Renombrar las columnas al español
            df = df.rename(columns={
                'id': 'ID de Compra',
                'product_name': 'Producto',
                'quantity': 'Cantidad',
                'price_unit': 'Precio Unitario',
                'total_cost': 'Costo Total',
                'purchase_date': 'Fecha de Compra',
                # 'created_at': 'Fecha de Creación'
            })

            # Convertir las fechas a formato legible (sin hora)
            for column in ['Fecha de Compra']:
                if column in df.columns:
                    df[column] = pd.to_datetime(df[column]).dt.date

            # Generar el archivo Excel
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="compras_completadas_proveedor_{id}.xlsx"'

            with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Compras Completadas')
                workbook = writer.book
                worksheet = writer.sheets['Compras Completadas']

                # Formato para el encabezado
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })

                # Aplicar formato al encabezado
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)

                # Ajustar automáticamente el ancho de las columnas
                for column in df:
                    column_length = max(df[column].astype(str).map(len).max(), len(column))
                    col_idx = df.columns.get_loc(column)
                    worksheet.set_column(col_idx, col_idx, column_length)

            return response

        except Exception as e:
            return Response({"detail": f"Error al generar el reporte: {str(e)}"}, status=500)