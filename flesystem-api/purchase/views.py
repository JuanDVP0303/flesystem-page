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
from django.utils import timezone
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from datetime import timedelta

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
        order_type = request.data.get("order_type", "COUNTED")
        days_of_credit = request.data.get("days_of_credit", 0)
        today = timezone.now()
        due_date = today + timedelta(days=days_of_credit) if order_type == "CREDIT" else None
        due_date = due_date.date() if due_date else None

        if order_type == "CREDIT" and not days_of_credit:
            return Response(
                {"error": "Para órdenes a crédito, se deben especificar los días de crédito."},
                status=400,
            )
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
            order_type=order_type,
            credit_days=days_of_credit if order_type == "CREDIT" else None,
            due_date=due_date,
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
            global_quantity = ProductBatch.objects.filter(product=order.product).aggregate(Sum('quantity'))['quantity__sum']
            print("GLOBAL", global_quantity)
            if global_quantity is None:
                global_quantity = 0
            if float(global_quantity) + float(real_quantity) > float(order.product.max_stock):
                return Response(
                    {"error": "La cantidad real supera el stock máximo permitido."},
                    status=400,
                )
            batch = ProductBatch.objects.create(
                product=order.product,
                purchase_order=order,
                quantity=real_quantity,
                initial_quantity=real_quantity, 
                price_unit=order.price_unit,
                sell_price=order.product.sell_price,
                batch=generate_random_id(),
                description=order.product.description,
                unit_of_measure=order.product.unit_of_measure,
                is_consignment=(order.order_type == 'CONSIGNATION'),  # Nuevo campo
                consignment_order=order if order.order_type == 'CONSIGNATION' else None
            )
            if order.order_type == 'CONSIGNATION':
                order.consignment_status = 'PENDING'
                order.sold_quantity = 0
                order.save()
        
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

        
    @action(detail=False, methods=['get'], url_path='credit-alerts')
    def credit_alerts(self, request):
        """Obtener órdenes a crédito próximas a vencer"""
        today = timezone.now().date()
        three_days_later = today + timedelta(days=3)
        
        upcoming_orders = Order.objects.filter(
            order_type='CREDIT',
            # due_date__range=[today, three_days_later],
            status='COMPLETED'
        ).order_by('due_date')
        
        serializer = OrderSerializer(upcoming_orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='update-sold-quantity')
    def update_sold_quantity(self, request, id=None):
        """Actualizar cantidad vendida para consignación"""
        order = self.get_object()
        sold_quantity = request.data.get('sold_quantity')
        
        if not sold_quantity:
            return Response({"error": "sold_quantity es requerido"}, status=400)
        
        if sold_quantity > order.quantity:
            return Response({"error": "La cantidad vendida no puede ser mayor que la cantidad total"}, status=400)
        
        order.sold_quantity = sold_quantity
        
        # Actualizar estado de consignación
        if sold_quantity == order.quantity:
            order.consignment_status = 'COMPLETED'
        elif sold_quantity > 0:
            order.consignment_status = 'PARTIAL'
        else:
            order.consignment_status = 'PENDING'
        
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='cancel-consignment')
    def cancel_consignment(self, request, id=None):
        """Cancelar consignación y devolver productos no vendidos"""
        order = Order.objects.get(id=id)
        unsold_quantity = order.quantity - order.sold_quantity
        
        try:
            # Obtener el batch de consignación asociado
            batch = ProductBatch.objects.get(consignment_order=order)
            
            # Crear movimiento de devolución
            if unsold_quantity > 0:
                Movement.objects.create(
                    product=order.product,
                    movement_type="outcome",
                    date=timezone.now(),
                    quantity=unsold_quantity,
                )
                
                # Eliminar el batch de consignación
                print("ELIMINANDO BATCH", batch.id)
                batch.delete()
        
        except ProductBatch.DoesNotExist:
            # Si no existe el batch, solo registrar la devolución
            if unsold_quantity > 0:
                Movement.objects.create(
                    product=order.product,
                    movement_type="outcome",
                    date=timezone.now(),
                    quantity=unsold_quantity,
                    description=f"Devolución consignación cancelada (Orden #{order.id})"
                )
        
        order.consignment_status = 'CANCELLED'
        order.save()
        
        return Response({
            "message": "Consignación cancelada",
            "to_pay": order.sold_quantity,
            "to_return": unsold_quantity
        })
    @action(detail=True, methods=['get'], url_path='shortage-report')
    def shortage_report(self, request, id=None):
        print("ENTRANDO POR ACA 1", id)
        
        #Implementar la lógica de consignación
        order = Order.objects.get(id=id) 
        print("ENTRANDO POR ACA 2")
        if order.real_quantity >= order.quantity:
            return Response({"error": "No aplica para generar reporte de diferencia"}, status=400)
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="diferencia_orden_{order.id}.pdf"'
        
        p = canvas.Canvas(response, pagesize=letter)
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 750, "Reporte de Diferencia en Recepción")
        
        # Detalles de la orden
        p.setFont("Helvetica", 12)
        y = 700
        p.drawString(100, y, f"Orden #: {order.id}")
        y -= 30
        p.drawString(100, y, f"Proveedor: {order.provider.name}")
        y -= 30
        p.drawString(100, y, f"Producto: {order.product.name}")
        y -= 30
        p.drawString(100, y, f"Fecha: {order.purchase_date}")
        
        # Tabla de diferencias
        p.setFont("Helvetica-Bold", 12)
        p.drawString(100, y - 50, "Detalles de la Diferencia")
        
        headers = ["Concepto", "Solicitado", "Recibido", "Diferencia"]
        data = [
            ["Cantidad", order.quantity, order.real_quantity, order.quantity - order.real_quantity],
            ["Monto Total", f"Bs. {order.total_cost}", 
            f"Bs. {order.real_quantity * order.price_unit}", 
            f"Bs. {(order.quantity - order.real_quantity) * order.price_unit}"]
        ]
        
        # Dibujar tabla
        p.setFont("Helvetica", 10)
        y -= 100
        col_widths = [150, 100, 100, 100]
        
        # Encabezados
        for i, header in enumerate(headers):
            p.drawString(100 + sum(col_widths[:i]), y, header)
        
        # Datos
        y -= 30
        for row in data:
            for i, item in enumerate(row):
                p.drawString(100 + sum(col_widths[:i]), y, str(item))
            y -= 20
        
        # Firmas
        y -= 50
        p.drawString(100, y, "Firma Proveedor: __________________________")
        y -= 30
        p.drawString(100, y, "Firma Operador: __________________________")
        y -= 30
        p.drawString(100, y, f"Usuario: {request.user.email}")
        
        p.showPage()
        p.save()
        return response 
    
    
    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, id=None):
        """
        Marca una orden de compra como pagada.
        """
        try:
            order = Order.objects.get(id=id)
            order.credit_paid = True
            order.save()
            log_user_action(request.user, "marcar orden como pagada", None, f"Se ha marcado la orden {order.id} como pagada")
            return Response({"message": "Orden marcada como pagada."}, status=200)
        except Order.DoesNotExist:
            return Response({"error": "Orden no encontrada."}, status=404) 

    @action(detail=False, methods=['get'], url_path='consignments')
    def list_consignments(self, request):
        consignment_orders = Order.objects.filter(
            order_type='CONSIGNATION',
            status='COMPLETED'
        ).order_by('-id')
        
        serializer = OrderSerializer(consignment_orders, many=True)
        return Response(serializer.data)

class ProviderViewset(viewsets.ModelViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    lookup_field = 'id' 

    def get_queryset(self):
        return Provider.objects.all()
    
    def create(self, request, *args, **kwargs):
        provider = super().create(request, *args, **kwargs)
        provider = Provider.objects.get(id=provider.data['id'])
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
        products = Product.objects.filter(providers=provider)
        data = ProductSerializer(products, many=True).data
        return Response(data)
    @action(detail=True, methods=['get'], url_path='export-completed-orders')
    def export_completed_orders(self, request, id=None):
        print("ID", id)
        
        """
        Exporta las compras completadas de un proveedor en formato Excel.
        """
        try:
                # Filtrar las órdenes completadas para el proveedor especificado
                orders = Order.objects.filter(provider__id=id, status='COMPLETED').annotate(
                    product_name=F('product__name')
                ).values(
                    'id', 'product_name', 'quantity', 'real_quantity', 'price_unit', 'total_cost', 'purchase_date'
                )

                # Crear un DataFrame con los datos
                df = pd.DataFrame(list(orders))

                # Verificar si hay datos para exportar
                if df.empty:
                    return Response({"detail": "No hay compras completadas para este proveedor."}, status=404)

                # Renombrar las columnas al español
                df = df.rename(columns={
                    'id': 'ID de Compra',
                    'product_name': 'Producto',
                    'quantity': 'Cantidad',
                    'real_quantity': 'Cantidad Real',
                    'price_unit': 'Precio Unitario',
                    'total_cost': 'Costo Total',
                    'purchase_date': 'Fecha de Compra',
                })

                # Convertir las fechas a formato legible (sin hora)
                for column in ['Fecha de Compra']:
                    if column in df.columns:
                        df[column] = pd.to_datetime(df[column]).dt.date

                # Generar el archivo Excel
                response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = f'attachment; filename="compras_completadas_proveedor_{id}.xlsx"'

                with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
                    df.to_excel(writer, index=False, sheet_name='Compras Completadas', startrow=3)  # Start from row 4
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

                    # Formato para el título
                    title_format = workbook.add_format({
                        'bold': True,
                        'font_size': 18,
                        'align': 'center',
                        'valign': 'vcenter',
                        'font_color': '#0c8f00',  # White,
                        'fg_color': '#1F4E78',  # Dark Blue
                    })
                    footer_row = 12 + len(df)  # Fila después de los datos (0-based)
                    footer_start_row = footer_row + 4
                    footer_format = workbook.add_format({
                        'bold': True,
                        'font_size': 12,
                        'valign': 'vcenter',
                        'fg_color': '#1F4E78',
                        'font_color': '#FFFFFF',
                    })
                        
                    # Obtener información del usuario y fecha/hora
                    user_name = "Usuario Anónimo"
                    if request.user.is_authenticated:
                        user_name = request.user.email
                    current_time = timezone.now().strftime("%d/%m/%Y %H:%M:%S")
                    footer_text = f"Generado por: {user_name}"

                    # Primera línea del pie (fila combinada)
                    worksheet.merge_range(
                        footer_start_row, 0,  # Desde columna A
                        footer_start_row, 13333,  # Hasta columna G
                    footer_text,
                        footer_format
                    )
                    
                    # Segunda línea del pie (fila combinada debajo)
                    worksheet.merge_range(
                        footer_start_row + 1, 0, 
                        footer_start_row + 1, 13333,
                        f"Fecha y hora de generación: {current_time}",
                        footer_format
                    )

                    # Ajustar altura de las filas del pie
                    worksheet.set_row(footer_start_row, 20)  # Altura 20 para primera línea
                    worksheet.set_row(footer_start_row + 1, 20)  # Altura 20 para segunda línea


                    # Formato de fondo azul oscuro para las primeras tres filas
                    background_format = workbook.add_format({
                        'fg_color': '#1F4E78',  # Dark Blue
                        'border': 0,
                    })

                    # Aplicar fondo azul oscuro a las primeras tres filas
                    worksheet.set_row(0, 20, background_format)
                    worksheet.set_row(1, 20, background_format)
                    worksheet.set_row(2, 20, background_format)

                    # Insertar la imagen en la primera fila
                    worksheet.insert_image('A1', 'media/images/Logo.png', {'x_scale': 0.5, 'y_scale': 0.5})
                    
                    rif_format = workbook.add_format({
                        'bold': True,
                        'font_size': 12,
                        'align': 'center',
                        'valign': 'vcenter',
                        'fg_color': '#1F4E78',  # Dark Blue
                        'font_color': '#FFFFFF',  # White
                    })
                    worksheet.merge_range('A2:G2', 'RIF: J-075199600', rif_format)  # RIF in row 3
                    # Agregar un título en la segunda fila
                    worksheet.merge_range('A3:E3', 'Compras Completadas del Proveedor', title_format)

                    # Aplicar formato al encabezado
                    for col_num, value in enumerate(df.columns.values):
                        worksheet.write(3, col_num, value, header_format)  # Header on row 4

                    # Ajustar automáticamente el ancho de las columnas
                    for column in df:
                        column_length = max(df[column].astype(str).map(len).max(), len(column))
                        col_idx = df.columns.get_loc(column)
                        worksheet.set_column(col_idx, col_idx, column_length)

                    # Agregar un gráfico
                    chart = workbook.add_chart({'type': 'column'})

                    # Configurar la serie del gráfico desde los datos del DataFrame.
                    chart.add_series({
                        'name': '=Compras Completadas!$E$4',
                        'categories': '=Compras Completadas!$B$5:$B$' + str(len(df) + 3),
                        'values': '=Compras Completadas!$E$5:$E$' + str(len(df) + 3),
                    })

                    # Agregar un título y etiquetas a los ejes del gráfico.
                    chart.set_title({'name': 'Costo Total por Producto'})
                    chart.set_x_axis({'name': 'Producto'})
                    chart.set_y_axis({'name': 'Costo Total'})

                    # Insertar el gráfico en la hoja de trabajo.
                    worksheet.insert_chart('G4', chart)
                log_user_action(request.user, "exportar ordenes", None, f"Se han exportado las ordenes del proveedor con id: {id}")

                return response
        except Exception as e:
            return Response({"detail": f"Error al generar el reporte: {str(e)}"}, status=500)

