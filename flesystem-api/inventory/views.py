from django.shortcuts import render
from rest_framework import viewsets, status
from .models import Inventory, Product, Movement, ProductBatch
from .serializer import ProductBatchSerializer, ProductSerializer, MovementSerializer
from rest_framework.decorators import action
# from operators.models import Operator
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from django.db.models import Sum, F, Count
from rest_framework.response import Response
import pandas as pd
from django.db.models.functions import Trunc
from django.utils import timezone
from datetime import datetime, timedelta
from django.http import HttpResponse
from io import BytesIO

# from audits.views import create_movement, asign_credits
# from operators.models import OperationsCategories, Bank, BranchOffice
from .utils import generate_random_id, get_operator_and_validate, divide_batches
from .reports import generate_csv_response, generate_excel_response, generate_pdf_response
from users.services import log_user_action
# from audits.utils import dollar_to_local, convert_amount_to_dollar

class ProductsViewset(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = 'name' 
    
    def get_object(self):
        queryset = self.get_queryset()
        filter = {}
        filter[self.lookup_field] = self.kwargs[self.lookup_field]
        print("FILTER", filter)
        return get_object_or_404(queryset, **filter)
    
    def get_serializer_context(self):
        # Llama al método de la clase base para obtener el contexto por defecto
        context = super().get_serializer_context()
        # Agrega el valor del inventario al contexto
        context['currency'] = self.request.query_params.get("currency")
        print("CONTEXT", context)
        return context
    
    def get_queryset(self):
        inventory = Inventory.objects.last()
        products = inventory.products.all()
        if self.request.query_params.get("name"):
            products = products.filter(name__icontains=self.request.query_params.get("name"))
        # self.inventory_value = products.aggregate(
        #     total_value=Sum(F('price_unit') * F('quantity'))
        # ).get('total_value', 0)
        
        batches = ProductBatch.objects.filter(product__in=products)
        self.inventory_value = batches.aggregate(
            total_value=Sum(F('price_unit') * F('quantity'))
        ).get('total_value', 0)
        self.inventory_value = f"{self.inventory_value:.2f} {'BS'}" if self.inventory_value else f"0.00 {'BS'}"
        return products.exclude(active=False).order_by('-date')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        print(queryset)
        #Mostrar los query params
        print("QUERY PARAMS", request.query_params)
        print("LISTANDO")
        if request.query_params.get("provider"):
            provider = request.query_params.get("provider")
            queryset = queryset.filter(provider__id=provider)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        # Create a custom response including both products and inventory value
        response_data = {
            'products': serializer.data,
            'inventory_value': self.inventory_value
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        inventory = Inventory.objects.last()
        name = request.data.get("name")
        if Product.objects.filter(name=name).exists():
            raise ValidationError({"name": "Ya existe un producto con este nombre"})
        total_cost = 0
        data = request.data.copy() 
        if request.data.get("sku"):
            if Product.objects.filter(sku=request.data.get("sku")).exists():
                raise ValidationError({"sku": "Ya existe un producto con este SKU"})
        data["active"] = True
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()


        sell_price = request.data.get("sell_price")
        sell_price = sell_price
        inventory.products.add(product)
        log_user_action(request.user, "crear producto", product.id, f"Se creó el producto {product.name}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
      
    @action(detail=False, methods=['delete'], url_path='delete-product', url_name='delete-product')
    def delete_product(self, request, *args, **kwargs):
        operatorId = request.query_params.get("office")
        inventory = Inventory.objects.last()
        branch_office = request.query_params.get("branch_office")
        product_id = request.query_params.get("product")
        product = get_object_or_404(Product, id=product_id)
        
        
        batches = ProductBatch.objects.filter(product=product)
        for batch in batches:
            batch.delete()
        
        
        log_user_action(request.user, "borrar producto", product.id, f"Se eliminó el producto {product.name}")
        product.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
       
    @action(detail=True, methods=['post'])
    def withdraw_product(self, request, *args, **kwargs):
        operatorId = request.data.get("office")
        inventory = Inventory.objects.last()
        
        # operator,inventory, error = get_operator_and_validate(operatorId, request.user)
        product_id = request.data.get("product").get("id")
        quantity = float(request.data.get("quantity"))
        movement_type = request.data.get("movement_type")
        location = request.data.get("location")
  
        product = get_object_or_404(Product, id=product_id)
        batches = ProductBatch.objects.filter(product=product)

        if location:
            batches = batches.filter(location=location)

        batches_quantity = batches.aggregate(total_quantity=Sum('quantity')).get('total_quantity', 0)
        batches_quantity = batches_quantity if batches_quantity else 0
        
        if batches_quantity < quantity:
            raise ValidationError({"quantity": "No hay suficiente cantidad de este producto en ese almacen"})
        # if batch.quantity < quantity:
        #     raise ValidationError({"quantity": "No hay suficiente cantidad de este producto"})
        
        quantity_withdrawn = 0
        for batch in batches:
            if quantity_withdrawn < quantity:
                if batch.quantity >= quantity - quantity_withdrawn:
                    batch.quantity -= quantity - quantity_withdrawn
                    quantity_withdrawn = quantity
                else:
                    quantity_withdrawn += batch.quantity
                    batch.quantity = 0
                batch.save()
            
        # print("BATCH",batches)
        
        # return Response({"error": "No se puede retirar la cantidad solicitada"}, status=status.HTTP_400_BAD_REQUEST)
        # movement_record = Movement(operator=operator, quantity=quantity, movement_type=movement_type, date=datetime.now())
            
        # if request.data.get("bank"):
        #     detail = OperationsCategories.objects.get_or_create(name="Venta")[0]
        #     bank = get_object_or_404(Bank, id=request.data.get("bank"))
        #     motive = request.data.get("motive")
        #     print(product.sell_price, quantity)
        #     data = {
        #         "operation_type": "+",
        #         "amount": str(product.sell_price * quantity),
        #         "sub_detail": motive if motive and motive != "" else "Venta del producto: " + product.name,
        #         "detail": detail
        #     }
        #     date = datetime.now().strftime("%Y-%m-%d")
        #     detail.operators.add(operator)
        #     asign_credits(None, bank, data)
        #     movement = create_movement(data, date, False, operator, detail,bank=bank, request=request)
        #     movement_record.with_sale = movement
        product.save()
        batch.save()
        
        # if variant and variant != "":
        #     movement_record.product_variant = product
        #     movement_record.product = product.product
        #     product = product.product
        # else:
        #     movement_record.product = product
        # # movement_record.save()    
        
        
        return Response(self.get_serializer(product).data, status=status.HTTP_200_OK)
      
    def update_batch(self, request, batch, data):
        ProductBatch.objects.filter(id=batch.id).update(
            quantity=data.get("quantity", batch.quantity),
            price_unit=data.get("price_unit", batch.price_unit),
            sell_price=data.get("sell_price", batch.sell_price),
            location=data.get("location", batch.location),
            waste=data.get("waste", batch.waste),
            safety_stock=data.get("safety_stock", batch.safety_stock),
            unit_of_measure=data.get("unit_of_measure", batch.unit_of_measure),
            description=data.get("description", batch.description)
        )
       
    @action(detail=False, methods=['get'])
    def get_product(self, request, *args, **kwargs):
        product_id = request.query_params.get("product")
        currency = request.query_params.get("currency")
        product = get_object_or_404(Product, id=product_id)
        
        product_serializer = ProductSerializer(product, context={
            'currency': currency
        }).data
        data = {
            "product":product_serializer,
        }
        response = Response(data, status=status.HTTP_200_OK)
        return response
    
    @action(detail=False, methods=['put'])
    def edit_product(self, request, *args, **kwargs):
        operatorId = request.data.get("office")
        product_id = request.data.get("id")
        batch = request.data.get("batch")
        print(request.data)
        print("PRODUCT", product_id)
        product = get_object_or_404(Product, id=product_id)
        
        data = request.data
        serializer = ProductSerializer(product, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if batch:
            batch = get_object_or_404(ProductBatch, batch=batch)
            self.update_batch(request, batch, data)
        log_user_action(request.user, "editar producto", product.id, f"Se editó el producto {product.name}")
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'])
    def delete_batch(self, request, *args, **kwargs):
        batch = request.query_params.get("batch")
        inventory = Inventory.objects.last()
        batch = get_object_or_404(ProductBatch, batch=batch)
        print("BATCH", batch)
        product_batch = batch.product
        batches = ProductBatch.objects.filter(product=product_batch)
        if batches.count() == 1:
            return Response({"error": "No se puede eliminar el único lote de un producto"}, status=status.HTTP_400_BAD_REQUEST)
        batch.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def divide_batch(self, request, *args, **kwargs):
        batch = request.data.get("batch")
        quantity = request.data.get("division_quantity")
        location = request.data.get("location")
        operatorId = request.data.get("office")
        inventory = Inventory.objects.last()
               
        if not batch or not quantity:
            raise ValidationError({"batch": "El lote no puede ser nulo o de cantidad nula"})
        new_batch = divide_batches(batch, quantity, location)
        return Response(ProductBatchSerializer(new_batch).data, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['get'])
    def get_locations(self, request, *args, **kwargs):
        operator_id = request.query_params.get("office")
        inventory = Inventory.objects.last()        
        # products = inventory.products.all()
        # locations = products.values_list('location', flat=True).distinct()
        locations = ProductBatch.objects.filter(product__in=inventory.products.all()).values_list('location', flat=True).distinct()
        is_any_null = any([location == None for location in locations])
        if is_any_null:
            #Reemplazar el nulo por "Sin ubicación"
            locations = ["Sin ubicación" if location == None else location for location in locations]
        
        return Response(locations, status=status.HTTP_200_OK)
                
    @action(detail=False, methods=['get'])
    def get_products_by_location(self, request, *args, **kwargs):
        operatorId = request.query_params.get("office")
        inventory = Inventory.objects.last()
        location = request.query_params.get("location")
        if location == "Sin ubicación":
            location = None
        
        batches = ProductBatch.objects.filter(
            product__in=inventory.products.all(),
            location=location
        ).values(
            'product__name', 'location', 'unit_of_measure', 'quantity', 'id'
        ).annotate(
            total_quantity=Sum('quantity')
        )

    # Return the grouped and annotated batches
        return Response(list(batches), status=status.HTTP_200_OK)
    
    
    @action(detail=False, methods=['post'])
    def transfer_products(self, request, *args, **kwargs ):
        data = request.data
        products = data.get("products")
        destiny_location = data.get("destiny_location")
        origin_location = data.get("origin_location")
        if origin_location == "Sin ubicación":
            origin_location = None
        if destiny_location == origin_location:
            return Response({"error": "La ubicación de origen y destino no pueden ser iguales"}, status=status.HTTP_400_BAD_REQUEST)
        new_batches= []
        for product in products:
            batch = get_object_or_404(ProductBatch, id=product.get("id"))
            if batch.location != origin_location:
                return Response({"error": "El lote no se encuentra en la ubicación de origen"}, status=status.HTTP_400_BAD_REQUEST)
            new_batch = divide_batches(batch.batch, product.get("quantity"), destiny_location)
            new_batches.append(new_batch)
        return Response(ProductBatchSerializer(new_batches, many=True).data, status=status.HTTP_200_OK)        
        
        
    @action(detail=False, methods=['get'], url_path='min-stock-products', url_name='min-stock-products')
    def get_min_stock_produts(self, request, *args, **kwargs):
        inventory = Inventory.objects.last()
        products = inventory.products.all()
        min_stock_products = []
        for product in products:
            batches = ProductBatch.objects.filter(product=product)
            total_quantity = batches.aggregate(total_quantity=Sum('quantity')).get('total_quantity', 0) or 0
            print("TOTAL", total_quantity, product.min_stock)
            if not product.min_stock:
                continue
            if total_quantity <= product.min_stock + 5:
                min_stock_products.append({
                    'product_name': product.name,
                    'total_quantity': total_quantity,
                    'min_stock': product.min_stock,
                    'max_stock': product.max_stock,
                    'product_id': product.id,
                    'provider_id': product.provider.id,
                    'sell_price': product.sell_price
                })        
        
        return Response(min_stock_products, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'], url_path='export-available-products', url_name='export-available-products')
    def export_available_products(self, request, *args, **kwargs):
        """
        Exporta los productos disponibles (no cerca de su stock mínimo) en formato Excel.
        """
        try:
            # Obtener el inventario actual y los productos
            inventory = Inventory.objects.last()
            products = inventory.products.all()

            available_products = []

            for product in products:
                batches = ProductBatch.objects.filter(product=product)
                total_quantity = batches.aggregate(total_quantity=Sum('quantity')).get('total_quantity', 0) or 0

                # Verificar si el producto tiene configurado un stock mínimo
                if not product.min_stock:
                    continue

                # Si el total está por encima del rango de alerta, se considera disponible
                if total_quantity > product.min_stock + 5:
                    available_products.append({
                        'product_name': product.name,
                        'total_quantity': total_quantity,
                        'min_stock': product.min_stock,
                        'max_stock': product.max_stock,
                        # 'product_id': product.id,
                        'provider_id': product.provider.id if product.provider else None,
                        'sell_price': product.sell_price
                    })

            # Verificar si hay productos disponibles para exportar
            if not available_products:
                return Response({"detail": "No hay productos disponibles para exportar."}, status=404)

            # Crear un DataFrame con los datos
            df = pd.DataFrame(available_products)

            # Renombrar las columnas al español
            df = df.rename(columns={
                'product_name': 'Producto',
                'total_quantity': 'Cantidad Total',
                'min_stock': 'Stock Mínimo',
                'max_stock': 'Stock Máximo',
                # 'product_id': 'ID del Producto',
                'provider_id': 'ID del Proveedor',
                'sell_price': 'Precio de Venta'
            })

            # Generar el archivo Excel
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="productos_disponibles.xlsx"'

            with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Productos Disponibles', startrow=3)  # Start from row 4
                workbook = writer.book
                worksheet = writer.sheets['Productos Disponibles']

                # Formato para el título
                title_format = workbook.add_format({
                    'bold': True,
                    'font_size': 18,
                    'align': 'center',
                    'valign': 'vcenter',
                    'fg_color': '#1F4E78',  # Dark Blue
                    'font_color': '#FFFFFF',  # White
                })


                # Formato para el encabezado
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#9BBB59',  # Light Olive Green
                    'font_color': '#FFFFFF',  # White
                    'border': 1,
                    'align': 'center',
                })

                # Formato de fondo azul oscuro para las primeras tres filas
                background_format = workbook.add_format({
                    'fg_color': '#1F4E78',  # Dark Blue
                    'border': 0,
                })
                
                footer_row = 4 + len(df)  # Fila después de los datos (0-based)
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


                # Aplicar fondo azul oscuro a las primeras tres filas
                worksheet.set_row(0, 20, background_format)
                worksheet.set_row(1, 20, background_format)
                worksheet.set_row(2, 20, background_format)

                # Insertar la imagen en la primera fila
                worksheet.insert_image('A1', 'media/images/Logo.png', {'x_scale': 0.5, 'y_scale': 0.5})

                # Agregar un título en la segunda fila
                worksheet.merge_range('A3:G3', 'Productos Disponibles en Inventario', title_format)
                
                rif_format = workbook.add_format({
                    'bold': True,
                    'font_size': 12,
                    'align': 'center',
                    'valign': 'vcenter',
                    'fg_color': '#1F4E78',  # Dark Blue
                    'font_color': '#FFFFFF',  # White
                })
                worksheet.merge_range('A2:G2', 'RIF: J-075199600', rif_format)  # RIF in row 3
                # Aplicar formato al encabezado
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(3, col_num, value, header_format)  # Header on row 4

                # Ajustar automáticamente el ancho de las columnas
                for column in df:
                    column_length = max(df[column].astype(str).map(len).max(), len(column))
                    col_idx = df.columns.get_loc(column)
                    worksheet.set_column(col_idx, col_idx, column_length + 2)  # Add some padding

                # Aplicar formato a las celdas de datos (ejemplo: precios como moneda)
                currency_format = workbook.add_format({'num_format': '$#,##0.00'})  # Currency format
                for col_num, column in enumerate(df.columns):
                    if column == "Precio de Venta":
                        for row_num in range(4, len(df) + 4):  # Data starts from row 4
                            worksheet.write_number(row_num, col_num, df.iloc[row_num - 4][column], currency_format)

                # Crear una gráfica básica (ejemplo: Cantidad Total vs Stock Mínimo)
                # # chart = workbook.add_chart({'type': 'column'})

                # # chart.add_series({
                # #     'name': '=Productos Disponibles!$B$4',  # Title of the series (Cantidad Total)
                # #     'categories': f'=Productos Disponibles!$A$5:$A${len(df) + 3}',  # Categories (Productos)
                # #     'values': f'=Productos Disponibles!$B$5:$A${len(df) + 3}',  # Values (Cantidad Total)
                # #     'fill': {'color': '#4F81BD'},  # Bar color
                # #     'data_labels': {'value': True},  # Show values on bars
                # # })

                # # chart.set_title({'name': 'Cantidad Total de Productos'})
                # # chart.set_x_axis({'name': 'Producto'})
                # # chart.set_y_axis({'name': 'Cantidad Total'})

                # # Insertar la gráfica en la hoja de cálculo
                # worksheet.insert_chart('I5', chart)

            return response

        except Exception as e:
            return Response({"detail": f"Error al generar el reporte: {str(e)}"}, status=500)

class MovementsViewset(viewsets.ModelViewSet):
    queryset = Movement.objects.all()
    serializer_class = MovementSerializer

    def get_queryset(self):
        type = self.request.query_params.get("type")
        inventory = Inventory.objects.last()
        # Obtener los productos del inventario
        movements = Movement.objects.filter(product__in=inventory.products.all())
        if type != "general":
            movements = movements.filter(movement_type=type)
        
        return movements.order_by('-date')



class InventoryReportsViewset(viewsets.ViewSet):
    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock_report(self, request):
        try:
            threshold = request.query_params.get('threshold', 10)
            inventory = Inventory.objects.last()
            products = inventory.products.all()
            min_stock_products = []
            
            for product in products:
                batches = ProductBatch.objects.filter(product=product)
                total_quantity = batches.aggregate(total_quantity=Sum('quantity')).get('total_quantity', 0) or 0
                if not product.min_stock:
                    continue
                if total_quantity <= product.min_stock + 5:
                    min_stock_products.append({
                        'product_name': product.name,
                        'total_quantity': total_quantity,
                        'min_stock': product.min_stock,
                        'max_stock': product.max_stock,
                        'product_id': product.id,
                        'provider_id': product.provider.id if product.provider else None,
                        'provider_name': product.provider.name if product.provider else None,
                        'sell_price': product.sell_price
                    })

            # Crear DataFrame con los datos
            df = pd.DataFrame([{
                "Producto": p.get("product_name"),
                "Stock Actual": p.get("total_quantity"),
                "Precio de Venta": p.get("sell_price"),
                "Proveedor": p.get("provider_name"),
                "Stock Mínimo": p.get("min_stock"),
                "Stock Máximo": p.get("max_stock"),
            } for p in min_stock_products])

            # if df.empty:
            #     import json
            #     return HttpResponse(
            #         json.dumps({"error": "No hay productos con stock bajo"}),
            #         status=404,
            #         content_type="application/json"
            #     )

            # Configurar respuesta HTTP
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="informe_stock_bajo.xlsx"'

            with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Stock Bajo', startrow=3)
                workbook = writer.book
                worksheet = writer.sheets['Stock Bajo']

                # Formato para encabezados
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })

                # Formato de título
                title_format = workbook.add_format({
                    'bold': True,
                    'font_size': 18,
                    'align': 'center',
                    'valign': 'vcenter',
                    'font_color': '#FFFFFF',
                    'fg_color': '#1F4E78',
                })
                footer_row = 4 + len(df)  # Fila después de los datos (0-based)
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
                # Fondo azul para primeras filas
                background_format = workbook.add_format({'fg_color': '#1F4E78'})
                
                # Aplicar formatos
                for row in range(0, 3):
                    worksheet.set_row(row, 20, background_format)

                # Insertar logo y texto
                worksheet.insert_image('A1', 'media/images/Logo.png', {'x_scale': 0.5, 'y_scale': 0.5})
                worksheet.merge_range('A2:F2', 'RIF: J-075199600', workbook.add_format({
                    'bold': True,
                    'font_size': 12,
                    'align': 'center',
                    'valign': 'vcenter',
                    'font_color': '#FFFFFF',
                    'fg_color': '#1F4E78'
                }))
                worksheet.merge_range('A3:F3', 'Reporte de Stock Bajo', title_format)

                # Aplicar formato a encabezados de columna
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(3, col_num, value, header_format)

                # Ajustar anchos de columnas
                for idx, col in enumerate(df.columns):
                    max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                    worksheet.set_column(idx, idx, max_len)

            return response

        except Exception as e:
            print(f"Error generando reporte: {str(e)}")
            import json
            return HttpResponse(
                json.dumps({"error": f"Error interno: {str(e)}"}),
                status=500,
                content_type="application/json"
            )
        
    @action(detail=False, methods=['get'], url_path='sales-trends')
    def sales_trends_report(self, request):
        # Parámetros de la solicitud
        period = request.query_params.get('period', 'daily')
        format_file = request.query_params.get('format_file', 'json')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Configurar fechas
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        # Configurar el truncamiento de fecha según el período
        date_trunc = {
            'daily': 'day',
            'weekly': 'week',
            'monthly': 'month',
            'annual': 'year'
        }.get(period, 'day')

        # Consulta para obtener las tendencias de ventas
        trends = Movement.objects.filter(
            movement_type='outcome',
            date__range=(start_date, end_date)
        ).annotate(
            period=Trunc('date', date_trunc)
        ).values('period', 'product__name', 'product__sell_price').annotate(
            total_quantity=Sum('quantity'),
            total_sales=Sum(F('quantity') * F('product__sell_price')),
            # products_sold=Count('product', distinct=True)
        ).order_by('period', '-total_sales')

        # Procesar datos
        data = []
        for t in trends:
            data.append({
                "date": t['period'].strftime('%Y-%m-%d'),
                "period": t['period'],
                "product": t['product__name'],
                "product_price": round(t['product__sell_price'], 2),
                "total_quantity": int(t['total_quantity']),
                "total_sales": round(t['total_sales'], 2),
                # "products_sold": t['products_sold']
            })

        # Generar respuesta según el formato solicitado
        if format_file == 'pdf':
            return generate_pdf_response(data, 'sales_trends_report')
        elif format_file == 'excel':
            df = pd.DataFrame(data)
            return generate_excel_response(df, 'sales_trends_report', request)
        elif format_file == 'csv':
            df = pd.DataFrame(data)
            return generate_csv_response(df, 'sales_trends_report')
        else:
            return Response({
                "start_date": start_date,
                "end_date": end_date,
                "period": period,
                "data": data
            })
            
            
            
