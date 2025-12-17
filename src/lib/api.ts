const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Cliente HTTP reutilizable
export const fetchAPI = async (endpoint: string, options?: RequestInit) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  console.log(`📤 API Request: ${API_URL}${endpoint}`, { 
    method: options?.method || 'GET',
    body: options?.body ? JSON.parse(options.body as string) : undefined
  });
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      ...options,
    });
    
    console.log(`📥 API Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.error('❌ Error data from backend (RAW):', errorData);
        
        // FastAPI devuelve errores de validación como {detail: [...]} o {detail: string}
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Es un array de errores de validación de Pydantic
            errorMessage = errorData.detail.map((err: any) => {
              if (typeof err === 'object' && err.msg) {
                const field = err.loc?.join('.') || 'campo';
                return `${field}: ${err.msg}`;
              }
              return String(err);
            }).join(', ');
          } else if (typeof errorData.detail === 'string') {
            // Es un string simple
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
        
        console.error('❌ API Error parsed:', errorMessage);
      } catch (jsonError) {
        console.error('❌ Error parsing JSON:', jsonError);
        // Si no se puede parsear como JSON, intentar como texto
        try {
          const text = await response.text();
          if (text) {
            errorMessage = text;
            console.error('❌ Error text:', text);
          }
        } catch {
          // Si falla todo, usar el mensaje por defecto
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    console.log(`✅ API Success:`, responseData);
    return responseData;
  } catch (error) {
    console.error('❌ API Fetch Error:', error);
    throw error;
  }
};

// Helper para convertir archivo a base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Funciones específicas de la API
export const api = {
  // ===== AUTH =====
  login: (username: string, password: string) => {
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    return fetchAPI(`/api/login?username=${encodedUsername}&password=${encodedPassword}`);
  },
  
  // ===== USUARIOS =====
  getUsuarios: () => fetchAPI('/api/usuarios'),
  getUsuario: (id: number) => fetchAPI(`/api/usuarios/${id}`),
  
  // ===== PACIENTES =====
  getPacientes: (limit?: number, offset?: number) => 
    fetchAPI(`/api/pacientes?limit=${limit || 100}&offset=${offset || 0}`),
  getPaciente: (id: number) => fetchAPI(`/api/pacientes/${id}`),
  createPaciente: (data: any) => 
    fetchAPI('/api/pacientes', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  updatePaciente: (id: number, data: any) =>
    fetchAPI(`/api/pacientes/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  deletePaciente: (id: number) =>
    fetchAPI(`/api/pacientes/${id}`, { method: 'DELETE' }),
  
  // ===== CITAS =====
  getCitas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/citas?limit=${limit || 100}&offset=${offset || 0}`),
  getCita: (id: number) => fetchAPI(`/api/citas/${id}`),
  createCita: (data: any) => fetchAPI('/api/citas', { method: 'POST', body: JSON.stringify(data) }),
  updateCita: (id: number, data: any) => fetchAPI(`/api/citas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCita: (id: number) => fetchAPI(`/api/citas/${id}`, { method: 'DELETE' }),
  
  // ===== HISTORIA CLÍNICA =====
  getHistoriasClinicas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/historias-clinicas?limit=${limit || 100}&offset=${offset || 0}`),
  
  getHistoriasByPaciente: async (pacienteId: number) => {
    console.log(`📋 Obteniendo historias para paciente ${pacienteId}...`);
    
    try {
      // Intentar endpoint específico primero
      return await fetchAPI(`/api/historias-clinicas/paciente/${pacienteId}`);
    } catch (error) {
      console.log(`⚠️ Endpoint específico falló, usando endpoint general para paciente ${pacienteId}`);
      const allHistorias = await api.getHistoriasClinicas(100, 0);
      
      // Filtrar por paciente_id
      if (Array.isArray(allHistorias.historias)) {
        return allHistorias.historias.filter((historia: any) => {
          const matches = historia.paciente_id === pacienteId;
          console.log(`🔍 Historia ${historia.id}: paciente_id=${historia.paciente_id}, matches=${matches}`);
          return matches;
        });
      }
      
      return [];
    }
  },
  
  getHistoriaClinica: (id: number) => fetchAPI(`/api/historias-clinicas/${id}`),
  
  createHistoriaClinica: (data: any) => {
    console.log("📤 Creando historia clínica con datos:", data);
    
    const backendData = {
      paciente_id: parseInt(data.paciente_id || data.id_paciente),
      motivo_consulta: data.motivo_consulta || '',
      antecedentes_medicos: data.antecedentes_medicos || '',
      antecedentes_quirurgicos: data.antecedentes_quirurgicos || '',
      antecedentes_alergicos: data.antecedentes_alergicos || '',
      antecedentes_farmacologicos: data.antecedentes_farmacologicos || '',
      exploracion_fisica: data.exploracion_fisica || '',
      diagnostico: data.diagnostico || '',
      tratamiento: data.tratamiento || '',
      recomendaciones: data.recomendaciones || '',
      fotos: ""  // Inicialmente vacío, las fotos se suben después
    };
    
    console.log("📤 Enviando al backend:", backendData);
    
    return fetchAPI('/api/historias-clinicas', {
      method: 'POST',
      body: JSON.stringify(backendData)
    });
  },
  
  updateHistoriaClinica: (id: number, data: any) => {
    console.log("📤 Actualizando historia clínica ID:", id, "con datos:", data);
    
    const backendData = {
      paciente_id: parseInt(data.paciente_id || data.id_paciente),
      motivo_consulta: data.motivo_consulta || '',
      antecedentes_medicos: data.antecedentes_medicos || '',
      antecedentes_quirurgicos: data.antecedentes_quirurgicos || '',
      antecedentes_alergicos: data.antecedentes_alergicos || '',
      antecedentes_farmacologicos: data.antecedentes_farmacologicos || '',
      exploracion_fisica: data.exploracion_fisica || '',
      diagnostico: data.diagnostico || '',
      tratamiento: data.tratamiento || '',
      recomendaciones: data.recomendaciones || '',
    };
    
    console.log("📤 Enviando al backend:", backendData);
    
    return fetchAPI(`/api/historias-clinicas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendData)
    });
  },
  
  deleteHistoriaClinica: async (id: number) => {
    console.log(`🗑️ Eliminando historia clínica ID: ${id}`)
    
    try {
      const response = await fetch(`${API_URL}/api/historias-clinicas/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      })
      
      console.log(`📥 Delete response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        
        // Si es 404, no lanzar error crítico
        if (response.status === 404) {
          console.log(`ℹ️ Historia ${id} no encontrada (posiblemente ya eliminada)`)
          return { success: true, message: "Historia ya eliminada" }
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log(`✅ Historia eliminada exitosamente:`, responseData);
      return responseData;
    } catch (error) {
      console.error('❌ Error eliminando historia:', error);
      throw error;
    }
  },
  
  // ===== SUBIDA DE ARCHIVOS =====
  uploadHistoriaFoto: async (historiaId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    try {
      console.log("📤 Subiendo foto para historia:", historiaId);
      console.log("📁 Detalles del archivo:", {
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size,
        ultimaModificacion: new Date(file.lastModified).toISOString()
      });
      
      // Subir el archivo real
      console.log("🚀 Iniciando upload real...");
      const response = await fetch(`${API_URL}/api/upload/historia/${historiaId}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      
      console.log("📥 Upload response status:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorDetail = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
          console.error("❌ Error detallado:", errorData);
        } catch {
          // Si no se puede parsear como JSON, usar el texto
          try {
            const text = await response.text();
            if (text) {
              errorDetail = text;
              console.error("❌ Error texto:", text);
            }
          } catch {
            // Ignorar
          }
        }
        
        throw new Error(errorDetail);
      }
      
      const result = await response.json();
      console.log("✅ Foto subida exitosamente:", result);
      
      // Convertir URL relativa a absoluta
      if (result.url && result.url.startsWith('/uploads/')) {
        result.url = `${API_URL}${result.url}`;
        console.log("🔗 URL convertida a absoluta:", result.url);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error subiendo foto:', error);
      
      // En desarrollo, usar Data URL como fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ En modo desarrollo, usando Data URL como fallback');
        try {
          const dataUrl = await fileToBase64(file);
          return {
            success: true,
            message: "Foto subida (modo simulación - desarrollo)",
            url: dataUrl,
            filename: file.name
          };
        } catch (base64Error) {
          console.error('❌ Error creando Data URL:', base64Error);
        }
      }
      
      throw error;
    }
  },
  
  // ===== ESTADOS =====
  getEstadosCitas: () => fetchAPI('/api/estados/citas'),
  getEstadosQuirurgicos: () => fetchAPI('/api/estados/quirurgicos'),
  
  // ===== PROCEDIMIENTOS (CONSULTA) =====
getProcedimientos: () => fetchAPI('/api/procedimientos'),
getProcedimiento: (id: number) => fetchAPI(`/api/procedimientos/${id}`),

// ===== PROCEDIMIENTOS (CATÁLOGO) - Verifica los endpoints correctos =====
getCatalogoProcedimientos: () => fetchAPI('/api/procedimientos'),
getCatalogoProcedimiento: (id: number) => fetchAPI(`/api/procedimientos/${id}`),
createCatalogoProcedimiento: (data: any) => 
  fetchAPI('/api/procedimientos', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
updateCatalogoProcedimiento: (id: number, data: any) => 
  fetchAPI(`/api/procedimientos/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
deleteCatalogoProcedimiento: (id: number) => 
  fetchAPI(`/api/procedimientos/${id}`, { method: 'DELETE' }),

// ===== ADICIONALES - Endpoints temporales (crear si no existen) =====
getAdicionales: () => fetchAPI('/api/adicionales'),
getAdicional: (id: number) => fetchAPI(`/api/adicionales/${id}`),
createAdicional: (data: any) => 
  fetchAPI('/api/adicionales', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
updateAdicional: (id: number, data: any) => 
  fetchAPI(`/api/adicionales/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
deleteAdicional: (id: number) => 
  fetchAPI(`/api/adicionales/${id}`, { method: 'DELETE' }),

// ===== OTROS ADICIONALES - Endpoints temporales (crear si no existen) =====
getOtrosAdicionales: () => fetchAPI('/api/otros-adicionales'),
getOtroAdicional: (id: number) => fetchAPI(`/api/otros-adicionales/${id}`),
createOtroAdicional: (data: any) => 
  fetchAPI('/api/otros-adicionales', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
updateOtroAdicional: (id: number, data: any) => 
  fetchAPI(`/api/otros-adicionales/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
deleteOtroAdicional: (id: number) => 
  fetchAPI(`/api/otros-adicionales/${id}`, { method: 'DELETE' }),
  
  // ===== DASHBOARD =====
  async getDashboardStats() {
    try {
      const [pacientesResponse, citasResponse] = await Promise.all([
        this.getPacientes(10000),
        this.getCitas(1000)
      ]);
      
      const totalPacientes = pacientesResponse.pacientes?.length || 0;
      const today = new Date().toISOString().split('T')[0];
      let citasHoy = 0;
      
      if (citasResponse && citasResponse.citas) {
        citasHoy = citasResponse.citas.filter((cita: any) => {
          if (cita.fecha_hora) {
            try {
              const citaDate = new Date(cita.fecha_hora);
              const citaDateStr = citaDate.toISOString().split('T')[0];
              return citaDateStr === today;
            } catch {
              return false;
            }
          }
          return false;
        }).length;
      }
      
      return {
        totalPacientes,
        citasHoy,
        totalCotizaciones: 0,
        ingresosMes: "$0"
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalPacientes: 0,
        citasHoy: 0,
        totalCotizaciones: 0,
        ingresosMes: "$0"
      };
    }
  },
  
  // ===== TEST =====
  testBackend: () => fetchAPI('/api/test-frontend'),
  
  testConnection: async () => {
    try {
      const response = await fetch(`${API_URL}/api/test-frontend`);
      if (!response.ok) {
        return {
          success: false,
          message: `Backend no responde: ${response.status}`,
          status: response.status
        };
      }
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: `Error conectando al backend: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  // ===== DEBUG =====
  debugUploadDir: () => fetchAPI('/api/debug/upload-dir'),
  debugSalaEspera: () => fetchAPI('/api/debug/sala-espera'),
  
  // Nueva función para debug de fotos
  debugHistoriaFotos: async (historiaId: number) => {
    try {
      const historia = await api.getHistoriaClinica(historiaId);
      console.log("🔍 Debug historia fotos:", {
        historiaId,
        rawFotos: historia.fotos,
        parsedFotos: historia.fotos ? historia.fotos.split(',').filter(f => f.trim()) : [],
        urls: historia.fotos ? historia.fotos.split(',').map((url: string) => {
          const trimmed = url.trim();
          return {
            original: trimmed,
            isRelative: trimmed.startsWith('/uploads/'),
            absoluteUrl: trimmed.startsWith('/uploads/') ? `${API_URL}${trimmed}` : trimmed,
            willLoad: trimmed.startsWith('http') || trimmed.startsWith('/uploads/')
          };
        }) : []
      });
      return historia;
    } catch (error) {
      console.error("❌ Debug error:", error);
      throw error;
    }
  },

  // ===== SALA DE ESPERA =====
  getSalaEspera: async (mostrarTodos: boolean = true): Promise<any> => {
    try {
      console.log(`📥 Obteniendo sala de espera, mostrarTodos: ${mostrarTodos}`);
      const response = await fetch(`${API_URL}/api/sala-espera?mostrarTodos=${mostrarTodos}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      });
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error obteniendo sala de espera:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Respuesta sala de espera recibida:", {
        success: data.success,
        total: data.total,
        pacientes: data.pacientes?.length || 0
      });
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo sala de espera:', error);
      // Retornar datos de fallback en lugar de lanzar error
      return {
        success: false,
        pacientes: [],
        total: 0,
        message: 'Error cargando sala de espera: ' + (error instanceof Error ? error.message : 'Error desconocido')
      };
    }
  },

  bulkUpdateEstadosSalaEspera: async (cambios: Record<string, string>): Promise<any> => {
    try {
      console.log("💾 Enviando cambios de estado a sala de espera:", {
        totalCambios: Object.keys(cambios).length,
        cambios: cambios
      });
      
      const response = await fetch(`${API_URL}/api/sala-espera/bulk-estados`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify({ cambios }),
      });
      
      console.log("📥 Respuesta bulk update:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error en bulk update:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Bulk update completado:", {
        success: data.success,
        actualizados: data.actualizados,
        errores: data.errores?.length || 0
      });
      return data;
    } catch (error) {
      console.error('❌ Error actualizando estados:', error);
      throw error;
    }
  },

  getEstadisticasSalaEspera: async (): Promise<any> => {
    try {
      console.log("📊 Obteniendo estadísticas de sala de espera...");
      const response = await fetch(`${API_URL}/api/sala-espera/estadisticas`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      });
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error obteniendo estadísticas:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        // No lanzar error para estadísticas, retornar datos por defecto
        console.warn('⚠️ Usando estadísticas por defecto');
        return {
          success: false,
          estadisticas: {
            total: 0,
            pendientes: 0,
            llegadas: 0,
            confirmadas: 0,
            en_consulta: 0,
            completadas: 0,
            no_asistieron: 0,
            con_cita_hoy: 0,
            sin_cita_hoy: 0,
            tiempo_promedio_espera: 15,
            tiempo_promedio_consulta: 25
          }
        };
      }
      
      const data = await response.json();
      console.log("✅ Estadísticas obtenidas:", data);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      // Retornar estadísticas por defecto en lugar de lanzar error
      return {
        success: false,
        estadisticas: {
          total: 0,
          pendientes: 0,
          llegadas: 0,
          confirmadas: 0,
          en_consulta: 0,
          completadas: 0,
          no_asistieron: 0,
          con_cita_hoy: 0,
          sin_cita_hoy: 0,
          tiempo_promedio_espera: 15,
          tiempo_promedio_consulta: 25
        }
      };
    }
  },

  agregarPacienteSalaEspera: async (pacienteId: string, citaId?: string): Promise<any> => {
    try {
      console.log("➕ Agregando paciente a sala de espera:", { pacienteId, citaId });
      
      const body: any = { paciente_id: parseInt(pacienteId) };
      if (citaId) {
        body.cita_id = parseInt(citaId);
      }
      
      const response = await fetch(`${API_URL}/api/sala-espera`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(body),
      });
      
      console.log("📥 Respuesta agregar paciente:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error agregando paciente:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Paciente agregado a sala de espera:", data);
      return data;
    } catch (error) {
      console.error('❌ Error agregando paciente:', error);
      throw error;
    }
  },

  updateEstadoSalaEspera: async (pacienteId: string, estado: string, citaId?: string): Promise<any> => {
    try {
      console.log("🔄 Actualizando estado individual:", { pacienteId, estado, citaId });
      
      const body: any = { estado };
      if (citaId) {
        body.cita_id = parseInt(citaId);
      }
      
      const response = await fetch(`${API_URL}/api/sala-espera/${pacienteId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(body),
      });
      
      console.log("📥 Respuesta actualizar estado:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error actualizando estado individual:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Estado actualizado individualmente:", data);
      return data;
    } catch (error) {
      console.error('❌ Error actualizando estado individual:', error);
      throw error;
    }
  },

  // ===== CREAR REGISTRO EN SALA DE ESPERA =====
  crearRegistroSalaEspera: async (pacienteId: number, citaId?: number): Promise<any> => {
    try {
      console.log("📝 Creando registro sala de espera para paciente:", pacienteId);
      
      const body: any = { paciente_id: pacienteId };
      if (citaId) {
        body.cita_id = citaId;
      }
      
      const response = await fetch(`${API_URL}/api/sala-espera`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(body),
      });
      
      console.log("📥 Respuesta crear registro:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error creando registro:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Registro creado exitosamente:", data);
      return data;
    } catch (error) {
      console.error('❌ Error creando registro:', error);
      throw error;
    }
  },

  // ===== ACTUALIZAR ESTADO SALA DE ESPERA (CORREGIDO) =====
  actualizarEstadoSalaEspera: async (pacienteId: string, datos: { estado: string, cita_id?: string }): Promise<any> => {
    try {
      console.log("🔄 Actualizando estado sala espera:", { pacienteId, datos });
      
      const response = await fetch(`${API_URL}/api/sala-espera/${pacienteId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(datos),
      });
      
      console.log("📥 Respuesta actualizar estado:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error actualizando estado:', errorData);
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          // Si no se puede parsear como JSON
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Estado actualizado correctamente:", data);
      return data;
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw error;
    }
  },

  // ===== OBTENER DIAGNÓSTICO DE SALA DE ESPERA =====
  getDiagnosticSalaEspera: async (): Promise<any> => {
    try {
      console.log("🔍 Obteniendo diagnóstico de sala de espera...");
      const response = await fetch(`${API_URL}/api/debug/sala-espera`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      });
      
      if (!response.ok) {
        console.warn('⚠️ No se pudo obtener diagnóstico de sala de espera');
        return {
          success: false,
          message: 'No se pudo obtener diagnóstico'
        };
      }
      
      const data = await response.json();
      console.log("✅ Diagnóstico obtenido:", data);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo diagnóstico:', error);
      return {
        success: false,
        message: 'Error obteniendo diagnóstico: ' + (error instanceof Error ? error.message : 'Error desconocido')
      };
    }
  },
};

// Helper para manejar errores
export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Errores específicos de sala de espera
    if (message.includes('sala') && message.includes('espera')) {
      if (message.includes('tabla') || message.includes('no existe')) {
        return 'Error: La tabla de sala de espera no existe en la base de datos. Contacta al administrador.';
      }
      if (message.includes('estado') && message.includes('no encontrado')) {
        return 'Error: Estado no válido en sala de espera. Contacta al administrador.';
      }
      return 'Error en sala de espera: ' + error.message;
    }
    
    if (message.includes('datetime value')) {
      return 'Error de formato de fecha/hora. Contacta al administrador.';
    }
    if (message.includes('data too long')) {
      return 'Error: El valor es demasiado largo para la columna en la base de datos.';
    }
    if (message.includes('401') || message.includes('no autorizado') || message.includes('credenciales')) {
      return 'Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.';
    }
    if (message.includes('404') || message.includes('no encontrado')) {
      return 'Recurso no encontrado.';
    }
    if (message.includes('500') || message.includes('servidor')) {
      return 'Error del servidor. Por favor, intente más tarde.';
    }
    if (message.includes('network') || message.includes('failed to fetch')) {
      return 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
    }
    if (message.includes('upload') && message.includes('directory')) {
      return 'Error de configuración del servidor. El directorio de uploads no está configurado correctamente.';
    }
    
    return error.message || 'Error desconocido';
  }
  
  return typeof error === 'string' ? error : 'Error desconocido';
};

// Funciones helper para transformar datos
export const transformBackendToFrontend = {
  // Transformar paciente del backend al formato del frontend
  paciente: (backendPaciente: any) => ({
    id: backendPaciente.id?.toString() || '',
    nombres: backendPaciente.nombre || '',
    apellidos: backendPaciente.apellido || '',
    tipo_documento: backendPaciente.tipo_documento || 'CC',
    documento: backendPaciente.numero_documento || '',
    fecha_nacimiento: backendPaciente.fecha_nacimiento || '',
    genero: backendPaciente.genero || '',
    telefono: backendPaciente.telefono || '',
    email: backendPaciente.email || '',
    direccion: backendPaciente.direccion || '',
    ciudad: backendPaciente.ciudad || 'No especificada',
    estado_paciente: 'activo',
    fecha_registro: backendPaciente.fecha_registro || new Date().toISOString(),
  }),
  
  // Transformar cita del backend al formato del frontend
  cita: (backendCita: any) => {
    let fecha = '';
    let hora = '';
    
    if (backendCita.fecha_hora) {
      const fechaHoraStr = backendCita.fecha_hora.toString();
      
      if (fechaHoraStr.includes(' ')) {
        const [datePart, timePart] = fechaHoraStr.split(' ');
        fecha = datePart;
        hora = timePart ? timePart.substring(0, 5) : '09:00';
      } else if (fechaHoraStr.includes('T')) {
        const dateObj = new Date(fechaHoraStr);
        fecha = dateObj.toISOString().split('T')[0];
        hora = dateObj.toTimeString().substring(0, 5);
      }
    }
    
    let tipoCompleto = "consulta";
    if (backendCita.tipo === "program_quir") tipoCompleto = "programacion_quirurgica";
    else if (backendCita.tipo === "consulta") tipoCompleto = "consulta";
    else if (backendCita.tipo === "control") tipoCompleto = "control";
    else if (backendCita.tipo === "valoracion") tipoCompleto = "valoracion";
    
    let estadoNombre = "pendiente";
    if (backendCita.estado_id === 1) estadoNombre = "pendiente";
    else if (backendCita.estado_id === 2) estadoNombre = "confirmada";
    else if (backendCita.estado_id === 3) estadoNombre = "completada";
    else if (backendCita.estado_id === 4) estadoNombre = "cancelada";
    
    return {
      id: backendCita.id?.toString() || '',
      id_paciente: backendCita.paciente_id?.toString() || '',
      id_usuario: backendCita.usuario_id?.toString() || '',
      tipo_cita: tipoCompleto as "consulta" | "control" | "valoracion" | "programacion_quirurgica",
      fecha: fecha || '',
      hora: hora || '09:00',
      duracion: backendCita.duracion_minutos || 30,
      estado: estadoNombre as "pendiente" | "confirmada" | "completada" | "cancelada",
      observaciones: backendCita.notas || '',
      paciente_nombre: backendCita.paciente_nombre || '',
      paciente_apellido: backendCita.paciente_apellido || '',
      doctor_nombre: backendCita.doctor_nombre || '',
    };
  },
  
  // Transformar historia clínica del backend al formato del frontend - CORREGIDO
  historiaClinica: (backendHistoria: any) => {
    // Extraer fecha de fecha_creacion
    let fechaCreacion = '';
    if (backendHistoria.fecha_creacion) {
      const fechaStr = backendHistoria.fecha_creacion.toString();
      if (fechaStr.includes(' ')) {
        fechaCreacion = fechaStr.split(' ')[0];
      } else if (fechaStr.includes('T')) {
        fechaCreacion = fechaStr.split('T')[0];
      } else {
        fechaCreacion = fechaStr;
      }
    }
    
    // Procesar URLs de fotos - CORREGIDO
    let fotosString = '';
    if (backendHistoria.fotos) {
      // Asegurarnos de que sea string
      fotosString = backendHistoria.fotos.toString();
      
      // Si la cadena ya tiene URLs completas, dejarla como está
      // Si tiene URLs relativas (/uploads/...), convertirlas a absolutas
      if (fotosString.includes('/uploads/')) {
        const urls = fotosString.split(',').map((url: string) => {
          const trimmedUrl = url.trim();
          if (trimmedUrl && trimmedUrl.startsWith('/uploads/')) {
            return `${API_URL}${trimmedUrl}`;
          }
          return trimmedUrl;
        });
        fotosString = urls.filter((url: string) => url).join(',');
      }
    }
    
    return {
      id: backendHistoria.id?.toString() || '',
      id_paciente: backendHistoria.paciente_id?.toString() || '',
      fecha_creacion: fechaCreacion || new Date().toISOString().split('T')[0],
      motivo_consulta: backendHistoria.motivo_consulta || '',
      antecedentes_medicos: backendHistoria.antecedentes_medicos || '',
      antecedentes_quirurgicos: backendHistoria.antecedentes_quirurgicos || '',
      antecedentes_alergicos: backendHistoria.antecedentes_alergicos || '',
      antecedentes_farmacologicos: backendHistoria.antecedentes_farmacologicos || '',
      exploracion_fisica: backendHistoria.exploracion_fisica || '',
      diagnostico: backendHistoria.diagnostico || '',
      tratamiento: backendHistoria.tratamiento || '',
      recomendaciones: backendHistoria.recomendaciones || '',
      medico_id: '3', // Mantenemos un valor por defecto para compatibilidad
      fotos: fotosString
    };
  },
  
  // Transformar procedimiento del backend al formato del frontend
  procedimiento: (backendProcedimiento: any) => ({
    id: backendProcedimiento.id?.toString() || '',
    nombre: backendProcedimiento.nombre || '',
    descripcion: backendProcedimiento.descripcion || '',
    precio: backendProcedimiento.precio_base || backendProcedimiento.precio || 0,
    tiempo_promedio: 90,
  }),

  // Transformar procedimiento de catálogo
  procedimientoCatalogo: (backendProcedimiento: any) => ({
    id: backendProcedimiento.id?.toString() || '',
    nombre: backendProcedimiento.nombre || '',
    precio: backendProcedimiento.precio || 0,
  }),

  // Transformar adicional
  adicional: (backendAdicional: any) => ({
    id: backendAdicional.id?.toString() || '',
    nombre: backendAdicional.nombre || '',
    precio: backendAdicional.precio || 0,
  }),

  // Transformar otro adicional
  otroAdicional: (backendOtroAdicional: any) => ({
    id: backendOtroAdicional.id?.toString() || '',
    nombre: backendOtroAdicional.nombre || '',
    precio: backendOtroAdicional.precio || 0,
  }),

  // Transformar paciente de sala de espera del backend al formato del frontend
  pacienteSalaEspera: (backendPaciente: any) => ({
    id: backendPaciente.id?.toString() || '',
    nombres: backendPaciente.nombres || backendPaciente.nombre || '',
    apellidos: backendPaciente.apellidos || backendPaciente.apellido || '',
    documento: backendPaciente.documento || backendPaciente.numero_documento || '',
    telefono: backendPaciente.telefono || '',
    email: backendPaciente.email || '',
    cita_id: backendPaciente.cita_id?.toString(),
    hora_cita: backendPaciente.hora_cita || '',
    fecha_cita: backendPaciente.fecha_cita || '',
    estado_sala: backendPaciente.estado_sala || 'pendiente',
    tiempo_espera: backendPaciente.tiempo_espera || 0,
    tiene_cita_hoy: backendPaciente.tiene_cita_hoy || false,
    sala_espera_id: backendPaciente.sala_espera_id?.toString()
  }),
  
  // Transformación inversa - Paciente
  pacienteToBackend: (frontendPaciente: any) => {
    let genero = frontendPaciente.genero;
    if (genero) {
      const lowerGenero = genero.toLowerCase();
      if (lowerGenero.includes('masc') || lowerGenero === 'm' || lowerGenero === 'masculino') {
        genero = 'M';
      } else if (lowerGenero.includes('fem') || lowerGenero === 'f' || lowerGenero === 'femenino') {
        genero = 'F';
      } else if (lowerGenero.includes('otr') || lowerGenero === 'o' || lowerGenero === 'otro') {
        genero = 'O';
      } else {
        genero = genero.charAt(0).toUpperCase();
      }
    }

    return {
      numero_documento: frontendPaciente.documento,
      tipo_documento: frontendPaciente.tipo_documento,
      nombre: frontendPaciente.nombres,
      apellido: frontendPaciente.apellidos,
      fecha_nacimiento: frontendPaciente.fecha_nacimiento,
      genero: genero,
      telefono: frontendPaciente.telefono,
      email: frontendPaciente.email,
      direccion: frontendPaciente.direccion,
      ciudad: frontendPaciente.ciudad,
    };
  },
  
  // Transformación inversa - Historia Clínica
  historiaClinicaToBackend: (frontendHistoria: any) => {
    return {
      paciente_id: parseInt(frontendHistoria.paciente_id || frontendHistoria.id_paciente),
      motivo_consulta: frontendHistoria.motivo_consulta || '',
      antecedentes_medicos: frontendHistoria.antecedentes_medicos || '',
      antecedentes_quirurgicos: frontendHistoria.antecedentes_quirurgicos || '',
      antecedentes_alergicos: frontendHistoria.antecedentes_alergicos || '',
      antecedentes_farmacologicos: frontendHistoria.antecedentes_farmacologicos || '',
      exploracion_fisica: frontendHistoria.exploracion_fisica || '',
      diagnostico: frontendHistoria.diagnostico || '',
      tratamiento: frontendHistoria.tratamiento || '',
      recomendaciones: frontendHistoria.recomendaciones || '',
      fotos: frontendHistoria.fotos || ''
    };
  },

  // Transformación inversa - Sala de Espera
  salaEsperaToBackend: (frontendPaciente: any) => {
    return {
      paciente_id: parseInt(frontendPaciente.id),
      estado: frontendPaciente.estado_sala,
      cita_id: frontendPaciente.cita_id ? parseInt(frontendPaciente.cita_id) : undefined
    };
  },

  // Transformación inversa - Procedimiento Catálogo
  procedimientoCatalogoToBackend: (frontendProcedimiento: any) => {
    return {
      nombre: frontendProcedimiento.nombre || '',
      precio: parseFloat(frontendProcedimiento.precio) || 0,
    };
  },

  // Transformación inversa - Adicional
  adicionalToBackend: (frontendAdicional: any) => {
    return {
      nombre: frontendAdicional.nombre || '',
      precio: parseFloat(frontendAdicional.precio) || 0,
    };
  },

  // Transformación inversa - Otro Adicional
  otroAdicionalToBackend: (frontendOtroAdicional: any) => {
    return {
      nombre: frontendOtroAdicional.nombre || '',
      precio: parseFloat(frontendOtroAdicional.precio) || 0,
    };
  },
};

// Funciones helper adicionales para sala de espera
export const salaEsperaHelpers = {
  // Mapear estado a color
  getEstadoColor: (estado: string): string => {
    switch (estado) {
      case "pendiente": return "bg-gray-100 text-gray-800";
      case "llegada": return "bg-yellow-100 text-yellow-800";
      case "confirmada": return "bg-green-100 text-green-800";
      case "en_consulta": return "bg-blue-100 text-blue-800";
      case "completada": return "bg-purple-100 text-purple-800";
      case "no_asistio": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  },

  // Mapear estado a etiqueta
  getEstadoLabel: (estado: string): string => {
    switch (estado) {
      case "pendiente": return "Pendiente";
      case "llegada": return "Llegada";
      case "confirmada": return "Confirmada";
      case "en_consulta": return "En Consulta";
      case "completada": return "Completada";
      case "no_asistio": return "No Asistió";
      default: return estado;
    }
  },

  // Estados disponibles
  estadosDisponibles: [
    "pendiente", "llegada", "confirmada", "en_consulta", "completada", "no_asistio"
  ],

  // Calcular tiempo de espera formateado
  formatTiempoEspera: (minutos: number): string => {
    if (minutos < 60) {
      return `${minutos} min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const minsRestantes = minutos % 60;
      return `${horas}h ${minsRestantes}min`;
    }
  },

  // Validar si un estado es válido
  isValidEstado: (estado: string): boolean => {
    const estadosValidos = ["pendiente", "llegada", "confirmada", "en_consulta", "completada", "no_asistio"];
    return estadosValidos.includes(estado);
  }
};