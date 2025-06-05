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
  Card,
  Tooltip,
  Box
} from '@mui/material';
import { useBuyingRecordContext } from '../hooks/useBuyingRecords';
import { RECORDSTATUSES } from '../Products/UserBuyingRecords';
import OrderStatusDashboard from './BuyingRecordsStatuses';
import DragAndDropBox from '../components/utils/DragAndDropBox';
import { useGlobalContext } from '../hooks/useGlobalContext';
import { toast } from 'react-toastify';
import LaunchIcon from '@mui/icons-material/Launch'

const OperatorDashboard = () => {
  const { buyingRecords, getBuyingRecords, updateOrderStatus } = useBuyingRecordContext();
    const { authenticatedUser } = useGlobalContext();
    const [statusFilter, setStatusFilter] = useState('PENDING'); // Estado para el filtro

  const [buyingRecordsToShow, setBuyingRecordsToShow] = useState([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, cancelled: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [searchedId, setSearchedId] = useState('');
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [newPayment, setNewPayment] = useState({});
  const [openImage, setOpenImage] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      console.log("Selected Order", selectedOrder)
      setPaymentDetails(selectedOrder.payment_details || []);
    }
  }, [selectedOrder]);

  const calculateRemaining = () => {
    if (!selectedOrder) return 0;
    
    const totalPaid = paymentDetails.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    return selectedOrder.total_cost - totalPaid;
  };

  const handleAddPayment = () => {
    if (!newPayment.method || !newPayment.amount) return;
    
    const amount = parseFloat(newPayment.amount);
    console.log("Amount", amount)
    console.log("Remaining", calculateRemaining())
    if (amount <= 0 || amount > calculateRemaining().toFixed(2)) {
      toast.error("Monto inválido");
      return;
    }

      //Validar que tenga comprobante si no es efectivo
    if (newPayment.method !== 'effective' && !newPayment.proof) {
      toast.error("Debe subir un comprobante de pago si no es efectivo");
      return;
    }

    //validar la longitud de la referencia
    if (newPayment.reference && newPayment.reference.length > 20) {
      toast.error("La referencia no puede tener más de 20 caracteres");
      return;
    }

    //Validar que la referencia no sea igual a otra anterior
    if (newPayment.reference && paymentDetails.some(payment => payment.reference === newPayment.reference)) {
      toast.error("Ya existe un pago con esa referencia");
      return;
    }
    setPaymentDetails([...paymentDetails, {
      ...newPayment,
      id: Date.now() // ID temporal para React
    }]);
    
    setNewPayment({});
  };

  const handleRemovePayment = (index) => {
    const newDetails = [...paymentDetails];
    newDetails.splice(index, 1);
    setPaymentDetails(newDetails);
  };

  useEffect(() => {
    let filteredRecords = [...buyingRecords];
    
    // Aplicar filtro de estado
    filteredRecords = filteredRecords.filter(record => record.status === statusFilter);
    
    // Aplicar filtro de búsqueda
    if (searchedId) {
      filteredRecords = filteredRecords.filter(record => 
        record.id.toString().includes(searchedId)
      );
    }
    
    setBuyingRecordsToShow(filteredRecords);
  }, [statusFilter, searchedId, buyingRecords]); // Dependencias actualizadas

  useEffect(() => {
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    getBuyingRecords();
  }, [authenticatedUser]);

  // useEffect(() => {
  //   setBuyingRecordsToShow(buyingRecords);
  // }, [buyingRecords]);

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
    console.log("CERANDO")
    setSelectedOrder(null);
    setPaymentMethod('');
    setPaymentRef('');
    setPaymentDetails([]);
    setNewPayment({
      method: '',
      amount: '',
      reference: '',
      proof: null
    });
    setOpenImage(false);

  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try{
      const paymentData = paymentDetails.map(payment => ({
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference || '',
        proof: payment.proof
      }));

      const totalAmount = paymentData.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      if (newStatus === 'COMPLETED' && totalAmount < selectedOrder.total_cost) {
        toast.error(`El total pagado (Bs.${totalAmount.toFixed(2)}) no cubre el costo del pedido (Bs.${selectedOrder.total_cost.toFixed(2)})`);
        return;
      }

      const response = await updateOrderStatus(orderId, newStatus, paymentData);
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
    }
  }, [searchedId, buyingRecords]);

    const remaining = calculateRemaining();

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
          <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <FilterButton statusFilter={statusFilter} setStatusFilter={setStatusFilter} status="PENDING" label="Pendientes" />
            <FilterButton statusFilter={statusFilter} setStatusFilter={setStatusFilter} status="COMPLETED" label="Completados" />
            <FilterButton statusFilter={statusFilter} setStatusFilter={setStatusFilter} status="CANCELLED" label="Cancelados" />
          </Grid>

      {/* Lista de Pedidos */}
      <TableContainer component={Paper} sx={{my:2}}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>ID Pedido</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {buyingRecordsToShow.map((order,index) => (
              <TableRow key={order.id}>
                <TableCell>{index+1}</TableCell>
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
      <Dialog fullWidth sx={{
        '& .MuiDialog-paper': {
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }



}} open={!!selectedOrder} onClose={handleCloseDialog}>
        <DialogTitle>Detalles del Pedido #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          <Typography>Usuario: {selectedOrder?.user?.email}</Typography>
          <Typography>Fecha: {selectedOrder?.purchase_date}</Typography>
          <Typography>Estado: {RECORDSTATUSES[selectedOrder?.status]}</Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
          Total a pagar: Bs.{selectedOrder?.total_cost.toFixed(2)}
        </Typography>
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
     <Typography variant="h6" color={remaining > 0 ? 'error' : 'success'}>
          Restante: Bs.{remaining.toFixed(2)}
        </Typography>
        <Dialog open={openImage} onClose={() => setOpenImage(false)}>
          <DialogTitle>Comprobante de Pago</DialogTitle>
          <DialogContent>
            <img
              src ={openImage}
              alt="Comprobante de pago"
              style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenImage(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog> 


        {/* Lista de pagos existentes */}
        {paymentDetails.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Pagos Registrados:</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Método</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Referencia</TableCell>
                    <TableCell>{
                      selectedOrder?.status === 'PENDING' ? 'Acciones' : 'Imagen'
                    }</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  
                  {paymentDetails.map((payment, index) => (
                    <TableRow key={payment.id || index}>
                      <TableCell>
                        {payment.method === 'effective' && 'Efectivo'}
                        {payment.method === 'transfer' && 'Transferencia'}
                        {payment.method === 'movil_pay' && 'Pago Móvil'}
                      </TableCell>
                      <TableCell>Bs.{payment.amount}</TableCell>
                      <TableCell>{payment.reference}</TableCell>
                      <TableCell>
                        {selectedOrder?.status === 'PENDING' && (
                          <Button 
                            color="error"
                            onClick={() => handleRemovePayment(index)}
                          >
                            Eliminar
                          </Button>
                        )}
                        
                        {payment.proof && selectedOrder?.status === 'COMPLETED' && (
                          <Box
                            sx={{position: 'relative', display: 'inline-block', cursor: 'pointer'}}
                          >
                          <Tooltip
                             onClick={() => setOpenImage(
                              typeof payment.proof === 'string' ? payment.proof : URL.createObjectURL(payment.proof)
                            )}
                            title="Ver Comprobante"
                            placement="top"
s

                            >
                              <div className='absolute top-2 right-2 p-1 z-10 bg-white rounded-full shadow-md cursor-pointer'>
                              <LaunchIcon fontSize='small' />
                              </div>
                          <img 
                           
                            src={typeof payment.proof === 'string' ? payment.proof : URL.createObjectURL(payment.proof)} 
                            alt="Comprobante de pago" 
                            style={{ width: '140px', height: '140px', objectFit: 'cover', cursor: 'pointer',

                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                             }} 
                          />
                          </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
{/* { !!(selectedOrder?.status == "PENDING" || paymentMethod) &&<FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
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
            
          </FormControl>} */}
          {/* {!!((selectedOrder?.status == "PENDING" && paymentMethod != "effective") || (paymentMethod && paymentMethod != "effective" && (selectedOrder?.status == "PENDING" ? true : paymentRef))) && <DragAndDropBox
            setFieldValue={(file) => {
              setPaymentRef(file);
            }}
            disabled={selectedOrder?.status !== 'PENDING'}

            field={"payment_proof"}
            label={"Referencia de pago"}
            value={paymentRef}
            width={160}
            height={160}
          />} */}

               {/* Formulario para nuevo pago */}
        {selectedOrder?.status === 'PENDING' && remaining > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Agregar Pago:</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={3} sx={{mt:1}}>
                <FormControl fullWidth>
                  <InputLabel>Método de pago</InputLabel>
                  {console.log("New Payment", newPayment)}
                  <Select
                    value={newPayment.method}
                    onChange={(e) => setNewPayment({...newPayment, method: e.target.value})}
                    label="Método de pago"
                  >
                    {/* Mostrar efectivo, pago movil y transferencia pero una sola ves por metodo, osea que no se pueda elegir el mismo metodo dos veces en un mismo pedido */}

                    {
                      paymentDetails.some(payment => payment.method === 'effective') ? null :
                        <MenuItem value="effective">Efectivo</MenuItem>

                    }
                    <MenuItem value="transfer">Transferencia</MenuItem>
                    <MenuItem value="movil_pay">Pago Móvil</MenuItem> 
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3} sx={{mt:1}}>
                <TextField
                  label="Monto"
                  type="number"
                  fullWidth
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  inputProps={{ min: 0.01, max: remaining.toFixed(2), step: newPayment.method !== 'effective' ? 0.01 : 1 }}
                />
              </Grid>
              
              {newPayment.method && newPayment.method !== 'effective' && (
                <Grid item xs={12} sm={3} sx={{mt:1}}>
                  {/* hacer que solo sean numeros enteros */}
                  <TextField
                    label="Referencia"
                    fullWidth
                    inputProps={{ 
                      maxLength: 20,
                      step: 1,
                    }}

                    helperText="Máximo 20 caracteres"
                    placeholder="Ingrese referencia"
                    type='number'
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                  />
                </Grid>
              )}
              
              {newPayment.method && newPayment.method !== 'effective' && (
                <Grid item xs={12} sm={3}>
                  <DragAndDropBox
                    setFieldValue={(file) => {
                      setNewPayment({...newPayment, proof: file});
                    }}
                    field={"payment_proof"}
                    // label={"Comprobante"}
                    title = "Comprobante de pago"
                    value={typeof newPayment.proof == "string" ? import.meta.VITE_API_URL + newPayment.proof : newPayment.proof}
                    width={100}
                    height={100}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  onClick={handleAddPayment}
                  disabled={!newPayment.method || !newPayment.amount}
                >
                  Agregar Pago
                </Button>
              </Grid>
            </Grid>
          </>
        )}
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

export const FilterButton = ({ status, label, statusFilter, setStatusFilter }) => (
    <Button
      variant={statusFilter === status ? 'contained' : 'outlined'}
      onClick={() => setStatusFilter(status)}
      sx={{ mx: 1 }}
    >
      {label}
    </Button>
  );
export default OperatorDashboard;

