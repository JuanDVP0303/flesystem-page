import React, { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import LaunchIcon from '@mui/icons-material/Launch'
import ClearIcon from '@mui/icons-material/Clear'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContentText from '@mui/material/DialogContentText'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import { DialogActions, Button, Input } from '@mui/material'
import { Document, Page, pdfjs } from 'react-pdf'
// import Lightbox from 'react-awesome-lightbox'
import html2canvas from 'html2canvas'

// You need to import the CSS only once
// import 'react-awesome-lightbox/build/style.css'


export const convertPdfToBase64Image = async (value, nPage) => {
  try {
    // Carrega o PDF da URL
    const pdfDoc = await pdfjs.getDocument({ url: value.replace('http://', 'https://') }).promise;
    // Obtém a primeira página do PDF
    const page = await pdfDoc.getPage(nPage);

    // Obtém as dimensões da página
    const viewport = page.getViewport({ scale: 2 });

    // Cria um elemento canvas
    const canvasElement = document.createElement('canvas');
    const context = canvasElement.getContext('2d');
    canvasElement.width = viewport.width;
    canvasElement.height = viewport.height;

    // Renderiza a página no canvas
    await page.render({ canvasContext: context, viewport }).promise;

    // Converte o canvas para uma imagem em base64
    const imageData = canvasElement.toDataURL('image/png');
    return imageData;
  } catch (error) {
    console.error('Erro ao converter PDF para imagem:', error);
    return null
  }
};

const DragAndDropBox = ({
  width,
  height,
  label,
  field,
  value,
  isBase64,
  error,
  onError,
  setFieldValue,
  disabled,
  style,
  maxSizeInMegaBytes = 1,
  allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  fileName,
  onDelete,
  onReplace,
  onClear,
  title
}) => {
  const [numPages, setNumPages] = useState(null)
  const [modal, setModal] = useState(null)
  const [imageURL, setImageURL] = useState('')
  const [base64Image, setBase64Image] = useState('');
  const pageRef = useRef(null)
  const validateFileSize = file => {
    if (!file) return true
    const maxSizeInBytes = maxSizeInMegaBytes * 1024 * 1024 // Convertendo para bytes

    return file.size <= maxSizeInBytes
  }
  const validateFileType = file => {
    if (!file) return true

    return allowedFileTypes.includes(file.type)
  }

  const getFormattedAllowedFileTypes = () => {
    return allowedFileTypes
      .map(fileType => {
        const parts = fileType.split('/')

        return parts[1]
      })
      .join(', ')
  }

  const handleFileSelection = event => {
    const selectedFile = event.currentTarget.files[0]

    if (selectedFile && validateFileSize(selectedFile) && validateFileType(selectedFile)) {
      setFieldValue(selectedFile)
      if (onError) onError(null)
    } else {
      let errorMessage = 'O arquivo selecionado não é válido.'

      if (!validateFileSize(selectedFile)) {
        errorMessage = 'O tamanho máximo permitido é 1 MB'
      } else if (!validateFileType(selectedFile)) {
        const allowedTypesMessage = getFormattedAllowedFileTypes()
        errorMessage = `Os tipos de arquivo permitidos são ${allowedTypesMessage}`
      }

      if (onError) onError(errorMessage)
    }
  }

  const handleDragEnter = e => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.style.borderColor = 'blue'
    e.currentTarget.style.background = '#013dff36'
  }

  const handleDragLeave = e => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.style.borderColor = 'unset'
    e.currentTarget.style.background = '#fff'
  }

  const handleDragOver = e => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.style.borderColor = 'unset'
    e.currentTarget.style.background = '#fff'

    const selectedFile = e.dataTransfer.files[0]

    if (selectedFile && validateFileSize(selectedFile) && validateFileType(selectedFile)) {
      setFieldValue(selectedFile)
      if (onError) onError(null)
    } else {
      let errorMessage = 'O arquivo selecionado não é válido.'

      if (!validateFileSize(selectedFile)) {
        errorMessage = 'O tamanho máximo permitido é 1 MB'
      } else if (!validateFileType(selectedFile)) {
        const allowedTypesMessage = getFormattedAllowedFileTypes()
        errorMessage = `Os tipos de arquivo permitidos são ${allowedTypesMessage}`
      }

      if (onError) onError(errorMessage)
    }
  }
  // value && console.log("value",value.slice(0,40))



  /*   const handleOpenFile = () => {
    if (typeof value === 'string') {
      // window.open(value, '_blank');
      setModal(true)
    }
  } */

  const handleOpenModalEditDocument = () => {
    setModalEdit(true)
  }

  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

  const handleOpenFile = async () => {
    if (typeof value === 'string') {
      // window.open(value, '_blank');
      setModal(true)
    }
    const canvas = await html2canvas(pageRef.current)
    setImageURL(canvas.toDataURL())
  }

  const convertPdfBase64ToBase64Image = async (base64Pdf) => {
    try {
      // Decodificar el base64 del PDF
      const pdfData = atob(base64Pdf.split(',')[1]);
      const pdfDataArray = new Uint8Array(pdfData.length);
      for (let i = 0; i < pdfData.length; i++) {
        pdfDataArray[i] = pdfData.charCodeAt(i);
      }
      
      // Cargar el PDF desde los datos decodificados
      const pdfDoc = await pdfjs.getDocument({ data: pdfDataArray }).promise;
      // Obtener la primera página del PDF

      const page = await pdfDoc.getPage(0);
      // Obtener las dimensiones de la página
      const viewport = page.getViewport({ scale: 2 });
  
      // Crear un elemento canvas
      const canvasElement = document.createElement('canvas');
      const context = canvasElement.getContext('2d');
      canvasElement.width = viewport.width;
      canvasElement.height = viewport.height;
  
      // Renderizar la página en el canvas
      await page.render({ canvasContext: context, viewport }).promise;
  
      // Convertir el canvas a una imagen en base64
      const imageData = canvasElement.toDataURL('image/png');
      setBase64Image(imageData);
      return imageData;
    } catch (error) {
      console.error('Error al convertir PDF a imagen:', error);
      return null;
    }
  };
  

  const convertPdfToBase64Image = async (value, page) => {
    try {
      // Carrega o PDF da URL
      const pdfDoc = await pdfjs.getDocument({ url: value.replace('http://', 'https://') }).promise;
      // Obtém a primeira página do PDF
      const page = await pdfDoc.getPage(1);

      // Obtém as dimensões da página
      const viewport = page.getViewport({ scale: 2 });

      // Cria um elemento canvas
      const canvasElement = document.createElement('canvas');
      const context = canvasElement.getContext('2d');
      canvasElement.width = viewport.width;
      canvasElement.height = viewport.height;

      // Renderiza a página no canvas
      await page.render({ canvasContext: context, viewport }).promise;

      // Converte o canvas para uma imagem em base64
      const imageData = canvasElement.toDataURL('image/png');
      setBase64Image(imageData);
    } catch (error) {
      console.error('Erro ao converter PDF para imagem:', error);
    }
  };

  useEffect(() => {
    setImageURL('') // Reset imageURL on component mount

  }, [value])
  return (
    <Box width={width} style={style}>
      {/* <Lightbox
        images={[{ url: imageURL, title: 'PDF Preview' }]}
        onClose={() => setModal(false)} 
      /> */}
      {/* <Document file='/PruebaPDF.pdf' onLoadSuccess={() => handleOpenFile()}>
        <Page ref={pageRef} pageNumber={1} width={400} />
      </Document> */}
      <Typography fontSize={12} mb={1}>
        {label}
      </Typography>
      <Box
        fullWidth
        sx={{
          display: 'inline-block',
          border: 1,
          borderStyle: 'dashed',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.3s',
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
         {value ? <>
          <img
            src={value && (typeof value === 'string' ? value : URL.createObjectURL(value))}
            alt='Preview'
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          </>
        :
        <Typography
        textAlign='center'
        sx={{ position: 'absolute', top: '50%', width: '100%', transform: 'translateY(-50%)' }}
      >
        {!disabled ? title ? title : "Subir foto" : "Sin foto" }
      </Typography>  
        }
        <Input
          disabled={disabled}
          type='file'
          InputLabelProps={{ shrink: true }}
          error={!!error}
          onChange={handleFileSelection}
          name={field}
          position='relative'
          style={{ opacity: 0, width: width, height: height }}
        />

        {typeof value === 'string' && onReplace && (
          <Box
            mt={1}
            position='absolute'
            top={5}
            right={75}
            zIndex={1}
            bgcolor='#fff'
            boxShadow='0 0 3px rgba(0, 0, 0, 0.5)'
            borderRadius={3}
          >
            <IconButton onClick={() => onReplace()} size='small'>
              <ImportExportIcon fontSize='small' />
            </IconButton>
          </Box>
        )}

        {typeof value === 'string' && onDelete && (
          <Box
            mt={1}
            position='absolute'
            top={5}
            right={40}
            zIndex={1}
            bgcolor='#fff'
            boxShadow='0 0 3px rgba(0, 0, 0, 0.5)'
            borderRadius={3}
          >
            <IconButton onClick={() => onDelete()} size='small'>
              <ClearIcon fontSize='small' />
            </IconButton>
          </Box>
        )}

        {onClear && (
          <Box
            mt={1}
            position='absolute'
            top={5}
            right={5}
            zIndex={1}
            bgcolor='#fff'
            boxShadow='0 0 3px rgba(0, 0, 0, 0.5)'
            borderRadius={3}
          >
            <IconButton onClick={() => onClear()} size='small'>
              <ClearIcon fontSize='small' />
            </IconButton>
          </Box>
        )}

        {typeof value === 'string' && (
          <Box
            mt={1}
            position='absolute'
            top={5}
            right={5}
            zIndex={1}
            bgcolor='#fff'
            boxShadow='0 0 3px rgba(0, 0, 0, 0.5)'
            borderRadius={3}
          >
            <IconButton onClick={handleOpenFile} size='small'>
              <LaunchIcon fontSize='small' />
            </IconButton>
          </Box>
        )}
      </Box>
      {error ? <Typography style={{ color: 'red', fontSize: 12, position: 'absolute', width: width }}>{error}</Typography> : null}

      <Dialog open={modal} onClose={() => setModal(false)} fullWidth={true} maxWidth='lg'>
        {modal && (
          (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={typeof value === 'string' ? value : URL.createObjectURL(value)}
                alt='Preview'
                style={{ width: '70%', height: 'auto', objectFit: 'cover' }}
              />
              {/* <Lightbox
                image={typeof value === 'string' && !isPDF ? value : isPDF ? base64Image : URL.createObjectURL(value)}
                title='Preview'
                onClose={() => setModal(false)}
              /> */}
            </Box>
          ) 
        )}
      </Dialog>
    </Box>
  )
}

export default DragAndDropBox
