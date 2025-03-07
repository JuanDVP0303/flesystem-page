import { useEffect, useState } from 'react';
import { 
  Container, Typography, Grid, Paper, Button, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Dialog, DialogActions, 
  DialogContent, DialogTitle
} from '@mui/material';
import { useBuyingRecordContext } from '../hooks/useBuyingRecords';
import { RECORDSTATUSES } from '../Products/UserBuyingRecords';
import OrderStatusDashboard from './BuyingRecordsStatuses';

const OperatorDashboard = () => {
  const { buyingRecords, getBuyingRecords, updateOrderStatus } = useBuyingRecordContext();
  const [stats, setStats] = useState({ pending: 0, completed: 0, cancelled: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    getBuyingRecords();
  }, []);

  useEffect(() => {
    const newStats = buyingRecords.reduce((acc, order) => {
      acc[order.status.toLowerCase()]++;
      return acc;
    }, { pending: 0, completed: 0, cancelled: 0 });
    setStats(newStats);
  }, [buyingRecords]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
    getBuyingRecords();
    handleCloseDialog();
  };

  return (
    <Container>
      <Typography variant="h4" sx={{mt:4}} gutterBottom>Panel de pedidos</Typography>
      
      {/* Dashboard */}
    
        <OrderStatusDashboard/>
      {/* Lista de Pedidos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID Pedido</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {buyingRecords.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.purchase_date}</TableCell>
                <TableCell>{RECORDSTATUSES[order.status]}</TableCell>
                <TableCell>Bs.{order.total_cost.toFixed(2)}</TableCell>
                <TableCell>
                  <Button onClick={() => handleViewOrder(order)}>Ver Detalles</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Detalles del Pedido */}
      <Dialog fullWidth open={!!selectedOrder} onClose={handleCloseDialog}>
        <DialogTitle>Detalles del Pedido #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {console.log(selectedOrder)}
          <Typography>Usuario: {selectedOrder?.user?.email}</Typography>
          <Typography>Fecha: {selectedOrder?.purchase_date}</Typography>
          <Typography>Estado: {RECORDSTATUSES[selectedOrder?.status]}</Typography>
          <Typography>Total: ${selectedOrder?.total_cost.toFixed(2)}</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Precio Unitario</TableCell>
                  <TableCell>Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedOrder?.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.product.name}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>${product.sell_price.toFixed(2)}</TableCell>
                    <TableCell>${(product.quantity * product.sell_price).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cerrar</Button>
          {selectedOrder?.status === 'PENDING' && (
            <>
              <Button onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} color="primary">
                Aceptar Pedido
              </Button>
              <Button onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')} color="secondary">
                Rechazar Pedido
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OperatorDashboard;
