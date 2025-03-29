from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Account, AuditLog
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
import pandas as pd
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
        audit_log = AuditLog.objects.all().order_by("-timestamp")
        serializer = AuditLogSerializer(audit_log, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    # Dentro de tu viewset
   
    @action(detail=False, methods=['get'], url_path='export-audit-logs', url_name='export-audit-logs')
    def export_audits(self, request, *args, **kwargs):
        print("REQUEST", request.user)
        
        if not request.user.is_superuser:
            return Response({"error": "No tienes permisos para realizar esta acción"}, status=status.HTTP_403_FORBIDDEN)

        try:
            # Obtener todos los registros de auditoría
            audit_logs = AuditLog.objects.all().order_by("-timestamp").values(
                'user__email', 'action', 'item_id', 'description', 'timestamp'
            )


            # Crear un DataFrame con los datos
            df = pd.DataFrame(list(audit_logs))

            print("DF", df.head())
            # Verificar si hay datos para exportar
            # if df.empty:
            #     return Response({"detail": "No hay registros de auditoría."}, status=404)

            # Renombrar las columnas al español
            df = df.rename(columns={
                # 'id': 'ID de Registro',
                'user__email': 'Usuario',
                'action': 'Acción',
                'item_id': 'ID del Elemento',
                'description': 'Descripción',
                'timestamp': 'Fecha y Hora',
            })

            # Convertir las fechas a formato legible (sin hora)
            for column in ['Fecha y Hora']:
                if column in df.columns:
                    df[column] = pd.to_datetime(df[column]).dt.strftime('%Y-%m-%d %H:%M')

            # Generar el archivo Excel
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="registros_de_auditoria.xlsx"'

            with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Registros de Auditoría', startrow=3)  # Start from row 4
                workbook = writer.book
                worksheet = writer.sheets['Registros de Auditoría']

                # Formato para el encabezado
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })

                # Formato para el título
                title_format = workbook.add_format({
                    'bold': True,
                    'font_size': 18,
                    'align': 'center',
                    'valign': 'vcenter',
                    'font_color': '#0c8f00',  # White,
                    'fg_color': '#1F4E78',  # Dark Blue
                })

                # Formato de fondo azul oscuro para las primeras tres filas
                background_format = workbook.add_format({
                    'fg_color': '#1F4E78',  # Dark Blue
                    'border': 0,
                })

                # Aplicar fondo azul oscuro a las primeras tres filas
                worksheet.set_row(0, 20, background_format)
                worksheet.set_row(1, 20, background_format)
                worksheet.set_row(2, 20, background_format)

                # Insertar un título en la segunda fila
                worksheet.merge_range('A3:G3', 'Registros de Auditoría', title_format)
                worksheet.insert_image('A1', 'media/images/Logo.png', {'x_scale': 0.5, 'y_scale': 0.5})
                
                rif_format = workbook.add_format({
                    'bold': True,
                    'font_size': 12,
                    'align': 'center',
                    'valign': 'vcenter',
                    'fg_color': '#1F4E78',  # Dark Blue
                    'font_color': '#FFFFFF',  # White
                })
                worksheet.merge_range('A2:G2', 'RIF: J-075199600', rif_format)  # RIF in row 3
                # Agregar un título en la segunda fila

                # Aplicar formato al encabezado
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(3, col_num, value, header_format)  # Header on row 4

                # Ajustar automáticamente el ancho de las columnas
                for column in df:
                    column_length = max(df[column].astype(str).map(len).max(), len(column))
                    col_idx = df.columns.get_loc(column)
                    worksheet.set_column(col_idx, col_idx, column_length)
            log_user_action(request.user, "exportar auditoria", None, f"Se han exportado todas las auditorias")
            return response
        except Exception as e:
            print("ERROR", str(e))
            return HttpResponse({"error": "..."}, status=500, content_type="application/json")


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