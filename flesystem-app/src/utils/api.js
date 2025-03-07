import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { toast } from 'react-toastify';

//Cargar el archivo .env

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

const updateApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


const refreshToken = async () => {
  try {
    const res = await updateApi.post("/users/token/refresh/", {
      refresh: localStorage.getItem("refresh"),
    });
    localStorage.setItem("account_token", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);
    return res.data.access;
  } catch (error) {
    console.log(error);
    toast.error("Sesión expirada, por favor inicia sesión nuevamente");
   
    return null;
  }

}

api.interceptors.request.use(async (config) => {
    // Verifica si hay un token en el almacenamiento local
    let token = localStorage.getItem("account_token");

    // Si hay un token, agrega el encabezado de autorización
    if (token) {
      const decoded = jwtDecode(token);
      const exp = decoded.exp;
      const now = new Date().getTime() / 1000;
      // Verifica si el token ha expirado
      if (exp < now) {
        token = await refreshToken();
        console.log("TOKEN",token)
        if(!token){
          window.location.href = "/login";
          localStorage.clear();
          return
        }
        config.headers["Authorization"] = `Bearer ${token}`;
        location.reload();
        return
      }
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

api.interceptors.response.use(
    response => {
      return response
    },
  );