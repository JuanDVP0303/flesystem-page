from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Account
from .serializers import AccountSerializer, AuditLogSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.exceptions import ValidationError
from inventory.models import Inventory
from .constants import PERMISSIONS
from rest_framework.decorators import action

from django.http import HttpResponse
from django.contrib.auth.decorators import user_passes_test
import subprocess
import os
from django.utils import timezone

from rest_framework import viewsets
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from .services import log_user_action
@user_passes_test(lambda u: u.is_superuser)
def export_database(request):
    try:
        # Ruta del archivo de la base de datos SQLite
        db_path = os.path.join(BASE_DIR, '../db.sqlite3')
        backup_file = "backup.sql"

        # Comando para exportar la base de datos usando sqlite3 y el comando .dump
        command = ["sqlite3", db_path, ".dump"]

        # Ejecutar el comando y capturar la salida
        with open(backup_file, "w") as f:
            process = subprocess.Popen(command, stdout=f, stderr=subprocess.PIPE)
            _, error = process.communicate()

        if process.returncode != 0:
            return HttpResponse(f"Error al exportar la base de datos: {error.decode('utf-8')}", status=500)

        # Leer el archivo generado y enviarlo como respuesta HTTP
        with open(backup_file, "r") as f:
            sql_data = f.read()

        response = HttpResponse(sql_data, content_type="application/sql")
        response["Content-Disposition"] = 'attachment; filename="database_export.sql"'

        # Eliminar el archivo temporal después de enviarlo
        os.remove(backup_file)

        return response

    except Exception as e:
        return HttpResponse(f"Error interno del servidor: {str(e)}", status=500)


class CreateUserView(APIView):
    def post(self, request, **kwargs):
        data = request.data.copy()
        if kwargs.get('management_user_data'):
            data = kwargs.get('management_user_data')
        print("DATA", data)
        serializer = AccountSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(data.get('password'))
            user.is_active = True
            user.save()
            
            if not data.get("kind_of_person"):
                log_user_action(user, "registro", None, f"El usuario {user.email} se ha registrado")
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                user_serializer = AccountSerializer(user)    
                return Response({"access_token": access_token, "refresh":refresh_token, "account":user_serializer.data}, status=status.HTTP_201_CREATED)
            else:
                log_user_action(request.user, "registro admin", user.id, f"El admin ha creado al usuario {user.email} como {'cliente' if user.kind_of_person == 'client' else 'operador'} ")
                
                return Response({"message":"Usuario creado exitosamente"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginUserView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = Account.objects.filter(email=email)
        if not user.exists():
            return Response({"error":"Usuario no encontrado"}, status=status.HTTP_400_BAD_REQUEST)
        user = user.first()
        user_serializer = AccountSerializer(user)
        if not user.is_active:
            return Response({"error":"Usuario inactivo"}, status=status.HTTP_400_BAD_REQUEST)
        if user.check_password(password):
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            log_user_action(user, "login", None, f"El usuario {user.email} inició sesión")
            
            return Response({"access_token": access_token, "refresh":refresh_token, "account":user_serializer.data}, status=status.HTTP_200_OK)
        return Response({"error":"Credenciales Invalidas"}, status=status.HTTP_400_BAD_REQUEST)

class LogoutUserView(APIView):
    def post(self, request):
        log_user_action(request.user, "logout", None, f"El usuario {request.user.email} cerró sesión")
        return Response({"message": "Sesión cerrada"}, status=status.HTTP_200_OK)

        # except Exception as e:
        #     return Response({"message": "Error al cerrar sesión", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UsersViewset(APIView):
    def get(self, request):
        if request.GET.get('auth'):
            print("AUTH", request.GET.get('auth'), request.user)
            user = Account.objects.get(id=request.user.id)
            serializer = AccountSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        if request.user.is_superuser:
            users = Account.objects.all().exclude(is_subsidiary=True).exclude(id=request.user.id)
            users_pf = Account.objects.filter(is_pf=True).exclude(id=request.user.id)
            users = users.union(users_pf)
            serializer = AccountSerializer(users, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({"error":"No tienes permisos para realizar esta accion"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        if request.user.is_superuser:
            user_id = self.request.query_params.get('user_id')
            user = Account.objects.get(id=user_id)
            log_user_action(request.user, "eliminar", user_id, f"Se ha eliminado el usuario con id {user_id}")
            if user.is_superuser:
                raise ValidationError({"error":"No puedes eliminar un superusuario"})
            user.delete()
            return Response({"message":"Usuario eliminado"}, status=status.HTTP_204_NO_CONTENT)
        
        
    # Acción personalizada para exportar la base de datos SQLite
  
class AdminViewset(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'], url_path='export-database', url_name='export_database')
    def export_database(self, request):
        if not request.user.is_superuser:
            return Response({"error": "No tienes permisos para realizar esta acción"}, status=status.HTTP_403_FORBIDDEN)

        try:
            # Ruta del archivo de la base de datos SQLite (un nivel atrás del settings.py)
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(BASE_DIR, 'db.sqlite3')
            print(db_path)

            # Archivo temporal para el volcado
            backup_file = "backup.sql"

            # Comando para exportar la base de datos usando sqlite3 y el comando .dump
            command = ["sqlite3", db_path, ".dump"]

            # Ejecutar el comando y capturar la salida
            with open(backup_file, "w") as f:
                process = subprocess.Popen(command, stdout=f, stderr=subprocess.PIPE)
                _, error = process.communicate()

            if process.returncode != 0:
                return Response({"error": f"Error al exportar la base de datos: {error.decode('utf-8')}"}, status=500)

            # Leer el archivo generado y enviarlo como respuesta HTTP
            with open(backup_file, "r") as f:
                sql_data = f.read()

            response = HttpResponse(sql_data, content_type="application/sql")
            response["Content-Disposition"] = 'attachment; filename="database_export.sql"'

            # Eliminar el archivo temporal después de enviarlo
            os.remove(backup_file)
            log_user_action(request.user, "exportar", None, f"Se ha exportado la base de datos")

            return response

        except Exception as e:
            return Response({"error": f"Error interno del servidor: {str(e)}"}, status=500)
        
    @action(detail=False, methods=['get'], url_path='audit-log', url_name='audit_log')
    def get_audit_log(self, request):
        print("REQUEST", request.user)
        if not request.user.is_superuser:
            return Response({"error": "No tienes permisos para realizar esta acción"}, status=status.HTTP_403_FORBIDDEN)
        from .models import AuditLog
        audit_log = AuditLog.objects.all().order_by("-timestamp")
        serializer = AuditLogSerializer(audit_log, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
class TokenRefreshCustomView(TokenRefreshView):
    pass

# class CountryList(APIView):
#     def get(self, request, format=None):
#         countries = [
#             {
#                 "code": country[0],
#                 "name": country[1]
#             } for country in COUNTRIES
#         ]
#         return Response(countries, status=status.HTTP_200_OK)