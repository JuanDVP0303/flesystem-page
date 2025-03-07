import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';

const SearchAutocomplete = ({
  options,
  onChange,
  required,
  disabled,
  value,
  name,
  placeholder,
  endAdornment,
  multiline,
  numeric,
  freeSolo = false,
  searchFunction,
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const handleChange = (event, newValue) => {
    console.log({ target: { name, value: newValue?.id } })
    if(onChange){
      onChange({ target: { name, value: newValue?.id } });
    }
    if (newValue) {
      const itemInOptions = options.find((item) => item.name === newValue.name);
      setSelectedItem(itemInOptions || null);
    } else {
      setSelectedItem(null);
    }
  };

  const handleInputChange = (event) => {
    if(onChange){
      onChange(event);
    }
    if(searchFunction){
      searchFunction(event.target.value);
    }
    setSelectedItem(null);
  };



  return (
    <Autocomplete
      freeSolo={freeSolo}
      onChange={handleChange}
      required={required}
      disabled={disabled}
      getOptionLabel={(option) => option?.name || ''}
      value={options.find(option => option.id == value) || null}
      options={options}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: endAdornment,
            multiline: !!multiline,
            type: numeric ? "number" : "text",
            onChange: handleInputChange
          }}
        />
      )}
    />
  );
};

export default SearchAutocomplete;
