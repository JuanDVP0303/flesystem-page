import { Box, Button, Grid, IconButton } from "@mui/material";
import { ExpirationField, FieldGroup, GridField, MiniCard } from "./Inventory";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { toast } from "react-toastify";
import { GoBackInventoryButton } from "./InventoryMovements";
import { formatNumber, getProductQuantityByUnit } from "../../src/utils/methods";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import { ModalComponent } from "../../src/components/utils/ModalComponent";
import Swal from "sweetalert2";
import ProductCard from "./components/ProductCard";
import { useInventoryContext } from "../../src/hooks/useInventoryContext";
import { SaveButton } from "./components/Buttons";
import { useGlobalContext } from "../../src/hooks/useGlobalContext";
import { api } from "../utils/api";
import SearchAutocomplete from "./components/SearchAutoComplete";
import { usePurchaseContext } from "../hooks/usePurchasesContext";
export const genericBlue = "#1adb00";
const ProductView = () => {
  const {  productId } = useParams();
  const { office, authenticatedUser } = useGlobalContext();
  const {product, setProduct, editProductFunction, deleteProduct} = useInventoryContext()
  const [editProduct, setEditProduct] = useState(false);
  const [productEdited, setProductEdited] = useState(null);
  const getProduct = async (currency) => {
    let res;
    try {
      let url = `/inventory/products/get_product/?product=${productId}`
      if (currency) {
        url += `&currency=${currency}`
      }
      res = await api.get(
        url
      );

      
      setProduct(res.data.product);
      setProductEdited({
        ...res.data.product,
        expirationEnabled: false,
      });
    } catch (e) {
      res = e.response;
    }
    if (res.status !== 200) {
      toast.error("Ha ocurrido un error");
    }
  };

  const handleProductChange = (e, providers) => {
    console.log(providers)
    if (providers){
      setProductEdited((prev) => {
        return { ...prev, providers: providers};
      });
      return;
    }
    const { name, value } = e.target;
    setProductEdited((prev) => {
      return { ...prev, [name]: value };
    });
  };


  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if(!productEdited?.min_stock){
      toast.error("El stock mínimo es requerido")
      return
    }
    if(!productEdited?.max_stock){
      toast.error("El stock máximo es requerido")
      return
    }
    if(productEdited?.min_stock > productEdited?.max_stock){
      toast.error("El stock mínimo no puede ser mayor al máximo")
      return
    }
    if(productEdited?.min_stock <= 0){
      toast.error("El stock mínimo no puede ser menor o igual a 0")
      return
    }
    if(productEdited?.max_stock <= 0){
      toast.error("El stock máximo no puede ser menor o igual a 0")
      return
    }
    if(productEdited?.min_stock == productEdited?.max_stock){
      toast.error("El stock mínimo no puede ser igual al máximo")
      return
    }
    //Validar que el max stock no sea muy alto
    if(productEdited?.max_stock > 10000){
      toast.error("El stock máximo no puede ser mayor a 10.000")
      return
    }
    const res = await editProductFunction(productEdited, productId)
    setProductEdited(res.data);
    setEditProduct(false);
    if (res.status !== 200) {
      toast.error("Ha ocurrido un error");
    }
    else{
      toast.success("Producto editado con éxito")
    }
  }

  useEffect(() => {
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    // const currency = currencySelected || office?.main_currency || office?.currency
    // !office && getOffice(officeId)
    getProduct();

    return () => {
      setProduct(null)
    }
  }, []);



  return (
    <Box className="p-5">
      <GoBackInventoryButton office={office} />
      <MiniCard>
        {product ? (<>
          <Box className="flex flex-col md:flex-row p-4">
            <div className="flex-1">
              <h2 className="text-2xl p-6 pl-0">{product?.name || "Cargando"}</h2>
              <div className="flex flex-col gap-4">
                <KeyValue
                  label="Cantidad en inventario"
                  value={`${product?.quantity ?? 0} ${getProductQuantityByUnit(product, false, true)}`}
                />
                <KeyValue
                  label="Valor en inventario"
                  value={`${formatNumber(
                    product?.quantity * product?.price_unit
                  )} ${("BS")?.toUpperCase()}.`}
                />
                <KeyValue label="Categoría" value={`${product?.category}`} />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-2xl p-6 pl-0"></h2>

              <KeyValue label="Descripción" value={`${product?.description ? product?.description : "Sin descripción"}`} />
              <KeyValue label="Stock Mínimo" value={`${product?.min_stock ? product?.min_stock : "Sin descripción"}`} />
              <KeyValue label="Stock Máximo" value={`${product?.max_stock ? product?.max_stock : "Sin descripción"}`} />
              <div className="flex">
                <div className="flex-1"></div>
              {/* {!authenticatedUser.is_superuser &&<Button
                  className="strong_blue_button"
                  sx={{color:"white", px:4}}
                  onClick={() => {
                    Swal.fire({
                      title: "¿Estás seguro?",
                      text: "No podrás revertir esta acción",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#3085d6",
                      cancelButtonColor: "#d33",
                      confirmButtonText: "Sí, eliminar!",
                    }).then((result) => {
                      if (result.isConfirmed) {
                        deleteProduct(productId)
                      }})
                  }}
                >
                  <DeleteOutlineIcon /> Eliminar Producto
                </Button>} */}
              </div>
            </div>
            <div className="flex gap-2 items-start">

            <EditButton onClick={() => setEditProduct(true)} />
            </div>
          </Box>
            <div className="flex-1 flex flex-col gap-4 m-4">
                  <img src={import.meta.env.VITE_API_URL + "/"+ product?.product_image} alt={product?.name} className="w-64 h-64 object-cover border" />
            </div></>
        ): <h1>Cargando...</h1>}
      </MiniCard>
        <EditModalForm handleSubmit={handleSubmitEdit} handleProductChange={handleProductChange} product={product} editProduct={editProduct} setEditProduct={setEditProduct} productEdited={productEdited}  setProductEdited={setProductEdited}/>
      {/* {
        product?.batches?.length > 0 ? <div className="flex flex-wrap gap-4">
          {product?.batches.map((batch, index) => {
            return ( 
              <div key={index} >
                <ProductCard product={batch} isVariant={!!batch.product_variant} nonDelete ={product?.batches.length == 1} />
              </div>
            );
          })}
        </div> : null
      } */}

    </Box>
  );
};

export const KeyValue = ({ label, value, spaceBetween }) => {
  return (
    <div className={`flex gap-2 ${spaceBetween && "justify-between"} `}>
      <span className={`font-bold text-[${genericBlue}]`}>{label}:</span>
      <span>{value}</span>
    </div>
  );
};

export const EditButton = ({onClick, small}) => {
  let sx = {border: "1px solid " + genericBlue}
  const sxSmall = { width: "30px", height: "30px", padding:2 }
  sx = small ? {...sx, ...sxSmall} : sx
  return <IconButton
  sx={sx}
  onClick={onClick}
>
  <DriveFileRenameOutlineIcon sx={{ color: genericBlue }} />
</IconButton>
}

export const EditModalForm = ({ handleProductChange, product, editProduct, setEditProduct, setProductEdited, productEdited, handleSubmit, isBatch }) =>{
  const {providers, getProviders} = usePurchaseContext()
  const [selectedProviders, setSelectedProviders] = useState([]);
  console.log("PRODUCT EDITED", productEdited)
    useEffect(() => {
      if(productEdited?.providers && providers.length > 0){
      setSelectedProviders(providers.filter(p => {
        return productEdited.providers.includes(p.id)
      }))}
    }, [productEdited])

    useEffect(() => {
      getProviders()
    }, [])
    console.log(selectedProviders)
    const handleProviderChange = (event, values) => {
      setSelectedProviders(values);
      handleProductChange(event, values.map(p => p.id));
      // setFormValues({
      //     ...formValues,
      //     providers: values.map(p => p.id)
      // });
  };
    
  const searchProviders = (partialName) => {
    return providers.filter(provider => provider.name.toLowerCase().includes(partialName.toLowerCase()))
  } 
  return <ModalComponent
  fullWidth={isBatch}
  title={product?.name}
  open={editProduct}
  setOpen={setEditProduct}
>

  <Box sx={{ padding: 3, display:"flex", flexDirection:"column", gap:2 }}>
    {!isBatch ? <form onSubmit={handleSubmit}>
    <Grid container spacing={4}>
      <GridField>
        <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.name}
          name="name"
          // searchFunction={searchProductDebounce}
          required={true}
          label="Nombre"
          placeholder="Ex:. Zapatos..."
        />
        <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.sku}
          label={`SKU`}
          optional={true}
          // required={true}
          // numeric={true}
          name="sku"
          placeholder="Ex:. PRODUCTO"
        />
      </GridField>
       <GridField>
          <FieldGroup
            onChange={handleProductChange}
            value={productEdited?.max_stock}
            label="Stock Máximo"
            // disabled={!productEdited?.max_stock}
            name="max_stock"
            optional={true}
            numeric={true}
            placeholder="Ex:. 100..."
          />
          <FieldGroup
            onChange={handleProductChange}
            value={productEdited?.min_stock}
            label="Stock Mínimo"
            numeric={true}
            // disabled={!productEdited?.min_stock}
            name="min_stock"
            optional={true}
            placeholder="Ex:. 10..."
          />
       </GridField>
    </Grid>
        <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.category}
          label="Categoría"
          disabled={!productEdited?.category}
          name="category"
          optional={true}
          placeholder="Ex:. Vestimenta..."
        />

    <FieldGroup
      onChange={handleProductChange}
      value={productEdited?.description}
      label="Descripción"
      name="description"
      optional={true}
    />
    <Box sx={{mt:2}}>
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
            </Box>
    <div className="flex justify-center mt-4">
    <SaveButton label="Guardar Cambios" />
    </div>
    </form> :
    <form onSubmit={handleSubmit}>
    <Grid container spacing={4}>
      <GridField>
        <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.quantity}
          name="quantity"
          numeric={true}
          endAdornment={getProductQuantityByUnit(product, false, true)}
          label="Cantidad"
          placeholder="Ex:. 20..."
        />
      </GridField>
      <GridField>
        <FieldGroup
          onChange={handleProductChange}
          disabled={true}
          value={formatNumber(productEdited?.price_unit * productEdited?.quantity)}
          label="Costo total"
          name="name"
          placeholder="Ex:. 100"
        />
        </GridField>
       {/* <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.price_unit}
          label="Costo unitario."
          // disabled={!productEdited?.category}
          name="price_unit"
          optional={true}
          placeholder="Ex:. 20$..."
        />
        <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.name}
          label="Nombre"
          // disabled={!productEdited?.safety_stock}
          name="name"
          optional={true}
          placeholder="Ex:. Vestimenta..."
        />
      </GridField> */}
      {/* <GridField> */}
      {/* <FieldGroup
          onChange={handleProductChange}
          value={productEdited?.location}
          label={`Ubicación`}
          optional={true}
          name="location"
          placeholder="Ex:. Almacén A"
        /> */}
      {/* </GridField> */}
      {/* <GridField>
      <ExpirationField 
        handleExpirationToggle={handleExpirationToggle}
        checked={productEdited?.expirationEnabled}
        handleChange={handleProductChange}
        value={isBatch ? productEdited?.expiration_date : productEdited?.expiration}

        disabled={!productEdited?.expirationEnabled}
        dateFieldName={"expiration_date"}
      />
      </GridField> */}
    </Grid>
    <div className="flex justify-center p-5">
    <SaveButton label="Guardar Cambios" />
    </div>
    </form>
    }
  </Box>

</ModalComponent>
}



export default ProductView;
