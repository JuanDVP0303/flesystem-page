import { Slider } from "./Slider";
import { NavLink } from "react-router-dom";
import About from "./About/About";
import Contact from "../Contact/Contact";
import flesystemCompleteLogo from "/510.png";
import enterpriseImage from "/656.jpg";

export default function Home() {
  return (
    <main className="">
      {/* Parte superior, hero */}
      <figure className="h-auto w-full flex justify-center items-center gap-10 flex-col relative pt-20 bg-gradient-to-r from-[#1e3c72] to-[#2974f5]  ">
        <img
          src={enterpriseImage}
          className="empresa md:w-[40%]"
          alt=""
        />
        <img
          src={flesystemCompleteLogo}
          className="w-[90%] md:w-[40%]  object-contain relative"
          alt=""
        />
        <p className="text-white max-w-sm text-sm text-center font-bold">
          La elección más inteligente en flejes plásticos en Venezuela
        </p>
        <NavLink
          className={({ isActive }) => {
            const isActive2 = isActive ? "active" : "text-white";
            return `${isActive2} p-2 mb-5 bg-green-700 rounded-md active:scale-105 transition-all hover:bg-green-900 hover:scale-110`;
          }}
          to={"/products"}
        >
          Productos
        </NavLink>
      </figure>

      {/* Slider y parte de nosotros */}
      <Slider />
      <About />
      <hr className="w-[80%] m-m-0-auto bg-green-700 h-1 mt-20 mb-20" />
      <Contact />
    </main>
  );
}
