from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BuyingRecords, BuyingRecordsProducts
from .serializers import BuyingRecordsSerializer
from django.utils import timezone
from django.db import transaction
from .services import update_product_batches
from users.services import log_user_action
import pandas as pd
from django.http import HttpResponse
from django.db.models import F
from purchase.models import Order
from purchase.serializers import OrderSerializer

class BuyingRecordsViewsets(viewsets.ModelViewSet):
    queryset = BuyingRecords.objects.all()
    serializer_class = BuyingRecordsSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='create-buying-record')
    def create_buying_record(self, request):
        products = request.data.get('products', [])
        
        if not products:
            return Response({"error": "No products provided"}, status=status.HTTP_400_BAD_REQUEST)
        total_cost = 0
        buying_record = BuyingRecords.objects.create(
            purchase_date=timezone.now().date(),
            user=request.user
        )

        for product_data in products:
            sell_price = product_data['sell_price']
            quantity = product_data['quantity']
            
            BuyingRecordsProducts.objects.create(
                buying_record=buying_record,
                product_id=product_data['id'],
                quantity=quantity,
            )
            
            total_cost += quantity * sell_price

        buying_record.total_cost = total_cost
        buying_record.save()
        log_user_action(request.user, "pedido", buying_record.id, f"Se ha creado el registro de pedido {buying_record.id}")
        
        
        serializer = self.get_serializer(buying_record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='get-buying-records')
    def get_buying_records(self, request):
        user = request.user
        if user.kind_of_person == "client":
            buying_records = BuyingRecords.objects.filter(user=user)
        else:
            buying_records = BuyingRecords.objects.all()
        buying_records = buying_records.order_by("-created_at")
        
        serializer = self.get_serializer(buying_records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, id=None):
        buying_record = self.get_object()
        new_status = request.data.get('status')

        if new_status not in [status for status, _ in BuyingRecords.STATUS_CHOICES]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == 'COMPLETED' and buying_record.status != 'COMPLETED':
            try:
                with transaction.atomic():
                    for product_record in BuyingRecordsProducts.objects.filter(buying_record=buying_record):
                        update_product_batches(product_record.product, product_record.quantity)
                    
                    buying_record.status = new_status
                    buying_record.save()
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            buying_record.status = new_status
            buying_record.save()
        log_user_action(request.user, "pedido", buying_record.id, f"Se ha actualizado el estado del pedido {buying_record.id} a {buying_record.get_status_display()}")

        serializer = self.get_serializer(buying_record)
        return Response(serializer.data)
    
    
    @action(detail=False, methods=['get'], url_path='export-buying')
    def export_orders(self, request):
        """
        Exporta las órdenes de compra en formato Excel.
        """
        try:
            orders = BuyingRecords.objects.all().values(
                'created_at',
                'purchase_date',
                'status',
                'total_cost',
                'user__email'
            )
            
            #Hacer un annotate para traducir los estatus a español
            # Crear un DataFrame con los datos
            df = pd.DataFrame(list(orders))

            # Verificar si hay datos para exportar
            if df.empty:
                return Response({"detail": "No hay órdenes para exportar."}, status=404)

            # Renombrar las columnas al español
            df.rename(columns={
                'created_at': 'Fecha de Creación',
                'purchase_date': 'Fecha de Compra',
                'status': 'Estado',
                'total_cost': 'Costo Total',
                'user__email': 'Usuario'
            }, inplace=True)

            # Convertir las fechas a formato legible (sin hora)
            for column in ['Fecha de Compra', 'Fecha de Creación']:
                if column in df.columns:
                    df[column] = pd.to_datetime(df[column]).dt.date

            # Generar el archivo Excel
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="ordenes_compras.xlsx"'

            with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
                reemplazos = {
                    'COMPLETED': 'Completado',
                    'PENDING': 'Pendiente',
                    'CANCELLED': 'Cancelado'
                }
                print("reemplazos", reemplazos)
                #Cambiar los estatus a español
                df['Estado'] = df['Estado'].replace(reemplazos)
                df.to_excel(writer, index=False, sheet_name='Ordenes Compras', startrow=3)  # Start from row 4
                workbook = writer.book
                worksheet = writer.sheets['Ordenes Compras']
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
                worksheet.merge_range('A3:E3', 'Pedidos', title_format)

                # Aplicar formato al encabezado
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(3, col_num, value, header_format)  # Header on row 4

                # Ajustar automáticamente el ancho de las columnas
                for column in df:
                    column_length = max(df[column].astype(str).map(len).max(), len(column))
                    col_idx = df.columns.get_loc(column)
                    worksheet.set_column(col_idx, col_idx, column_length)

                # Agregar un gráfico
            log_user_action(request.user, "exportar pedidos", None, f"Se han exportado todos los pedidos a Excel")

            return response
        except Exception as e:
            return Response({"detail": f"Error al generar el reporte: {str(e)}"}, status=500)


