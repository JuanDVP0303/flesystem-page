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
        }
    }, []);

    const updateOrderStatus = async (orderId, newStatus, paymentDetails) => {
        try {
            const formData = new FormData();
            console.log(newStatus)
        // Validaciones para el estado COMPLETED
        if (newStatus === "COMPLETED") {
            if (!paymentDetails || paymentDetails.length === 0) {
                toast.error('Debe agregar al menos un método de pago');
                return;
            }

            // Calcular el total pagado
            const totalPaid = paymentDetails.reduce((sum, payment) => {
                return sum + parseFloat(payment.amount);
            }, 0);

            // Validar que el total pagado cubra el costo del pedido
            const order = buyingRecords.find(record => record.id === orderId);
            if (order && totalPaid < order.total_cost) {
                toast.error(`El total pagado (Bs.${totalPaid.toFixed(2)}) no cubre el costo del pedido (Bs.${order.total_cost.toFixed(2)})`);
                return;
            }

            // Validar comprobantes para métodos no efectivo
            const invalidPayments = paymentDetails.filter(payment => 
                payment.method !== 'effective' && !payment.proof
            );

            if (invalidPayments.length > 0) {
                toast.error('Debe subir comprobantes para los métodos de pago que no sean efectivo');
                return;
            }
        }
            formData.append('status', newStatus);
            paymentDetails.forEach((payment, index) => {
            formData.append(`payment_details[${index}][method]`, payment.method);
            formData.append(`payment_details[${index}][amount]`, payment.amount);
            formData.append(`payment_details[${index}][reference]`, payment.reference || '');
            
            if (payment.proof && payment.method !== 'effective') {
                // Si proof es un archivo (File object)
                if (payment.proof instanceof File) {
                    formData.append(`payment_details[${index}][proof]`, payment.proof);
                } 
                // Si proof es una cadena (ya subido previamente)
                else if (typeof payment.proof === 'string') {
                    formData.append(`payment_details[${index}][proof]`, payment.proof);
                }
            }
        });

            const response = await api.patch(`/buying/records/${orderId}/update-status/`, formData);
            if (response.status === 200) {
                toast.success('Estado del pedido actualizado correctamente');
            }
            else{
                console.log("error,", response)
                if(response.status == 500){
                    toast.error("Error interno del servidor, por favor intente más tarde");
                    return
                }
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
