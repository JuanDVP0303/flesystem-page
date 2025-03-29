import { useState } from 'react';
import { MenuItem, Select, Button, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { api } from '../../utils/api';
import moment from 'moment';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

// Registrar elementos necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export default function SalesTrendsReport() {
    const [period, setPeriod] = useState('daily');
    const [startDate, setStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
    const [data, setData] = useState([]);
    const [chartData, setChartData] = useState(null);

    const columns = [
        { field: 'period', headerName: 'Periodo', width: 150 },
        { field: 'product', headerName: 'Producto', width: 200 },
        { field: 'product_price', headerName: 'Precio de producto', width: 200, valueFormatter: (params) => `Bs. ${params?.toFixed(2)}` },
        { field: 'total_quantity', headerName: 'Cantidad', width: 120 },
        { field: 'total_sales', headerName: 'Ventas Totales', width: 150, valueFormatter: (params) => `Bs. ${params?.toFixed(2)}` },
    ];

    const handleGenerate = async () => {
        try {
            const response = await api.get(`/inventory/reports/sales-trends/?period=${period}&start_date=${startDate}&end_date=${endDate}`);
            const fetchedData = response.data.data.map((item, index) => ({
                id: index,
                period: moment(item.period).format('YYYY-MM-DD'),
                product: item.product,
                total_quantity: item.total_quantity,
                total_sales: item.total_sales,
                product_price: item.product_price,
            }));
            setData(fetchedData);

            // Preparar datos para el gráfico de torta
            const productQuantities = fetchedData.reduce((acc, item) => {
                acc[item.product] = (acc[item.product] || 0) + item.total_quantity;
                return acc;
            }, {});
            const labels = Object.keys(productQuantities);
            const quantities = Object.values(productQuantities);

            setChartData({
                labels,
                datasets: [
                    {
                        data: quantities,
                        backgroundColor: labels.map(() =>
                            `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
                        ),
                        borderColor: labels.map(() =>
                            `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`
                        ),
                        borderWidth: 1,
                    },
                ],
            });
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

            {/* Renderizar gráfico de torta si hay datos */}
            {chartData && (
                <div className="chart-container" style={{ marginTop: '20px', display: "flex", justifyContent: "center" }}>
                    <div style={{ height: "300px", width: "300px" }}> {/* Tamaño reducido */}
                        <h3 style={{ textAlign: "center" }}>Distribución de Productos</h3>
                        <Pie 
                            data={chartData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { 
                                        display: true, 
                                        position: "top",
                                        labels: {
                                            generateLabels: (chart) => {
                                                const data = chart.data;
                                                if (data.labels.length && data.datasets.length) {
                                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                                    return data.labels.map((label, i) => {
                                                        const value = data.datasets[0].data[i];
                                                        const percentage = ((value / total) * 100).toFixed(2) + '%';
                                                        return {
                                                            text: `${label} (${percentage})`,
                                                            fillStyle: data.datasets[0].backgroundColor[i],
                                                            strokeStyle: data.datasets[0].borderColor[i],
                                                            hidden: !chart.getDataVisibility(i),
                                                            lineCap: 'round',
                                                            lineDash: [],
                                                            lineDashOffset: 0,
                                                            lineJoin: 'round',
                                                            lineWidth: 1,
                                                            pointStyle: undefined,
                                                            rotation: 0
                                                        };
                                                    });
                                                }
                                                return [];
                                            }
                                        }
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => {
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = ((context.raw / total) * 100).toFixed(2) + '%';
                                                return `${context.label}: ${context.raw} (${percentage})`;
                                            }
                                        }
                                    },
                                    title: { display: true, text: "Distribución de Productos por Cantidad Vendida" }
                                }
                            }} 
/>
                    </div>
                </div>
            )}
        </div>
    );
}
