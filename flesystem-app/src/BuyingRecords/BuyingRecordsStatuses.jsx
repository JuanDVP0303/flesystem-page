import React, { useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import { useBuyingRecordContext } from '../hooks/useBuyingRecords';
import { api } from '../utils/api';

const OrderStatusDashboard = () => {
  const { buyingRecords, getBuyingRecords } = useBuyingRecordContext();

    useEffect(() => {
        getBuyingRecords()
    }, [])

  const stats = buyingRecords.reduce((acc, order) => {
    acc[order.status.toLowerCase()]++;
    return acc;
  }, { pending: 0, completed: 0, cancelled: 0 });


    const exportPurchases = async () => {
      try {
          const response = await api.get(`/buying/records/export-buying/`, { responseType: "blob" });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `purchases.xlsx`);
          document.body.appendChild(link);
          link.click();
      } catch (error) {
          console.error("Error al exportar las compras completadas:", error);
      }
  };

  return (
    <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex: 1, backgroundColor: "#fdfdfd" }}>
      <Typography variant="h6" gutterBottom>Estado de Pedidos</Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
            <Typography variant="subtitle1">Pendientes</Typography>
            <Typography variant="h4">{stats.pending}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
            <Typography variant="subtitle1">Completados</Typography>
            <Typography variant="h4">{stats.completed}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', backgroundColor: '#ffebee' }}>
            <Typography variant="subtitle1">Cancelados</Typography>
            <Typography variant="h4">{stats.cancelled}</Typography>
          </Paper>
        </Grid>
        <Button variant="contained" color="primary" onClick={exportPurchases} sx={{ m: 2 }}>
            Exportar Compras Completadas
          </Button>
      </Grid>
    </Box>
  );
};

export default OrderStatusDashboard;
