from rest_framework import serializers
from .models import Account, AuditLog

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ("email", "id", "is_superuser", "is_active", "is_staff", "created_at", "groups", "user_permissions", "kind_of_person", "phone", "document", "rif")
        
class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['user', 'action', 'description', 'timestamp']

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "email": obj.user.email,
            "kind_of_person": obj.user.kind_of_person
        }