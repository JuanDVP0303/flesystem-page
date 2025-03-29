import React, { useEffect, useState } from "react";
import { MiniCard } from "../Inventory/Inventory";
import { Box, Button, Dialog, FormControl, formControlClasses, IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from "@mui/material";
import { useAdminContext } from "../hooks/useAdminContext";
import WarningIcon from '@mui/icons-material/Warning';
import { usePurchaseContext } from "../hooks/usePurchasesContext";
import CloseIcon from '@mui/icons-material/Close';
import { useBuyingRecordContext } from "../hooks/useBuyingRecords";
import OrderStatusDashboard from "../BuyingRecords/BuyingRecordsStatuses";
import { useGlobalContext } from "../hooks/useGlobalContext";
import { api } from "../utils/api";
import DownloadIcon from '@mui/icons-material/Download';
import { toast } from "react-toastify";
import RegisterBrain from "../Auth/Register";
import moment from "moment";

const Admin = () => {
  const {getMinStockProducts, minStockProducts} = useAdminContext()
  const { buyingRecords, getBuyingRecords } = useBuyingRecordContext();
  const {authenticatedUser} = useGlobalContext()

  const {createPurchase} = usePurchaseContext()
  const [productPriceUnit, setProductPriceUnit] = useState(0)
  const [openPriceUnitModal, setOpenPriceUnitModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [auditLog, setAuditLog] = useState([])

  const getAuditLog = async () => {
    try {
      const response = await api.get('/users/admin/audit-log/');
      setAuditLog(response.data);
      console.log('Audit log:', response.data);
    } catch (error) {
      console.error('Error al obtener el log de auditoría:', error);
    }
  }


  const downloadAuditLog = async () => {
    try {
        const response = await api.get(`/users/admin/export-audit-logs/`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `audit_logs.xlsx`);
        document.body.appendChild(link);
        link.click();
    } catch (error) {
        console.error("Error al exportar las compras completadas:", error);
    }
  }

  const exportDatabase = async () => {
    try {
      const response = await api.get('/users/admin/export-database/', {
        responseType: 'blob', // Necesario para manejar archivos binarios como SQL
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database_export.sql';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Base de datos exportada con éxito');
    } catch (error) {
      toast.error('Error al exportar la base de datos');
      console.error('Error al exportar la base de datos:', error);
    }
  };

  const generatePurchase = (product) => {
    createPurchase({
      product: {...product, id: product.product_id},
      quantity: product.max_stock - product.total_quantity,
      provider: product.provider_id,
      price_unit: productPriceUnit,
      purchase_date:new Date().toISOString().split("T")[0]

    })
    
    getMinStockProducts()
  }

  useEffect(() => {
    getMinStockProducts()
    getBuyingRecords()
    getAuditLog()
  }, [])


  const downloadManual = async (type) => {
    try {
      let manualURL = type === "admin" ? "/media/manuals/ManualAdministradorFlesystem.pdf" : "/media/manuals/ManualOperadorFlesystem.pdf";
      const mediaUrl = import.meta.VITE_API_URL+manualURL
      console.log(mediaUrl)
      const response = await api.get(manualURL , {
        responseType: 'blob', // Necesario para manejar archivos binarios como PDF
      });
      if (response.status !== 200) {
          toast.error('Error al descargar el manual');
          return
        }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al descargar el manual :/');
      console.error('Error al descargar el manual:', error);
    }
  }

  const downloadLowStockProducts = async  () => {
    try {
      const response = await api.get('/inventory/reports/low-stock/', { responseType: "blob" });
      // const response = await api.get(`/users/admin/export-audit-logs/`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `low_stock_products.xlsx`);
      document.body.appendChild(link);
      link.click();
  } catch (error) {
      console.error("Error al exportar las compras completadas:", error);
  }
  }
  

  console.log(auditLog)
  // const stats = buyingRecords.reduce((acc, order) => {
  //   acc[order.status.toLowerCase()]++;
  //   return acc;
  // }, { pending: 0, completed: 0, cancelled: 0 });


  return (
    <Box
      sx={{
        width: "95%",
        margin: "auto",
      }}
    >
      
      <Dialog open={openPriceUnitModal} onClose={() => {
        setOpenPriceUnitModal(false)
        setSelectedProduct(null)
      }}>
        
        <Box sx={{p:2}}>
          <Box sx={{mb:2, display:"flex", justifyContent:"flex-end"}}>
          <IconButton onClick={() => {
            setOpenPriceUnitModal(false)
            setSelectedProduct(null)
          }}><CloseIcon /></IconButton>
          </Box>
          <Box sx ={{
            display:"flex",
            flexDirection:"column",
            gap:2
          }}>
          <Typography variant="h6" >Precio unitario para {selectedProduct?.product_name}</Typography>
          <Typography variant="body2" sx={{color:"gray"}}>Actual precio de venta: {selectedProduct?.sell_price} </Typography>
          <TextField
            label="Precio unitario" 
            type="number" 
            value={productPriceUnit} 
            onChange={(e) => setProductPriceUnit(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={() => {
            generatePurchase(selectedProduct)
            setOpenPriceUnitModal(false)
          }}>Aceptar</Button>
          </Box>
        </Box>
      </Dialog>
      <MiniCard className={"max-w-full flex"}>
        <Box sx={{marginBottom:5}}>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p>Esta es la sección de {
            authenticatedUser.is_superuser ? "administrador" : "operador"}</p>
        </Box>
        <Box sx={{
          display:"flex",
          justifyContent:"flex-end",
          marginBottom:2
        }}>

        {authenticatedUser.is_superuser && (
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={exportDatabase}
            >
              Exportar Base de Datos
            </Button>
          )}
          {
            authenticatedUser.is_superuser ? <>
              <Button
              sx={{marginLeft:2}}
              startIcon={<DownloadIcon />}
              variant="contained"
              color="success"
              onClick={() => {
                downloadManual("admin")
              }}
              >
                Descargar Manual de Administrador
              </Button>
            </>:
            <>
              <Button
              onClick={() => {
                downloadManual("admin")

              }}
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              >
                Descargar Manual de Operador
              </Button>
            </>
          }
        </Box>
        <Box sx={{display:"flex", gap:5}}>
          <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
            <Typography variant="h6">Productos con stock bajo</Typography>
            <Button variant="contained" color="success" onClick={downloadLowStockProducts} 
            sx={{marginBottom:2, marginTop:2}} startIcon={<DownloadIcon />}
            >
              Descargar los productos con stock bajo
            </Button>
            <List>
              {minStockProducts.map((product) => (
                <ListItem key={product.id} sx={{border: "1px solid #ccc", borderRadius: "10px", margin: "1rem 0", boxShadow: "1px 1px 5px #ccc", backgroundColor:"white"}}>
                  <WarningIcon sx={{m:2}} color="warning" />
                  <ListItemText 
                    primary={`Producto: ${product.product_name}`} 
                    secondary={`Stock Actual: ${product.total_quantity} Stock Minimo: ${product.min_stock}`}
                  ></ListItemText>
                  <Button variant="contained" color="primary" onClick={() => {
                    setSelectedProduct(product)
                    setOpenPriceUnitModal(true)
                  }}>Comprar</Button>
                </ListItem>
              ))}
            </List>
          </Box>
          <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
              <OrderStatusDashboard />
          </Box>
        </Box>
        {authenticatedUser.is_superuser && <>
          <Box sx={{ marginTop:5, border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
            <Typography variant="h6" sx={{
              marginBottom:2,
              textTransform:"uppercase",
              textAlign:"center",
              fontWeight:"bold",
              color:"green"
            }} >Auditoría</Typography>
            <Button variant="contained" color="success" onClick={downloadAuditLog}
            sx={{marginBottom:2, marginTop:2}} startIcon={<DownloadIcon />}
            >
              Descargar todos los registros de auditoría
            </Button>
            <AuditTable auditLogs={auditLog} />
          </Box>
          <Box sx={{display:"flex", gap:5, marginTop:5}}>
          <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
              <RegisterBrain isAdmin/>
          </Box>
        </Box>
        </>}
        
      </MiniCard>

    </Box>
  );
};
const AuditTable = ({ auditLogs }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedAction, setSelectedAction] = useState('all');

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setPage(0);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setPage(0);
  };

  const handleActionChange = (event) => {
    setSelectedAction(event.target.value);
    setPage(0);
  };

  // Obtener acciones únicas

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesEmail = log.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    
    // Validación de fecha
    const logDate = moment(log.timestamp);
    const matchesDate = (!startDate || logDate.isSameOrAfter(moment(startDate))) && 
                       (!endDate || logDate.isSameOrBefore(moment(endDate)));

    return matchesEmail && matchesAction && matchesDate;
  });

  const uniqueActions = [...new Set(filteredAuditLogs.map(log => log.action))];

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredAuditLogs.length) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Buscar por email"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        
        <TextField
          label="Fecha inicial"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          size="small"
          onChange={handleStartDateChange}
          sx={{ width: 220 }}
        />
        
        <TextField
          label="Fecha final"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          size="small"
          onChange={handleEndDateChange}
          sx={{ width: 220 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Acción</InputLabel>
          <Select
            value={selectedAction}
            label="Acción"
            onChange={handleActionChange}
          >
            <MenuItem value="all">Todas</MenuItem>
            {uniqueActions.map(action => (
              <MenuItem key={action} value={action}>{action}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell align="left">Acción</TableCell>
              <TableCell align="left">Descripción</TableCell>
              <TableCell align="left">Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rowsPerPage > 0
              ? filteredAuditLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              : filteredAuditLogs
            ).map((log) => (
              <TableRow
                key={log.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {log.user.email}
                </TableCell>
                <TableCell align="left">{log.action}</TableCell>
                <TableCell align="left">{log.description}</TableCell>
                <TableCell align="left">
                  {moment(log.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                </TableCell>
              </TableRow>
            ))}

            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredAuditLogs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Box>
  );
};
AuditTable.propTypes = {
  auditLogs: []
}

export default Admin;
