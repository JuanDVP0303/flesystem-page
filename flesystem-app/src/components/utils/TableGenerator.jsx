import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import PropTypes from 'prop-types';
const TableGenerator = ({ labels, data, rowFields }) => {
  return (
    <TableContainer  sx={{width:{
        xs:"85vw",
        sm:"85vw",
        md:"100%",
      }, }
    }>
    <Table className="min-w-full">
        <TableHead>
          <TableRow>
            {labels.map((label, index) => (
              <TableCell key={index}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((obj, rowIndex) => (
            <TableRow key={rowIndex}>
              {rowFields.map((field, cellIndex) => (
                <TableCell key={cellIndex}>{obj[field]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};


TableGenerator.propTypes = {
    labels: PropTypes.array,
    data: PropTypes.array,
    rowFields: PropTypes.array,
    };

export default TableGenerator;
