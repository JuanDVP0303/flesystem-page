import { buyingRecordContext } from "./context";
import { api } from "../utils/api";
import { useGlobalContext } from "../hooks/useGlobalContext";
import { useState, useCallback } from "react";
import { toast } from "react-toastify";

export const BuyingRecordProvider = ({ children }) => {
    const [buyingRecords, setBuyingRecords] = useState([]);

    const getBuyingRecords = useCallback(async () => {
        try {
            const response = await api.get('/buying/records/get-buying-records/');
            setBuyingRecords(response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching buying records:', error);
            throw error;
        }
    }, []);

    const updateOrderStatus = async (orderId, newStatus, paymentMethod, paymentRef) => {
        try {
            const formData = new FormData();
            console.log(newStatus)
            if(newStatus != "CANCELLED"){
                if(!paymentMethod){
                    toast.error('Selecciona un método de pago');
                    return;
                }
                if(paymentMethod !="effective" && !paymentRef){
                    toast.error('Agrega el comprobante de pago');
                    return;
                }
            }
            formData.append('status', newStatus);
            formData.append('payment_method', paymentMethod);
            formData.append('payment_ref', paymentRef);
            const response = await api.patch(`/buying/records/${orderId}/update-status/`, formData);
            if (response.status === 200) {
                toast.success('Estado del pedido actualizado correctamente');
            }
            else{
                console.log("error,", response)
                const errorData = response.data
                for (let key in errorData) {
                    const message = errorData[key];
                    toast.error(message);
                }
            }
            // Actualizar el estado local si es necesario
            setBuyingRecords(prevRecords => 
                prevRecords.map(record => 
                    record.id === orderId ? { ...record, status: newStatus } : record
                )
            );

            return response.data;
        } catch (error) {
            for(let key in error.response.data) {
                const message = error.response.data[key];
                toast.error(message);}
            console.error('Error updating order status:', error);
            throw error;
        }
    };


    return (
        <buyingRecordContext.Provider value={{
            buyingRecords,
            getBuyingRecords,
            updateOrderStatus
        }}>
            {children}
        </buyingRecordContext.Provider>
    );
}
