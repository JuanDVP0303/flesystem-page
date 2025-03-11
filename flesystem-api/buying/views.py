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