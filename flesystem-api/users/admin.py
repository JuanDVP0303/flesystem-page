from django.contrib import admin
from .models import Account, AuditLog

admin.site.register(Account)
admin.site.register(AuditLog)
# Register your models here.
