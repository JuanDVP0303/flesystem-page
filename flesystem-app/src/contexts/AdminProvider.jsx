import { useState } from "react";
import { adminContext } from "./context";
import { api } from "../utils/api";

export const AdminProvider = ({ children }) => {
    
    const [minStockProducts, setMinStockProducts] = useState([]);



    const getMinStockProducts = async () => {
        try {
            const response = await api.get("/inventory/products/min-stock-products");
            const data = await response.data;
            console.log("DATA", data)
            setMinStockProducts(data);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <adminContext.Provider value={{
            minStockProducts,
            getMinStockProducts
        }}>
        {children}
        </adminContext.Provider>
    );
}