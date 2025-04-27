import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, TextField } from '@mui/material'
import { Link } from 'react-router-dom'
import { api } from '../../src/utils/api'
import { useGoTo } from '../../src/hooks/useGoTo'
import { SaveButton } from '../Inventory/components/Buttons'
import { toast } from 'react-toastify'
import PropTypes from 'prop-types'
import { Logo } from '../components/icons/Logo'

// Componente principal para recuperación de contraseña
export function PasswordResetMain() {
  const { goTo } = useGoTo()
  const formRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(formRef.current)
    
    try {
      const res = await api.post("/users/password_reset/", formData)
      if (res.status === 200 && !res.data.error) {
        toast.success('¡Instrucciones enviadas al correo electrónico, revisa la bandeja de spam!')
        goTo('/login')
      }
      else{
        if(res.data.error)
          toast.error(res.data.message)
        else
          toast.error('Error: Usuario o contraseña incorrectos')
      }
    } catch (err) {
      console.log("ERROR",err)
      toast.error(err.response?.data?.error || 'Error al enviar la solicitud')
    }
  }


  return (
    <article className='mt-20 flex-1 h-full min-h-[650px] w-[90%] md:w-[50%] lg:w-[30%] mx-auto'>
    <Box className="flex ">
        <div className="flex-1 flex flex-col overflow-y-auto p-3 w-full">
          <Logo medium />
          <div className="flex justify-center mt-2">
          <img src="https://i.postimg.cc/Jz7k2pKv/Logo2.png" className='bg-green-900 p-1 rounded-full m-1' alt="" />

          {/* <img src={avatar} alt="avatar" className="object-cover w-20 h-20 rounded-full" /> */}
          </div>
        </div>
      </Box>
      <form ref={formRef} onSubmit={handleSubmit} className='authSubContainer'>
        <h2 className='title'>Recuperar contraseña</h2>
        <TextField
          fullWidth
          label="Email registrado"
          name="email"
          type="email"
          required
          variant="outlined"
        />
        <SaveButton
          variant="contained"
          color="primary"
          type="submit"
          label={"Enviar instrucciones"}
        />
        <Link to="/login" className='font-light'>
          Volver al login
        </Link>
      </form>
    </article>
  )
}

// Componente para confirmación de nueva contraseña
export function PasswordResetConfirmMain() {
  const [searchParams] = useSearchParams()
  const { goTo } = useGoTo()
  const formRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(formRef.current)
    const uid = searchParams.get('hash')
    
    // Validación de contraseñas
    if (formData.get('new_password') !== formData.get('re_new_password')) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    // Agregar parámetros de la URL al formData
    formData.append('hash', uid)

    try {
      const res = await api.post('/users/password_reset_confirm/', formData)
      if (res.status === 200) {
        toast.success('Contraseña actualizada correctamente')
        goTo('/login')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Error al actualizar la contraseña')
    }
  }

  return (
    <article className='mt-20 flex-1 h-full min-h-[590px] w-[90%] md:w-[50%] lg:w-[30%] mx-auto'>
      <form ref={formRef} onSubmit={handleSubmit} className='flex flex-col h-full gap-8'>
        <h2 className='title'>Nueva Contraseña</h2>
        <TextField
          fullWidth
          label="Nueva contraseña"
          name="new_password"
          type="password"
          required
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Confirmar nueva contraseña"
          name="re_new_password"
          type="password"
          required
          variant="outlined"
        />
        <SaveButton
          variant="contained"
          color="primary"
          type="submit"
          label={"Establecer nueva contraseña"}
        />
        <Link to="/login" className='font-light'>
          Volver al login
        </Link>
      </form>
    </article>
  )
}

// Configuración de PropTypes
PasswordResetMain.propTypes = {
  formRef: PropTypes.object,
  handleSubmit: PropTypes.func
}

PasswordResetConfirmMain.propTypes = {
  formRef: PropTypes.object,
  handleSubmit: PropTypes.func
}

/* 
Uso en rutas:
import { PasswordResetMain, PasswordResetConfirmMain } from './components/PasswordReset'

<Route path="/password-reset" element={<PasswordResetMain />} />
<Route path="/password-reset-confirm" element={<PasswordResetConfirmMain />} />
*/