import { Box, Button, Dialog, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useParams } from 'react-router-dom';
import { useGoTo } from '../../../src/hooks/useGoTo';
import { formatNumber, getProductQuantityByUnit } from '../../../src/utils/methods';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { genericBlue } from '../Inventory';
const emptyValue = "---"
import propTypes from "prop-types"
import { usePurchaseContext } from '../../hooks/usePurchasesContext';

import CloseIcon from '@mui/icons-material/Close';

const ProductTable = ({products, isProvider}) => {
      const [openPriceUnitModal, setOpenPriceUnitModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [productPriceUnit, setProductPriceUnit] = useState(0)
    const {createPurchase} = usePurchaseContext()
    console.log(selectedProduct)
    const generatePurchase = (product) => {
      console.log({...product, id: product.id})
    createPurchase({
      product: {...product, id: product.id},
      quantity: product.max_stock - product.quantity,
      provider: product.provider,
      price_unit: productPriceUnit,
      purchase_date:new Date().toISOString().split("T")[0]

    })
  }

  return (
    <TableContainer sx={{
      width:{
        xs:"85vw",
        sm:"85vw",
        md:"100%",
      }
    }}>
      
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
                  {console.log(selectedProduct)}
                <Typography variant="h6" >Precio unitario para {selectedProduct?.product_name}</Typography>
                <Typography variant="body2" sx={{color:"gray"}}>Actual precio de venta: {selectedProduct?.sell_price} </Typography>
                <Typography variant="body2" sx={{color:"gray"}}>Último precio de compra: {(selectedProduct?.last_completed_order_price_unit) || 0} </Typography>
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
    <Table className="min-w-full">
      <TableHead>
        <TableRow>
          <TableCell></TableCell>
          <TableCell>Nombre</TableCell>
          <TableCell>SKU</TableCell>
          <TableCell>Categoría</TableCell>
          <TableCell>Costo unitario</TableCell>
          <TableCell>Cantidad</TableCell>
          <TableCell>Valor en inventario</TableCell>
          <TableCell>Precio de venta</TableCell>
         {
          isProvider&&  <TableCell>Acción</TableCell>
         }

        </TableRow>
      </TableHead>
      <TableBody>
        {products?.length > 0 ? products.map((product, index) => (
          <ProductTableRow isProvider={isProvider} key={index} product={product} setSelectedProduct={setSelectedProduct} setOpenPriceUnitModal={setOpenPriceUnitModal} />
        ))  :
        <TableRow>
        <TableCell colSpan={12} sx={{fontSize:"15px"}}>No hay productos en inventario</TableCell>
      </TableRow>
       }
      </TableBody>
    </Table>
    </TableContainer>
  )
}
const ProductTableRow = ({ product, isProvider, setSelectedProduct, setOpenPriceUnitModal }) => {
    const {goTo} = useGoTo();
    const {id} = useParams();

    const [showVariations, setShowVariations] = useState(false);
    return (
      <>

      <TableRow>
        <TableCell style={{ width: 5 }}>
        {product.variants.length > 0 && 
        <div className="flex items-center justify-center">
            <ArrowForwardIosIcon onClick={() => setShowVariations(prev => !prev)} sx={{width:15, color:"#00B4DB", cursor:"pointer", transform:showVariations && "rotate(90deg)", transition:"transform ease .2s"}}/>
        </div>}
        </TableCell>
        <TableCell>{product.name}</TableCell>
        <TableCell>{product.sku || emptyValue}</TableCell>
        <TableCell>{product.category || emptyValue}</TableCell>
        <TableCell>{"BS"}.{Number(product.price_unit ?? 0).toFixed(2)}</TableCell>
        <TableCell>{getProductQuantityByUnit(product, true)}</TableCell>
        <TableCell>{"BS"}.{formatNumber(product.quantity * product.price_unit)}</TableCell>
        <TableCell>{"BS"}.{formatNumber(product.sell_price)}</TableCell>
        <TableCell>
          <VisibilityIcon onClick={() => goTo(`/inventory/products/${product.id}/`)} sx={{color:genericBlue, width:18, cursor:"pointer"}}/>
        </TableCell>
        {
          isProvider && <TableCell>
            <Button onClick={() => {
              setSelectedProduct(product);
              setOpenPriceUnitModal(true);
            }} variant='contained' color='success' size='small'>Comprar</Button>
          </TableCell>
        }
        
      </TableRow>
     {showVariations && product.variants.length > 0 && product.variants.map((variation, index) => {
        return (
          <TableRow sx={{
            backgroundColor: "#f7fbff",
          }} key={index}>
            <TableCell></TableCell>
            <TableCell>{variation.name}</TableCell>
            <TableCell>{variation.sku}</TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>{variation.price_unit}</TableCell>
            <TableCell>{variation.quantity}</TableCell>
            <TableCell>{formatNumber(variation.quantity * variation.price_unit)}</TableCell>
            <TableCell>{formatNumber(variation.sell_price)}</TableCell>

          </TableRow>
        )
     })}
      
      </>
    );
  }


ProductTableRow.propTypes = {
    product: propTypes.object.isRequired
    }

ProductTable.propTypes = {
    products: propTypes.array.isRequired
    }

export default ProductTable