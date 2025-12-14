"use client"

import { useContext, useState } from "react"
import { AuthContext } from "../context/AuthContext"
import { Sidebar } from "../components/Sidebar"
import { Header } from "../components/Header"
import { DashboardHome } from "../pages/DashboardHome"
import { PacientesPage } from "../pages/PacientesPage"
import { AgendaPage } from "../pages/AgendaPage"
import { HistoriaClinicaPage } from "../pages/HistoriaClinicaPage"
import { CotizacionesPage } from "../pages/CotizacionesPage"
import { SalaEsperaPage } from "../pages/SalaEsperaPage"
import { ProgramacionQuirurgicaPage } from "../pages/ProgramacionQuirurgicaPage"
import { PlanQuirurgicoPage } from "../pages/PlanQuirurgicoPage"
import { OrdenExamenesPage } from "../pages/OrdenExamenesPage"
import { UsuariosPage } from "@/pages/UsuariosPage"

type CurrentPage =
  | "home"
  | "pacientes"
  | "agenda"
  | "historia"
  | "cotizaciones"
  | "sala-espera"
  | "programacion"
  | "plan"
  | "ordenExamen"
  | "usuarios"

export function DashboardLayout() {
  const auth = useContext(AuthContext)
  const [currentPage, setCurrentPage] = useState<CurrentPage>("home")

  if (!auth) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={auth.user} onNavigate={(page) => setCurrentPage(page as CurrentPage)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={auth.user} onLogout={auth.logout} />
        <main className="flex-1 overflow-auto">
          {currentPage === "home" && <DashboardHome user={auth.user} hasPermission={auth.hasPermission} />}
          {currentPage === "pacientes" && <PacientesPage />}
          {currentPage === "usuarios" && <UsuariosPage />}
          {currentPage === "agenda" && <AgendaPage />}
          {currentPage === "historia" && <HistoriaClinicaPage />}
          {currentPage === "cotizaciones" && <CotizacionesPage />}
          {currentPage === "sala-espera" && <SalaEsperaPage />}
          {currentPage === "programacion" && <ProgramacionQuirurgicaPage />}
          {currentPage === "plan" && <PlanQuirurgicoPage />}
          {currentPage === "ordenExamen" && <OrdenExamenesPage />} {/* ← CAMBIA ESTA LÍNEA */}
        </main>
      </div>
    </div>
  )
}