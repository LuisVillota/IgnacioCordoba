"use client"

import { X } from "lucide-react"
import type { Cotizacion } from "../pages/CotizacionesPage"
import type { Paciente } from "../pages/PacientesPage"
import { useState } from "react";




interface ConfirmarPagoModalProps {
  cotizacion: Cotizacion
  paciente?: Paciente
  onClose: () => void
  
}

const getCardColor = (numero: string) => {
  const clean = numero.replace(/\s+/g, "");

  if (/^4/.test(clean)) {
    return "from-blue-300 to-blue-500"; // VISA
  }

  if (/^(5[1-5])/.test(clean)) {
    return "from-red-300 to-red-500"; // MASTERCARD
  }

  if (/^3[47]/.test(clean)) {
    return "from-purple-300 to-purple-500"; // AMEX
  }

  if (clean.length >= 4) {
    return "from-gray-300 to-gray-500"; // otro tipo o desconocido
  }

  return "from-gray-200 to-gray-300"; // vacío por defecto
};


export function ConfirmarPagoModal({ cotizacion, paciente, onClose }: ConfirmarPagoModalProps) {
 
    const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [cvc, setCvc] = useState("");


  return (
   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 max-h-[95vh]">
  <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8">
    
    {/* Header */}
    <div className="flex items-center justify-between border-b pb-3 mb-4">
      <h2 className="text-xl font-bold text-gray-800">
        Confirmar Pago
      </h2>
      <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
        <X size={20} />
      </button>
    </div>

    {/* CONTENIDO */}
    <div className="space-y-4">
      <p className="text-gray-700 text-sm">
        Estás a punto de registrar un pago para la cotización:
      </p>

      <div className="bg-gray-100 rounded-lg p-3">
        <p className="text-sm text-gray-800">
          <strong>Paciente:</strong> {paciente?.nombres} {paciente?.apellidos}
        </p>
        <p className="text-sm text-gray-800">
          <strong>Cotización:</strong> CZ-{cotizacion.id}
        </p>
        <p className="text-sm text-gray-800">
          <strong>Total a pagar:</strong> ${cotizacion.total.toLocaleString("es-CO")}
        </p>
      </div>

      

      <div className="bg-gray-100 rounded-lg p-3">
        
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            
                

            {/* TARJETA */}
            <div className="flex justify-center">
<div
  className={`
    w-[320px] h-[200px] rounded-xl shadow-lg relative p-5 
    bg-gradient-to-br 
    ${getCardColor(numero)}
  `}
>
                {/* Chip */}
                <div className="w-10 h-7 bg-gray-400 rounded-sm mb-4"></div>

                {/* Número de tarjeta */}
                <div className="text-lg tracking-widest text-gray-700 mb-6">
                    {numero !== "" ? numero : "●●●● ●●●● ●●●● ●●●●"}
                </div>

                {/* Fecha */}
                <div className="text-sm text-gray-600 mb-6">
                    {fecha !== "" ? fecha : "MM / YYYY"}
                </div>

                {/* Nombre */}
                <div className="text-gray-700 font-semibold">
                    {nombre !== "" ? nombre.toUpperCase() : "FULL NAME"}
                </div>
                </div>
            </div>

            {/* FORMULARIO */}
            <div className="space-y-3">

                <div>
                <label className="block text-sm font-medium text-gray-700">Numero de la Tarjeta</label>
                <input
                    type="text"
                    maxLength={19}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del titular</label>
                <input
                    type="text"
                    maxLength={30}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de expiración</label>
                <input
                    type="month"
                    placeholder="MM / YYYY"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700">Numero de Seguridad</label>
                <input 
                    type="text"
                    maxLength={3}
                    placeholder="CVC"
                    className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
                />
                </div>

            </div>

            </div>
      
      </div>

      <button
        onClick={() => {
          alert("Pago registrado correctamente (aquí agregas tu lógica real)")
          onClose()
        }}
        className="w-full bg-[#1a6b32] hover:bg-[#155529] text-white py-2 rounded-lg font-semibold transition"
      >
        Registrar Pago por : ${cotizacion.total.toLocaleString("es-CO")}
      </button>
    </div>

  </div>
</div>

  )
}
