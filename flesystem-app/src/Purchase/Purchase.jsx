import {
  Autocomplete,
  Box,
  Button,
  Card,
  Dialog,
  FormControl,
  FormLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useGlobalContext } from "../../src/hooks/useGlobalContext";
import { GenericButton } from "../Inventory/components/Buttons";
import StoreIcon from "@mui/icons-material/Store";
import { ModalComponent } from "../components/utils/ModalComponent";
import { usePurchaseContext } from "../hooks/usePurchasesContext";
import { useEffect, useRef, useState } from "react";
import TableGenerator from "../components/utils/TableGenerator";
export const genericBlue = "#1adb00";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { FieldGroup, GridField } from "../Inventory/Inventory";
import { useInventoryContext } from "../hooks/useInventoryContext";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import ProductTable from "../Inventory/components/ProductTable";
import { FilterButton } from "../BuyingRecords/BuyingRecords";
import ConsignmentManager from "./ConsignmentManager";

const Purchase = () => {
  const { authenticatedUser } = useGlobalContext();
  const { purchasesModalType, setPurchasesModalType, getProviders, getOrders, orders } = usePurchaseContext();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [openConsignationManager, setOpenConsignationManager] = useState(false);
  const filteredOrders = orders.filter(order => 
    statusFilter ? order.status === statusFilter : true
  );
  useEffect(() => {
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    getProviders();
    getOrders();
  }, [authenticatedUser]);



  return (
    <Box
      sx={{
        width: "95%",
        margin: "auto",
      }}
    >
      <MiniCard>
        <Box
          sx={{
            display: "flex",
            flexDirection: {
              xs: "column",
              md: "row",
            },
            justifyContent: "space-between",
            padding: "10px",
            flexWrap: "wrap",
          }}
        >
          <Box className="flex items-center text-[#00db00]">
            <StoreIcon />
            <span className={`text-xl font-bold text-[${genericBlue}]`}>
              Compras
            </span>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}></Box>
        </Box>
      </MiniCard>
        <MiniCard>
          <div className="flex flex-col md:flex-row justify-center gap-5">
            <GenericButton
              onClick={() => {
                setPurchasesModalType("providers");
              }}
              outlined
              label={
                <>
                  Proveedores&nbsp;
                  <LocalShippingIcon />
                </>
              }
            />
            {/* <GenericButton
              onClick={() => {
                setPurchasesModalType("purchase");
              }}
              label={
                <>
                  Generar compra&nbsp;
                  <StoreIcon />
                </>
              }
            /> */}
          </div>
        </MiniCard>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            mb: 2,
            flexWrap: 'wrap'
          }}>
            <FilterButton status="PENDING" label="Pendientes" statusFilter={statusFilter} setStatusFilter={setStatusFilter}/>
            <FilterButton status="COMPLETED" label="Completados" statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
            <FilterButton status="CANCELLED" label="Cancelados" statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
          </Box>
      <MiniCard>
        <TableGenerator
              labels={["Producto", "Cantidad Prevista", "Cantidad Real", "Proveedor", "Tipo", "Costo Total Esperado", "Costo Total Final", "Fecha", "Acción", "Status"]}
              data={filteredOrders.map(order => {
              const orderTypeMap = {
              'COUNTED': 'Contado',
              'CREDIT': 'Crédito',
              'CONSIGNATION': 'Consignación'
            };
                return {
                  ...order,
                  order_type: orderTypeMap[order.order_type] || order.order_type,
                  total_cost: `Bs.${order.total_cost.toFixed(2)}`,
                  real_total_cost: `Bs.${(order.real_quantity * order.price_unit).toFixed(2)}`,
                  status: (
                    <Box className={`${
                      order.status === "COMPLETED" ? "bg-green-500" :
                      order.status === "PENDING" ?  "bg-yellow-500":
                      "bg-red-500"
                    } w-3 h-3 rounded-full`}></Box>                  
                  ),
                  action: (
                    <Box sx={{
                      display: "flex",
                    }}>
                    <Tooltip title="Ver detalles de la compra">
                    <IconButton
                      onClick={() => {
                        console.log(order)
                        setPurchasesModalType(order);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    </Tooltip>

                    </Box>
                  )
                }}) || []}
              rowFields={["product_name", "quantity", "real_quantity", "provider_name", "order_type", "total_cost", "real_total_cost","purchase_date", "action", "status"]}
            />
      </MiniCard>
      <PurchaseModal />
    </Box>
  );
};
const PurchaseModal = () => {
  const { purchasesModalType, setPurchasesModalType } = usePurchaseContext();
  return (
    <ModalComponent
      fullScreen={true}
      title={`${
        purchasesModalType === "providers" ? "Proveedores" : "Compra"
      }`}
      open={Boolean(purchasesModalType)}
      setOpen={setPurchasesModalType}
    >
      {purchasesModalType === "providers" ? (
        <ProviderSection />
      ) : (
        <PurchaseSection />
      )}
    </ModalComponent>
  );
};

const PurchaseSection = () => {
  
  const [formValues, setFormValues] = useState({
    provider: null,
    product: null,
    quantity: 0,
    price_unit: 0,
    total_cost: 0,
    purchase_date: "",
    invoice_number: "",
    order_type: "COUNTED", // Nuevo campo: tipo de orden
    credit_days: 0,        // Nuevo campo: días de crédito
  });
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState([]);
  const { searchProductDebounce,  setSearchedProducts,  } = useInventoryContext();
  const { createPurchase, purchasesModalType, setPurchasesModalType, updateOrderStatus } = usePurchaseContext();
  const [order, setOrder] = useState(null)
  const formRef = useRef();
  const {searchedProducts, } = useInventoryContext()

  const searchProviders = async (search) => {
    if (search.length > 0) {
      const response = await api.get(
        `/purchase/providers/get-providers?name=${search}`
      );
      const data = response?.data;
      console.log("DATA", data);
      // const response = await fetch(`http://localhost:8000/api/purchases/purchase/?search=${search}`)
      setProviders(
        response?.data?.map((provider) => {
          return {
            ...provider,
            label: provider?.name,
          };
        })
      );
    } else {
      setProviders([]);
    }
  };

  const handleChange = (e) => {
    console.log("ASDASD", e.target.name, e.target.value)
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };


  
const generateShortageReport = async (orderId) => {
  try {
    const response = await api.get(`/purchase/orders/${orderId}/shortage-report/`, {
      responseType: 'blob', // Para manejar la respuesta como blob (PDF)
    });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
    link.setAttribute('download', `diferencia_orden_${orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    toast.error("Error al generar el reporte de diferencia");
    console.error(error);
    return false;
  }
};

  useEffect(() => {
    setFormValues(prev => {
      return {
        ...prev,
        total_cost: formValues.quantity * formValues.price_unit
      }
    })

    return () => {
      setSearchedProducts([])
      
    }
  }, [formValues.quantity, formValues.price_unit]);	

  useEffect(() => {
    if(typeof purchasesModalType === "object"){
      setOrder(purchasesModalType)
      console.log("ORDER", purchasesModalType)
      setFormValues({
        ...formValues,
        provider: purchasesModalType.provider,
        product: purchasesModalType.product,
        quantity: purchasesModalType.quantity,
        price_unit: purchasesModalType.price_unit,
        total_cost: purchasesModalType.total_cost,
        purchase_date: purchasesModalType.purchase_date,
        invoice_number: purchasesModalType.invoice_number,
        real_quantity: purchasesModalType.real_quantity,
        order_type: purchasesModalType.order_type || "COUNTED", // Asegurarse de que el tipo de orden esté definido
        credit_days: purchasesModalType.credit_days || 0, // Asegurarse de que los días de crédito estén definidos
      })
    }
  } , [purchasesModalType])

  return (
    <Box className="p-5">
      <form
        ref={formRef}
        onSubmit={(e) => {
          createPurchase();
          e.preventDefault();
        }}
      >
        <Box sx={{ width: "100%" }}>
        {typeof purchasesModalType === "object" && 
          purchasesModalType?.order_type === "CONSIGNATION" && 
          purchasesModalType?.status === "COMPLETED" && (
          <ConsignmentManager order={purchasesModalType} />
        )}
        <Box className={`${
                      purchasesModalType?.status === "COMPLETED" ? "bg-green-500" :
                      purchasesModalType?.status === "PENDING" ?  "bg-yellow-500":
                      "bg-red-500"
                    } w-auto p-1 text-center text-white rounded-full`}>
                        {
                          purchasesModalType?.status === "COMPLETED" ? "Completado" :
                          purchasesModalType?.status === "PENDING" ?  "Pendiente":
                          "Denegado"
                        }
                      </Box> 


              <div className="flex flex-col flex-1">
                <FormLabel>Proveedor</FormLabel>
                <Autocomplete
                disabled={typeof purchasesModalType === "object"}

                  freeSolo={providers?.length === 0}
                  onChange={(e, value) => {
                    handleChange({
                      target: { name: "provider", value: value },
                    });
                    if (value) {
                      const productInSearch = providers?.find(
                        (product) => product?.name === value?.name
                      );
                      if (productInSearch) {
                        setProvider(productInSearch);
                      } else {
                        setProvider(null);
                      }
                    }
                  }}
                  required={true}
                  variant="outlined"
                  size="medium"
                  // disabled={false}
                  value={formValues?.provider?.name || null}
                  name={"provider"}
                  options={providers}
                  renderInput={(params) => (
                    <>
                      <TextField
                        {...params}
                        // endAdornment={endAdornment}
                        placeholder={"Ex:. Proveedor S.A."}
                        InputProps={{
                          ...params.InputProps,
                          name: "provider",
                          type: "text",
                          onChange: (e) => {
                            searchProviders(e?.target?.value);
                            handleChange(e);
                            setProvider(null);
                          },
                        }}
                      />
                    </>
                  )}
                />
              </div>
              {console.log([formValues?.product])}
          <Grid container spacing={4}>
            <GridField>
              <FieldGroup
                onChange={handleChange}
                value={formValues?.product?.id}
                name="product"
                required={true}
                options={typeof purchasesModalType == "object" && formValues?.product ? [formValues?.product] : searchedProducts}
                searchFunction={(e) => searchProductDebounce(e, formValues?.provider?.id)}
                label="Producto"
                disabled={typeof purchasesModalType === "object"}

                placeholder="Buscar producto"
                disableShowProduct={false}
              />
              <FieldGroup
                onChange={handleChange}
                value={formValues.purchase_date}
                name="purchase_date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required={true}
                label="Fecha de compra"
                disabled={typeof purchasesModalType === "object"}

                type="date"
              />
              {/* <FieldGroup
                onChange={handleChange}
                value={formValues.invoice_number}
                name="invoice_number"
                optional={true}
                label="Número de factura"
                placeholder="Ex:. 001-123456"
              /> */}
            </GridField>
            <GridField>
              <FieldGroup
                onChange={handleChange}
                value={formValues.quantity}
                name="quantity"
                required={true}
                label="Cantidad"
                numeric={true}
                disabled={typeof purchasesModalType === "object"}

                placeholder="Ex:. 100"
              />
              <FieldGroup
                onChange={handleChange}
                value={formValues.price_unit}
                name="price_unit"
                required={true}
                label="Costo unitario"
                numeric={true}
                endAdornment={"Bs."}
                disabled={typeof purchasesModalType === "object"}
                placeholder="Ex:. 50.00"
              />
            </GridField>
          </Grid>
          <GridField>
            {console.log("FORM VALUES", formValues)}
  {formValues.order_type === 'CREDIT' && (
    <FieldGroup
      onChange={handleChange}
      value={formValues.credit_days}
      name="credit_days"
      disabled
      required={true}
      label="Días de crédito"
      numeric={true}
      placeholder="Ej: 15"
    />
  )}
  {console.log(formValues)}
  {formValues.order_type === 'CONSIGNATION' && (
    <Typography variant="body2" color="textSecondary">
      Los productos se registrarán como consignados
    </Typography>
  )}
</GridField>
     {typeof purchasesModalType == "object" && <FieldGroup
                onChange={handleChange}
                value={formValues.real_quantity}
                name="real_quantity"
                required={true}
                label="Cantidad real"
                maxNumber={formValues.quantity}
                disabled={purchasesModalType.status != "PENDING"}
                numeric={true}
                placeholder="Ex:. 50.00"
              />}
  
            {/* <div className="px-8 pt-5">
              <FieldGroup
                onChange={handleChange}
                value={formValues.total_cost}
                name="total_cost"
                disabled={true}
                label="Costo total"
                placeholder="Calculado automáticamente"
              />
            </div> */}
          <Box mt={4}>
    {!typeof purchasesModalType === "object" && (<Grid container spacing={2}>
              <Grid item xs={12}>
                <Button type="submit" variant="outlined" color="primary">
                  Generar Compra
                </Button>
              </Grid>
              {/* <Grid item xs={12}>
        <PurchaseOrderSummary
          products={formValues.products}
          onRemove={handleRemoveProduct}
        />
      </Grid> */}
            </Grid>) 
            }

            {typeof purchasesModalType === "object" && purchasesModalType?.status == "PENDING" && (
                  <>
                  <Button type="submit" variant="outlined" color="primary" onClick={async () => {
                    console.log(formValues)
                    if(!formValues.real_quantity){
                      toast.error("Por favor, ingrese la cantidad real");
                      return
                    }
                    if(formValues.real_quantity <= 0){
                      toast.error("La cantidad real debe ser mayor a 0");
                      return
                    }
                    if(formValues.real_quantity > formValues.quantity){
                      toast.error("La cantidad real no puede ser mayor a la cantidad prevista");
                      return
                    }


                  await updateOrderStatus(order.id, "COMPLETED", formValues.real_quantity)
                  setPurchasesModalType(null)
                    // Si es de tipo CONTADO y hay diferencia, generar reporte
                  if (formValues.real_quantity < formValues.quantity) {
                    const reportGenerated = await generateShortageReport(order.id);
                    if (!reportGenerated) {
                      return; // Si hay error, no continuar
                    }
                  }


                  }}>
                    Aceptar compra
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => {
                    updateOrderStatus(order.id, "CANCELLED")
                    setPurchasesModalType(null)
                    
                    }}>
                    Denegar
                  </Button>
                  </>
            )}
            
          </Box>
        </Box>
      </form>
    </Box>
  );
};

const ProviderSection = () => {
  //options: str: view | str: add | int: idOfProvider
  const [state, setState] = useState("view");
  const [providersToShow, setProvidersToShow] = useState(null);
  const { providers, formRef,setProvider } = usePurchaseContext();
  useEffect(() => {
    setProvidersToShow(
      providers.map((provider) => {
        return {
          ...provider,
          action: (
            <IconButton
              onClick={() => {
                setState(provider.id);
              }}
            >
              <VisibilityIcon />
            </IconButton>
          ),
        };
      })
    );
  }, [providers]);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 2,
      }}
    >
      <MiniCard>
        
        <Box className="flex flex-col md:flex-row justify-center gap-5">
          <GenericButton
            outlined={state == "view"}
            label="Ver proveedores"
            onClick={() => {
              setState("view");
            }}
          />
          <GenericButton
            outlined={state == "add"}
            label="Agregar proveedor"
            onClick={() => {
              //Resetear formREf
              formRef.current && formRef.current.reset();
              setState("add");
              setProvider(null);
            }}
          />
        </Box>
        {state == "view" && (
          <Box>
            <TableGenerator
              labels={["Nombre", "Correo", "Dirección", "Teléfono", "Acciones"]}
              data={providersToShow || []}
              rowFields={["name", "email", "address", "phone", "action"]}
            />
          </Box>
        )}
        {state == "add" || !isNaN(state) ? (
            <Box>
              <ProvidersView state={state} />
            </Box>
           ): null}
      </MiniCard>
    </Box>
  );
};
const ProvidersView = ({ state }) => {
  const { createProvider, getProvider, editProvider, provider, setProvider,formRef, providerProducts, setProviderProducts, getProvidersProducts } =
    usePurchaseContext();

    const [showProvidersProduct, setShowProvidersProduct] = useState(false)

  useEffect(() => {
    return () => setProvider(null);
  }, []);


  const onSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const providerData = {};
    formData.forEach((value, key) => {
      providerData[key] = value;
    });
    if (provider) {
      providerData.id = state;
    }
    providerData["document"] = providerData["document"].replace(/[^0-9]/g, ""); // Solo números
    providerData["document"] = `${providerData["type_of_document"]}-${providerData["document"]}`;
    // console.log("PROVIDER DATA", providerData);
    
    if (state == "add") {
      createProvider(providerData);
    } else {
      editProvider(providerData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProvider((prev) => {
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleExportCompletedOrders = async () => {
    try {
        const response = await api.get(`/purchase/providers/${provider.id}/export-completed-orders/`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `compras_completadas_proveedor_${provider.id}.xlsx`);
        document.body.appendChild(link);
        link.click();
    } catch (error) {
        console.error("Error al exportar las compras completadas:", error);
    }
};
  useEffect(() => {
    // Verificar si state es un número
    if (!isNaN(state)) {
      // Buscar el proveedor con ese id
      getProvider(state);
    }
  }, [state]);

  useEffect(() => {
    if(showProvidersProduct && provider){
      getProvidersProducts(provider?.id)
    }
    else{
      setProviderProducts([])
    }
  }, [showProvidersProduct])
  console.log(providerProducts)
  return (
    <Box>
      <MiniCard>
        <Box>
          <ModalComponent
            title={`Productos de ${provider?.name}`}
            open={showProvidersProduct}
            setOpen={setShowProvidersProduct}
            fullWidth
          >
            
            <Card sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: 2,
            }}>
          <Box>
            <ProductTable isProvider={provider} products={providerProducts?.length > 0 ? providerProducts : []} />
          </Box>
          </Card>
          </ModalComponent>
          <div className="mb-6 flex gap-4">
{provider && <>        <GenericButton outlined onClick={() => setShowProvidersProduct(true)} label={"Productos"}>
        </GenericButton>
        <GenericButton onClick={handleExportCompletedOrders} label={"Compras Completadas"} /></>}
          </div>
        </Box>
        <form
          ref={formRef}
          onSubmit={(e) => {
            onSubmit(e);
          }}
        >
          <Box>
            {/* Grupo de campos: Nombre y Email */}
            <GridField agrouped={true}>
              <FieldGroup
                onChange={handleChange}
                label="Nombre"
                name="name"
                required
                value={provider ? provider.name : ""}
              />
              <FieldGroup
                onChange={handleChange}
                label="Email"
                name="email"
                required
                value={provider ? provider.email : ""}
              />
            </GridField>

            {/* Grupo de campos: Teléfono y Dirección */}
            <GridField agrouped={true}>
              {/* Teléfono - Formato venezolano */}
              <FieldGroup
                  onChange={(e) => {
                    let formattedValue = e.target.value.replace(/[^0-9]/g, ""); // Solo números

                    // Limitar a un máximo de 11 dígitos (4 para el código y 7 para el número)
                    if (formattedValue.length > 11) {
                      formattedValue = formattedValue.slice(0, 11); // Cortar a los primeros 11 dígitos
                    }

                    // Aplicar el formato #### #######
                    if (formattedValue.length > 4) {
                      formattedValue = `${formattedValue.slice(0, 4)} ${formattedValue.slice(4)}`;
                    }

                    handleChange({ target: { name: "phone", value: formattedValue } });
                  }}
                  label="Teléfono"
                  name="phone"
                  required
                  placeholder="0424 1234567"
                  value={provider ? provider.phone : ""}
                />

              <FieldGroup
                onChange={handleChange}
                label="Dirección"
                name="address"
                required
                value={provider ? provider.address : ""}
              />
            </GridField>

            {/* Grupo de campos: RIF y Cédula */}
            <GridField agrouped={true}>
              {/* RIF - Solo numérico */}
              <FieldGroup
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, ""); // Solo números
                  handleChange({ target: { name: "rif", value: numericValue } });
                }}
                label="RIF"
                name="rif"
                required
                placeholder="Solo números"
                value={provider ? provider.rif : ""}
              />

              {/* Cédula */}
              <Box display="flex" alignItems="center" gap={1} sx={{pt:3}}>
                {/* Select para tipo de documento */}
                <FormControl sx={{ width: "20%" }} variant="outlined" required>
                  <InputLabel id="select-label">J</InputLabel>
                  <Select
                    labelId="select-label"
                    label="V"
                    name="type_of_document"
                    onChange={(e) =>
                      handleChange({ target: { name: "type_of_document", value: e.target.value } })
                    }
                    value={provider ? provider.type_of_document : "J"}
                  >
                    <MenuItem value={"V"}>V</MenuItem>
                    <MenuItem value={"J"}>J</MenuItem>
                  </Select>
                </FormControl>

                {/* Campo para número de cédula */}
                <FieldGroup
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, ""); // Solo números
                    handleChange({ target: { name: "document", value: numericValue } });
                  }}
                  // label="Cédula"
                  name="document"
                  required
                  placeholder="Cédula"
                  sx={{ width: "80%" }}
                  value={provider ? provider.document : ""}
                />
              </Box>
            </GridField>
          </Box>

          {/* Botón para enviar el formulario */}
          <Box className="flex justify-center my-4">
            <GenericButton
              label={provider ? "Editar proveedor" : "Agregar proveedor"}
              type="submit"
            />
          </Box>
        </form>
      </MiniCard>
    </Box>
  );
};

export const MiniCard = ({ children }) => {
  return (
    <Box
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
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
};

export default Purchase;
