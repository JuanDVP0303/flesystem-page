import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  FormLabel,
  Grid,
  IconButton,
  InputBase,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import ControlPointOutlinedIcon from '@mui/icons-material/ControlPointOutlined';
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import React, {useEffect, useState } from "react";
import SouthWestIcon from "@mui/icons-material/SouthWest";
import { ModalComponent } from "../../src/components/utils/ModalComponent";
import { useInventoryContext } from "../../src/hooks/useInventoryContext";
import { useParams } from "react-router-dom";
import { useGoTo } from "../../src/hooks/useGoTo";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateField } from '@mui/x-date-pickers/DateField';
import moment from "moment";
import TransferItems from "./components/TransferItems";
import ProductTable from "./components/ProductTable";
import {  GenericButton } from "./components/Buttons";
import SearchBar from "./components/SearchBar";
import { useGlobalContext } from "../../src/hooks/useGlobalContext";
import SearchAutocomplete from "./components/SearchAutoComplete";
import { usePurchaseContext } from "../hooks/usePurchasesContext";
import DragAndDropBox from "../components/utils/DragAndDropBox";
import { toast } from "react-toastify";
import { api } from "../utils/api";

const formValuesDefault = {
  name: "",
  quantity: "",
  price_unit: "",
  sell_price: "",
  category: "",
  sku: "",
  totalCost: "",
  profit: "",
  unit_of_measure: "kg",
  porcentualProfit: "",
  location: "",
  expiration: "",
  waste: "",
  safety_stock: "",
  showAdvancedOptions: false,
  expirationEnabled: false,
  disableFields: false,
}


export const genericBlue = "#007A5E"
const Inventory = () => {
  const {
    setInventoryModalType,
    getProducts,
    products,
    inventoryValues,
    searchProductDebounce,
    searchedProducts
  } = useInventoryContext();
  // const { id, branch_office_id } = useParams();
  const {goTo} = useGoTo();
  const {authenticatedUser} = useGlobalContext()
  const [openTransferItems, setOpenTransferItems] = useState(false);
  // const {office, getOffice, currencySelected, setCurrencySelected} = useMovementContext()
  useEffect(() => {
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    getProducts();
  }, [authenticatedUser]); // Asegúrate de incluir todas las dependencias necesarias
  const handleExportAvailablesProducts = async () => {
    try {
        const response = await api.get(`/inventory/products/export-available-products/`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `productos_disponibles.xlsx`);
        document.body.appendChild(link);
        link.click();
    } catch (error) {
        console.error("Error al exportar las compras completadas:", error);
    }
};

  return (
    <Box
      sx={{
        width: "95%",
        margin: "auto",
      }}
    >
      <TransferItems open={openTransferItems} setOpen={setOpenTransferItems}/>
      <InventoryModal />
      <MiniCard>
        <Box
          sx={{
            display: "flex",
            flexDirection:{
              xs:"column",
              md:"row"
            },
            justifyContent:"space-between",
            // gridTemplateColumns: "1fr 1fr",
            padding: "10px",
            flexWrap:"wrap"

          }}
        >
          <Box className="flex items-center text-[#00db54]">
            <Inventory2OutlinedIcon />
            <span className={`text-xl font-bold text-[${genericBlue}]`}>Inventario</span>
          </Box>
          <Box sx={{display:"flex", gap:2}}>
          {/* <ExchangeButton func={() => {}} /> */}
          <SearchBar label="Buscar Item" searchFunction={searchProductDebounce} />
          </Box>

        </Box>
      </MiniCard>

      <MiniCard>
        <Box className="m-0 md:m-4 flex flex-col gap-5">
          <Box className="flex flex-col md:flex-row gap-4 justify-between ">
              <div className="flex flex-col md:flex-row gap-3 md:gap-2">
              <div className="flex flex-col md:flex-row justify-center gap-5">
          {/* <GenericButton outlined onClick={() => setInventoryModalType("outcome")} label={<>
            Nueva venta <NorthEastIcon />
          </>} /> */}
          <GenericButton onClick={() => setInventoryModalType("income")} label={<>
            <SouthWestIcon /> Agregar producto
          </>} />
        </div>
              <GenericButton outlined onClick={() => goTo(`/inventory/registry-general/`)} label="Registros" />
            {/* {!authenticatedUser.is_superuser &&  <GenericButton onClick={() => setOpenTransferItems(true)} label="Cambiar ubicaciones" />} */}
              </div>
            <div className="chip">
              <p className={`text-[${genericBlue}] font-semibold`}>
                Valor en inventario: {inventoryValues}
              </p>
            </div>
          </Box>
          <Card className="m-0 md:m-4 rounded-lg shadow-lg overflow-auto">
              <ProductTable products={searchedProducts?.length > 0 ? searchedProducts : products} />
          </Card>
          <Box>

          <GenericButton outlined onClick={handleExportAvailablesProducts} label="Disponibilidad de productos" />
          </Box>
        </Box>
      </MiniCard>
    </Box>
  );
};


export const MiniCard = ({ children, className }) => {
  return (
    <Box
    className={`${className}`}
      sx={{
        backgroundColor: "white",
        padding: 1.5,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "20px",
        my: "10px",
      }}
    >
      {children}
    </Box>
  );
};

const InventoryModal = () => {
  const { inventoryModalType, setInventoryModalType } = useInventoryContext();
  return (
    <ModalComponent
      fullScreen={inventoryModalType === "income"}
      title={`${
        inventoryModalType == "income" ? "Añade un producto a tu inventario" : "Extrae un producto de tu inventario"
      }`}
      open={inventoryModalType}
      setOpen={setInventoryModalType}
    >
      {inventoryModalType === "income" ? (
        <IncomeInventory />
      ) : (
        <OutcomeInventory />
      )}
    </ModalComponent>
  );
};

const IncomeInventory = () => {
  const { addProduct, formRef, searchProductDebounce, setSearchedProducts, product } = useInventoryContext();
  const {providers, getProviders} = usePurchaseContext()
  const [formValues, setFormValues] = useState(formValuesDefault);
  const [searchedProviders, setSearchedProviders] = useState([])
  const [selectedProviders, setSelectedProviders] = useState([]);
  
    const handleProviderChange = (event, values) => {
        setSelectedProviders(values);
        setFormValues({
            ...formValues,
            providers: values.map(p => p.id)
        });
    };


  useEffect(() => {
    getProviders()
  }, [])
  const handleChange = (e) => {
    
    const { name, value } = e.target;
    console.log("NAME VLAUE", name,value)
    let realValue = value
    if(name == "sku"){
      realValue = realValue.toUpperCase()
    }
    setFormValues({
      ...formValues,
      [name]: realValue,
    });
  };


  useEffect(() => {
    let quantity = parseFloat(formValues.quantity) || 0;
    let priceUnit = parseFloat(formValues.price_unit) || 0;
    let sellPrice = parseFloat(formValues.sell_price) || 0;
    let totalCost = priceUnit * quantity;
    let profit = sellPrice - priceUnit;
    if(formValues.hasVariations) {
      totalCost = 0;
      profit = 0
      formValues.variations.forEach(variation => {
        if(variation.variation_price_unit){
          profit += parseFloat(sellPrice) - parseFloat(variation.variation_price_unit)
          totalCost += parseFloat(variation.variation_price_unit) * parseFloat(variation.variation_quantity)
        }
      })
    }
    let porcentualProfit = priceUnit > 0 ? ((sellPrice - priceUnit) / priceUnit) * 100 : 0;
      setFormValues((prevValues) => ({
        ...prevValues,
        totalCost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        porcentualProfit: String(porcentualProfit.toFixed(2) + "%").replaceAll(
          ".00",
          ""
        ),
      }));
  }, [formValues.quantity, formValues.price_unit, formValues.sell_price]);


  useEffect(() => {
    if (product) {
      setFormValues((prevValues) => {
        const newObject = {
        ...prevValues,
        name: product.name,
        category: product.category,
        sku: product.sku,
        price_unit: product.price_unit,
        sell_price: product.sell_price,
        unit_of_measure: product.unit_of_measure,
        hasVariations: product.variants.length > 0,
        variations: product?.variants?.map(variation => ({
          variation_name: variation.name,
          variation_quantity: variation.quantity,
          variation_sku: variation.sku,
          variation_price_unit: variation.price_unit,
          variation_id: variation.id,
        })),
        waste: product.waste,
        safety_stock: product.safety_stock,
        location: product.location,
        expiration: product.expiration,
        expirationEnabled: product.expiration ? true : false,
        showAdvancedOptions: product.waste || product.safety_stock || product.location || product.expiration ? true : false,
        variationsGlobalPriceUnit: true,
        description: product.description,
        disableFields: true,
        productId: product.id,
      }
    
    return newObject
    });
    }
    else{
      setFormValues(formValuesDefault)
  }}, [product])


  useEffect(() => {
      setFormValues(formValuesDefault)

      return () => {
        setSearchedProducts([])
      }
  }, [])

  const searchProviders = (partialName) => {
    return providers.filter(provider => provider.name.toLowerCase().includes(partialName.toLowerCase()))
  } 



  return (
    <Box className="p-5">
      <form
        style={{ width: "100%" }}
        onSubmit={(e) => {
          e.preventDefault();
          if(!formValues.product_image){
            toast.error("Debes subir una imagen del producto")
            return
          }
          if(Number(formValues.sell_price) < 0){
            toast.error("El precio de venta no puede ser menor a 0")
            return
          }
          if(Number(formValues.min_stock) < 0){
            toast.error("El stock mínimo no puede ser menor a 0")
            return
          }
          if(Number(formValues.max_stock) < 0){
            toast.error("El stock máximo no puede ser menor a 0")
            return
          }
          if(Number(formValues.min_stock) > Number(formValues.max_stock)){
            console.log("VALIDANDO ACA", formValues)
            toast.error("El stock mínimo no puede ser mayor al stock máximo")
            return
          }
          console.log(formValues)
          if(!formValues.providers || formValues.providers.length == 0){
            toast.error("Debes seleccionar un proveedor")
            return
          }
          const skuRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/;
          const sku = formValues.sku
          if (!sku) {
            toast.error("Debes ingresar un SKU para el producto");
            return;
          }
          console.log("SKU", sku, skuRegex.test(sku))
          if (!skuRegex.test(sku)) {
            toast.error("El SKU debe ser alfanumérico, sin espacios ni caracteres especiales, y tener entre 6 y 12 caracteres");
            return;
          }
          addProduct(formRef, formValues);
        }}
        ref={formRef}
      >
        <Box sx={{ width: "100%" }}>
          {console.log(selectedProviders)}
            <GridField>
            <SearchAutocomplete
              multiple
              options={providers}
              onChange={handleProviderChange}
              required={true}
              value={selectedProviders || []}
              name={"provider"}
              placeholder={"Proveedor"}
              searchFunction={searchProviders}
            />
            </GridField>
          <Grid container spacing={4}>
            <GridField>
              <FieldGroup
                onChange={handleChange}
                value={formValues.name}
                name="name"
                disableShowProduct={true}
                required={true}
                label="Nombre"
                placeholder="Ej: Zapatos..."
              />
              <FieldGroup
                onChange={handleChange}
                value={formValues.quantity}
                label="Unidades de medida"
                required={!formValues?.hasVariations}
                disabled={formValues?.hasVariations}
                formValues={formValues}
                numeric={true}
                name="unit_of_measure"
                double={true}
              />
                <FieldGroup
                  onChange={handleChange}
                  value={formValues.min_stock}
                  label="Min. stock"
                  numeric={true}
                  required={true}
                  name="min_stock"
                  placeholder="Ej: 20..."
                />
               <FieldGroup
                  onChange={handleChange}
                  value={formValues.description}
                  label="Descripción"
                  name="description"
                  placeholder="Ej: Producto de alta calidad..."
                />
            </GridField>
            <GridField>
              <FieldGroup
                onChange={handleChange}
                value={formValues.category}
                label="Categoria"
                disabled={formValues.disableFields}
                name="category"
                placeholder="Ej: Flejes Plásticos..."
              />
              <FieldGroup
                onChange={handleChange}
                value={formValues.sell_price}
                label="Precio de venta"
                required={true}
                name="sell_price"
                numeric={true}
                placeholder="Ej: 100.00"
              />
                    <FieldGroup
                  onChange={handleChange}
                  value={formValues.max_stock}
                  label="Max. stock"
                  numeric={true}
                  required={true}
                  name="max_stock"
                  placeholder="Ej: 60..."
                />
              <FieldGroup
                onChange={handleChange}
                value={formValues.sku}
                label="SKU"
                name="sku"
                placeholder={"Stock Keeping Unit"}
              />
            </GridField>
          </Grid>
        </Box>
        <Box sx={{display:"flex", justifyContent:"center"}}>
        <DragAndDropBox
            setFieldValue={(file) => {
              setFormValues((prev) => ({
                ...prev,
                "product_image": file,
              }));
            }}
            field={"product_image"}
            label={"Foto del producto"}
            value={formValues?.product_image}
            width={160}
            height={160}
          />
   </Box>
        <div className="w-full flex justify-center mt-10">
          <Button
            type="submit"
            variant="contained"
            className="inventory-income-button"
            sx={{ borderRadius: "10px", py: 1, px: 4 }}
          >
            Agregar
          </Button>
        </div>
      </form>
    </Box>
  );
};

const OutcomeInventory = () => {
  const { withdrawProduct, formRefWithdrawal, searchProductDebounce, setSearchedProducts } = useInventoryContext();
  // const {office, getOffice} = useMovementContext()
  const { id } = useParams();
  const [formValues, setFormValues] = useState({
    product: {name:"", quantity:0, location:null},
    quantity: "",
    location: null,
    locations: [],
    motive: "",
    variant: "",
    bank:null,
  })
  const [inInventoryQuantity, setInInventoryQuantity] = useState(0);
  console.log(formValues.variant)
  useEffect(() => {
    const location = formValues?.location
    let batches = formValues?.product?.batches
    const variant = formValues?.variant
    if (variant && batches){
      if(variant == "Non-variant"){
        batches = batches.filter(batch => !batch.product_variant)
      }
      else{
        batches = batches.filter(batch => batch.product_variant == variant)
      }
    }
    if(batches){
      if(location){
        const batch = batches.filter(batch => batch.location == location)
        if(batch){
          setInInventoryQuantity(
            batch.reduce((acc, batch) => acc + batch.quantity, 0)
          )
        }
      }
      else{
        setInInventoryQuantity(
          batches.reduce((acc, batch) => acc + batch.quantity, 0)
        )
      }
    }


  }, [formValues.product, formValues.variant, formValues.location]);

  // useEffect(() => {
  //   !office && getOffice(id)

  //   return () => {
  //     setSearchedProducts([])
  //   }
  // }, [])

  const handleChange = (e) => {
    const { name, value } = e.target;

    let realValue = value

    const new_data  = {
      ...formValues,
      [name]: realValue,
    }
    if(name == "product"){
      const prevLocation = []
      console.log(value?.batches)
      let locations = value?.batches?.map(batch => {
        if(prevLocation.includes(batch.location)){
          return null
        }
        if(!batch.location){
          return null
        }
        prevLocation.push(batch.location)
        return {name:batch.location, id:batch.location}
      })
      //Remove nulls
      locations = locations?.filter(location => location)
      new_data["locations"] = locations


      const isAllBatchesVariant = value?.batches?.every(batch => batch.product_variant)
      if(!isAllBatchesVariant){
        console.log(value)
        const variants = value?.variants
        if(variants){
          variants.push({name:"Sin variante", id:"Non-variant"})
          value["variants"] = variants
        }
      }
    }


    setFormValues(new_data);
  }
  return (
    <Box className="p-5">
    <form
      style={{ width: "100%" }}
      onSubmit={(e) => {
        e.preventDefault();
        withdrawProduct(formValues);
      }}
      ref={formRefWithdrawal}
    >
      <Box sx={{ width: "100%" }}>
          <Grid container spacing={4}>
            <GridField>
              <FieldGroup
                onChange={handleChange}
                value={formValues?.product?.name}
                name="product"
                // searchFunction={searchProductDebounce}
                required={true}
                label="Nombre"
                placeholder="Ej: Zapatos..."
              />
              <FieldGroup
                onChange={handleChange}
                value={formValues.quantity}
                label={`Cantidad - [En inventario ${inInventoryQuantity}]`}
                required={true}
                numeric={true}
                name="quantity"
                placeholder="Ej: 10.00"
              />
            </GridField>
            <GridField>
              <FieldGroup
                onChange={handleChange}
                label="Ubicacion"
                value={formValues?.location}
                choices={formValues?.locations}
                disabled={!formValues?.locations?.length > 0}
                name="location"
                placeholder="Ej: Almacen A..."
              />
               {formValues?.product && formValues?.product?.variants?.length > 0 && <FieldGroup
                onChange={handleChange}
                value={formValues?.variant}
                label="Variante"
                required={true}
                choices={formValues?.product?.variants}
                name="variant"
                numeric={true}
              />
}
            </GridField>
          </Grid>
          <Grid container spacing={4}>
            <GridField>
              {/* <FieldGroup
                onChange={handleChange}
                value={formValues?.bank}
                label="Banco"
                required={true}
                choices={office?.banks}
                name="bank"
                numeric={true}
                placeholder="Ej: 10.00"
              /> */}

            </GridField>
          </Grid>
          <FormLabel sx={{fontSize:12, color:"red"}}>
            ¡Se utilizará el contenido del motivo para el subdetalle del movimiento!
          </FormLabel>
            <FieldGroup
              onChange={handleChange}
                value={formValues.motive}
                label="Motivo"
                name="motive"
                multiline={true}
                placeholder="Ej: Venta...">
            </FieldGroup>

            <h2 className="font-bold my-4 text-blue-400">
              Total a pagar: {formValues.quantity * formValues?.product?.sell_price}
            </h2>
        </Box>

        <div className="w-full flex justify-center mt-10">
          <Button
            type="submit"
            variant="contained"
            className="inventory-income-button"
            sx={{ borderRadius: "10px", py: 1, px: 4 }}
          >
            Confirmar
          </Button>
        </div>
    </form>
    </Box>
  );
};

export const FieldGroup = ({
  label,
  optional,
  placeholder,
  double,
  name,
  required,
  value,
  onChange,
  disabled,
  defaultValue,
  numeric,
  multiple,
  type,
  maxNumber,
  searchFunction, multiline, endAdornment, choices, formValues, options
}) => {
  const handleKeyDown = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
    }
  };
  
  return (
    
  
    <div className="flex flex-col flex-1">
      <FormLabel>
        {label}
      </FormLabel>
      {double ? (
        <div className="flex w-full">
          {
            /*
                <TextField
            disabled={disabled}
            onChange={onChange}
            required={required}
            type={numeric ? "number" : "text"}
            variant="outlined"
            size="medium"
            name={name}
            value={value || null}
            placeholder={placeholder}
            InputProps={{
               sx: { borderRadius: "8px 0 0 8px", width: "100%", bgcolor:disabled ? "#e0e0e0" : "white"},
              }}
            style={{ flex: 1 }}
          />
            */
          }
          <TextField
            disabled={!!formValues.productId}
            type={numeric ? "number" : "text"}
            onChange={onChange}
            required={required}
            select
            name="unit_of_measure"
            variant="outlined"
            InputProps={{ sx: { borderRadius: "0 8px 8px 0" } }}
            style={{ flex: 1 }}
            defaultValue={"und"}
          >
            <MenuItem value={"kg"}>Kg.</MenuItem>
            <MenuItem value={"lb"}>Lb.</MenuItem>
            <MenuItem value={"und"}>Und.</MenuItem>
            <MenuItem em value={"lts"}>
              Lts.
            </MenuItem>
            <MenuItem value={"mts"}>mts.</MenuItem>
            <MenuItem value={"cm"}>cm.</MenuItem>
            <MenuItem value={"gr"}>gr.</MenuItem>
            <MenuItem value={"ml"}>ml.</MenuItem>
          </TextField>
        </div>
      ) : (
        !searchFunction ? <TextField
          multiline={!!multiline}
          endAdornment={endAdornment}
          onChange={onChange}
          required={required}
          variant="outlined"
          type={type ? type : numeric ? "number" : "text"}
          step={numeric ? 0.01 : ""}
          size="medium"
          select={!!choices}
          disabled={disabled}
          value={value || null}
          multiple={multiple}
          max={maxNumber}
          min={0}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          InputProps={{
            endAdornment:(
              <>
              {  endAdornment}
              </>
            ),
            sx: {
              bgcolor:disabled ? "#e0e0e0" : "white",
              borderRadius: 3,
              width: "100%",
            },
            min: 0,
            
          }}
          onKeyDown={numeric ? handleKeyDown : null}
        >
          {choices && choices?.map((choice, index) => (
            <MenuItem key={index} value={choice?.id}>{choice?.name}</MenuItem>
          ))}
        </TextField>
        :
      <SearchAutocomplete
        options={options}
        onChange={onChange}
        required={required}
        disabled={disabled}
        value={value || null}
        name={name}
        placeholder={placeholder}
        endAdornment={endAdornment}
        multiline={multiline}
        numeric={numeric}
        searchFunction={searchFunction}
      />
      )}
    </div>
  );
};
export const GridField = ({ children, agrouped }) => {
  return (
    <Grid
      item
      xs={12}
      sm={agrouped ? 12 : 6}
      sx={{
        display: "flex",
        flexDirection: agrouped ? "row" : "column",
        gap: 2,
        width: "100%",
      }}
    >
      {React.Children.map(children, (child) => (
          <div style={{flex:1, height:"auto"}}>{child}</div> // Asegúrate de que cada hijo ocupe el espacio disponible
      ))}
    </Grid>
  );
};

export const ExpirationField = ({checked, handleExpirationToggle, value, handleChange, disabled, dateFieldName}) => {
return <div className="flex items-center gap-0 w-full">
  <div className="flex-1">
    <FormLabel>
    <Checkbox
    type="checkbox"
    size="small"
    checked={checked}
    onChange={() => {
      handleExpirationToggle()
    }}
    sx={{p:0, pr:1}}
  />
        Expiración <span className="text-gray-300">(Opcional)</span>
      </FormLabel>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateField
      fullWidth
      onChange={(date) => {
          handleChange({target:{name:dateFieldName, value:date}})
        }}
        defaultValue={moment(value) || null}
        disabled={disabled}
        maxDate={moment("2050-12-31")}
        placeholder="Ej: 2024-12-31"
      />
    </LocalizationProvider>

  </div>
  {/* <div className="flex-1">

    <FieldGroup
      onChange={handleChange}
      value={value}
      label="Expiración"
      name="expiration"
      disabled={disabled}
      placeholder="Ej: 2024-12-31"
    />
  </div> */}
</div>
}

export default Inventory;
