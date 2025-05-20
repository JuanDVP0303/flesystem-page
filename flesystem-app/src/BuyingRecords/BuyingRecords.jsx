import { useEffect, useState } from 'react';
import { 
  Container, Typography, Grid, Paper, Button, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Dialog, DialogActions, 
  DialogContent, DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Card
} from '@mui/material';
import { useBuyingRecordContext } from '../hooks/useBuyingRecords';
import { RECORDSTATUSES } from '../Products/UserBuyingRecords';
import OrderStatusDashboard from './BuyingRecordsStatuses';
import DragAndDropBox from '../components/utils/DragAndDropBox';
import { useGlobalContext } from '../hooks/useGlobalContext';

const OperatorDashboard = () => {
  const { buyingRecords, getBuyingRecords, updateOrderStatus } = useBuyingRecordContext();
    const { authenticatedUser } = useGlobalContext();
  
  const [buyingRecordsToShow, setBuyingRecordsToShow] = useState([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, cancelled: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [searchedId, setSearchedId] = useState('');
  useEffect(() => {
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    getBuyingRecords();
  }, []);

  useEffect(() => {
    setBuyingRecordsToShow(buyingRecords);
  }, [buyingRecords]);

  useEffect(() => {
    if (selectedOrder) {
      setPaymentMethod(selectedOrder.payment_method);
      setPaymentRef(selectedOrder.payment_proof);
    }
  }, [selectedOrder])

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
    try{
      const response = await updateOrderStatus(orderId, newStatus, paymentMethod, paymentRef);
      console.log("Response", response);
      getBuyingRecords();
      handleCloseDialog();
      setPaymentMethod('');
      setPaymentRef('');
    }
    catch (error) {
      console.log("AAAA", error)
    }
  };


  useEffect(() => {
    if (searchedId) {
      const filteredRecords = buyingRecords.filter((record) => record.id.toString().includes(searchedId));
      setBuyingRecordsToShow(filteredRecords);
    } else {
      setBuyingRecordsToShow(buyingRecords);
    }
  }, [searchedId, buyingRecords]);

  return (
    <Container>
      <Typography variant="h4" sx={{mt:4}} gutterBottom>Panel de pedidos</Typography>
      
      {/* Dashboard */}
    
        <OrderStatusDashboard/>
      
      {/* Textfield para filtrar por ID De pedido */}

      <Card sx={{my:2}}>
        <FormControl fullWidth variant="outlined" sx={{ m: 2 }}>
          <TextField
            label="Buscar por ID de pedido"
            variant="outlined"
            value={searchedId}
            onChange={(e) => setSearchedId(e.target.value)}
          />
        </FormControl>
        </Card>
      {/* Lista de Pedidos */}
      <TableContainer component={Paper} sx={{my:2}}>
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
            {buyingRecordsToShow.map((order) => (
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
          <Typography>Usuario: {selectedOrder?.user?.email}</Typography>
          <Typography>Fecha: {selectedOrder?.purchase_date}</Typography>
          <Typography>Estado: {RECORDSTATUSES[selectedOrder?.status]}</Typography>
          <Typography>Total: BS.{selectedOrder?.total_cost.toFixed(2)}</Typography>
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
                    <TableCell>Bs.{product.sell_price.toFixed(2)}</TableCell>
                    <TableCell>Bs.{(product.quantity * product.sell_price).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {console.log("Selected Order", !!(selectedOrder || paymentMethod))}
{ !!(selectedOrder?.status == "PENDING" || paymentMethod) &&<FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
            <InputLabel id="payment-method-label">Método de pago</InputLabel>
            <Select
              labelId="payment-method-label"
              id="payment-method-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              label="Método de pago"
              disabled={selectedOrder?.status !== 'PENDING'}
              fullWidth
            >
              <MenuItem value="effective">Efectivo</MenuItem>
              <MenuItem value="transfer">Transferencia</MenuItem>
              <MenuItem value="movil_pay">Pago Móvil</MenuItem>
            </Select>
            
          </FormControl>}
          {!!((selectedOrder?.status == "PENDING" && paymentMethod != "effective") || (paymentMethod && paymentMethod != "effective" && (selectedOrder?.status == "PENDING" ? true : paymentRef))) && <DragAndDropBox
            setFieldValue={(file) => {
              setPaymentRef(file);
            }}
            disabled={selectedOrder?.status !== 'PENDING'}

            field={"payment_proof"}
            label={"Referencia de pago"}
            value={paymentRef}
            width={160}
            height={160}
          />}
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
