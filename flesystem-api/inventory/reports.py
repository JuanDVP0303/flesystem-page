from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
import pandas as pd
from reportlab.pdfgen import canvas
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from io import BytesIO
import datetime
def generate_excel_response(df, filename):
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'

    # Renombrar las columnas al español
    df = df.rename(columns={
        'period': 'Periodo',
        'product': 'Producto',
        'product_price': 'Precio del Producto',
        'total_quantity': 'Cantidad Total',
        'total_sales': 'Ventas Totales'
    })

    # Convertir todas las columnas de fechas con zona horaria a timezone-naive
    for column in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[column]):
            if hasattr(df[column].dtype, "tz"):  # Si tiene zona horaria
                df[column] = df[column].dt.tz_localize(None)
            df[column] = df[column].dt.date
    with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Tendencias de Ventas')
        workbook = writer.book
        worksheet = writer.sheets['Tendencias de Ventas']
        
        # Formato para el encabezado
        header_format = workbook.add_format({
            'bold': True,
            'text_wrap': True,
            'valign': 'top',
            'fg_color': '#D7E4BC',
            'border': 1
        })

        # Aplicar formato al encabezado
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
        
        # Autoajustar el ancho de las columnas
        for column in df:
            column_length = max(df[column].astype(str).map(len).max(), len(column))
            col_idx = df.columns.get_loc(column)
            writer.sheets['Tendencias de Ventas'].set_column(col_idx, col_idx, column_length)

    return response

def generate_csv_response(df, filename):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'

    # Renombrar las columnas al español
    df = df.rename(columns={
        'period': 'Periodo',
        'product': 'Producto',
        'product_price': 'Precio del Producto',
        'total_quantity': 'Cantidad Total',
        'total_sales': 'Ventas Totales'
    })

    # Escribir el DataFrame en el archivo CSV
    df.to_csv(path_or_buf=response, index=False, encoding='utf-8-sig')  # utf-8-sig para compatibilidad con Excel
    return response
def generate_pdf_response(data, filename):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    # Estilos
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    normal_style = styles['Normal']

    # Título del reporte
    elements.append(Paragraph("Reporte de Tendencias de Ventas", title_style))
    elements.append(Spacer(1, 0.25 * inch))

    # Fecha de generación del reporte
    elements.append(Paragraph(f"Generado el: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    elements.append(Spacer(1, 0.25 * inch))

    # Tabla de datos
    table_data = [
        ["Periodo", "Producto", "Precio Producto", "Cantidad", "Ventas Totales",]
    ]  # Encabezados

    # Agregar filas a la tabla con los datos
    for item in data:
        # Formatear el periodo para que sea más legible (YYYY-MM-DD)
        formatted_period = item['period'].strftime('%Y-%m-%d')

        table_data.append([
            formatted_period,  # Periodo formateado
            item['product'],  # Producto
            f"Bs. {item['product_price']:.2f}",  # Precio del producto
            item['total_quantity'],  # Cantidad total vendida
            f"Bs. {item['total_sales']:.2f}",  # Ventas totales
        ])

    # Crear tabla con estilos personalizados
    table = Table(table_data, colWidths=[1.5 * inch, 2 * inch, 1.5 * inch, 1 * inch, 1.5 * inch, 1.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),  # Fondo gris para encabezados
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),  # Texto blanco para encabezados
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),  # Alinear todo al centro
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Fuente en negrita para encabezados
        ('FONTSIZE', (0, 0), (-1, 0), 12),  # Tamaño de fuente para encabezados
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),  # Espaciado inferior para encabezados

        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),  # Fondo beige para filas de datos
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),  # Texto negro para filas de datos
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),  # Fuente normal para filas de datos

        ('FONTSIZE', (0, 1), (-1, -1), 10),  # Tamaño de fuente para filas de datos
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),

        ('GRID', (0, 0), (-1, -1), 0.5, colors.black)  # Líneas de la tabla
    ]))

    elements.append(table)

    # Construir el PDF y devolverlo en la respuesta HTTP
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    response.write(pdf)
    return response


