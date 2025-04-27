import { useEffect, useState } from "react"
import { globalContext } from "./context";
import PropTypes from 'prop-types'
import { toast } from "react-toastify";
import { api } from "../utils/api";
import { useGoTo } from "../hooks/useGoTo";

const GlobalProvider = ({ children }) => {
    const [authenticatedUser, setAuthenticatedUser] = useState(false)
    const [countries, setCountries] = useState([])
    const [office, setOffice] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(window.innerWidth > 600 ? true : false);

    const { goTo } = useGoTo()

    useEffect(() => {

      const account_token = localStorage.getItem('account_token')
      const account_json = localStorage.getItem('account_json')
      console.log("DATOS",account_json, account_token)

      if (account_token && account_json){
        console.log("ENTRO")
        getUserInfo(JSON.parse(account_json).id)
      }else{
        if(window.location.pathname !== "/password-reset-confirm"){
          console.log("NO ENTRO")
          setAuthenticatedUser(null)
          window.location.pathname !== "/register" && goTo('/login')
          localStorage.clear()
        }
      }

    }, [])

    // useEffect(() => {
    //     const getCountries = async () => {
    //       let res;
    //       try{
    //         res = await api.get("/users/countries/")
    //         const data = await res.data
    //         setCountries(data)
    //       }
    //       catch(err){
    //         toast.error('Error al cargar los paises')
    //       }
    //     }
    //     getCountries()
    //   }, [authenticatedUser])


              
    const getUserInfo = (userId) => {
        api.get(`/users/users/?auth=${userId}`).then(res => {
          if(res.status == 200){
            localStorage.setItem('account_json', JSON.stringify(res.data))
            setAuthenticatedUser(res.data)
          }
          else{
            setAuthenticatedUser(null)
            goTo('/login')
            localStorage.clear()
            return
          }
        })
    }
    const values = {
        authenticatedUser,
        setAuthenticatedUser,
        setCountries,
        countries,
        getUserInfo,
        office,
        setOffice,
        mobileOpen, 
        setMobileOpen
    }
    return (
    <globalContext.Provider value={values}>{children}</globalContext.Provider>
)
}

GlobalProvider.propTypes = {
    children: PropTypes.node
}
export default GlobalProvider