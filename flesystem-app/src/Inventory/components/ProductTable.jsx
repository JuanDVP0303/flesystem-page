import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { useState } from 'react'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useParams } from 'react-router-dom';
import { useGoTo } from '../../../src/hooks/useGoTo';
import { formatNumber, getProductQuantityByUnit } from '../../../src/utils/methods';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { genericBlue } from '../Inventory';
const emptyValue = "---"
import propTypes from "prop-types"


const ProductTable = ({products}) => {
  return (
    <TableContainer sx={{
      width:{
        xs:"85vw",
        sm:"85vw",
        md:"100%",
      }
    }}>
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
          <TableCell></TableCell>

        </TableRow>
      </TableHead>
      <TableBody>
        {products?.length > 0 ? products.map((product, index) => (
          <ProductTableRow key={index} product={product} />
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
const ProductTableRow = ({ product }) => {
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