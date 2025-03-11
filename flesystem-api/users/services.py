from .models import AuditLog

def log_user_action(user, action, item_id=None, description=""):
    AuditLog.objects.create(
        user=user,
        action=action,
        item_id=item_id,
        description=description
    )