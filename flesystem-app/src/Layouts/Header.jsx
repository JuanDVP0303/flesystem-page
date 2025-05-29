import { Typography } from '@mui/material'
import { useGlobalContext } from '../hooks/useGlobalContext'
import NavButtons from './NavButtons'
import { NavLink } from 'react-router-dom'
import { api } from '../utils/api'
import flesystemLogo from "../../public/Logo2.png";



function Header() {
  return (
    <header className='relative z-10 w-full' id='header'>
      <NavBar />
    </header>
  )
}


export const NavBar = () => { 
  const {authenticatedUser} = useGlobalContext()
  const logout = () => {
    api.post("/users/logout/", {
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
  return (

    <nav className={`flex justify-between items-center  w-full  z-2 bg-green-700`} >
      <div className='flex items-center'>
      <NavLink to={"/"} >
      <img src={flesystemLogo} className='bg-green-900 p-2 rounded-full m-1 active:scale-110 transition-transform w-[40px] h-[40px]' alt="" />
      </NavLink>
      <Typography sx={{color:"white", fontWeight:"bold"}}>
      {authenticatedUser?.email}

      </Typography>
      </div>
      <ul className='flex'>
        {console.log(authenticatedUser?.kind_of_person == 'client' || authenticatedUser?.is_superuser)}
      {(authenticatedUser?.kind_of_person == 'client' || authenticatedUser?.is_superuser)&&<li>
      <NavButtons content="Productos" to="/products"/>
      </li>}
      <li>
      <NavButtons content="Contactos" to="/contact"/>
      </li>
      {
       authenticatedUser && authenticatedUser?.kind_of_person != 'client' && <>
      <li>
        <NavButtons content="Dashboard" to="/dashboard"/>
      </li>
        </>
      }
      {
        authenticatedUser && ["operator","admin"].includes(authenticatedUser.kind_of_person) && 
        <>
        <li>
        <NavButtons content="Inventario" to="/inventory"/>
        </li>
        <li>
        <NavButtons content="Compras" to="/purchases"/>
        </li>
        <li>
        <NavButtons content="Pedidos" to="/buying-records"/>
        </li>
        </>
      }

      {
        authenticatedUser ? 
        <li>
          <button className='text-white mr-4' onClick={() => {logout()}}>Cerrar Sesión</button>

        </li>
        :
        <li>
        <NavButtons content="Iniciar sesión" to="/login"/>
        </li>
      }
      </ul>
      </nav>
  )
}


export default Header