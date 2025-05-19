import React, { useState, useEffect } from 'react';
import { Box, IconButton, TextField, styled } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const StyledBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5),
  width: 'fit-content',
}));

const StyledIconButton = styled(IconButton)({
  padding: 4,
});

const StyledTextField = styled(TextField)({
  '& .MuiInputBase-input': {
    padding: '2px 0',
    textAlign: 'center',
    width: '40px',
  },
  '& .MuiInput-underline:before': {
    borderBottom: 'none',
  },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
    borderBottom: 'none',
  },
  '& .MuiInput-underline:after': {
    borderBottom: 'none',
  },
});

const NumericSelector = ({ initialValue = 1, min = 1, max = 100, onChange }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  const handleChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      setValue(newValue);
    } 
    if(isNaN(newValue)){
      setValue(min)
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      setValue(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      setValue(value - 1);
    }
  };

  return (
    <StyledBox>
      <StyledIconButton onClick={handleDecrement} disabled={value <= min} size="small">
        <RemoveIcon fontSize="small" />
      </StyledIconButton>
      <StyledTextField
        value={value}
        onChange={handleChange}
        variant="standard"
        inputProps={{ min, max, type: 'number', defaultValue: initialValue }}
      />
      <StyledIconButton onClick={handleIncrement} disabled={value >= max} size="small">
        <AddIcon fontSize="small" />
      </StyledIconButton>
    </StyledBox>
  );
};

export default NumericSelector;
