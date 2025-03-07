import { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import api from '../utils/api';

const columns = [
    { field: 'Producto', headerName: 'Producto', width: 200 },
    { field: 'Stock Actual', headerName: 'Stock Actual', width: 150 },
    { field: 'Stock Mínimo', headerName: 'Stock Mínimo', width: 150 }
];

export default function LowStockAlert() {
    const [data, setData] = useState([]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/inventory/reports/low-stock/');
                setData(response.data);
            } catch (error) { /* Manejar error */ }
        };
        fetchData();
    }, []);
    
    return (
        <div className="p-4 h-96">
            <DataGrid
                rows={data}
                columns={columns}
                getRowId={(row) => row.Producto}
            />
        </div>
    );
}