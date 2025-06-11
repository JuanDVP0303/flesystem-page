// PriceUnitDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, Box, IconButton, Typography, Autocomplete,
  TextField, FormControl, InputLabel, Select, MenuItem, Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FieldGroup, GridField } from "../../Inventory/Inventory";
import { usePurchaseContext } from "../../hooks/usePurchasesContext";
import { toast } from "react-toastify";
import { useAdminContext } from "../../hooks/useAdminContext";

const PurchaseDialog = ({
  open,
  onClose,
  compensationOrder=null
}) => {
  const [productPriceUnit, setProductPriceUnit] = useState(0);
  const [productQuantity, setProductQuantity] = useState(0);
  const [providerSelected, setProviderSelected] = useState(null);
  const [orderType, setOrderType] = useState("COUNTED");
  const [daysOfCredit, setDaysOfCredit] = useState(0);
  const { createPurchase, setSelectedProduct, selectedProduct, providers } = usePurchaseContext();
  const { getMinStockProducts } = useAdminContext();

  useEffect(() => {
    if (open) {
      setProductPriceUnit(0);
      setProductQuantity(0);
      setProviderSelected(null);
      setOrderType("COUNTED");
      setDaysOfCredit(0);
    }
  }, [open]);

  useEffect(() => {
    console.log("ENTRANDO",compensationOrder)
    if(compensationOrder){
        console.log(compensationOrder)
        setProviderSelected(compensationOrder?.provider)
        setProductQuantity(Number(compensationOrder?.quantity) - Number(compensationOrder?.real_quantity) || 0)
        setProductPriceUnit(compensationOrder?.price_unit || 0);

    }
  }, [compensationOrder, open])


    const generatePurchase = (product) => {
      //validar que esten todos los datos ademas de validar que la cantidad no sea mayor al stock máximo
      let proceed = true;
      if (
        !productPriceUnit ||
        !productQuantity ||
        !providerSelected ||
        !orderType
      ) {
        console.log(
          "Faltan datos para generar la compra",
          productPriceUnit,
          productQuantity,
          providerSelected,
          orderType
        )
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
  
      //Validar que daysOfCredit sea un número entero
      if (orderType === "CREDIT" && daysOfCredit && !Number.isInteger(daysOfCredit)) {
        toast.error("Los días de crédito deben ser un número entero");
        proceed = false;
      }


      if (productQuantity > product.max_stock - product.total_quantity) {
        toast.error(
          "La cantidad no puede ser mayor al stock máximo del producto"
        );
        proceed = false;
      }
      if (proceed) {
        const purchaseObj = {
          product: { ...product, id: product.product_id },
          quantity: productQuantity,
          provider: providerSelected.id,
          price_unit: productPriceUnit,
          purchase_date: new Date().toISOString().split("T")[0],
          order_type: orderType, // Valor por defecto para compras desde proveedores
          days_of_credit: orderType === "CREDIT" ? daysOfCredit : 0,
        }

        if (compensationOrder) {
            purchaseObj.compensation_order = compensationOrder.id;
        }

        createPurchase(purchaseObj);
      }
      setSelectedProduct(null);
      setProductPriceUnit(0);
      setProductQuantity(0);
      setProviderSelected(null);
  
      getMinStockProducts();
    };
  

  return (
    <Dialog fullWidth open={open} onClose={onClose}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">
            Orden de {compensationOrder ? "reabastecimiento" : "compra"} para {selectedProduct?.name}
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
                      {selectedProduct?.max_stock - selectedProduct?.total_quantity ||
                        0}
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
        {!compensationOrder&&  <TextField
            label="Precio unitario"
            type="number"
            value={productPriceUnit}
            onChange={(e) => setProductPriceUnit(e.target.value)}
          />}
          <TextField
            label="Cantidad"
            type="number"
            value={productQuantity}
            onChange={(e) => setProductQuantity(e.target.value)}
          />
         {!compensationOrder && <FormControl fullWidth>
            <InputLabel id="order-type-label">Tipo de Orden</InputLabel>
            <Select
              labelId="order-type-label"
              label="Tipo de Orden"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <MenuItem value="COUNTED">Contado</MenuItem>
              <MenuItem value="CREDIT">Crédito</MenuItem>
              <MenuItem value="CONSIGNATION">Consignación</MenuItem>
            </Select>
          </FormControl>}
          {orderType === "CREDIT" && (
            <TextField
              label="Días de crédito"
              type="number"
              value={daysOfCredit}
              onChange={(e) => setDaysOfCredit(Number(e.target.value) || 0)}
            />
          )}
          <Button variant="contained" onClick={() => {
            generatePurchase(selectedProduct)
            onClose()
          }}>
            Confirmar
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default PurchaseDialog;
