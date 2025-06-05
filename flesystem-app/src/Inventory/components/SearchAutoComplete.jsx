import React, { useEffect, useState } from 'react';
import { Autocomplete, Chip, TextField } from '@mui/material';

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
  multiple = false
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const handleChange = (event, newValue) => {
    console.log({ target: { name, value: newValue } })
    if(onChange){
      onChange({ target: { name, value: newValue } }, newValue);
      if(multiple){
        return;
      }
    }
    if (newValue) {
      const itemInOptions = options.find((item) => item.name === newValue.name);
      setSelectedItem(itemInOptions || null);
    } else {
      setSelectedItem(null);
    }
  };

  const handleInputChange = (event, values) => {
    console.log(values)
    if(onChange){
      onChange(event);
    }
    if(searchFunction){
      searchFunction(event.target.value);
    }
    setSelectedItem(null);
  };


console.log(value)
  return (
    <Autocomplete
      multiple={multiple}
      freeSolo={freeSolo}
      onChange={handleChange}
      required={required}
      // id="tags-standard"
      disabled={disabled}
      getOptionLabel={(option) => option?.name || ''}
      value={multiple ? value : options.find(option => option.id == value) || null}
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
