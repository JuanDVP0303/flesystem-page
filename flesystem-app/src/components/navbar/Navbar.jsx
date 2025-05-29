import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Card,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  styled,
  Toolbar,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import PropTypes from "prop-types";
import { useGlobalContext } from "../../hooks/useGlobalContext";
import { useGoTo } from "../../hooks/useGoTo";
import { api } from "../../utils/api";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import * as React from "react";
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import StoreRoundedIcon from '@mui/icons-material/StoreRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { useBranchOfficesContext } from "../../hooks/useBranchOfficeContext";
import LocalConvenienceStoreIcon from '@mui/icons-material/LocalConvenienceStore';
import { useEffect } from "react";
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
const companyNavbarRoutes = [
  {
    "name": "Dashboard",
    "items":[
      {
        "name":"Dashboard Empresa",
        "icon": <DashboardRoundedIcon />,
        "url": "/company/dashboard/"
      },
      {
        "name": "Sucursales",
        "icon": <StoreRoundedIcon/>,
        "url": "/branch-offices",
      },
    ]
  },
]


const branchOfficeNavbarRoutes = [
  {
    "name": "Sucursal",
    "items":[
      {
        "name":"Dashboard Sucursal",
        "branch_office": true,
        "icon": <DashboardRoundedIcon />,
        "url": (id) => "/branch-office/dashboard/" + id
      },
      {
        "name":"Cajas",
        "branch_office": true,
        "icon": <LocalConvenienceStoreIcon />,
        "url": (id) => "/subsidiaries/" + id
      }
      
    ]
  }
]


const adminNavbarRoutes = [
  {
    "name": "Admin",
    "items":[
      {
        "name": "Usuarios",
        "icon": <PeopleAltIcon />,
        "url": "/users"
      }
    ]
  }
]

//El use_branch_office es para especificar que es un modulo compartido entre las cajas de la sucursal
const subsidiaryNavbarRoutes = [
  {
    "name": "Módulos",
    "items":[
      {
        "name":"Dashboard",
        "icon": <DashboardRoundedIcon />,
        "condition": (operator) => operator?.operations_permitted?.dashboard,
        "url": (id) => "/dashboard/" + id
      },
      {
        "name": "Cuentas",
        "icon": <AccountBalanceWalletRoundedIcon />,
        "items":[
          {
            "icon": <AttachMoneyRoundedIcon />,
            "name": "Movimientos",
            "url": (id) => "/movements/" + id
          },
          {
            "name": "Bancos",
            "icon": <AccountBalanceRoundedIcon/>,
            "url": (id) => "/banks/" + id
          },
          {
            "name": "Cuentas pendientes",
            "condition": (operator) => operator?.operations_permitted?.pending_bills,
            "icon": <ReceiptLongRoundedIcon />,
            "url": (id) => "/pending-bills/" + id
          },
          {
            "name": "Gastos",
            "condition": (operator) => operator?.operations_permitted?.breakdown_of_expenses,
            "icon": <PendingActionsRoundedIcon />,
            "url": (id) => "/business-expenses/" + id
          },
          {
            "name": "Rentabilidad",
            "condition": (operator) => operator?.operations_permitted?.rentability,
            "icon": <BarChartRoundedIcon />,
            "url": (id) =>  "/business-profitability/" + id
          }
        ]
      },
      {
        "name": "Tienda",
        "condition": (operator) => {
          //ESto porque creo que hay operadores donde para la tienda dice inventory y otros dice store
          if(!operator?.operations_permitted)return false
          const keys =Object.keys(operator?.operations_permitted) 
          // ?.store
          const is_store = keys.find(key => key == "store")
          return is_store ? operator?.operations_permitted?.store : operator?.operations_permitted?.inventory
        },
        "use_branch_office": (user) => !user?.is_pf,
        "icon": <ShoppingCartRoundedIcon />,
        "url": (user, branch_office_id) => {
          if (user?.is_pf){
            return "/inventory/" + user.id + "/branch-office/PF"
          }
          return "/inventory/" + user.id + "/branch-office/" + branch_office_id
        }
      },
      {
        "name": "Ventas",
        // "condition": (operator) => operator?.operations_permitted?.store,
        "use_branch_office": (user) => !user?.is_pf,
        "icon": <ShoppingBagIcon />,
        "url": (user, branch_office_id) => {
          if (user?.is_pf){
            return "/sales/" + user.id + "/branch-office/PF"
          }
          return "/sales/" + user.id + "/branch-office/" + branch_office_id
        }
      },
    ]

  }
]



const BadgeContentSpan = styled("span")(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: theme.palette.success.main,
  boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
}));

const MenuItemStyled = styled(MenuItem)(({ theme }) => ({
  "&:hover .MuiBox-root, &:hover .MuiBox-root svg": {
    color: theme.palette.primary.main,
  },
}));

const Navbar = ({ children }) => {
  const {mobileOpen, setMobileOpen} = useGlobalContext();

  return (
    <Box className="navbar">
      <main>
        <ResponsiveDrawer mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
          {children}
        </ResponsiveDrawer>
      </main>
    </Box>
  );
};

export const Logo = ({giant, medium}) => {
  return (
    <div
      className="
    flex
    items-center
    justify-center
    w-full
    text-xl
    font-bold
  "
    >
      <span className={`text-black ${giant ? "text-4xl" : medium && 'text-3xl'}`}>
        App
      </span>
      <span className={`text-[#00B4DB] ${giant ? "text-4xl" : medium && 'text-3xl'}`}>
      Finanzas
      </span>
    </div>
  );
};

const styles = {
  px: 4,
  py: 1.75,
  width: "100%",
  display: "flex",
  alignItems: "center",
  color: "text.primary",
  textDecoration: "none",
  "& svg": {
    mr: 2.5,
    fontSize: "1.5rem",
    color: "text.secondary",
  },
};

Navbar.propTypes = {
  children: PropTypes.node,
};

function ResponsiveDrawer({ children, mobileOpen, setMobileOpen }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const { authenticatedUser } = useGlobalContext();
  const { goTo } = useGoTo();

  React.useEffect(() => {
    window.addEventListener("resize", () => {
      setIsMobile(window.outerWidth < 600);
    });

    setIsMobile(window.outerWidth < 600);

    return () => {
      window.removeEventListener("resize", () => {
        setIsMobile(window.outerWidth < 600);
      });
    }
  }, []);


  const handleDropdownOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const logout = () => {
    api
      .post("/users/logout/", {
        refresh: localStorage.getItem("refresh_token"),
      })
      .then(() => {
        localStorage.clear();
        window.location.href = "/login";
      })
      .catch(() => {
        localStorage.clear();
        window.location.href = "/login";
      });
  };

  //Si se abre el modal y es en mobil quiero que el fondo sea opaco oscuro
  return (
    <Box sx={{ display: "flex", width: "100%"}}>
      {/* <CssBaseline /> */}
      <AppBar
        // position="fixed"
        sx={{
          boxShadow: "0px 1px 2px 0px rgba(0,0,0,0.05)",          
          width: { sm: `100%` },
          display:authenticatedUser ? "block" : "none",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            background: "white",
            
          }}
        >
          <div className="flex items-center">
            <IconButton
              sx={
                {
                  display:authenticatedUser ? "block" : "none",
                }
              }
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <MenuIcon />
            </IconButton>
 
            <Logo />
          </div>
          <div className={`${authenticatedUser ? "block" : "hidden"}`}>
            <>
              <Badge
                overlap="circular"
                onClick={handleDropdownOpen}
                sx={{ ml: 2, cursor: "pointer" }}
                badgeContent={<BadgeContentSpan />}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
              >
                <Avatar
                  alt="Usuario"
                  src="/images/avatars/avatar.png"
                  onClick={handleDropdownOpen}
                  sx={{ width: 38, height: 38 }}
                />
              </Badge>
              <Menu
                id="simple-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                sx={{ "& .MuiMenu-paper": { width: 300, mt: 0.75 } }}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
              >
                <Box sx={{ py: 0.75, px: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Badge
                      overlap="circular"
                      badgeContent={<BadgeContentSpan />}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                    >
                      <Avatar
                        alt="John Doe"
                        src="/images/avatars/avatar.png"
                        sx={{ width: "2.5rem", height: "2.5rem" }}
                      />
                    </Badge>
                    <Box
                      sx={{
                        display: "flex",
                        ml: 2.5,
                        alignItems: "flex-start",
                        flexDirection: "column",
                      }}
                    >
                      <Typography sx={{ fontWeight: 500 }}>
                        {authenticatedUser?.email}
                      </Typography>
                      <Typography variant="body2">
                        {authenticatedUser?.currency}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider
                  sx={{ my: (theme) => `${theme.spacing(1)} !important` }}
                />
                <MenuItemStyled sx={{ p:0 }} onClick={logout}>
                  <Box sx={styles}>
                    <LogoutIcon />
                    Cerrar sesión
                  </Box>
                </MenuItemStyled>
              </Menu>
            </>
          </div>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display:"flex",
          mt: authenticatedUser ? 8 : 0,
          // bgcolor: "white",
        }}
      >
        <Card
        className="navDrawer"
          sx={{
            display: authenticatedUser ? "block" : "none",
            backgroundColor: "white",
            borderRadiusTopRight: 10,
            borderRadiusBottomRight: 10,
            width: mobileOpen ? isMobile ? "100%" : "240px" : "0px",
            transition: "width 0.2s ease",
            height: "100%",
            overflowY: "auto",
            paddingBottom:10,
            zIndex: 1000,
            position: isMobile ? "fixed" : "relative",
          }}
        >
          <NavDrawer />
        </Card>
        <Box sx={{ flex: 1, alignSelf:"start" }}>{children}</Box>
      </Box>
    </Box>
  );
}

const NavDrawer = () => {
  const [routes, setRoutes] = useState([]);
  const {office, authenticatedUser} = useGlobalContext();
  console.log(office)
  const {branchOffice} = useBranchOfficesContext();
  React.useEffect(() => {
    if(authenticatedUser && !authenticatedUser.is_subsidiary){
      let navRoutes = companyNavbarRoutes;
      console.log("OFFICINA",office)
       if(office){
        navRoutes = [
          ...navRoutes,
          ...subsidiaryNavbarRoutes
        ]
      }
      else{
        navRoutes = [
          ...navRoutes,
        ]
      }
      setRoutes(navRoutes);
    }
    if(authenticatedUser?.is_subsidiary){
      setRoutes(subsidiaryNavbarRoutes);
    }
    console.log("BRANCH OFFICE", branchOffice)
    if(branchOffice && !authenticatedUser?.is_subsidiary){
      setRoutes(prev => {
        return [...prev, ...branchOfficeNavbarRoutes]
      });
    }
    if(authenticatedUser?.is_superuser && !office){
      setRoutes(adminNavbarRoutes)
    }
    if(authenticatedUser?.is_superuser && office){

      setRoutes(prev => [...adminNavbarRoutes, ...prev]);
    }

  }, [office, authenticatedUser, branchOffice])

  return (
    <Box> 
      {routes.map((route, index) => (
        <List
          key={index}
          sx={{
            width: "100%",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ListSubheader sx={{ bgcolor: "background.paper" }}>
          <span className="text-[#00B4DB]">
            {route.name}
          </span>
          </ListSubheader>
          {route.items.map((item, index) => (
            <NavDrawerButton item={item} index={index} key={index} />
          ))}
        </List>
      ))}
    </Box>
  );
}

const NavDrawerButton = ({item, index}) => {
  const {office, setMobileOpen} = useGlobalContext();
  const {branchOffice} = useBranchOfficesContext()
  const { goTo } = useGoTo();
  const [openSubItems, setOpenSubItems] = useState(false);
  const [subItems, setSubItems] = useState([]);
  const [show, setShow] = useState(true);
  useEffect(() => {
    if(item.condition){
      setShow(item.condition(office))
    }
    if(item.items){
      const subItemsFiltered = item.items.filter(subItem => {
        console.log("SUBITEM", subItem)
        if(subItem.condition){
          return subItem.condition(office)
        }
        return true
      })
      setSubItems(subItemsFiltered)
    }
  }, [item, office])

  return <div>
    {show && <>
      <ListItemButton
      key={index}
      onClick={() => {
        if(window.innerWidth < 600 && !item.items){
          setMobileOpen(false);
        }
        if(item.items){
          setOpenSubItems(!openSubItems);
          return
        }
        if (typeof item.url === "function" && !item.items) {
          let url = ""
          if(item.use_branch_office){
            const is_branch_office = item.use_branch_office(office);
            if(is_branch_office){
              let branchOfficeId = branchOffice?.id;
              if(!branchOfficeId){
                branchOfficeId = office?.branch_office;
              }
              console.log("ID", branchOfficeId, office, branchOffice)
              url = item.url(office, branchOfficeId );
            }
            else{
              url = item.url(office);
            }
          }
          else{
            url = item.url(item.branch_office ? branchOffice?.id : office?.id); 
          }
          goTo(url);
        } else {
          goTo(item.url);
        }
      }}
      >
      <ListItemIcon>
        <Avatar
          sx={{
            boxShadow: "0px 1px 2px 0px rgba(0,0,0, 0.3)",
            background: "white",
            color:"#00B4DB",
            width: 32,
            height: 32,
          }}
        >
          {item.icon}
        </Avatar>
      </ListItemIcon>
      <ListItemText primary={item.name} />
      </ListItemButton>
      {openSubItems && subItems.map((subItem, index) => (
      <ListItemButton
        key={index}
        sx={{ pl: 4 }}
        onClick={() => {
          if(window.innerWidth < 600){
            setMobileOpen(false);
          }
          if (typeof subItem.url === "function") {
            console.log("OFFICE", office)
            goTo(subItem.url(office.id));
          } else {
            goTo(subItem.url);
          }
        }}
      >
        <ListItemIcon>
          <Avatar
            sx={{
              flex:1,
              background: "white",
              color:"#00B4DB",
              width: 29,
              height: 29,
            }}
          >
            {subItem.icon}
          </Avatar>
        </ListItemIcon>
        <ListItemText primary={subItem.name} />
      </ListItemButton>
      ))}
  </>}
  </div>
}


NavDrawerButton.propTypes = {
  item: PropTypes.object,
  index: PropTypes.number
}

ResponsiveDrawer.propTypes = {
  children: PropTypes.node,
  mobileOpen: PropTypes.bool,
  setMobileOpen: PropTypes.func
}

export default Navbar;


