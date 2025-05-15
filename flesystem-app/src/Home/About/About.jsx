import { useEffect } from "react";
import { useState } from "react";
import { productDataUrl } from "../../data";
import { MisionVision } from "./MisionVision";
import { Link } from "react-router-dom";
import enterpriseImage from "../../../public/656.jpg";
import flejes from "../../../public/flejes.jpg";
export default function About() {
  return (
    <>
      <AboutOne />
      <Catalogo />
      <AboutTwo />
    </>
  );
}

const AboutOne = () => {
  return (
    <>
      <h2 className="font-bold text-5xl text-center text-green-700 pb-6 pt-6">
        Nosotros
      </h2>
      <article className="flex flex-col md:flex-row-reverse justify-center mt-12 mb-12 ml-5 mr-5 ">
        <img
          className=""
          src="https://www.transpakcorp.com/images/index/logo.png"
          alt=""
        />

        <p className="min-w-min  max-w-lg">
          <span className="font-bold">FLESYSTEM®</span> es una empresa
          venezolana con más de 30 años de experiencia en la fabricación y
          comercialización de materiales y equipos para embalar, incluyendo,
          entre otros; flejes plásticos, grapas metálicas, máquinas flejadoras
          manuales, semi-automáticas y automáticas
        </p>
      </article>
    </>
  );
};

const AboutTwo = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    window.addEventListener("resize", () => {
      setWindowWidth(window.innerWidth);
    });
  }, [windowWidth]);

  return (
    <main className=" pt-14">
      <section className="ml-5 mr-5">
        <figure className="flex justify-center">
          <img
            src={enterpriseImage}
            className="w-full md:object-cover md:w-[90%]"
            alt=""
          />
        </figure>
        <article className="flex flex-col md:flex-row md:pt-7 gap-5 items-center md:justify-center ">
          <div className="bg-gray-300 rounded-xl p-5">
            <p className="mt-5 max-w-md">
              Establecida en la ciudad de Maracay ¡
              <span className="font-bold">FLESYSTEM®</span> elabora flejes
              plástico bajo los más estrictos procedimientos de calidad{" "}
              {windowWidth > 400
                ? "para ofrecer un producto de insuperables  características preferido por las grandes empresas del sector de empaque."
                : null}
              <br />
              <br />
              <span className="font-bold">FLESYSTEM®</span> ofrece soluciones
              integrales en empaque, que van desde la selección de equipos,
              máquinas automáticas, insumos, servicios de instalación y
              mantenimiento, asi como permanente soporte y asistencia técnica
            </p>
          </div>
          <img
            src={flejes}
            className="h-96 w-[95%] md:max-w-[50%] rounded-xl"
            alt=""
          />
        </article>
        <MisionVision />
      </section>
    </main>
  );
};

const Catalogo = () => {
  return (
    <div className="bg-[#1e3c72] text-white p-8 m-m-0-auto">
      <h2 className="font-bold text-center ">¡Observa nuestro catálogo!</h2>
      <article className="flex lg:justify-center overflow-x-scroll lg:overflow-hidden gap-5 h-auto  w-full relative">
        {productDataUrl.map((imgData, index) => {
          return (
            <div className="mt-10 flex flex-col white  w-[150px]" key={index}>
              <h2 className="ml-2 truncate ">{imgData.productName}</h2>
              <div className={`w-[150px] bg-white h-[150px]`}>
                <img src={`${imgData.url}`} alt={`${imgData.productName}`} />
              </div>
            </div>
          );
        })}        
      </article>
      <div className="flex flex-col items-center pt-5">
      <p className="font-bold">Velos en detalles</p>
      <Link to="/products" className="p-2  bg-green-700 rounded-md active:scale-105 transition-all hover:bg-green-900 hover:scale-110">Productos</Link>
      </div>
    </div>
  );
};
