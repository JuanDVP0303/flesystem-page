import { Autocomplete, Box, Button, Dialog, TextField, Typography } from '@mui/material'
import React, { useEffect } from 'react'
import { usePurchaseContext } from '../hooks/usePurchasesContext';
import { api } from '../utils/api';
import { toast } from 'react-toastify';

const ReplenishProduct = ({
    open,
    onClose,
    compensationOrder
}) => {
    const [replenishQuantity, setReplenishQuantity] = React.useState(0);
    const [providerSelected, setProviderSelected] = React.useState(null);
    const { providers, selectedProduct, replenishProduct } = usePurchaseContext();
    
    useEffect(() => {
        if(compensationOrder){
            setProviderSelected(compensationOrder?.provider);
            setReplenishQuantity(Number(compensationOrder?.quantity) - Number(compensationOrder?.real_quantity) || 0);
        }
    }, [compensationOrder, open])


  return (
    <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
    >   
        <Box sx={{p:4, display: 'flex', flexDirection: 'column', gap: 2}}>

            <Typography variant="h5" component="h2" gutterBottom>
                Reabastecer producto
            </Typography>

                  <Autocomplete
                    options={providers.filter((p) =>
                      selectedProduct?.providers?.includes(p.id)
                    )}
                    disabled={compensationOrder}
                    getOptionLabel={(option) => option.name}
                    value={providerSelected}
                    onChange={(e, value) => setProviderSelected(value)}
                    renderInput={(params) => (
                      <TextField {...params} label="Proveedor" />
                    )}
                  />
                 <TextField
                    label="Cantidad a reabastecer"
                    type="number"
                    disabled
                    value={replenishQuantity}
                    onChange={(e) => setReplenishQuantity(e.target.value)}
                  />

                <Button variant='contained' color="success" onClick={() => {
                    replenishProduct(
                        providerSelected, replenishQuantity, compensationOrder, "productss"
                    );
                    onClose();
                }}>
                    Confirmar Reabastecimiento
                </Button>
                

                  </Box>

    </Dialog>

  )
}

export default ReplenishProduct