"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, Loader2, RefreshCw } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { ProcedimientoForm } from "../components/ProcedimientoForm"
import { ProcedimientoModal } from "../components/ProcedimientoModal"
import { AdicionalForm } from "../components/AdicionalForm"
import { AdicionalModal } from "../components/AdicionalModal"
import { OtroAdicionalForm } from "../components/OtroAdicionalForm"
import { OtroAdicionalModal } from "../components/OtroAdicionalModal"
import { api, transformBackendToFrontend, handleApiError } from "../lib/api"

export interface ItemBase {
  id: string
  nombre: string
  precio: number
}

type Tab = "procedimientos" | "adicionales" | "otros"

export function ProcedimientosPage() {
  const [tab, setTab] = useState<Tab>("procedimientos")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [procedimientos, setProcedimientos] = useState<ItemBase[]>([])
  const [adicionales, setAdicionales] = useState<ItemBase[]>([])
  const [otros, setOtros] = useState<ItemBase[]>([])

  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<ItemBase | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const dataMap = {
    procedimientos: [procedimientos, setProcedimientos],
    adicionales: [adicionales, setAdicionales],
    otros: [otros, setOtros],
  } as const

  const [data, setData] = dataMap[tab]

  const buttonLabel = {
    procedimientos: "Nuevo Procedimiento",
    adicionales: "Nuevo Adicional",
    otros: "Nuevo Otro Adicional",
  }[tab]

  // Cargar datos iniciales
  useEffect(() => {
    fetchData()
  }, [tab])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log(`Cargando datos de ${tab}...`)
      
      switch (tab) {
        case "procedimientos":
          const procedimientosData = await api.getCatalogoProcedimientos()
          console.log("Datos de procedimientos recibidos:", procedimientosData)
          
          // Procesar la respuesta según el formato esperado
          let procsArray: any[] = []
          if (Array.isArray(procedimientosData)) {
            procsArray = procedimientosData
          } else if (procedimientosData && typeof procedimientosData === 'object') {
            if (procedimientosData.procedimientos) {
              procsArray = procedimientosData.procedimientos
            } else if (procedimientosData.data) {
              procsArray = procedimientosData.data
            } else {
              // Intentar extraer cualquier array del objeto
              const keys = Object.keys(procedimientosData)
              for (const key of keys) {
                if (Array.isArray(procedimientosData[key])) {
                  procsArray = procedimientosData[key]
                  break
                }
              }
            }
          }
          
          const formattedProcs = procsArray.map((item: any) => ({
            id: item.id?.toString() || crypto.randomUUID(),
            nombre: item.nombre || item.Nombre || "",
            precio: parseFloat(item.precio || item.Precio || item.precio_base || 0)
          }))
          
          console.log("Procedimientos formateados:", formattedProcs)
          setProcedimientos(formattedProcs)
          break

        case "adicionales":
          const adicionalesData = await api.getAdicionales()
          console.log("Datos de adicionales recibidos:", adicionalesData)
          
          let addArray: any[] = []
          if (Array.isArray(adicionalesData)) {
            addArray = adicionalesData
          } else if (adicionalesData && typeof adicionalesData === 'object') {
            if (adicionalesData.adicionales) {
              addArray = adicionalesData.adicionales
            } else if (adicionalesData.data) {
              addArray = adicionalesData.data
            } else {
              const keys = Object.keys(adicionalesData)
              for (const key of keys) {
                if (Array.isArray(adicionalesData[key])) {
                  addArray = adicionalesData[key]
                  break
                }
              }
            }
          }
          
          const formattedAdds = addArray.map((item: any) => ({
            id: item.id?.toString() || crypto.randomUUID(),
            nombre: item.nombre || item.Nombre || "",
            precio: parseFloat(item.precio || item.Precio || 0)
          }))
          
          console.log("Adicionales formateados:", formattedAdds)
          setAdicionales(formattedAdds)
          break

        case "otros":
          const otrosData = await api.getOtrosAdicionales()
          console.log("Datos de otros adicionales recibidos:", otrosData)
          
          let otrosArray: any[] = []
          if (Array.isArray(otrosData)) {
            otrosArray = otrosData
          } else if (otrosData && typeof otrosData === 'object') {
            if (otrosData.otros_adicionales) {
              otrosArray = otrosData.otros_adicionales
            } else if (otrosData.data) {
              otrosArray = otrosData.data
            } else {
              const keys = Object.keys(otrosData)
              for (const key of keys) {
                if (Array.isArray(otrosData[key])) {
                  otrosArray = otrosData[key]
                  break
                }
              }
            }
          }
          
          const formattedOtros = otrosArray.map((item: any) => ({
            id: item.id?.toString() || crypto.randomUUID(),
            nombre: item.nombre || item.Nombre || "",
            precio: parseFloat(item.precio || item.Precio || 0)
          }))
          
          console.log("Otros adicionales formateados:", formattedOtros)
          setOtros(formattedOtros)
          break
      }
    } catch (err: any) {
      console.error(`Error cargando datos de ${tab}:`, err)
      const errorMessage = handleApiError(err)
      setError(errorMessage)
      
      // Si el endpoint no existe, mostrar datos vacíos
      if (err.message.includes("404") || err.message.includes("No encontrado")) {
        console.log(`Endpoint para ${tab} no existe aún, mostrando lista vacía`)
        setData([]) // Inicializar array vacío
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Función para refrescar datos manualmente
  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
  }

  const handleSave = async (item: Omit<ItemBase, "id">) => {
    try {
      console.log(`Guardando ${tab}:`, item)
      
      if (editingId) {
        // Actualizar
        const idNumber = parseInt(editingId.trim())
        if (isNaN(idNumber)) {
          alert("ID inválido para actualización")
          return
        }

        const dataToSend = {
          nombre: item.nombre,
          precio: item.precio
        }

        let response: any
        switch (tab) {
          case "procedimientos":
            response = await api.updateCatalogoProcedimiento(idNumber, dataToSend)
            break
          case "adicionales":
            response = await api.updateAdicional(idNumber, dataToSend)
            break
          case "otros":
            response = await api.updateOtroAdicional(idNumber, dataToSend)
            break
        }

        console.log("Respuesta de actualización:", response)

        // Después de actualizar, refrescar datos automáticamente
        await refreshData()
        
        setEditingId(null)
      } else {
        // Crear nuevo
        const dataToSend = {
          nombre: item.nombre,
          precio: item.precio
        }

        let newItem: any
        switch (tab) {
          case "procedimientos":
            newItem = await api.createCatalogoProcedimiento(dataToSend)
            break
          case "adicionales":
            newItem = await api.createAdicional(dataToSend)
            break
          case "otros":
            newItem = await api.createOtroAdicional(dataToSend)
            break
        }

        console.log("Respuesta de creación:", newItem)

        // Después de crear, refrescar datos automáticamente
        await refreshData()
      }
      setShowForm(false)
      setSelected(null)
    } catch (err: any) {
      console.error("Error guardando:", err)
      alert(handleApiError(err))
    }
  }

  const handleEdit = (item: ItemBase) => {
    console.log("Editando item:", item)
    setSelected(item)
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro?")) return

    try {
      // Validar y convertir el ID
      const idNumber = parseInt(id.trim())
      
      // Verificar que sea un número válido
      if (isNaN(idNumber)) {
        console.error("ID inválido:", id)
        alert("ID inválido. Por favor, recarga la página e intenta nuevamente.")
        return
      }

      console.log(`Eliminando ${tab} con ID:`, idNumber)

      let response: any
      switch (tab) {
        case "procedimientos":
          response = await api.deleteCatalogoProcedimiento(idNumber)
          break
        case "adicionales":
          response = await api.deleteAdicional(idNumber)
          break
        case "otros":
          response = await api.deleteOtroAdicional(idNumber)
          break
      }

      console.log("Respuesta de eliminación:", response)

      // **SOLUCIÓN: Refrescar datos automáticamente después de eliminar**
      await refreshData()
      
      // Mostrar mensaje de éxito
      alert("Registro eliminado exitosamente")
      
    } catch (err: any) {
      console.error("Error eliminando:", err)
      const errorMessage = handleApiError(err)
      
      // **MEJORA: Si hay error pero probablemente fue eliminado, refrescar datos igualmente**
      if (errorMessage.includes("404") || errorMessage.includes("No encontrado") || errorMessage.includes("eliminado")) {
        // Refrescar datos para sincronizar con el backend
        await refreshData()
        alert("Registro eliminado exitosamente")
      } else {
        alert(`Error al eliminar: ${errorMessage}`)
      }
    }
  }

  const openNewForm = () => {
    console.log("Abriendo nuevo formulario para", tab)
    setSelected(null)
    setEditingId(null)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    console.log("Cerrando formulario")
    setShowForm(false)
    setSelected(null)
    setEditingId(null)
    refreshData() // Refrescar datos automáticamente
  }

  const handleTabChange = (newTab: Tab) => {
    console.log("Cambiando tab a:", newTab)
    setTab(newTab)
    setSelected(null)
    setShowForm(false)
    setEditingId(null)
  }

  return (
    <ProtectedRoute permissions={["ver_procedimientos"]}>
      <div className="p-8">

        {/* HEADER */}
        <div className="flex justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Procedimientos</h1>
            <p className="text-gray-600">Gestiona el catálogo médico</p>
          </div>

          <div className="flex gap-2">
            {/* Botón de refrescar */}
            <button
              onClick={refreshData}
              disabled={loading || refreshing}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar datos"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refrescando..." : "Refrescar"}
            </button>

            {/* Botón de nuevo */}
            <button
              onClick={openNewForm}
              className="flex items-center gap-2 bg-[#1a6b32] text-white px-4 py-2 rounded-lg hover:bg-[#155a27] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || refreshing}
            >
              <Plus size={18} />
              {buttonLabel}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6">
          {[
            { key: "procedimientos", label: "Procedimientos" },
            { key: "adicionales", label: "Adicionales" },
            { key: "otros", label: "Otros adicionales" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key as Tab)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tab === t.key 
                  ? "bg-[#1a6b32] text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={loading || refreshing}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* MENSAJES DE ERROR/CARGA */}
        {(loading || refreshing) && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a6b32]" />
            <span className="ml-2 text-gray-600">
              {refreshing ? "Refrescando datos..." : "Cargando datos..."}
            </span>
          </div>
        )}

        {error && !loading && !refreshing && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-700 font-medium">Error al cargar datos</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={refreshData}
                  className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                  disabled={refreshing}
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABLE */}
        {!loading && !refreshing && !error && (
          <>
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">#</th>
                    <th className="px-6 py-3 text-left">Nombre</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No hay {tab} registrados
                        <button
                          onClick={refreshData}
                          className="mt-2 block mx-auto text-sm text-[#1a6b32] hover:underline"
                        >
                          Refrescar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    data.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={`border-t hover:bg-gray-50 transition-colors ${
                          selected?.id === item.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelected(item)}
                      >
                        <td className="px-6 py-4">{index + 1}</td>
                        <td className="px-6 py-4 font-medium">{item.nombre}</td>
                        <td className="px-6 py-4 text-right">
                          {item.precio === 0 ? "Incluido" : `$${item.precio.toLocaleString("es-CO")}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(item)
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                              disabled={refreshing}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(item.id)
                              }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                              disabled={refreshing}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Contador de items y botón de refrescar */}
            <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
              <span>
                Mostrando {data.length} {tab}
              </span>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-1 text-[#1a6b32] hover:underline disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refrescando..." : "Refrescar datos"}
              </button>
            </div>
          </>
        )}

        {/* FORMS */}
        {showForm && tab === "procedimientos" && (
          <ProcedimientoForm
            procedimiento={selected || undefined}
            onSave={handleSave}
            onClose={handleCloseForm}
          />
        )}

        {showForm && tab === "adicionales" && (
          <AdicionalForm
            adicional={selected || undefined}
            onSave={handleSave}
            onClose={handleCloseForm}
          />
        )}

        {showForm && tab === "otros" && (
          <OtroAdicionalForm
            otroAdicional={selected || undefined}
            onSave={handleSave}
            onClose={handleCloseForm}
          />
        )}

        {/* MODALS */}
        {selected && !showForm && tab === "procedimientos" && (
          <ProcedimientoModal
            procedimiento={selected}
            onClose={() => setSelected(null)}
            onEdit={() => handleEdit(selected)}
          />
        )}

        {selected && !showForm && tab === "adicionales" && (
          <AdicionalModal
            adicional={selected}
            onClose={() => setSelected(null)}
            onEdit={() => handleEdit(selected)}
          />
        )}

        {selected && !showForm && tab === "otros" && (
          <OtroAdicionalModal
            otroAdicional={selected}
            onClose={() => setSelected(null)}
            onEdit={() => handleEdit(selected)}
          />
        )}

      </div>
    </ProtectedRoute>
  )
}