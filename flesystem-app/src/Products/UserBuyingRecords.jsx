import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, List, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Typography, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { ListItem, ListItemText, ListItemButton } from '@mui/material';
import { buyingRecordContext } from '../contexts/context';
import { useBuyingRecordContext } from '../hooks/useBuyingRecords';
import { useGlobalContext } from '../hooks/useGlobalContext';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DragAndDropBox from '../components/utils/DragAndDropBox';

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

  useEffect(() => {
    if (record){
      setPaymentMethod(record.payment_method || '');
      setPaymentRef(record.payment_proof || '');
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
        summary += `  Precio: $${product.sell_price.toFixed(2)}\n`;
        summary += `  Subtotal: $${(product.quantity * product.sell_price).toFixed(2)}\n\n`;
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
                <TableCell align="right">${product.sell_price.toFixed(2)}</TableCell>
                <TableCell align="right">${(product.quantity * product.sell_price).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
                  {paymentMethod && <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
                    <InputLabel id="payment-method-label">Método de pago</InputLabel>
                    <Select
                      labelId="payment-method-label"
                      id="payment-method-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      label="Método de pago"
                      fullWidth
                      disabled
                    >
                      <MenuItem value="effective">Efectivo</MenuItem>
                      <MenuItem value="transfer">Transferencia</MenuItem>
                      <MenuItem value="movil_pay">Pago Móvil</MenuItem>
                    </Select>
                    
                  </FormControl>}
                 {paymentMethod && paymentMethod != "effective" && paymentRef && <DragAndDropBox
                      disabled

                    setFieldValue={(file) => {}}
                    field={"payment_proof"}
                    label={"Referencia de pago"}
                    value={paymentRef}
                    width={160}
                    height={160}
                  />}
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
  