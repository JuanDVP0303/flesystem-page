import { productDataUrl } from "../data";
import { useEffect } from "react";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import propTypes from "prop-types";
import { useInventoryContext } from "../hooks/useInventoryContext";
import { Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, Icon, IconButton, Input, List, ListItem, ListItemText, Typography } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { styled } from "@mui/material/styles";
import { Unstable_NumberInput as NumberInput } from '@mui/base';
import NumberInputIntroduction from "../components/utils/NumberInput";
import { createTheme } from '@mui/material/styles';
import NumericSelector from "../components/utils/NumberInput";
import { useGlobalContext } from "../hooks/useGlobalContext";
import { toast } from "react-toastify";
import { api } from "../utils/api";
import { useBuyingRecordContext } from "../hooks/useBuyingRecords";
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import BuyingRecordsDialog from "./UserBuyingRecords";

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    right: -3,
    top: 13,
    border: `2px solid ${theme.palette.background.paper}`,
    backgroundColor: "red",
    padding: "0 4px",
  },
}));

export default function Products() {
  const [showToHeader, setShowToHeader] = useState(
    "opacity-0 pointer-events-none"
  );

  const [showProductCart, setShowProductCart] = useState(false);
  const { getProducts, products, selectedProducts, setSelectedProducts } = useInventoryContext();
  const {buyingRecords, getBuyingRecords } = useBuyingRecordContext()
  const {authenticatedUser} = useGlobalContext()
  const [openUserBuyingRecords, setOpenUserBuyingRecords] = useState(false)
  const [showPreviousPurchaseProducts, setShowPreviousPurchaseProducts] = useState(false)
  useEffect(() => {
    getBuyingRecords()
  }, [])

  useEffect(() => {
    if(authenticatedUser && authenticatedUser.kind_of_person != "client" && !authenticatedUser.is_superuser){
      window.location.href = "/"
    }
  }, [authenticatedUser])

  useEffect(() => {
    const handleScroll = () => {
      setShowToHeader(
        window.scrollY >= 300
          ? "opacity-1 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      );
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if(selectedProducts.length == 0){
      setShowProductCart(false)
    }
  }, [selectedProducts])

  useEffect(() => {
    console.log(authenticatedUser)
    if(authenticatedUser && authenticatedUser.kind_of_person != "client" && !authenticatedUser.is_superuser){
      window.location.href = "/"
    }
    getProducts();
  }, []);


const generateOrder = async () => {
  try {
//VErificar que todos los productos tengan cantidad mayor a 0
    const isAnyProductInQuantityZero = selectedProducts.find(product => product.quantity == 0 || product.quantity == null)
    if(isAnyProductInQuantityZero){
      toast.error("Ingrese la cantidad en todos los productos")
      return
    }

    const response = await api.post('/buying/records/create-buying-record/', {
      products: selectedProducts.map(product => ({
        id: product.id,
        quantity: product.quantity,
        sell_price: product.sell_price
      }))
    });

    if(response.status == 201){
      toast.success("Pedido generado con éxito")
      setSelectedProducts([])
      getBuyingRecords()
    }
    else{
      toast.error("Ha ocurrido un error")
    }

    console.log('Order created successfully:', response.data);
    
    // Cierra el diálogo y realiza cualquier acción adicional necesaria
    setShowPreviousPurchaseProducts(false);
    // Por ejemplo, podrías mostrar un mensaje de éxito o redirigir al usuario
    
  } catch (error) {
    toast.error("Ha ocurrido un error")

    console.error('There was a problem creating the order:', error);
    // Maneja el error, por ejemplo, mostrando un mensaje al usuario
  }
};


  return (
    <main className="pb-24 pt-24">
      <BuyingRecordsDialog open={openUserBuyingRecords} onClose ={() => setOpenUserBuyingRecords(false)} />
<Dialog fullWidth open={showPreviousPurchaseProducts} onClose={() => setShowPreviousPurchaseProducts(false)}>
  <DialogTitle>Productos a Pedir</DialogTitle>
  <DialogContent>
    <List>
      {selectedProducts.map((product, index) => (
        <ListItem key={index} className="flex flex-col md:flex-row">
          <ListItemText
          className="text-center md:text-start"
            primary={product.name}
            secondary={`Cantidad: ${product.quantity} - Precio unitario: $${product.sell_price.toFixed(2)}`}
          />
          <Typography variant="body2">
            Subtotal: ${(product.quantity * product.sell_price).toFixed(2)}
          </Typography>
        </ListItem>
      ))}
    </List>
    <Divider />
    <Typography variant="h6" style={{ marginTop: '1rem' }}>
      Precio Final: Bs.{selectedProducts.reduce((total, product) => total + (product.quantity * product.sell_price), 0).toFixed(2)}
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowPreviousPurchaseProducts(false)}>Cerrar</Button>
    <Button variant="contained" onClick={generateOrder}>Generar Pedido</Button>
  </DialogActions>
</Dialog>
        <a
          href="#header"
          className={`
        w-12 h-12 fixed rounded-full bg-[#1e3c72] right-1 ${showToHeader} transition ease-in-out duration-300 md:right-[80px] md:w-16 md:h-16 active:scale-125`}
        ></a>
        <ul className="flex flex-wrap justify-center">
          {products.filter(product => product.quantity && product.quantity > product.min_stock).length > 0 ? (
            products.filter(product => product.quantity && product.quantity > product.min_stock).map((product) => {
              return (
                <li
                  key={product?.id}
                  className="m-10 flex border transition-all hover:translate-y-[-20px] border-green-300 rounded-lg p-4 shadow-md justify-center flex-col"
                >
                  {/* ANtes el div este padre UU, era un <Link> */}
                  <div className="relative" to={`/products/${product?.id}`}>
                    <IconButton
                      sx={{
                        position: "absolute",
                        right: "0px",
                        top: "0px",
                        color: "green",
                        p:0
                      }}
                      onClick={() => {
                        setSelectedProducts((prev) => {
                          const productIndex = prev.findIndex(
                            (p) => p.id === product.id
                          );
                          if (productIndex === -1) {
                            return [...prev, {
                              ...product,
                              quantity: 1,
                            }];
                          } else {
                            return prev.filter((p) => p.id !== product.id);
                          }
                        });
                      }}
                    >
                      <ShoppingCartIcon />
                    </IconButton>
                    <h2 className="text-center mt-4">{product?.name}</h2>
                    <img
                      src={product?.product_image}
                      alt={product?.name}
                      className="rounded-lg w-80 h-80 object-fit"
                    />
                  </div>
                </li>
              );
            })
          ) : (
            <h1 className="font-bold text-xl text-center">En este momento no tenemos stock de nuestros productos, intente más tarde...</h1>
          )}
        </ul>
       <IconButton
          sx={{ position: "fixed", right: 0, top: 50 }}
          className={`
                          w-12 h-12 rounded-full bg-[#1e3c72] transition ease-in-out duration-300 md:w-16 md:h-16 active:scale-125`}
          onClick={() => {
            setShowProductCart((prev) => !prev);
          }}
        >
          <StyledBadge
            badgeContent={selectedProducts?.length}
            color="secondary"
          >
            <ShoppingCartIcon />
          </StyledBadge>
        </IconButton> 
        <IconButton
          sx={{ position: "fixed", left: 0, bottom: 50 }}
          className={`
                          w-12 h-12 rounded-full bg-[#1e3c72] transition ease-in-out duration-300 md:w-12 md:h-12 active:scale-125`}
          onClick={() => {
            setOpenUserBuyingRecords((prev) => !prev);
          }}
        >
            <ShoppingBagIcon />
        </IconButton> 
        <DrawerCart
          showProductCart={showProductCart}
          setShowProductCart={setShowProductCart}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          setShowPreviousPurchaseProducts={setShowPreviousPurchaseProducts}
          products={products}
        />
    </main>
  );
}

export const DrawerCart = ({ showProductCart, setShowProductCart, selectedProducts, setSelectedProducts, setShowPreviousPurchaseProducts, products }) => {
  return       <Drawer anchor="right" open={showProductCart} onClose={() => setShowProductCart(false)}>
        <div className="w-[30rem] h-full flex flex-col p-5">
          <h2 className="text-center">Carrito de compras</h2>
          <List className="flex flex-col gap-5">
            {selectedProducts.map((product) => {
              return (
                <ListItem key={product.id} className="flex relative gap-5 items-center border">
                  <IconButton
                    sx={{
                      position:"absolute",
                      top:2,
                      right:2
                    }}
                  size="small" onClick={() => {
                    setSelectedProducts(prev => {
                      return prev.filter(p => p.id != product.id )
                    })
                  }}>
                    ✖️
                  </IconButton>
                  <img
                    src={product.product_image}
                    alt={product.name}
                    className="w-20 h-20 object-fit border p-2"
                  />
                  <div className="flex gap-2 items-center">
                  <ListItemText sx={{mr:2}} primary={product.name} secondary={<>
                    {
                    "BS."+product.sell_price 
                    }
                    <br />
                    {
                    "Stock actual: "+(products?.find(p => p.id == product.id).quantity || 0)
                    }
                    </>}></ListItemText>
                  {/* <ListItemText secondary={}></ListItemText> */}
                  <NumericSelector initialValue={1} value={product.quantity > 0 ? product.quantity : 1} max={(products?.find(p => p.id == product.id).quantity) ||0} min={1} onChange={(value) => {
                    if (value > 0){
                      setSelectedProducts((prev) => {
                        const productIndex = prev.findIndex((p) => p.id === product.id);
                        const newProductData= {
                          ...prev[productIndex],
                          quantity: value,
                        };
                        const newProducts = [...prev];
                        newProducts[productIndex] = newProductData;
                        return newProducts; 
                      });
                    }
                  }
                  } />
                  <Typography sx={{color:"green"}}>{"BS."+((product.sell_price || 0) * (product.quantity || 0))}</Typography>
                  </div>
                </ListItem>
              );
            })}
          </List>
         {    selectedProducts.length > 0 &&  <Button onClick={() => {
            const isAnyProductInQuantityZero = selectedProducts.find(product => product.quantity == 0)
            if(isAnyProductInQuantityZero){
              toast.error("Ingrese la cantidad en todos los productos")
            }
            else{
              setShowPreviousPurchaseProducts(true)
            }
          }}>
            Generar pedido
          </Button>}
        </div>
      </Drawer>
}

export const ProductDetail = () => {
  //esperando el parametro que este en la url que sera un numero
  const { productId } = useParams();
  //Accediendo a la data del product dependiendo de la url
  const productData = productDataUrl[productId];
  const { productName, url, descripcion, caracteristicas, usos, colores } =
    productData;

  const Titles = ({ children }) => {
    return (
      <h2 className="font-bold text-xl text-center text-green-700">
        {children}
      </h2>
    );
  };
  Titles.propTypes = {
    children: propTypes.string,
  };

  return (
    <article className="w-full h-full flex flex-col items-center bg-gray-300/20 rounded-lg py-20">
      <Link
        className="border-2 p-2 border-green-500 rounded-lg bg-green-100 mb-20"
        to={"/products"}
      >
        {" "}
        Volver a los productos
      </Link>
      <h2 className="font-bold text-3xl mb-5  text-green-700">{productName}</h2>
      <img
        src={`${url}`}
        alt={`${productName}`}
        className="rounded-xl border-2 border-green-700  w-[40vmax]  object-cover  mb-10"
      />
      <div className="flex flex-col gap-5 px-5 lg:w-[40vmax] text-center">
        <p className="">{}</p>
        <Titles>Descripción</Titles>
        <p>{descripcion}</p>

        <Titles>Caracteristicas</Titles>
        <ListRendering propiedad={caracteristicas} />
        <Titles>Usos</Titles>
        <ListRendering propiedad={usos} />
        <Titles>Colores</Titles>
        <ListRendering propiedad={colores} />
      </div>
    </article>
  );
};

const ListRendering = ({ propiedad }) => {
  return (
    // <h1></h1>
    <ul className="list-disc text-start ">
      {propiedad
        ? propiedad.map((prop, i) => {
            return (
              <li key={i} className="mb-5">
                {prop}
              </li>
            );
          })
        : null}
    </ul>
  );
};

ListRendering.propTypes = {
  propiedad: propTypes.array.isRequired,
};
