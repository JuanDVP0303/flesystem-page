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
from django.template.loader import get_template
from xhtml2pdf import pisa
import pandas as pd
from django.http import HttpResponse
import xlsxwriter

def generate_excel_response(df, filename):
    """
    Generates a visually appealing and functional Excel file response.

    Args:
        df (pd.DataFrame): The DataFrame to export.
        filename (str): The desired filename (without extension).

    Returns:
        HttpResponse: An HTTP response containing the Excel file.
    """

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'

    # Rename columns to Spanish
    df = df.rename(
        columns={
            'period': 'Periodo',
            'product': 'Producto',
            'product_price': 'Precio del Producto',
            'total_quantity': 'Cantidad Total',
            'total_sales': 'Ventas Totales',
        }
    )

    # Convert timezone-aware datetime columns to timezone-naive dates
    for column in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[column]):
            if hasattr(df[column].dtype, "tz"):  # If timezone aware
                df[column] = df[column].dt.tz_localize(None)
            df[column] = df[column].dt.date  # Extract only the date part

    with pd.ExcelWriter(response, engine='xlsxwriter') as writer:
        df.to_excel(
            writer, index=False, sheet_name='Tendencias de Ventas', startrow=3
        )  # Start writing data from row 4

        workbook = writer.book
        worksheet = writer.sheets['Tendencias de Ventas']

        # Define formats
        title_format = workbook.add_format(
            {
                'bold': True,
                'font_size': 18,
                'align': 'center',
                'valign': 'vcenter',
                'font_color': '#0c8f00',  #Black
            }
        )

        header_format = workbook.add_format(
            {
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#9BBB59',  # Light Olive Green
                'font_color': '#FFFFFF',  # White
                'border': 1,
                'align': 'center',
            }
        )

        date_format = workbook.add_format({'num_format': 'dd/mm/yyyy'})  # Date format
        currency_format = workbook.add_format(
            {'num_format': '$#,##0.00'}
        )  # Currency format

        # Conditional formatting for top 10 sales
        top10_format = workbook.add_format(
            {'bg_color': '#FFC7CE', 'font_color': '#9C0006'}
        )  # Light red fill with dark red text

        # Total Format
        total_format = workbook.add_format(
            {
                'bold': True,
                'fg_color': '#F2F2F2',  # Light Gray
                'border': 1,
                'align': 'right',
            }
        )

        # Background format for the first three rows
        background_format = workbook.add_format(
            {
                'fg_color': '#1F4E78',  # Dark Blue
                'border': 0,
            }
        )

        # Apply background color to the first three rows
        worksheet.set_row(0, 20, background_format)
        worksheet.set_row(1, 20, background_format)
        worksheet.set_row(2, 20, background_format)
        worksheet.set_row(3, 20, background_format)

        # Insert the image in the first row
        worksheet.insert_image('A1', 'media/images/Logo.png', {'x_scale': 0.8, 'y_scale': 0.8})
        
        rif_format = workbook.add_format({
            'bold': True,
            'font_size': 12,
            'align': 'center',
            'valign': 'vcenter',
            'fg_color': '#1F4E78',  # Dark Blue
            'font_color': '#FFFFFF',  # White
        })
        worksheet.merge_range('A2:G2', 'RIF: J-075199600', rif_format)  # RIF in row 3
        # Add a title in the second row
        worksheet.merge_range('A4:E4', 'Tendencias de Ventas de Productos', title_format)

        # Apply header format
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(5, col_num, value, header_format)  # Header on row 4

        # Apply formats to data
        for column in df.columns:
            col_idx = df.columns.get_loc(column)
            for row_num in range(4, len(df) + 4):  # Start from row 4 (data start)
                cell_value = df.iloc[row_num - 4, col_idx]
                if pd.api.types.is_datetime64_any_dtype(df[column]):
                    worksheet.write_datetime(
                        row_num, col_idx, cell_value, date_format
                    )  # Write as datetime
                elif column == 'Precio del Producto' or column == 'Ventas Totales':
                    worksheet.write_number(
                        row_num, col_idx, cell_value, currency_format
                    )  # Write as currency
                else:
                    worksheet.write(row_num, col_idx, cell_value)

        # Conditional Formatting (Top 10 Sales)
        worksheet.conditional_format(
            4,
            4,
            len(df) + 3,
            4,
            {
                'type': 'top',
                'value': '10',
                'format': top10_format,
                'criteria': '=',
            },
        )  # Apply to 'Ventas Totales' column

        # Autofit column widths
        for column in df:
            column_length = max(
                df[column].astype(str).map(len).max(), len(column)
            )  # Get max length from column data
            col_idx = df.columns.get_loc(column)
            worksheet.set_column(col_idx, col_idx, column_length + 2)  # Add some padding

        # Add a total row
        num_rows, num_cols = df.shape
        worksheet.write(
            num_rows + 4, 0, "Total", total_format
        )  # Add total label in the first column

        # Add total sales
        total_sales = df['Ventas Totales'].sum()
        worksheet.write_number(
            num_rows + 4, 4, total_sales, currency_format
        )  # Use currency format for total sales

        # Add a chart
        chart = workbook.add_chart({'type': 'column'})

        # Configure the series of the chart from the dataframe data.
        chart.add_series({
            'name':       '=Tendencias de Ventas!$E$4',
            'categories': '=Tendencias de Ventas!$A$5:$A$' + str(len(df) + 4),
            'values':     '=Tendencias de Ventas!$E$5:$E$' + str(len(df) + 4),
        })

        # Add a chart title and axis labels.
        chart.set_title({'name': 'Tendencias de Ventas'})
        chart.set_x_axis({'name': 'Periodo'})
        chart.set_y_axis({'name': 'Ventas Totales'})

        # Insert the chart into the worksheet.
        worksheet.insert_chart('G4', chart)

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




def generate_pdf_response(data, filename):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'

    # Cargar el template HTML
    template = get_template('sales_reports.html')  # Asegúrate de que el nombre del template sea correcto

    # Crear el contexto con los datos
    context = {
        'data': data,
        'now': datetime.datetime.now(),
    }

    # Renderizar el template con el contexto
    html = template.render(context)

    # Crear el buffer para el PDF
    buffer = BytesIO()

    # Generar el PDF usando xhtml2pdf
    pdf_status = pisa.CreatePDF(html, dest=buffer)

    # Si hay errores, devuelve una respuesta de error
    if not pdf_status.err:
        # Preparar la respuesta HTTP con el PDF
        pdf = buffer.getvalue()
        buffer.close()
        response.write(pdf)
        return response
    else:
        return HttpResponse(f"Error al generar PDF: {pdf_status.err}", status=500)
