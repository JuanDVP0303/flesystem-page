from django.db import models
from datetime import timedelta
# Create your models here.
class Provider(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    document = models.CharField(max_length=255, unique=True, null=True)
    phone = models.CharField(max_length=255, unique=True, null=True)
    rif = models.CharField(max_length=255, unique=True, null=True)

    def __str__(self):
        return self.name
    
class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('COMPLETED', 'Completada'),
        ('CANCELLED', 'Cancelada'),
    ]
    ORDER_TYPE_CHOICES = [
        ('COUNTED', 'Contado'),
        ('CREDIT', 'Crédito'),
        ('CONSIGNATION', 'consignation'),
    ]
    compensation_type = models.CharField(
        max_length=30,
        choices=[
            ('money', 'Monetario'),
            ('product', 'Productos'),
        ],
        null=True,
        blank=True
    )
    compensed = models.BooleanField(default=True)
    invoice_number = models.CharField(max_length=255, null=True, blank=True)
    provider = models.ForeignKey("purchase.Provider", on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    purchase_date = models.DateField(default=None)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_cost = models.FloatField(null=True, blank=True)
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField()
    real_quantity = models.PositiveIntegerField(null=True, blank=True)
    price_unit = models.FloatField(null=True, blank=True)
    credit_days = models.PositiveIntegerField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        default='COUNTED',
        null=True,
        blank=True
    )
    consignment_status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pendiente'),
            ('PARTIAL', 'Parcialmente vendido'),
            ('COMPLETED', 'Completado'),
            ('CANCELLED', 'Cancelado'),
        ],
        default='PENDING',
        null=True,
        blank=True
    )
    credit_paid = models.BooleanField(default=False)
    paid_date = models.DateField(null=True, blank=True)
    sold_quantity = models.PositiveIntegerField(default=0, null=True, blank=True)
    cancelled_reason = models.TextField(null=True, blank=True)
    
    def __str__(self):
        return f"Orden {self.id} - {self.provider.name}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2)

    def get_total_cost(self):
        return self.quantity * self.cost_per_unit
