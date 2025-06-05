import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, List, DialogActions, FormControl, InputLabel, Select, MenuItem, Box, Tooltip, TableContainer } from '@mui/material';
import { Typography, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { ListItem, ListItemText, ListItemButton } from '@mui/material';
import { buyingRecordContext } from '../contexts/context';
import { useBuyingRecordContext } from '../hooks/useBuyingRecords';
import { useGlobalContext } from '../hooks/useGlobalContext';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DragAndDropBox from '../components/utils/DragAndDropBox';
import LaunchIcon from '@mui/icons-material/Launch'

export const RECORDSTATUSES = {
    'PENDING': 'Pendiente',
    'COMPLETED': 'Completado',
    'CANCELLED': 'Cancelado'
}

const BuyingRecordsDialog = ({ open, onClose }) => {
  const { buyingRecords, getBuyingRecords } = useBuyingRecordContext();
  const [selectedRecord, setSelectedRecord] = useState(null);
  useEffect(() => {
    if (open) {
      getBuyingRecords();
    }
  }, [open, getBuyingRecords]);

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Pedidos</DialogTitle>
      <DialogContent>
        {selectedRecord ? (
          <BuyingRecordDetails 
            record={selectedRecord} 
            onBack={() => setSelectedRecord(null)} 
          />
        ) : (
          <List>
            {buyingRecords?.length > 0 ? buyingRecords.map((record) => (
              <BuyingRecordItem 
                key={record.id} 
                record={record} 
                onClick={() => handleRecordClick(record)} 
              />
            )): <Typography variant='h6'>
                Aun no tienes pedidos. Realiza tu primer pedido...
            </Typography>}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuyingRecordsDialog;


const BuyingRecordItem = ({ record, onClick }) => {
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={onClick}>
        <ListItemText 
          primary={`Pedido #${record.id}`} 
          secondary={`Fecha: ${record.purchase_date} - Estado: ${RECORDSTATUSES[record.status]}`} 
        />
      </ListItemButton>
    </ListItem>
  );
};

// export default BuyingRecordItem;

const BuyingRecordDetails = ({ record, onBack }) => {
  const {authenticatedUser} = useGlobalContext();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [openImage, setOpenImage] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(record.payment_details || []);
  useEffect(() => {
    if (record){
      setPaymentMethod(record.payment_method || '');
      setPaymentRef(record.payment_proof || '');
      setPaymentDetails(record.payment_details || []);
    }
  }, [record]);
  const generateOrderSummary = () => {
    let summary = `*Buen día he generado el pedido de id #${record.id}*\n\n`;
    summary += `Cliente: ${authenticatedUser?.email || 'No especificado'}\n`;
    summary += `ID de Cliente: ${authenticatedUser?.id || 'No especificado'}\n`;
    summary += `Fecha de compra: ${record.purchase_date}\n`;
    summary += `Estado: ${RECORDSTATUSES[record.status]}\n\n`;
    summary += `*Productos:*\n`;
    
    record.products.forEach(product => {
        summary += `- ${product.product.name}\n`;
        summary += `  Cantidad: ${product.quantity}\n`;
        summary += `  Precio: Bs.${product.sell_price.toFixed(2)}\n`;
        summary += `  Subtotal: Bs.${(product.quantity * product.sell_price).toFixed(2)}\n\n`;
    });

    summary += `*Costo total: $${record.total_cost.toFixed(2)}*`;

    return encodeURIComponent(summary);
};

const handleWhatsAppClick = () => {
  const summary = generateOrderSummary();
  window.open(`https://wa.me/584243132091?text=${summary}`, '_blank');
};

    return (
      <div>
        <Button onClick={onBack}>Volver a la lista</Button>
        <Typography variant="h6">Detalles del Pedido #{record.id}</Typography>
        <Typography>Fecha de compra: {record.purchase_date}</Typography>
        <Typography>Estado: {RECORDSTATUSES[record.status]}</Typography>
        <Typography>Costo total: BS.{record.total_cost.toFixed(2)}</Typography>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio Unitario</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {record.products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.product.name}</TableCell>
                <TableCell align="right">{product.quantity}</TableCell>
                <TableCell align="right">Bs.{product.sell_price.toFixed(2)}</TableCell>
                <TableCell align="right">Bs.{(product.quantity * product.sell_price).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                      record?.status === 'PENDING' ? 'Acciones' : 'Imagen'
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

                        
                        {payment.proof && record?.status === 'COMPLETED' && (
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
        {console.log(authenticatedUser.id, record?.user?.id)}
   {authenticatedUser.id == record?.user?.id && <Button
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={handleWhatsAppClick}
                style={{ marginTop: '20px' }}
            >
                WhatsApp
            </Button>}
      </div>
    );
  };
  