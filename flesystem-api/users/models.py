from django.db import models
from django.contrib.auth.models import (
    PermissionsMixin,
    BaseUserManager,
    AbstractBaseUser,
)

# from django.utils.translation import gettext_lazy as _

class UserAccountManager(BaseUserManager):
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        # if not profile_picture:
        # raise ValueError("Por favor, sube una imagen de perfil.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        user.is_staff = False
        return user

    def create_superuser(self, email, password, **kwargs):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **kwargs)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        return user


class Account(AbstractBaseUser, PermissionsMixin):
    KIND_OF_PERSONS = (
        ("client", "Client"),
        ("operator", "Operator"),
        ("admin", "Admin"),
    )
    email = models.EmailField(max_length=255, unique=True)
    document = models.CharField(max_length=255, unique=True, null=True)
    phone = models.CharField(max_length=255, unique=True, null=True)
    rif = models.CharField(max_length=255, unique=True, null=True)
    kind_of_person = models.CharField(max_length=255, default="client", choices=KIND_OF_PERSONS)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    groups = models.ManyToManyField(
        "auth.Group",
        verbose_name="groups",
        blank=True,
        help_text="The groups this user belongs to.",
        related_name="account_set",
        related_query_name="account",
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        verbose_name="user permissions",
        blank=True,
        help_text="Specific permissions for this user.",
        related_name="account_set",
        related_query_name="account",
    )
    USERNAME_FIELD = "email"
    # REQUIRED_FIELDS = ["email"]
    objects = UserAccountManager()
