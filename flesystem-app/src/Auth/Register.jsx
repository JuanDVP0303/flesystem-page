import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../../src/utils/api';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { useGoTo } from '../../src/hooks/useGoTo';
import { useGlobalContext } from '../../src/hooks/useGlobalContext';
import { SaveButton } from '../Inventory/components/Buttons';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
const fieldsObj = {
  email: 'Email',
  rif: 'RIF',
  phone: 'Teléfono',
  type_of_document: 'Tipo de documento',
  document: 'Cédula',
  password: 'Contraseña',
  confirmPassword: 'Confirmar contraseña',

  account:"una cuenta"
};

function RegisterBrain({isAdmin}) {
  const { goTo } = useGoTo();
  const { setAuthenticatedUser } = useGlobalContext();
  const formRef = useRef(null);

  
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (!hasUpperCase) {
      toast.error('La contraseña debe contener al menos una letra mayúscula');
      return false;
    }
    if (!hasSymbol) {
      toast.error('La contraseña debe contener al menos un símbolo (!@#$%^&*(),.?":{}|<>)');
      return false;
    }
    return true;
  };


  const registerUser = async () => {
    const formData = new FormData(formRef.current);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    if (!validatePassword(password)) return;

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    formData.delete('confirmPassword'); // Eliminar campo de confirmación del formData

    if (isAdmin && !formData.get('kind_of_person')) {
      toast.error('Selecciona el tipo de usuario');
      return
    }
    
    const birthdate = formData.get('birthdate');
    if (!birthdate) {
      toast.error('La fecha de nacimiento es requerida');
      return;
    }

    const phone = formData.get('phone');
    //Phone example: 0424 3132091
    const phoneFirstNumbers = ["0424", "0414", "0412", "0416", "0426"];
    if (!/^\d{4} \d{7}$/.test(phone)) {
      toast.error('El teléfono debe tener el formato 0424 1234567');
      return;
    }
    if (!phoneFirstNumbers.some(num => phone.startsWith(num))) {
      toast.error('El teléfono debe comenzar con 0424, 0414, 0412, 0416 o 0426');
      return;
    }
  
    // Cálculo de edad
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (
      monthDiff < 0 || 
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    
    //Validar que el año sea menor al año actual
    if (birthDate.getFullYear() > today.getFullYear()) {
      toast.error('La fecha de nacimiento no puede ser mayor al año actual');
      return;
    }

    if (age < 18) {
      toast.error('Debes ser mayor de 18 años para registrarte');
      return;
    }
    formData.set(
      'document',
      `${formData.get('type_of_document')}-${formData.get('document')}`
    );

    if(formData.get("document").length < 7){
      toast.error('El número de cédula es inválido');
      return
    }

    if(formData.get("tipo_persona") === "juridica" && formData.get("document").length < 11){
      toast.error('El número de RIF es inválido');
      return
    }

    console.log(Object.fromEntries(formData));
    let res;
    try {
      res = await api.post('/users/create-user/', formData);
      const data = await res.data;
      if (res.status === 201 && !isAdmin) {
        localStorage.setItem('account_token', data.access_token);
        setAuthenticatedUser(data.account);
        localStorage.setItem('account_json', JSON.stringify(data.account));
        toast.success('Usuario creado correctamente');
        goTo('/');
      }
      if(res.status !== 201){
        console.log(res);
        for (const key in res.data) {
          toast.error(`${fieldsObj[key] ?? 'Campo'}: ${res.data[key][0]?.replace("account", "una cuenta").replace(key, fieldsObj[key])}`);
        }
        return
      }
      if(isAdmin){
        toast.success('Usuario creado correctamente');
        formRef.current.reset();
      }
    } catch (err) {
      console.log(err);
      const detailObj = err.response.data;
      for (const key in detailObj) {
        toast.error(`${fieldsObj[key] ?? 'Campo'}: ${detailObj[key].replace("account", "una cuenta")}`);
      }
    }
  };

  return (
    <>
      <Register formRef={formRef} registerUser={registerUser} isAdmin={isAdmin} />
    </>
  );
}


function Register({ formRef, registerUser, isAdmin }) {
  const [personType, setPersonType] = useState('natural');
  const [userRegistering, setUserRegistering] = useState("client")
  return (
    <article>
      <form
        className="authSubContainer"
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          registerUser();
        }}
      >
        <h2 className="title">{!isAdmin ? "Regístrate" : "Registra usuarios"}</h2>
        {isAdmin && <>
          <FormControl component="fieldset">
            <FormLabel component="legend">Tipo de usuario</FormLabel>
            <RadioGroup aria-label="kind_of_person" name="kind_of_person" defaultValue="client" onChange={()=>{
              setUserRegistering(prev => prev === "client" ? "operator" : "client")
            }}>
              <Box sx={{display:"flex"}}>
                <FormControlLabel value="client" control={<Radio />} label="Cliente" />
                <FormControlLabel value="operator" control={<Radio />} label="Operador" />
              </Box>
            </RadioGroup>
          </FormControl>
        </>}
        
        {/* Nuevo RadioGroup para tipo de persona */}
    {userRegistering == "client" && <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
          <FormLabel component="legend">Tipo de Persona</FormLabel>
          <RadioGroup 
            row
            aria-label="tipo-persona"
            name="tipo_persona"
            value={personType}
            onChange={(e) => setPersonType(e.target.value)}
          >
            <FormControlLabel 
              value="natural" 
              control={<Radio />} 
              label="Persona Natural" 
            />
            <FormControlLabel 
              value="juridica" 
              control={<Radio />} 
              label="Persona Jurídica" 
            />
          </RadioGroup>
        </FormControl>}

        {/* Campo oculto para type_of_document */}
        <input 
          type="hidden" 
          name="type_of_document" 
          value={personType === 'natural' ? 'V' : 'J'} 
        />

        {/* Campos condicionales según tipo de persona */}
        {personType === 'natural' ? (
          <Box display="flex" alignItems="center" width={'100%'} gap={1}>
            <FormControl sx={{ width: '15%' }} variant="outlined">
              <Select value="V" disabled>
                <MenuItem value="V">V</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              sx={{ width: '85%' }}
              label="Cédula"
              name="document"
              inputProps={{
                maxLength: 8,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
              }}
              required
            />
          </Box>
        ) : (
          <TextField
            fullWidth
            label="RIF"
            name="document"
            inputProps={{
              maxLength: 10,
              inputMode: 'numeric',
              pattern: '[0-9]*'
            }}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            }}
            required
          />
        )}

        {/* Resto de campos... */}
        <TextField fullWidth label="E-mail" variant="outlined" name="email" required />
        <TextField
          fullWidth
          label="Fecha de nacimiento"
          type="date"
          name="birthdate"
          required
          InputLabelProps={{ shrink: true }}
        />
        
        <TextField
          fullWidth
          label="Teléfono"
          name="phone"
          placeholder="0424 1234567"
          inputProps={{ maxLength: 12 }}
          onInput={(e) => {
            e.target.value = e.target.value
              .replace(/[^0-9]/g, '')
              .replace(/^(\d{4})(\d{0,7})$/, '$1 $2')
              .trim();
          }}
          required
        />

        <TextField 
          fullWidth 
          label="Contraseña" 
          type="password" 
          name="password" 
          required 
        />
        
        <TextField 
          fullWidth 
          label="Confirma Contraseña" 
          type="password" 
          name="confirmPassword" 
          required 
        />
        <SaveButton 
          variant="contained" 
          color="primary" 
          type="submit" 
          label={isAdmin ? 'Registrar' : 'Registrarse'} 
        />
        
        {!isAdmin && <Link to="/login" className="font-light">
          ¿Ya tienes una cuenta? Inicia sesión
        </Link>}
      </form>
    </article>
  );
}
Register.propTypes = {
  formRef: PropTypes.object,
  countries: PropTypes.array,
  registerUser: PropTypes.func,
  setCountryCode: PropTypes.func,
  countryCode: PropTypes.string,
  isAdmin: PropTypes.bool
};

RegisterBrain.propTypes = {
  isAdmin: PropTypes.bool
};
export default RegisterBrain;
