import { TextField } from '@mui/material'
import { Link } from 'react-router-dom'
import { useGoTo } from '../../src/hooks/useGoTo'
import PropTypes from 'prop-types';
import { useRef } from 'react';
import { api } from '../../src/utils/api';
import { useGlobalContext } from '../../src/hooks/useGlobalContext';
import { SaveButton } from '../Inventory/components/Buttons';
import { toast } from 'react-toastify';

function LoginBrain(){
  const { goTo } = useGoTo()
  const { setAuthenticatedUser } = useGlobalContext()
  const formRef = useRef(null)
  const loginUser = async () => {
    let res;
    const loginData = new FormData(formRef.current)
    try{
      res = await api.post("/users/login/", loginData)
      const data = await res.data
      if (res?.status === 200) {
        localStorage.setItem('account_token', data.access_token)
        localStorage.setItem('refresh', data.refresh)
        setAuthenticatedUser(data.account)
        console.log(data.account)
        localStorage.setItem('account_json', JSON.stringify(data.account))
        if(data.account.is_subsidiary){
          goTo("/")
        }
        else{
          goTo('/')
        }
        if(data.account.is_superuser){
          goTo('/dashboard')
        }
        toast.success('Sesión iniciada correctamente')
      }
      else{
        console.log(res)
        if(res.response.data.error)
          toast.error(res.response.data.error)
        else
          toast.error('Error: Usuario o contraseña incorrectos')
      }
    }
    catch(err){
      console.log(err)
      toast.error('Error: Usuario o contraseña incorrectos')
    }}

  return <>
    <Login formRef={formRef} loginUser={loginUser} />
  </>
}


function Login({formRef, loginUser}) {
  return (
    <article className='flex-1'>
        <form ref={formRef} onSubmit={(e) => {
          e.preventDefault()
          loginUser()}} className='authSubContainer flex-1'>
        <h2 className='title'>Inicia sesión</h2>
        <TextField fullWidth label="E-mail" name="email" required variant="outlined" />
        <TextField fullWidth label="Contraseña" name="password" required type='password' variant="outlined" />
        <SaveButton variant="contained" color="primary" type='submit' label={"Inicia sesión"}/>
        <Link to="/register" className='font-light'>
          ¿No tienes una cuenta? Registrate
        </Link>
        <Link to="/password-reset" className='font-light'>
          ¿Olvidaste tu contraseña? Restablecer
        </Link>
        </form>
    </article>
  )
}

Login.propTypes = {
  formRef: PropTypes.object,
  loginUser: PropTypes.func
}


export default LoginBrain