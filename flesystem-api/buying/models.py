from django.db import models

# Create your models here.
class BuyingRecords(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('COMPLETED', 'Completada'),
        ('CANCELLED', 'Cancelada'),
    ]
    created_at = models.DateTimeField(auto_now_add=True)
    purchase_date = models.DateField(default=None)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_cost = models.FloatField(null=True, blank=True)
    user = models.ForeignKey("users.Account", on_delete=models.CASCADE, null=True, blank=True)
    
    def __str__(self):
        return f"Orden {self.id} - {self.provider.name}"
    
class BuyingRecordsProducts(models.Model):
    buying_record = models.ForeignKey(BuyingRecords, on_delete=models.CASCADE)
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
