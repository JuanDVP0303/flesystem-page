import { Typography } from '@mui/material'
import { useGlobalContext } from '../hooks/useGlobalContext'
import NavButtons from './NavButtons'
import { NavLink } from 'react-router-dom'



function Header() {
  return (
    <header className='relative z-10 w-full' id='header'>
      <NavBar />
    </header>
  )
}


export const NavBar = () => { 
  const {authenticatedUser} = useGlobalContext()
  console.log("AUTH",authenticatedUser)
  return (

    <nav className={`flex justify-between items-center  w-full  z-2 bg-green-700`} >
      <div className='flex items-center'>
      <NavLink to={"/"} >
      <img src="https://i.postimg.cc/Jz7k2pKv/Logo2.png" className='bg-green-900 p-2 rounded-full m-1 active:scale-110 transition-transform w-[40px] h-[40px]' alt="" />
      </NavLink>
      <Typography sx={{color:"white", fontWeight:"bold"}}>
      {authenticatedUser?.email}

      </Typography>
      </div>
      <ul className='flex'>
      {authenticatedUser?.kind_of_person == 'client' || authenticatedUser?.is_superuser&&<li>
      <NavButtons content="Productos" to="/products"/>
      </li>}
      <li>
      <NavButtons content="Contactos" to="/contact"/>
      </li>
      {
        authenticatedUser?.kind_of_person != 'client' && <>
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
          <button className='text-white' onClick={() => {
            localStorage.clear()
            window.location.href = "/login"
          }}>Cerrar Sesión</button>

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