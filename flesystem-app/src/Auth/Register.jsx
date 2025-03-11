import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../../src/utils/api';
import { useRef } from 'react';
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
  password: 'Contraseña'
};

function RegisterBrain({isAdmin}) {
  const { goTo } = useGoTo();
  const { setAuthenticatedUser } = useGlobalContext();
  const formRef = useRef(null);

  const registerUser = async () => {
    const formData = new FormData(formRef.current);
    if (isAdmin && !formData.get('kind_of_person')) {
      toast.error('Selecciona el tipo de usuario');
      return
    }
    formData.set(
      'document',
      `${formData.get('type_of_document')}-${formData.get('document')}`
    );

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
      if(isAdmin){
        toast.success('Usuario creado correctamente');
        formRef.current.reset();
      }
    } catch (err) {
      console.log(err);
      const detailObj = err.response.data;
      for (const key in detailObj) {
        toast.error(`${fieldsObj[key] ?? 'Campo'}: ${detailObj[key]}`);
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
          <RadioGroup aria-label="kind_of_person" name="kind_of_person" defaultValue="client">
            <Box sx={{display:"flex"}}>
            <FormControlLabel value="client" control={<Radio />} label="Cliente" />
            <FormControlLabel value="operator" control={<Radio />} label="Operador" />
            </Box>
          </RadioGroup>
        </FormControl>
        </>}
        
        <TextField fullWidth label="E-mail" variant="outlined" name="email" required />
        
        {/* RIF - Solo numérico */}
        <TextField
          fullWidth
          label="RIF"
          variant="outlined"
          name="rif"
          required
          inputProps={{
            inputMode: 'numeric', // Muestra teclado numérico en móviles
            pattern: '[0-9]*' // Solo permite números
          }}
          onInput={(e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, ''); // Elimina caracteres no numéricos
          }}
        />

        {/* Teléfono - Formato venezolano */}
        <TextField
          fullWidth
          label="Teléfono"
          variant="outlined"
          name="phone"
          required
          placeholder="0424 1234567"
          inputProps={{
            maxLength: 12 // Limita la longitud del teléfono a "0424 1234567"
          }}
          onInput={(e) => {
            e.target.value = e.target.value
              .replace(/[^0-9]/g, '') // Solo permite números
              .replace(/^(\d{4})(\d{0,7})$/, '$1 $2') // Aplica el formato "#### #######"
              .trim(); // Elimina espacios innecesarios al final
          }}
        />

        <Box display="flex" alignItems="center" width={'100%'} gap={1}>
          {/* Select con tamaño reducido */}
          <FormControl sx={{ width: '15%' }} variant="outlined" required>
            <InputLabel id="select-label">V</InputLabel>
            <Select labelId="select-label" label="V" name="type_of_document">
              <MenuItem value={'V'}>V</MenuItem>
              <MenuItem value={'J'}>J</MenuItem>
            </Select>
          </FormControl>

          {/* TextField con tamaño ampliado */}
          <TextField
            fullWidth
            sx={{ width: '85%' }}
            label="Cédula"
            variant="outlined"
            name="document"
            required
          />
        </Box>

        <TextField fullWidth label="Contraseña" type="password" name="password" variant="outlined" required />
        
        <SaveButton variant="contained" color="primary" type="submit" label={'Registrarse'} />
        
        <Link to="/login" className="font-light">
          ¿Ya tienes una cuenta? Inicia sesión
        </Link>
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
