import { useState } from 'react';
import { MenuItem, Select, Button, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { api } from '../../utils/api';
import moment from 'moment';

export default function SalesTrendsReport() {
    const [period, setPeriod] = useState('daily');
    const [startDate, setStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
    const [data, setData] = useState([]);
    
    const columns = [
        { field: 'period', headerName: 'Periodo', width: 150 },
        { field: 'product', headerName: 'Producto', width: 200 },
        { field: 'product_price', headerName: 'Precio de producto', width: 200, valueFormatter: (params) => {return `Bs. ${params?.toFixed(2)}`;} },
        { field: 'total_quantity', headerName: 'Cantidad', width: 120 },
        { field: 'total_sales', headerName: 'Ventas Totales', width: 150, valueFormatter: (params) => {
            return `Bs. ${params?.toFixed(2)}`;
        } },
        // { field: 'products_sold', headerName: 'Productos Vendidos', width: 180 }
    ];
    
    const handleGenerate = async () => {
        try {
            const response = await api.get(`/inventory/reports/sales-trends/?period=${period}&start_date=${startDate}&end_date=${endDate}`);
            console.log("DATA", response.data);
            setData(response.data.data.map((item, index) => ({
                id: index,
                period: moment(item.period).format('YYYY-MM-DD'),
                product: item.product,
                total_quantity: item.total_quantity,
                total_sales: item.total_sales,
                // products_sold: item.products_sold,
                product_price: item.product_price
            })));
        } catch (error) {
            console.error("Error al generar el reporte:", error);
        }
    };
    
    const handleExport = async (format) => {
        try {
            const response = await api.get(
                `/inventory/reports/sales-trends/?period=${period}&start_date=${startDate}&end_date=${endDate}&format_file=${format}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const format_file = format === 'excel' ? 'xlsx' : format;
            a.download = `sales-trends-report.${format_file}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error al exportar el reporte:", error);
        }
    };
    
    return (
        <div className="p-4">
            <div className="flex gap-4 mb-4 flex-wrap">
                <TextField
                    type="date"
                    label="Fecha de inicio"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    type="date"
                    label="Fecha de fin"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <MenuItem value="daily">Diario</MenuItem>
                    <MenuItem value="weekly">Semanal</MenuItem>
                    <MenuItem value="monthly">Mensual</MenuItem>
                    <MenuItem value="annual">Anual</MenuItem>
                </Select>
                <Button variant="contained" onClick={handleGenerate}>Generar</Button>
                <Button variant="outlined" onClick={() => handleExport('pdf')}>PDF</Button>
                <Button variant="outlined" onClick={() => handleExport('excel')}>Excel</Button>
                <Button variant="outlined" onClick={() => handleExport('csv')}>CSV</Button>
            </div>
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid rows={data} columns={columns} pageSize={5} />
            </div>
        </div>
    );
}
