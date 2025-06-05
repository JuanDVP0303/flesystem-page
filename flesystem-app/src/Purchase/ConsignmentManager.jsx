// ConsignmentManagerDialog.jsx
import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, Typography, Box, 
  Grid,
  TextField,
  MenuItem
} from '@mui/material';
import { api } from '../utils/api';
import { toast } from 'react-toastify';

const CONSIGNMENT_STATUS =  {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcialmente vendido',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}


const ConsignmentManagerDialog = () => {
  const [consignments, setConsignments] = useState([]);
  const [consignmentsToShow, setConsignmentsToShow] = useState([]);
  const [selectedConsignment, setSelectedConsignment] = useState(null);

  useEffect(() => {
      fetchConsignments();
  }, []);

  const fetchConsignments = async () => {
    try {
      const response = await api.get('/purchase/orders/consignments/');
      setConsignments(response.data);
      setConsignmentsToShow(response.data);
    } catch (error) {
      toast.error("Error al cargar consignaciones");
    }
  };

  const handleCancelConsignment = async (orderId) => {
    try {
      const response = await api.post(`/purchase/orders/${orderId}/cancel-consignment/`);
      toast.success("Consignación cancelada");
      fetchConsignments();
      setSelectedConsignment(null);
    } catch (error) {
      toast.error("Error al cancelar consignación");
    }
  };

  return (
      
      <Box
      sx={{
        width: '100%',
      }}
      >

        <TextField
        select
        label="Filtrar por estado"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        onChange={(e) => {
          const status = e.target.value;
          if (status === 'ALL') {
            setConsignmentsToShow(consignments);
          } else {
            const filtered = consignments.filter(order => order.consignment_status === status);
            setConsignmentsToShow(filtered);
          }
        }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          {Object.entries(CONSIGNMENT_STATUS).map(([key, value]) => (
            <MenuItem key={key} value={key}>
              {value}
            </MenuItem>
          ))}
        </TextField>


        {selectedConsignment ? (
          <ConsignmentDetails 
            consignment={selectedConsignment} 
            onBack={() => setSelectedConsignment(null)}
            onCancel={handleCancelConsignment}
          />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Vendido</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {consignmentsToShow && consignmentsToShow.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{order.provider_name}</TableCell>
                    <TableCell>{order.real_quantity}</TableCell>
                    <TableCell>{order.sold_quantity}</TableCell>
                    <TableCell>
                      <Box className={`${
                        order.consignment_status === 'COMPLETED' ? "bg-green-500" :
                        order.consignment_status === 'PARTIAL' ? "bg-yellow-500" :
                        "bg-gray-500"
                      } text-white px-2 py-1 rounded-full text-center`}>
                        {CONSIGNMENT_STATUS[order.consignment_status]}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outlined"
                        onClick={() => setSelectedConsignment(order)}
                      >
                        Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

  );
};

const ConsignmentDetails = ({ consignment, onBack, onCancel }) => {
  const remaining = consignment.real_quantity - consignment.sold_quantity;
  
  return (
    <Box>
      <Button onClick={onBack} variant="outlined" sx={{ mb: 2 }}>
        &larr; Volver
      </Button>
      
      <Typography variant="h6" gutterBottom>
        Detalles de Consignación #{consignment.id}
      </Typography>
      
      <Box mb={2}>
        <Typography><strong>Producto:</strong> {consignment.product_name}</Typography>
        <Typography><strong>Proveedor:</strong> {consignment.provider_name}</Typography>
        <Typography><strong>Fecha:</strong> {consignment.purchase_date}</Typography>
      </Box>
      
      <Box mb={2} p={2} bgcolor="#f5f5f5" borderRadius={2}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="body2">Cantidad total</Typography>
            <Typography variant="h6">{consignment.real_quantity}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2">Vendido</Typography>
            <Typography variant="h6" color="green">
              {consignment.sold_quantity}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2">Por vender</Typography>
            <Typography variant="h6" color={remaining > 0 ? "error" : "success"}>
              {remaining}
            </Typography>
          </Grid>
        </Grid>
      </Box>
      
      <Box mb={3}>
        <Typography variant="body1">
          <strong>Estado:</strong> {CONSIGNMENT_STATUS[consignment.consignment_status]}
        </Typography>
        {consignment.consignment_status === 'COMPLETED' && (
          <Typography variant="body2" color="success.main">
            ¡Todos los productos vendidos! Debe pagar al proveedor.
          </Typography>
        )}
      </Box>
      
      {consignment.consignment_status !== 'CANCELLED' && remaining > 0 && (
        <Button 
          variant="contained" 
          color="error"
          onClick={() => onCancel(consignment.id)}
        >
          Cancelar Consignación
        </Button>
      )}
      
      {consignment.consignment_status === 'CANCELLED' && (
        <Box mt={2} p={2} bgcolor="#fff8e1" borderRadius={2}>
          <Typography variant="body1"><strong>Consignación Cancelada</strong></Typography>
          <Typography>
            Productos a pagar: {consignment.sold_quantity}
          </Typography>
          <Typography>
            Productos a devolver: {remaining}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ConsignmentManagerDialog;