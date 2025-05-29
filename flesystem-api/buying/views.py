from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BuyingRecords, BuyingRecordsProducts, PaymentDetail
from .serializers import BuyingRecordsSerializer, PaymentDetailSerializer
from django.utils import timezone
from django.db import transaction
from .services import update_product_batches
from users.services import log_user_action
import pandas as pd
from django.http import HttpResponse
from django.db.models import F, Sum
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
        # payment_details = request.data.get('payment_details', [])
        #Seleccionar todos los campos del request.data que empiecen con 'payment_details' ya que el formato es payment_details[${index}][method], entoces agrupar por el index y crear una lista de diccionarios
        payment_details = []
        for key, value in request.data.items():
            if key.startswith('payment_details'):
                index = key.split('[')[1].split(']')[0]
                if len(payment_details) <= int(index):
                    payment_details.append({})
                field_name = key.split(']')[1][1:]  # Obtener el nombre del campo después del índice
                payment_details[int(index)][field_name] = value
                
        print("payment_details", payment_details)
        if not new_status:
            return Response({"error": "Nuevo Status es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_status not in [status for status, _ in BuyingRecords.STATUS_CHOICES]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Actualizar detalles de pago
                for payment_data in payment_details:
                    payment = PaymentDetail.objects.update_or_create(
                        buying_record=buying_record,
                        method=payment_data['method'],
                        defaults={
                            'amount': payment_data['amount'],
                            'reference': payment_data.get('reference', ''),
                        }
                    )
                    if 'proof' in payment_data:
                        #Hacer el save file del proof
                        payment[0].proof = payment_data['proof']
                        payment[0].save()
                
                # Calcular total pagado
                total_paid = buying_record.payment_details.aggregate(
                    total=Sum('amount')
                )['total'] or 0
                buying_record.total_paid = total_paid
                print("total_paid", total_paid, buying_record.total_cost)

                if new_status == 'COMPLETED' and buying_record.status != 'COMPLETED':
                    if total_paid < buying_record.total_cost:
                        return Response({"error": "El pago no cubre el total del pedido"}, status=status.HTTP_400_BAD_REQUEST)
                    
                    for product_record in BuyingRecordsProducts.objects.filter(buying_record=buying_record):
                        update_product_batches(product_record.product, product_record.quantity)
                    
                    buying_record.status = new_status
                    buying_record.payment_date = timezone.now()
                else:
                    buying_record.status = new_status
                
                buying_record.save()
                
            log_user_action(request.user, "pedido", buying_record.id, f"Se ha actualizado el estado del pedido {buying_record.id} a {buying_record.get_status_display()}")
            return Response(BuyingRecordsSerializer(buying_record).data)
        
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='add-payment')
    def add_payment(self, request, id=None):
        buying_record = self.get_object()
        payment_data = request.data
        
        try:
            with transaction.atomic():
                payment = PaymentDetail.objects.create(
                    buying_record=buying_record,
                    method=payment_data['method'],
                    amount=payment_data['amount'],
                    reference=payment_data.get('reference', ''),
                    proof=payment_data.get('proof', None)
                )
                
                # Actualizar total pagado
                buying_record.total_paid = buying_record.payment_details.aggregate(
                    total=Sum('amount')
                )['total'] or 0
                buying_record.save()
                
                return Response(PaymentDetailSerializer(payment).data)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
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


