from django.http import FileResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from io import BytesIO
from django.shortcuts import get_object_or_404
from purchase.models import Order
from django.utils import timezone
from django.http import HttpResponse

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from django.http import HttpResponse
from purchase.models import Order

def generate_credit_product(request, order_id):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="reporte_producto_crédito_{order_id}.pdf"'
    order = get_object_or_404(Order, id=order_id)
    print("ASDASDA")
    doc = SimpleDocTemplate(response, pagesize=letter)
    elements = []
    # Estilos
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    subtitle_style = styles['Heading2']
    normal_style = styles['BodyText']
    
    # Encabezado
    elements.append(Paragraph("Flesystem, Flejes y Sistemas C.A.", title_style))
    elements.append(Paragraph("Avenida Anton Phillips, Maracay 2103", normal_style))
    elements.append(Paragraph("RIF: J-075199600 - Teléfono: 0414-1399568", normal_style))
    elements.append(Paragraph("<br/><br/>", normal_style))
    
    elements.append(Paragraph("COMPROBANTE DE PAGO DE CRÉDITO", subtitle_style))
    elements.append(Paragraph("<br/>", normal_style))
    
    # Detalles de la orden
    order_data = [
        ["Número de Orden:", f"#{order.id}"],
        ["Fecha de Pago Acordada:", order.due_date.strftime("%d/%m/%Y")],
        ["Fecha de Pago Pagada:", order.paid_date.strftime("%d/%m/%Y")],
        ["Proveedor:", order.provider.name],
        ["Producto:", order.product.name],
        ["Monto Pagado:", f"Bs. {float(order.real_quantity * order.price_unit):.2f}"],
        ["Método de Pago:", "Transferencia Bancaria"],
    ]
    
    order_table = Table(order_data, colWidths=[150, 300])
    order_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.lightgrey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    elements.append(order_table)
    elements.append(Paragraph("<br/><br/>", normal_style))
    
    # Firmas
    signature_data = [
        ["Firma del Proveedor:", "__________________________"],
        ["Firma del Responsable:", "__________________________"],
        ["Observaciones:", "_________________________________________________________"],
    ]
    
    signature_table = Table(signature_data, colWidths=[150, 300])
    signature_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(signature_table)
    elements.append(Paragraph("<br/>", normal_style))
    
    # Pie de página
    elements.append(Paragraph(f"Usuario: {request.user.email}", normal_style))
    elements.append(Paragraph(f"Fecha de generación: {timezone.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    elements.append(Paragraph("Este documento es un comprobante de pago oficial", normal_style))
    
    # Construir PDF
    doc.build(elements)
    return response

def generate_consignment_report(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="reporte_consignacion_{order.id}.pdf"'
    
    doc = SimpleDocTemplate(response, pagesize=letter)
    elements = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    subtitle_style = styles['Heading2']
    normal_style = styles['BodyText']
    
    # Encabezado
    elements.append(Paragraph("Flesystem, Flejes y Sistemas C.A.", title_style))
    elements.append(Paragraph("Avenida Anton Phillips, Maracay 2103", normal_style))
    elements.append(Paragraph("RIF: J-075199600 - Teléfono: 0414-1399568", normal_style))
    elements.append(Paragraph("<br/><br/>", normal_style))
    print("ORDER STATUS:", order.status, order.id)
    status = "COMPLETADA" if order.consignment_status == "COMPLETED" else "CANCELADO" 
    elements.append(Paragraph(f"REPORTE DE CONSIGNACIÓN {status}", subtitle_style))
    elements.append(Paragraph("<br/>", normal_style))
    
    # Detalles de la consignación
    consignment_data = [
        ["Número de Orden:", f"#{order.id}"],
        ["Proveedor:", order.provider.name],
        ["Producto:", order.product.name],
        ["Cantidad Consignada:", f"{order.real_quantity} unidades"],
        ["Cantidad Vendida:", f"{order.sold_quantity} unidades"],
    ]
    
    if order.consignment_status == "CANCELLED":
        consignment_data.append(["Motivo de Cancelación:", order.cancelled_reason or "N/A"])
    else:
        consignment_data.append(["Total a Pagar:", f"Bs. {float(order.real_quantity * order.price_unit):.2f}"])
        
    consignment_table = Table(consignment_data, colWidths=[150, 300])
    consignment_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.lightgrey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    elements.append(consignment_table)
    elements.append(Paragraph("<br/><br/>", normal_style))
    
    # # Detalles de ventas
    # elements.append(Paragraph("Detalle de Ventas:", subtitle_style))
    
    # # Aquí deberías agregar los detalles específicos de las ventas
    # # Esto es un ejemplo, necesitarías obtener los datos reales de tu modelo
    # sales_data = [
    #     ["Fecha", "Cantidad", "Precio Unitario", "Total"],
    #     ["01/06/2023", "5", "Bs. 10.00", "Bs. 50.00"],
    #     ["05/06/2023", "3", "Bs. 10.00", "Bs. 30.00"],
    #     ["", "", "TOTAL:", "Bs. 80.00"],
    # ]
    
    # sales_table = Table(sales_data, colWidths=[120, 80, 100, 100])
    # sales_table.setStyle(TableStyle([
    #     ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
    #     ('FONT', (0, 1), (-1, -1), 'Helvetica', 10),
    #     ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    #     ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
    #     ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    #     ('BACKGROUND', (0, -1), (-2, -1), colors.lightgrey),
    # ]))
    
    # elements.append(sales_table)
    elements.append(Paragraph("<br/><br/>", normal_style))
    
    # Firmas
    signature_data = [
        ["Firma del Proveedor:", "__________________________"],
        ["Firma del Responsable:", "__________________________"],
        ["Observaciones:", "_________________________________________________________"],
    ]
    
    signature_table = Table(signature_data, colWidths=[150, 300])
    signature_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(signature_table)
    elements.append(Paragraph("<br/>", normal_style))
    
    # Pie de página
    elements.append(Paragraph(f"Usuario: {request.user.email}", normal_style))
    elements.append(Paragraph(f"Fecha de generación: {timezone.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    
    # Construir PDF
    doc.build(elements)
    return response