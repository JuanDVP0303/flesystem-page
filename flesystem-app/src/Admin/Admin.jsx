import React, { useEffect, useState } from "react";
import { MiniCard } from "../Inventory/Inventory";
import { Box, Button, Dialog, IconButton, List, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import { useAdminContext } from "../hooks/useAdminContext";
import WarningIcon from '@mui/icons-material/Warning';
import { usePurchaseContext } from "../hooks/usePurchasesContext";
import CloseIcon from '@mui/icons-material/Close';
import { useBuyingRecordContext } from "../hooks/useBuyingRecords";
import OrderStatusDashboard from "../BuyingRecords/BuyingRecordsStatuses";
import { useGlobalContext } from "../hooks/useGlobalContext";
import { api } from "../utils/api";
import DownloadIcon from '@mui/icons-material/Download';
import { toast } from "react-toastify";

const Admin = () => {
  const {getMinStockProducts, minStockProducts} = useAdminContext()
  const { buyingRecords, getBuyingRecords } = useBuyingRecordContext();
  const {authenticatedUser} = useGlobalContext()

  const {createPurchase} = usePurchaseContext()
  const [productPriceUnit, setProductPriceUnit] = useState(0)
  const [openPriceUnitModal, setOpenPriceUnitModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  console.log(minStockProducts)

  const exportDatabase = async () => {
    try {
      const response = await api.get('/users/admin/export-database/', {
        responseType: 'blob', // Necesario para manejar archivos binarios como SQL
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database_export.sql';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Base de datos exportada con éxito');
    } catch (error) {
      toast.error('Error al exportar la base de datos');
      console.error('Error al exportar la base de datos:', error);
    }
  };

  const generatePurchase = (product) => {
    createPurchase({
      product: {...product, id: product.product_id},
      quantity: product.max_stock - product.total_quantity,
      provider: product.provider_id,
      price_unit: productPriceUnit,
      purchase_date:new Date().toISOString().split("T")[0]

    })
    
    getMinStockProducts()
  }

  useEffect(() => {
    getMinStockProducts()
    getBuyingRecords()
  }, [])

  const stats = buyingRecords.reduce((acc, order) => {
    acc[order.status.toLowerCase()]++;
    return acc;
  }, { pending: 0, completed: 0, cancelled: 0 });


  return (
    <Box
      sx={{
        width: "95%",
        margin: "auto",
      }}
    >
      
      <Dialog open={openPriceUnitModal} onClose={() => {
        setOpenPriceUnitModal(false)
        setSelectedProduct(null)
      }}>
        
        <Box sx={{p:2}}>
          <Box sx={{mb:2, display:"flex", justifyContent:"flex-end"}}>
          <IconButton onClick={() => {
            setOpenPriceUnitModal(false)
            setSelectedProduct(null)
          }}><CloseIcon /></IconButton>
          </Box>
          <Box sx ={{
            display:"flex",
            flexDirection:"column",
            gap:2
          }}>
          <Typography variant="h6" >Precio unitario para {selectedProduct?.product_name}</Typography>
          <Typography variant="body2" sx={{color:"gray"}}>Actual precio de venta: {selectedProduct?.sell_price} </Typography>
          <TextField
            label="Precio unitario" 
            type="number" 
            value={productPriceUnit} 
            onChange={(e) => setProductPriceUnit(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={() => {
            generatePurchase(selectedProduct)
            setOpenPriceUnitModal(false)
          }}>Aceptar</Button>
          </Box>
        </Box>
      </Dialog>
      <MiniCard className={"max-w-full flex"}>
        <Box sx={{marginBottom:5}}>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p>Esta es la sección de administración</p>
        </Box>
        <Box sx={{
          display:"flex",
          justifyContent:"flex-end",
          marginBottom:2
        }}>

        {authenticatedUser.is_superuser && (
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={exportDatabase}
            >
              Exportar Base de Datos
            </Button>
          )}
        </Box>
        <Box sx={{display:"flex", gap:5}}>
      <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
          <Typography variant="h6">Productos con stock bajo</Typography>
          <List>
            {minStockProducts.map((product) => (
              <ListItem key={product.id} sx={{border: "1px solid #ccc", borderRadius: "10px", margin: "1rem 0", boxShadow: "1px 1px 5px #ccc", backgroundColor:"white"}}>
                <WarningIcon sx={{m:2}} color="warning" />
                <ListItemText 
                  primary={`Producto: ${product.product_name}`} 
                  secondary={`Stock Actual: ${product.total_quantity} Stock Minimo: ${product.min_stock}`}
                ></ListItemText>
                <Button variant="contained" color="primary" onClick={() => {
                  setSelectedProduct(product)
                  setOpenPriceUnitModal(true)
                }}>Comprar</Button>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
            <OrderStatusDashboard />
        </Box>
        </Box>
      </MiniCard>

    </Box>
  );
};

export default Admin;
