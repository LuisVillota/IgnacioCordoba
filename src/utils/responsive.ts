export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    checkResponsive()
    window.addEventListener('resize', checkResponsive)
    
    return () => {
      window.removeEventListener('resize', checkResponsive)
    }
  }, [])

  return { isMobile, isTablet }
}

// Clases de Tailwind CSS recomendadas para responsive:
// - Para contenedores: p-4 md:p-6 lg:p-8
// - Para grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
// - Para textos: text-sm md:text-base lg:text-lg
// - Para márgenes: m-2 md:m-4 lg:m-6