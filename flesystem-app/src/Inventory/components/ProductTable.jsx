import { Autocomplete, Box, Button, Dialog, FormControl, IconButton, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useParams } from 'react-router-dom';
import { useGoTo } from '../../../src/hooks/useGoTo';
import { formatNumber, getProductQuantityByUnit } from '../../../src/utils/methods';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { FieldGroup, genericBlue, GridField } from '../Inventory';
const emptyValue = "---"
import propTypes from "prop-types"
import { usePurchaseContext } from '../../hooks/usePurchasesContext';

import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-toastify';

const ProductTable = ({products, isProvider}) => {
    const {providers, getProviders} = usePurchaseContext()
    const [openPriceUnitModal, setOpenPriceUnitModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [productPriceUnit, setProductPriceUnit] = useState(0)
    const [productQuantity, setProductQuantity] = useState(0)
      const [orderType, setOrderType] = useState("COUNTED"); // "COUNTED", "CREDIT", "CONSIGNATION"
      const [daysOfCredit, setDaysOfCredit] = useState(0);
    const {createPurchase} = usePurchaseContext()
  const generatePurchase = (product) => {
    //validar que esten todos los datos ademas de validar que la cantidad no sea mayor al stock máximo
    let proceed = true;
    if (
      !productPriceUnit ||
      !productQuantity ||
      !orderType
    ) {
      toast.error("Por favor completa todos los campos");
      proceed = false;
    }
    if (orderType === "CREDIT" && daysOfCredit <= 0) {
      toast.error("Por favor ingresa los días de crédito");
      proceed = false;
    }
    if (orderType === "CREDIT" && daysOfCredit >= 200) {
      toast.error("Los días de crédito no pueden ser mayores a 200");
      proceed = false;
    }

    if (productQuantity > product.max_stock - product.total_quantity) {
      toast.error(
        "La cantidad no puede ser mayor al stock máximo del producto"
      );
      proceed = false;
    }
    if (proceed) {
      createPurchase({
        product: { ...selectedProduct},
        quantity: productQuantity,
        provider: isProvider?.id,
        price_unit: productPriceUnit,
        purchase_date: new Date().toISOString().split("T")[0],
        order_type: orderType, // Valor por defecto para compras desde proveedores
        days_of_credit: orderType === "CREDIT" ? daysOfCredit : 0,
      });
    }
    setOpenPriceUnitModal(false);
    setSelectedProduct(null);
    setProductPriceUnit(0);
    setProductQuantity(0);
    // setProviderSelected(null);

    // getMinStockProducts();
  };

    useEffect(() => {
      getProviders()
    }, [])
  return (
    <TableContainer sx={{
      width:{
        xs:"85vw",
        sm:"85vw",
        md:"100%",
      }
    }}>
      

      <Dialog
        fullWidth
        open={openPriceUnitModal}
        onClose={() => {
          setOpenPriceUnitModal(false);
          setSelectedProduct(null);
          //Reiniciar estados
          setProductPriceUnit(0);
          setProductQuantity(0);
          setProviderSelected(null);
          setOrderType("COUNTED");
          setDaysOfCredit(0);
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <IconButton
              onClick={() => {
                setOpenPriceUnitModal(false);
                setSelectedProduct(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h6">
              Orden de compra para {selectedProduct?.product_name}
            </Typography>
            <Typography variant="body2" sx={{ color: "gray" }}>
              Actual precio de venta: {selectedProduct?.sell_price}{" "}
            </Typography>
            <Typography variant="body2" sx={{ color: "gray" }}>
              Último precio de compra:{" "}
              {selectedProduct?.last_completed_order_price_unit || 0}{" "}
            </Typography>
            <Typography variant="body2" sx={{ color: "gray" }}>
              Cantidad necesaria para llenar stock:{" "}
              {console.log(selectedProduct)}
              {selectedProduct?.max_stock - selectedProduct?.quantity ||
                0}
            </Typography>

            <TextField
              label="Precio unitario"
              type="number"
              value={productPriceUnit}
              onChange={(e) => setProductPriceUnit(e.target.value)}
            />
            <TextField
              label="Cantidad"
              type="number"
              defaultValue={
                selectedProduct?.max_stock - selectedProduct?.total_quantity
              }
              value={productQuantity}
              onChange={(e) => setProductQuantity(e.target.value)}
            />
            <GridField>
              <FormControl fullWidth>
                <InputLabel id="order-type-label">Tipo de Orden</InputLabel>
                <Select
                  labelId="order-type-label"
                  label="Tipo de Orden"
                  name="order_type"
                  value={orderType}
                  onChange={(e) => {
                    setOrderType(e.target.value);
                  }}
                  required
                >
                  <MenuItem value="COUNTED">Contado</MenuItem>
                  <MenuItem value="CREDIT">Crédito</MenuItem>
                  <MenuItem value="CONSIGNATION">Consignación</MenuItem>
                </Select>
              </FormControl>

              {/* Campo condicional para días de crédito */}
              {orderType === "CREDIT" && (
                <FieldGroup
                  onChange={(e) => {
                    console.log("ASDSAD");
                    setDaysOfCredit(Number(e.target.value) || 0);
                  }}
                  value={daysOfCredit}
                  name="credit_days"
                  required={true}
                  label="Días de crédito"
                  numeric={true}
                  placeholder="Ej: 15"
                />
              )}
            </GridField>

            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                generatePurchase(selectedProduct);
                setOpenPriceUnitModal(false);
              }}
            >
              Aceptar
            </Button>
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
       {isProvider && <Button sx={{mx:2}} onClick={() => {
          setSelectedProduct(product);
          setOpenPriceUnitModal(true);
        }} variant='contained' color='success' size='small'>Comprar</Button>}
        </TableCell>
        
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