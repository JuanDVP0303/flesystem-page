from rest_framework import serializers
from .models import Account

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ("email", "id", "is_superuser", "is_active", "is_staff", "created_at", "groups", "user_permissions", "kind_of_person", "phone", "document", "rif")
        