import React, { useEffect, useState } from "react";
import { MiniCard } from "../Inventory/Inventory";
import { Box, Button, Dialog, FormControl, formControlClasses, IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
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
import Drawer from '@mui/material/Drawer';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import { GenericButton } from "../Inventory/components/Buttons";
const Admin = () => {
  const {getMinStockProducts, minStockProducts} = useAdminContext()
  const { buyingRecords, getBuyingRecords } = useBuyingRecordContext();
  const {authenticatedUser} = useGlobalContext()
  const {createPurchase} = usePurchaseContext()
  const [userList, setUserList] = useState([])
  const [productPriceUnit, setProductPriceUnit] = useState(0)
  const [openPriceUnitModal, setOpenPriceUnitModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [activeSection, setActiveSection] = useState('stock'); // 'stock', 'audit', 'register'
  const [openSection, setOpenSection] = useState(false);
  const sections = [
    { id: 'stock', label: 'Stock y Pedidos', icon: <InventoryIcon />, condition:true },
    { id: 'audit', label: 'Auditoría', icon: <HistoryIcon />, condition: authenticatedUser.is_superuser },
    { id: 'register', label: 'Registro de Usuarios', icon: <PersonAddIcon />, condition: authenticatedUser.is_superuser },
    { id: 'users', label: 'Lista de usuarios', icon: <PersonIcon />, condition: authenticatedUser.is_superuser },
  ];


  const getAllUsers = async () => {
    try{
      const response = await api.get('/users/users/');
      console.log("DASDADASD", response)
      setUserList(response.data);
    }catch(e){
      toast.error("Error al obtener los usuarios")
    }
    //const response = await api.get('/users/');
    //setUserList(response.data);
  }

  const getAuditLog = async () => {
    try {
      const response = await api.get('/users/admin/audit-log/');
      setAuditLog(response.data);
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
        link.setAttribute("download", `registros_auditorias.xlsx`);
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
      a.download = 'base_de_datos_respaldo.sql';
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
    if(authenticatedUser?.kind_of_person == "client"){
      window.location.href = "/"
      return
    }
    getMinStockProducts()
    getBuyingRecords()
    getAuditLog()
  }, [])

  useEffect(() => {
    if(authenticatedUser.is_superuser){
      getAllUsers()
    }
  }, [authenticatedUser])

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
      const today = moment()
      const download_name = `productos_stock_bajo_${today.format('YYYY-MM-DD')}.xlsx`;
      link.download = download_name
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);

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
      <Drawer
        open={openSection}
        onClose={() => setOpenSection(false)}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6">Panel de Administración</Typography>
        </Box>
        <List>
          {sections.filter(s => s.condition).map((section) => (
            <ListItem key={section.id} disablePadding>
              <ListItemButton
                selected={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                <ListItemIcon>{section.icon}</ListItemIcon>
                <ListItemText primary={section.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #ddd' }}>
       {authenticatedUser.is_superuser &&<Button
            fullWidth
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={exportDatabase}
          >
            Exportar BD
          </Button>}
          <Button
            fullWidth
            sx={{ mt: 2 }}
            variant="contained"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={() => downloadManual(authenticatedUser.is_superuser ? "admin" : "operator")}
          >
            Descargar Manual
          </Button>
        </Box>
      </Drawer>


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
            {console.log(selectedProduct)}
          <Typography variant="h6" >Precio unitario para {selectedProduct?.product_name}</Typography>
          <Typography variant="body2" sx={{color:"gray"}}>Actual precio de venta: {selectedProduct?.sell_price} </Typography>
          <Typography variant="body2" sx={{color:"gray"}}>Último precio de compra: {selectedProduct?.last_completed_order_price_unit} </Typography>
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
      {authenticatedUser.is_superuser && <Box sx={{ display: "flex", m:2, justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
      <GenericButton small={true} onClick={() => setOpenSection(true)} label={<>
          <MenuIcon/>
      </>}  />
      </Box>}
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

        {/* {authenticatedUser.is_superuser && (
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={exportDatabase}
            >
              Exportar Base de Datos
            </Button>
          )} */}
          {/* {
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
                downloadManual("operator")

              }}
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              >
                Descargar Manual de Operador
              </Button>
            </>
          } */}
        </Box>
      {activeSection == "stock" && <Box sx={{display:"flex", gap:5}}>
          <Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
            <Typography variant="h6">Productos con stock bajo</Typography>
            <Button variant="contained" color="success" onClick={downloadLowStockProducts} 
            sx={{marginBottom:2, marginTop:2}} startIcon={<DownloadIcon />}
            >
              Descargar los productos con stock bajo
            </Button>
            <List>
              {(minStockProducts ?? [])?.map((product) => (
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
        </Box>}
        {authenticatedUser.is_superuser && activeSection == "audit" && <>
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
        </Box>
        </>}
          {activeSection == "register" &&<Box sx={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "10px", flex:1, backgroundColor: "#fdfdfd"}}>
              <RegisterBrain isAdmin/>
          </Box>}
          {activeSection === "users" && (
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="h5" gutterBottom>
              Lista de Usuarios Registrados
            </Typography>
            <UsersTable users={userList} />
          </Box>
        )}

        
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

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

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

const UsersTable = ({ users }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('email');

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedUsers = users.slice().sort((a, b) => {
    if (order === 'asc') {
      return a[orderBy] > b[orderBy] ? 1 : -1;
    }
    return a[orderBy] < b[orderBy] ? 1 : -1;
  });

  const getTipoUsuario = (user) => {
    if (user.is_superuser) return 'Administrador';
    switch (user.kind_of_person) {
      case 'client': return 'Cliente';
      case 'operator': return 'Operador';
      case 'user': return 'Usuario';
      default: return 'Sin especificar';
    }
  };

  const getIdentificacion = (user) => {
    if (user.document) return `Documento: ${user.document}`;
    if (user.rif) return `RIF: ${user.rif}`;
    return 'Sin registro';
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="Tabla de usuarios">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy === 'email' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'email'}
                  direction={orderBy === 'email' ? order : 'asc'}
                  onClick={() => handleRequestSort('email')}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell>Tipo de Usuario</TableCell>
              <TableCell>Identificación</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell sortDirection={orderBy === 'created_at' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'created_at'}
                  direction={orderBy === 'created_at' ? order : 'asc'}
                  onClick={() => handleRequestSort('created_at')}
                >
                  Fecha de Registro
                </TableSortLabel>
              </TableCell>
              {/* <TableCell>Estado</TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getTipoUsuario(user)}</TableCell>
                  <TableCell>{getIdentificacion(user)}</TableCell>
                  <TableCell>{user.phone || 'No registrado'}</TableCell>
                  <TableCell>
                    {moment(user.created_at).format('DD/MM/YYYY HH:mm')}
                  </TableCell>
                  {/* <TableCell>
                    <Box
                      sx={{
                        backgroundColor: user.is_active ? '#e8f5e9' : '#ffebee',
                        color: user.is_active ? '#2e7d32' : '#c62828',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}
                    >
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </Box>
                  </TableCell> */}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={users.length}
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

