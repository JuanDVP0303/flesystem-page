from django.contrib import admin

# Register your models here.
from .models import BuyingRecords, BuyingRecordsProducts

admin.site.register(BuyingRecords)
admin.site.register(BuyingRecordsProducts)