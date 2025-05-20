import L from "leaflet";
import emailjs from "@emailjs/browser";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Paragraph } from "../Layouts/Footer";
import "leaflet/dist/leaflet.css";

const MapView = () => {
  return (
    <section className="flex flex-col  justify-start items-center md:justify-center md:items-start md:flex-row gap-12 h-auto ">
      <div className="w-screen map-container ">
        <MapContainer
          center={{ lat: "10.2389401", lng: "-67.6081559" }}
          zoom={13}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker
            position={{ lat: "10.23541473281838", lng: "-67.62270990189339" }}
            icon={L.icon({
              iconUrl:
                "https://raw.githubusercontent.com/Leaflet/Leaflet/87c4fab0ac8f767daf6bacb23f458160e5b94517/src/images/marker.svg",
              iconRetinaUrl:
                "https://raw.githubusercontent.com/Leaflet/Leaflet/87c4fab0ac8f767daf6bacb23f458160e5b94517/src/images/marker.svg",
              iconSize: [40, 40],
            })}
          />
        </MapContainer>
        <UbicationCard/>
      </div>
      <article className="bg-slate-600 md:bg-inherit flex justify-center pt-10 pb-10">
      {/* <Form /> */}
      </article>
    </section>
  );
};

const UbicationCard = () => {
  return (
    <article className="w-[90%] text-center h-auto bg-blue-500 text-white rounded-xl shadow-2xl m-m-0-auto  md:w-[80%] mb-8 p-5">
      <div className="flex gap-5 justify-center items-center mb-8">
        <h1 className="font-bold text-2xl">FLESYSTEM</h1>
        <h2 className="font-bold">Flejes y sistemas C.A</h2>
      </div>
      <Paragraph
        color={"black"}
        content={"Av. Anton Phillps Zona industrial San Vicente , Nro. 22. "}
      />
      <Paragraph
        color={"black"}
        content={"Grupo Industrial San Vicente . Maracay - Edo Aragua."}
      />
      <Paragraph color={"black"} content={"Telfs :+58(414)-1399568"} />
      <Paragraph color={"black"} content={"+58(416)-6276351  "} />
      <Paragraph color={"black"} content={"ventas@flesystem.com"} />
    </article>
  );
};

function Form() {
  const [sent, setSent] = useState(false);
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();
  const [disabledButton, setDisabledButton] = useState(false);

  const onSubmit = handleSubmit(
    ({ Nombre, Apellido, Email, Asunto, Mensaje }) => {
      if (Object.keys(errors).length == 0) disableButton();
      setSent(true);

      let templateParams = {
        from_name: "Flesystem",
        user_name: Nombre,
        user_lastname: Apellido,
        user_email: Email,
        user_affair: Asunto,
        message: Mensaje,
      };

      emailjs.send(
        "service_py9yli5",
        "template_anovkyc",
        templateParams,
        "3FZVw7vBbNbiD_K-I"
      );
    }
  );

  const disableButton = () => {
    setDisabledButton(true);
  };
  const inputsArray = ["Nombre", "Apellido", "Email", "Asunto"]
  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col justify-center items-center gap-4 w-[90%] bg-green-500 rounded-xl p-5 lg:mr-10 "
      >
      
      <div className="flex flex-col text-white p-5 text-center">
          <h2 className="text-xl">Contáctenos</h2>
          <p className="font-light">
            Le invitamos a realizar sus comentarios, consultas o sugerencias,
            completando el siguiente formulario.
          </p>
        </div>
            {inputsArray.map((category, id) => {
              return <div key={id} className="md:w-[50%] w-[90%] text-center">
              <label className="text-white" htmlFor={category}>
                {category}
              </label>
    
              <input
                type="text"
                className="rounded-md"
                name={category}
                autoComplete="off"
                {...register(category, {
                  required: {
                    value: true,
                    message: `${category} es requerida`,
                  },
                  maxLength: 20,
                  
                })}
              />

          {errors[`${category}`] && <span className="text-red-600">{errors[`${category}`].message}</span>}
            </div>
            })}
            <div className="flex flex-col w-full justify-center items-center  ">
            <label htmlFor="mensaje" className="text-white text-start">Mensaje</label>
            <textarea name="" id="mensaje" cols="30" rows="2" className="md:w-[50%] max-h-[150px] w-[90%] rounded-md"/>
            </div>
        <button
          disabled={disabledButton}
          type="submit"
          className="bg-white p-4 border-none w-28 h-auto active:scale-95 rounded-md "
        >
          {sent ? "¡Enviado!" : "Enviar"}
        </button>

        {sent && (
          <p className="text-white max-w-sm text-center pt-5">
            Muchas gracias por enviarnos un mensaje! te atenderemos a la
            brevedad posible
          </p>
        )}
      </form>
    </>
  );
}


export default function Contact() {
  return (
    <div className="">
      <h2 className="text-5xl font-bold text-green-600 text-center pb-20 underline ">
        Ubicanos!
      </h2>
      <MapView />
    </div>
  );
}

