import { Box, Card } from "@mui/material";
import Login from "./Login";
import Register from "./Register";
import avatar from "/images/avatars/avatar_login.jpg";
import background from "/background_login.jpg";
import { Logo } from "../components/icons/Logo";
import flesystemLogo from "/Logo2.png";
//importar el background image del public
// import background from "..//images/";
function Auth() {
  const pathname = window.location.pathname;
  return (
    <Box className="h-screen">
    <Card className="w-full flex h-full" sx={{
      // display:"flex",
      // justifyContent:"center",
    }}>
      <Box className="boxAuth flex flex-1 ">
        <div className="flex-1 flex flex-col overflow-y-auto p-3 w-full">
          <Logo medium />
          <div className="flex justify-center mt-2">
          <img src={flesystemLogo} className='bg-green-900 p-1 rounded-full m-1' alt="" />

          {/* <img src={avatar} alt="avatar" className="object-cover w-20 h-20 rounded-full" /> */}
          </div>
        {pathname == "/login" ? <Login /> : <Register />}
        </div>
        <div className='hidden md:flex justify-center items-center flex-1' style={
          {backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center"}
        } >
        </div>
      </Box>
    </Card>
    </Box>
  );
}

export default Auth;
