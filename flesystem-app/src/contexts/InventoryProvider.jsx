import { useCallback, useMemo, useRef, useState } from "react";
import { inventoryContext } from "./context";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { formatNumber } from "../utils/methods";
import { useGoTo } from "../hooks/useGoTo";
import moment from "moment";
import debounce from "just-debounce-it";
import propTypes from "prop-types";


export const InventoryProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [inventoryValues, setInventoryValues] = useState(0);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [inventoryModalType, setInventoryModalType] = useState(null);
    const [searchedProducts, setSearchedProducts] = useState([])
    const [product, setProduct] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([])

    const {goTo} = useGoTo()
    
    const formRef = useRef(null)
    const formRefWithdrawal = useRef(null)

    const getProducts = async () => {
        let url = "/inventory/products/"
        const res = await api.get(url)
        setProducts(res?.data?.products)
        setInventoryValues(res?.data?.inventory_value)
        setInventoryLoading(false)
    }

    const addProduct = async(productFormRef, formValues) => {
        const formData = new FormData(productFormRef.current)
        formValues.providers.forEach(providerId => {
          formData.append('providers[]', providerId);
      });
        let errorThrowed = false
        // formData.set('provider', formValues.provider)
        let res;
        try{
            res = await api.post("/inventory/products/", formData)

        }catch(e){
            res = e.response
            for(const key in res.data){
                toast.error(`${key}: ${res.data[key]}`)
            }
            errorThrowed = true
        }
        
        if (res.status === 201) {
          setProducts(prev => {
            return [res.data, ...prev]
          })
          setProduct(null)
          setInventoryValues(prev => {
            if(!prev) return '0.00'
            let [quantity, currency] = prev.split(" ")
            quantity = parseInt(quantity)
            quantity += parseInt(res.data.price_unit*res.data.quantity)
            return `${formatNumber(quantity)} ${currency}`
          })
          setInventoryModalType(null)
          toast.success("Producto añadido con éxito")
        }
        else{
          if(!errorThrowed)toast.error(res.data[Object.keys(res.data)[0]])
        }
      } 

      /*
      
      POR HACER:

      - Revisar que todas las funciones del inventario funcionen correctamente, analizar para que sirve la funcion de searchProduct con sus batches

      - Revisar Inventario de caja de empresa, solo se hicieron pruebas con caja de persona Fisica

      
      */
      
      const searchProduct = useCallback(async (search, provider_id) => {
        let url = `/inventory/products/?name=${search}`
        if(provider_id){
          url += `&provider=${provider_id}`
        }
        console.log(url, search, provider_id)
        const res = await api.get(url)
        console.log(res)
        const arr = res?.data?.products ? res.data.products : res.data
        setSearchedProducts(arr?.map(product => {
            return {
              ...product,
              label:product?.name
            }
        }))
        // setProducts(res.data.products)
      }, [])
      
      const searchProductDebounce = useMemo(() => debounce((search, provider_id) => searchProduct(search, provider_id), 500),[searchProduct]);
      
  
      const editProductFunction = async (productEdited, productId, isVariant, batch) => {
    let res;
    try {
      const data = {
        ...productEdited,
      }
      if(batch){
        data["batch"] = batch;
      }
      data["id"] = productId;
      //Eliminar los campos nulos
      for (const key in data) {
        if (data[key] === null || data[key] === "") {
          delete data[key];
        }
      }
      const expirationField = isVariant ? "expiration_date" : "expiration";
      if(data[expirationField]){
        data[expirationField] = moment(data[expirationField]).format("YYYY-MM-DD");
      }
      console.log("DATA",data)
      delete data.product_image;
      const url = isVariant ? `/inventory/products/edit_product_variants/?variant=${productId}` : `/inventory/products/edit_product/?product=${productId}`;
      res = await api.put(
        url,
        data
      );
      console.log("RES",res)     
        setProduct(res.data);
    } catch (e) {
      console.log(e)
        res = e.response;
    }
    if (res.status !== 200) {
        toast.error("Ha ocurrido un error");
    }
    return res
  }

  const deleteProduct = async (productId, batch) => {
    let res;
    try {
      let url_base  = `/inventory/products/`
      if(batch){
        url_base += `delete_batch/`
      }
      else{
        url_base += `delete-product/`
      }
      if(batch){
        url_base += url_base.includes("?") ? "&" : "?"
        url_base += `batch=${encodeURIComponent(batch)}`
      }

      url_base += url_base.includes("?") ? "&" : "?"
      url_base += `product=${productId}`
      res = await api.delete(
        url_base
      );
      if (res.status === 204) {
        if (batch){
          toast.success("Lote eliminado correctamente");
        }
        else{

          toast.success("Producto eliminado correctamente");
        }
        if(!batch){
          goTo("/inventory/");
        }
      }
      if(batch){
        setProduct(prev => {
          return {
            ...prev,
            batches: prev.batches.filter(b => encodeURI(b.batch) !== encodeURI(batch)),
            variants: prev.variants.filter(variant => variant.id !== productId)
          }
        })
      }
      else{
        setProduct(null);
      }
    } catch (e) {
      res = e.response;
    }
    if (res.status !== 204) {
      toast.error("Ha ocurrido un error");
    }
  }


      const withdrawProduct = async (formValues) => {
        const formData = new FormData(formRefWithdrawal.current);
        const values = Object.fromEntries(formData.entries());
        values["movement_type"] = inventoryModalType === "income" ? "income" : "outcome";
        values["product"] = formValues["product"];
        values["variant"] = formValues["variant"];
        
        console.log("VALORES WITHDRAWAL", values);
        if(!values["product"].id){
            toast.error("Seleccione un producto");
            return;
        }
        if (values["quantity"] > values["product"].quantity) {
            toast.error("La cantidad a retirar es mayor a la cantidad en inventario");
            return;
        }
        
        if(values["variant"] && values["variant"] == "Non-variant"){
            delete values["variant"]
        }

        let res;
        try {
            res = await api.post("/inventory/products/" + values["product"].id + "/withdraw_product/", values);
        } catch (e) {
            console.error("Error en la petición:", e);
            res = e.response;
        }
        if (res && res.status === 200) {
            setProducts(products.map(product => {
                if (product.id === values["product"].id) {
                  return res.data
                }
                return product;
            }));
            setInventoryValues(prev => {
                let [quantity, currency] = prev.split(" ");
                quantity = parseInt(quantity);
                quantity -= parseInt(values["product"].price_unit * values["quantity"]);
                return `${formatNumber(quantity)} ${currency}`;
            });
            setProduct(null);
            setInventoryModalType(null);
            toast.success("Producto retirado con éxito");
        } else {
          console.log(res.response)
            for (const key in res.response.data) {
              console.log(key)
                toast.error(`${key}: ${res.response.data[key]}`);
            }
        }
    };


    const batchDivision = async (values) => {
        let res;
        try{
          res = await api.post("/inventory/products/divide_batch/", values)
        }catch(e){
          res = e.response
        }

        if(res.status === 200){
          setProduct(prev => {
            const batches = prev.batches.map(batch => {
              if(batch.batch === values.batch){
                batch.quantity -= values.division_quantity
              }
              return batch
            })
            return {
              ...prev,
              batches: [...batches, res.data]
            }
          })
          toast.success("Lote dividido correctamente")
    }
    else{
        for(const key in res.data){
            toast.error(`${key}: ${res.data[key]}`)
        }
    }
    return res
  }
    

  const getLocations = async (office, branchOfficeId) => {
    let res;
    let url = "/inventory/products/get_locations/?office=" +office
    if (branchOfficeId){
      url += "&branch_office=" + branchOfficeId
    }
    try{
      res = await api.get(url)
    }
    catch(e){
      console.log(e)
      res = e.response
    }
    console.log(res)
    return res
  }

  const getProductsByLocation = async (location) => {
    let res;
    try{
      res = await api.get(`/inventory/products/get_products_by_location/?location=${location}`)
    }
    catch(e){
      res = e.response
    }
    return res
  }


  const transferProducts = async (data) => {
    let res;
    try{
      res = await api.post("/inventory/products/transfer_products/", data)
    }
    catch(e){
      res = e.response
    }
    return res
  }

    const values = {
        products,
        setProducts,
        inventoryLoading,
        setInventoryLoading,
        inventoryModalType,
        setInventoryModalType,
        formRef,
        formRefWithdrawal,
        addProduct,
        withdrawProduct,
        getProducts,
        inventoryValues,
        searchProduct,
        searchedProducts,
        setSearchedProducts,
        product,
        setProduct,
        editProductFunction,
        deleteProduct,
        searchProductDebounce,
        batchDivision,
        getLocations,
        getProductsByLocation,
        transferProducts,
        selectedProducts, setSelectedProducts
    }

    return (
        <inventoryContext.Provider value={values}>
        {children}
        </inventoryContext.Provider>
    );
    }


    InventoryProvider.propTypes = {
        children: propTypes.node.isRequired
      }