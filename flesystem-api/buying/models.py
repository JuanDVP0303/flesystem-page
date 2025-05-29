from django.db import models

# Create your models here.
class PaymentDetail(models.Model):
    PAYMENT_METHODS = [
        ('effective', 'Efectivo'),
        ('transfer', 'Transferencia'),
        ('movil_pay', 'Pago Móvil'),
    ]
    buying_record = models.ForeignKey("buying.BuyingRecords", on_delete=models.CASCADE, related_name='payment_details')
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    amount = models.FloatField()
    reference = models.CharField(max_length=100, null=True, blank=True)
    proof = models.FileField(upload_to='payment_proofs/', null=True, blank=True)

class BuyingRecords(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('COMPLETED', 'Completada'),
        ('CANCELLED', 'Cancelada'),
    ]
    created_at = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, null=True, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    payment_proof = models.FileField(upload_to='payment_proofs/', null=True, blank=True)
    purchase_date = models.DateField(default=None)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_cost = models.FloatField(null=True, blank=True)
    user = models.ForeignKey("users.Account", on_delete=models.CASCADE, null=True, blank=True)
    total_paid = models.FloatField(default=0)  # Nuevo campo para almacenar el total pagado

    def __str__(self):
        return f"Orden {self.id}"
    
class BuyingRecordsProducts(models.Model):
    buying_record = models.ForeignKey(BuyingRecords, on_delete=models.CASCADE)
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
