import React from "react"
import ReactDOM from "react-dom/client"
import App from "./pages/_app"
import "./index.css"
import type { NextComponentType } from 'next'

const mockRouter = {
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  push: async () => true,
  replace: async () => true,
  reload: () => {},
  back: () => {},
  prefetch: async () => {},
  beforePopState: () => {},
  events: {
    on: () => {},
    off: () => {},
    emit: () => {}
  },
  isFallback: false,
  isReady: true,
  isPreview: false,
  basePath: '',
  locale: undefined,
  locales: undefined,
  defaultLocale: undefined,
  domainLocales: undefined,
  isLocaleDomain: false
} as any

const MockComponent: NextComponentType = () => {
  return (
    <div>
      <h1>Hernán Ignacio Córdoba</h1>
      <p>Cirugía Plástica - Sistema de Gestión</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App 
      Component={MockComponent}
      pageProps={{}}
      router={mockRouter}
    />
  </React.StrictMode>,
)