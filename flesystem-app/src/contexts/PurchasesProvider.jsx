import { useRef, useState } from "react";
import { purchasesContext } from "./context";
import PropTypes from 'prop-types'
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useInventoryContext } from "../hooks/useInventoryContext";

const PurchasesProvider = ({ children }) => {
    const [purchasesModalType, setPurchasesModalType] = useState(null)
    const [providers, setProviders] = useState([])
    const [provider, setProvider] = useState(null)
    const [providerProducts, setProviderProducts] = useState([])
    const [orders, setOrders] = useState([])
    const {  getProducts, } = useInventoryContext();
    const formRef = useRef();
    
    const createProvider = (provider) => {
        api.post('/purchase/providers/', provider).then(res => {
            if(res.status === 201){
                setPurchasesModalType(null)
                setProviders(prev => [...prev, res.data])
                toast.success("Proveedor creado con éxito")
            }
            else{
                const data = res.response.data
                for (const key in data) {
                    toast.error(`${key}: ${data[key]}`)
                }
            }
        }).catch(err => {
            console.log(err)
            const data = err.data
            for (const key in data) {
                toast.error(`${key}: ${data[key]}`)
            }
            toast.error("Hubo un error al crear el proveedor :(")
        })
    }

    const getProviders = () => {
        api.get('/purchase/providers/').then(res => {
            if(res.status === 200){
                setProviders(res.data)
            }
            else{
                toast.error("Hubo un error al obtener los proveedores")
            }
        }).catch(err => {
            console.log(err)
            toast.error("Hubo un error al obtener los proveedores")
        })
    }

    const getProvider = (id) => {
        api.get(`/purchase/providers/${id}`).then(res => {
            if(res.status === 200){
                setProvider(res.data)
            }
            else{
                toast.error("Hubo un error al obtener el proveedor")
            }
        }).catch(err => {
            console.log(err)
            toast.error("Hubo un error al obtener el proveedor")
            return err.response
        })
    }

    const editProvider = (providerToEdit) => {
        api.put('/purchase/providers/'+providerToEdit?.id+"/", providerToEdit).then(res => {
            if(res.status === 200){
                setPurchasesModalType(null)
                setProviders(prev => prev.map(p => p.id === providerToEdit.id ? res.data : p))
                toast.success("Proveedor editado con éxito")
            }
            else{
                const data = res.response.data
                for (const key in data) {
                    toast.error(`${key}: ${data[key]}`)
                }
            }
        }).catch(err => {
            console.log(err)
            const data = err.data
            for (const key in data) {
                toast.error(`${key}: ${data[key]}`)
            }
            toast.error("Hubo un error al editar el proveedor :(")
        })
    }

    const getOrders = async () => {
        try {
            const res = await api.get('/purchase/orders/get-orders/')
            if(res.status === 200){
                setOrders(res.data)
                return res.data
            }
            else{
                toast.error("Hubo un error al obtener las órdenes")
            }
        } catch (error) {
            console.log(error)
            toast.error("Hubo un error al obtener las órdenes")
        }
    }

    const createPurchase = async (formValues) => {
        const priceUnit = formValues.price_unit;
        if(!priceUnit){
            toast.error("Por favor ingrese una cantidad")
            return
        }
        if(Number(priceUnit) <= 0){
            toast.error("Por favor ingrese un valor mayor a 0")
            return
        }
        console.log("FORM VALUES", {

            ...formValues})

            console.log(formValues.product.quantity, formValues.quantity, formValues.product.max_quantity)

        if(formValues.product.quantity + Number(formValues.quantity) > formValues.product.max_stock){
            toast.error("La cantidad total a comprar supera el stock máximo, actual stock: " + formValues.product.quantity)
            return
        }
        let res;
        try{
          res = await api.post("/purchase/orders/create-order/", {
            ...formValues,
            product: formValues.product?.id,
            provider: formValues.provider?.id ?? formValues.provider,
          });
        }catch(e){
          res = e.response
        }
        
        if (res.status === 201) {
          toast.success("Compra creada exitosamente");
          setPurchasesModalType(null);
          getOrders();
          getProducts()
    
        }
        else{
          toast.error("Error al crear la compra");
        }
      }
    
      const updateOrderStatus = async (orderId, status, real_quantity) => {
        try {
            if (!status) {
                toast.error("Por favor selecciona un estado");
                return;
            }
            if (status === "completed" && !real_quantity) {
                toast.error("Por favor ingresa la cantidad real");
                return;
            }
            if (status === "completed" && real_quantity <= 0) {
                toast.error("La cantidad real debe ser mayor a 0");
                return;
            }
          const res = await api.post(`/purchase/orders/order-status/`, {
            order_id: orderId,
            status,
            real_quantity: real_quantity
          })
          if(res.status === 200){
            toast.success("Estado de la orden actualizado con éxito")
            getOrders()
          }
          else{
            toast.error(res.data.error)
          }
        } catch (error) {
          console.log(error)
          toast.error("Hubo un error al actualizar el estado de la orden")
        }
      }

    const getProvidersProducts = async (providerId) => {
        try {
            const res = await api.get(`/purchase/providers/providers-products/?provider_id=${providerId}`)
            if(res.status === 200){
                setProviderProducts(res.data)
                return res.data
            }
            else{
                toast.error("Hubo un error al obtener los productos del proveedor")
            }
        } catch (error) {
            console.log(error)
            toast.error("Hubo un error al obtener los productos del proveedor")
        }
    }

  // Nueva función para actualizar cantidad vendida
  const updateSoldQuantity = async (orderId, soldQuantity) => {
    try {
      const res = await api.put(`/purchase/orders/${orderId}/update-sold-quantity/`, {
        sold_quantity: soldQuantity
      });
      getOrders(); // Refrescar la lista de órdenes
      return res.data;
    } catch (error) {
      toast.error("Error al actualizar la cantidad vendida");
    }
  };

  // Nueva función para cancelar consignación
  const cancelConsignment = async (orderId) => {
    try {
      const res = await api.post(`/purchase/orders/${orderId}/cancel-consignment/`);
      getOrders(); // Refrescar la lista de órdenes
      return res.data;
    } catch (error) {
      toast.error("Error al cancelar la consignación");
    }
  };

  // Nueva función para obtener alertas de crédito
  const getCreditAlerts = async () => {
    try {
      const res = await api.get('/purchase/orders/credit-alerts/');
      return res.data;
    } catch (error) {
      toast.error("Error al obtener alertas de crédito");
      return [];
    }
  };
  
    const values = {
        purchasesModalType,
        providers,
        provider,
        setPurchasesModalType,
        createProvider,
        getProviders,
        getProvider,
        editProvider,
        setProvider,
        getOrders,
        createPurchase,
        orders,
        updateOrderStatus,
        formRef,
        getProvidersProducts,
        providerProducts,
        setProviderProducts,
        updateSoldQuantity,
        cancelConsignment,
        getCreditAlerts
    }
    return (
    <purchasesContext.Provider value={values}>{children}</purchasesContext.Provider>
)
}

PurchasesProvider.propTypes = {
    children: PropTypes.node
}
export default PurchasesProvider