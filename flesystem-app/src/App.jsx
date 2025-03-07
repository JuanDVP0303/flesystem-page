import {BrowserRouter , Route, Routes} from "react-router-dom"
import Layout from "./Layouts/Layout"
import Home from "./Home/Home"
import Contact from "./Contact/Contact"
import Products, { ProductDetail } from "./Products/Products"
import Inventory from "./Inventory/Inventory"
import ProductView from "./Inventory/ProductView"
import InventoryMovements from "./Inventory/InventoryMovements"
import GlobalProvider from "./contexts/GlobalProvider"
import { InventoryProvider } from "./contexts/InventoryProvider"
import Auth from "./Auth/Auth"
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Purchase from "./Purchase/Purchase"
import PurchasesProvider from "./contexts/PurchasesProvider"
import Admin from "./Admin/Admin"
import { AdminProvider } from "./contexts/AdminProvider"
import { BuyingRecordProvider } from "./contexts/BuyingRecordsProvider"
import OperatorDashboard from "./BuyingRecords/BuyingRecords"


export default function App() {
  return (
    <BrowserRouter>
    <GlobalProvider>
      <InventoryProvider>
      <PurchasesProvider>
      <BuyingRecordProvider>
        <AdminProvider>
        <Routes>
          <Route path='/' Component={Layout}>
            <Route path="/" Component={Home}/>
            <Route path="/products" Component={Products}/>
            <Route path="/products/:productId" Component={ProductDetail}/>
            <Route path="/contact" Component={Contact}/>
            <Route path="/purchases" Component={Purchase}/>
            <Route path="/dashboard" Component={Admin}/>
            <Route path="/buying-records" Component={OperatorDashboard}/>
            <Route path="/inventory" Component={Inventory}/>
            <Route path="/inventory/products/:productId" Component={ProductView}/>
            <Route path="/inventory/registry-income/" element={<InventoryMovements type={"income"} />}/>
            <Route path="/inventory/registry-outcome/" element={<InventoryMovements type={"outcome"} />}/>
            <Route path="/inventory/registry-general/" element={<InventoryMovements type={"general"} />}/>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="*" element={<h1>Not Found </h1>}></Route>
          </Route>
        </Routes>
        </AdminProvider>
        <ToastContainer />
      
      </BuyingRecordProvider>

        </PurchasesProvider>
      </InventoryProvider>
    </GlobalProvider>
    </BrowserRouter>
  )
}

