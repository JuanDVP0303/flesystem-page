import { Button, Card, IconButton } from '@mui/material'
import { useEffect, useState } from 'react'
import { EditButton, EditModalForm, genericBlue, KeyValue } from '../ProductView'
import { formatNumber, getProductQuantityByUnit } from '../../../src/utils/methods'
import { useGlobalContext } from '../../../src/hooks/useGlobalContext'
import moment from 'moment'
import { useInventoryContext } from '../../../src/hooks/useInventoryContext'
import { useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Swal from 'sweetalert2'
import MoveUpIcon from '@mui/icons-material/MoveUp';
import BatchDivision from './BatchDivision'
import propTypes from 'prop-types'

const ProductCard = ({product, isVariant, nonDelete}) => {
  const { authenticatedUser } = useGlobalContext()
  const {editProductFunction, deleteProduct} = useInventoryContext()
  const [editProduct, setEditProduct] = useState(false);
  const [productEdited, setProductEdited] = useState(null);
  const [openBatchDivision, setOpenBatchDivision] = useState(false)
  const { officeId } = useParams();
  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await editProductFunction(productEdited, isVariant ? product.product_variant : product.product_id, isVariant, product?.batch)
    if(res.status === 200){
        toast.success("Variante editada correctamente")
        setEditProduct(false)
    }
  }

  useEffect(() => {setProductEdited(product)}, [product])

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductEdited((prev) => {
      return { ...prev, [name]: value };
    });
  }
  return (
    <>
    <BatchDivision open={openBatchDivision} setOpen={setOpenBatchDivision} batch={product} />
    <EditModalForm handleProductChange={handleProductChange} isBatch={true}  product={product} editProduct={editProduct} setEditProduct={setEditProduct} setProductEdited={setProductEdited} productEdited={productEdited || {}} handleSubmit={handleSubmit}/>
    <Card sx={{width:"380px", minHeight:"450px", borderRadius:5}} className='shadow-lg bg-gray-100'>
        <div className='bg-[#dbffd5] flex p-5 justify-between'>
            <div className='flex flex-col  '>
                {/* <h2 className='font-medium'>Variacion: {isVariant ? product?.product_variant_name : "Ninguna"}</h2> */}
                <h2 className='text-sm text-gray-500'>
                  Lote: {product?.batch || "Ninguno"}
                </h2> 
           {/* {!authenticatedUser.is_superuser && <Button onClick={() => setOpenBatchDivision(true)} variant="outlined" size='small' sx={{backgroundColor:"none", borderRadius:4, color:genericBlue, border:2, fontWeight:"bold", mt:2, ":hover":{border:2}}}>
                   <MoveUpIcon sx={{mr:1}}/> Dividir Lote
                  </Button>} */}
            </div>
            <div className='flex flex-col justify-between gap-1'>
              <div className='flex'>
             {/* {!nonDelete  && !authenticatedUser.is_superuser &&  <DeleteButton small={true} onClick={() => {
                    Swal.fire({
                        title: '¿Estás seguro?',
                        text: "No podrás revertir esto!",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#1adb00',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Sí, eliminar!'
                      }).then((result) => {
                        if (result.isConfirmed) {
                          console.log(product?.batch)
                            deleteProduct(product.product, product?.batch)
                            }})
                    }} />} */}
              {/* {!authenticatedUser.is_superuser && <EditButton small={true} onClick={() => setEditProduct(true)} />} */}
              </div>
              {product.quantity === 0 && <div className='rounded-md px-5 bg-red-400 text-white'>
                  <p className='pb-1'>Producto agotado</p>
              </div>}
            </div>
        </div>
        <div className='p-5'>
            <div className='flex flex-col gap-4'>
                <KeyValue spaceBetween={true} label="Cantidad" value={getProductQuantityByUnit(product)} />
                <KeyValue spaceBetween={true} label="Costo unitario" value={` ${("BS")?.toUpperCase()}. ${formatNumber(product?.price_unit)}`} />
                <KeyValue spaceBetween={true} label="Valor en inventario" value={` ${("BS")?.toUpperCase()}. ${formatNumber(product?.price_unit * product?.quantity)}`} />
                <KeyValue spaceBetween={true} label="Categoría" value={`${product?.category}`} />
                {/* <KeyValue spaceBetween={true} label="Ubicación" value={`${product?.location || "---"}`} /> */}
            </div>
        </div>
            <div className='mt-10 flex h-full flex-col gap-4 p-5 border-t-[1px]'>
                <KeyValue spaceBetween={true} label="Registrado" value={moment(product?.date).format("YYYY-MM-DD")} />
                <KeyValue spaceBetween={true} label="Actualizado" value={moment(product?.updated).format("YYYY-MM-DD")} />

            </div>
    </Card>
    </>
  )
}


export const DeleteButton = ({small, onClick}) => {
    let sx = {border: "1px solid #BF1A2F"}
    const sxSmall = { width: "30px", height: "30px", padding:2 }
    sx = small ? {...sx, ...sxSmall} : sx
    return <IconButton sx={sx} onClick={onClick}>
        <DeleteOutlineIcon sx={{color:"#BF1A2F"}} />
    </IconButton>
}

export default ProductCard


ProductCard.propTypes = {
    product: propTypes.object,
    isVariant: propTypes.bool,
}

DeleteButton.propTypes = {
    small: propTypes.bool,
    onClick: propTypes.func
}