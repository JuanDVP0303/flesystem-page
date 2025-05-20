import React, { useEffect, useState } from 'react'
import { MiniCard } from './Inventory'
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Box, Button, Dialog, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useGoTo } from '../../src/hooks/useGoTo';
import moment from 'moment'
import { api } from '../utils/api';
import SalesTrendsReport from './components/SalesTrendReport';
import { ModalComponent } from '../components/utils/ModalComponent';
import { useGlobalContext } from '../hooks/useGlobalContext';
const InventoryMovements = ({type}) => {
  const [movements, setMovements] = useState([])
  const [showSalesTrend, setShowSalesTrend] = useState(false)
  const {goTo} = useGoTo()
  const {authenticatedUser } = useGlobalContext()

  const getMovements = async () => {
    const res = await api.get(`/inventory/movements/?&type=${type}`)
    setMovements(res.data)
  }

  useEffect(() => {
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    getMovements()
  }, [type])

  return (
    <Box className="p-5 md:p-10">
      <GoBackInventoryButton />
    <MiniCard>
      <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            // gridTemplateColumns: "1fr",
            padding: "10px",
          }}
        >
      <Box className="text-[#00B4DB] flex items-center gap-2">
        <AssignmentIcon  />
        <span className="text-xl font-bold text-[#0195c7] ">Registro de Inventario</span>
      </Box>
      <Button variant='outlined' onClick={() => {
        setShowSalesTrend(!showSalesTrend)
      }}>
        Reportes de pedidos
      </Button>
      </Box>
      <ModalComponent
        title="Reporte de pedidos"
        fullHeight
        fullWidth
      open={showSalesTrend} setOpen={() => setShowSalesTrend(false)}>
        <SalesTrendsReport />
      </ModalComponent>
    </MiniCard>  
    
    <div className='flex gap-10'>
        <button className={`${type =="income" && "registry-selected"}`} onClick={() => {
          goTo(`/inventory/registry-income/`)
        }}> 
          Ingresos
        </button>
        <button className={`${type =="outcome" && "registry-selected"}`} onClick={() => {
          goTo(`/inventory/registry-outcome/`)
        }}>
          Egresos
        </button>
        <button className={`${type =="general" && "registry-selected"}`} onClick={() => {
          goTo(`/inventory/registry-general/`)
        }}>
          General
        </button>
    </div>
    <MiniCard>
    <TableContainer>
    <Table className="min-w-full">
    <TableHead>
      <TableRow>
        <TableCell></TableCell>
        <TableCell>Producto</TableCell>
        <TableCell>Fecha de entrada</TableCell>

        {/* <TableCell>Ubicación</TableCell> */}
        <TableCell>Cantidad</TableCell>
        <TableCell>Valor en Inventario</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {movements && movements.length > 0 ? movements?.map((movement, index) => (
        <TableRow key={index}>
        {console.log(movement.product.variants.find(id => {
          console.log(id, movement.product_variant)
          return id == movement.product_variant
        }))}

          <TableCell>{movement.movement_type == "income" ? <Arrow type="income"/> : <Arrow type="outcome"/>}</TableCell>
          <TableCell>{movement.product.name} {movement.product_variant && ` - ${movement?.product?.variants?.find(variant => variant.id == movement.product_variant)?.name}`}</TableCell>
          <TableCell>{moment(movement.date).format("YYYY-MM-DD")}</TableCell>
          {/* <TableCell>{movement.location}</TableCell> */}
          <TableCell>{movement.quantity}</TableCell>
          <TableCell>{movement.product.price_unit * movement.product.quantity}</TableCell>
        </TableRow>
      )) : <TableRow>
        <TableCell colSpan={6} className="text-center">No hay registros</TableCell>
        </TableRow>}


    </TableBody>
    
    </Table>
    </TableContainer>
    </MiniCard>
    
    </Box>
  )
}

export const Arrow = ({type, black}) => {
  return <svg xmlns="http://www.w3.org/2000/svg" style={{transform:type=="income" && "rotate(90deg)"}} height="24px" viewBox="0 -960 960 960" width="24px" fill={black ? "#f6f6f6" :  type == "income" ? "#75FB4C" : "#EA3323"}><path d="M480-840q74 0 139.5 28.5T734-734q49 49 77.5 114.5T840-480q0 74-28.5 139.5T734-226q-49 49-114.5 77.5T480-120q-41 0-79-9t-76-26l61-61q23 8 46.5 12t47.5 4q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 24 4 47.5t12 46.5l-60 60q-18-36-27-74.5t-9-79.5q0-74 28.5-139.5T226-734q49-49 114.5-77.5T480-840Zm40 520v-144L176-120l-56-56 344-344H320v-80h280v280h-80Z"/></svg>
}


export default InventoryMovements

export const GoBackInventoryButton = () => {
  const {goTo} = useGoTo()
  return <Button
  onClick={() => goTo("/inventory/")}
  variant="standard"
  className="mt-5"
  sx={{ fontSize: "12px", color: "blue" }}
>{"<"} Volver al inventario </Button>
}