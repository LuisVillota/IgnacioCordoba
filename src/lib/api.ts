const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const callsInProgress = new Set<string>();

export const fetchAPI = async (endpoint: string, options?: RequestInit) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      
      try {
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch {
          responseData = responseText;
        }
        
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData && typeof responseData === 'object') {
          if (responseData.detail) {
            if (typeof responseData.detail === 'string') {
              errorMessage = responseData.detail;
            } else if (Array.isArray(responseData.detail)) {
              errorMessage = responseData.detail.map((err: any) => {
                if (typeof err === 'string') return err;
                if (err && typeof err === 'object' && err.msg && err.loc) {
                  const field = Array.isArray(err.loc) ? err.loc.slice(1).join('.') : err.loc;
                  return `${field}: ${err.msg}`;
                }
                return JSON.stringify(err);
              }).join(', ');
            } else if (responseData.detail && typeof responseData.detail === 'object') {
              errorMessage = responseData.detail.message || JSON.stringify(responseData.detail);
            }
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else if (responseData.error) {
            if (typeof responseData.error === 'string') {
              errorMessage = responseData.error;
            } else if (responseData.error && typeof responseData.error === 'object') {
              errorMessage = responseData.error.message || JSON.stringify(responseData.error);
            }
          } else {
            errorMessage = JSON.stringify(responseData);
          }
        }
      } catch {
      }
      
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      throw apiError;
    }
    
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = responseText;
    }
    
    return responseData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(typeof error === 'string' ? error : 'Error desconocido en la conexión con la API');
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const preventDuplicateCall = async (callType: string, callFn: () => Promise<any>): Promise<any> => {
  const callKey = `${callType}_${Date.now()}`;
  
  if (callsInProgress.has(callType)) {
    throw new Error(`Ya hay una llamada ${callType} en proceso`);
  }
  
  callsInProgress.add(callType);
  
  try {
    const result = await callFn();
    return result;
  } catch (error) {
    throw error;
  } finally {
    callsInProgress.delete(callType);
  }
};

export const api = {
  login: (username: string, password: string) => {
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    return fetchAPI(`/api/login?username=${encodedUsername}&password=${encodedPassword}`);
  },
  
  getUsuarios: () => fetchAPI('/api/usuarios'),
  getUsuario: (id: number) => fetchAPI(`/api/usuarios/${id}`),
  
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
  
  getCitas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/citas?limit=${limit || 100}&offset=${offset || 0}`),
  getCita: (id: number) => fetchAPI(`/api/citas/${id}`),
  createCita: (data: any) => fetchAPI('/api/citas', { method: 'POST', body: JSON.stringify(data) }),
  updateCita: (id: number, data: any) => fetchAPI(`/api/citas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCita: (id: number) => fetchAPI(`/api/citas/${id}`, { method: 'DELETE' }),
  
  getAgendaProcedimientos: (
    limit?: number, 
    offset?: number,
    fecha?: string,
    estado?: string,
    numero_documento?: string,
    fecha_inicio?: string,
    fecha_fin?: string
  ) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (fecha) params.append('fecha', fecha);
    if (estado) params.append('estado', estado);
    if (numero_documento) params.append('numero_documento', numero_documento);
    if (fecha_inicio) params.append('fecha_inicio', fecha_inicio);
    if (fecha_fin) params.append('fecha_fin', fecha_fin);
    
    return fetchAPI(`/api/agenda-procedimientos?${params.toString()}`);
  },

  getAgendaProcedimiento: (id: number) => 
    fetchAPI(`/api/agenda-procedimientos/${id}`),

  createAgendaProcedimiento: (data: any) => {
    return preventDuplicateCall('createAgendaProcedimiento', () => {
      const dataParaEnviar = { ...data };
      
      if (dataParaEnviar.procedimiento_id !== undefined && dataParaEnviar.procedimiento_id !== null) {
        const procedimientoIdNum = parseInt(dataParaEnviar.procedimiento_id);
        
        if (isNaN(procedimientoIdNum)) {
          throw new Error("El ID del procedimiento debe ser un número válido");
        }
        
        dataParaEnviar.procedimiento_id = procedimientoIdNum;
      }
      
      if (dataParaEnviar.duracion !== undefined) {
        dataParaEnviar.duracion = parseInt(dataParaEnviar.duracion) || 60;
      }
      
      return fetchAPI('/api/agenda-procedimientos', { 
        method: 'POST', 
        body: JSON.stringify(dataParaEnviar) 
      });
    });
  },

  updateAgendaProcedimiento: (id: number, data: any) => {
    return preventDuplicateCall('updateAgendaProcedimiento', () => {
      const dataParaEnviar = { ...data };
      
      if (dataParaEnviar.procedimiento_id !== undefined && dataParaEnviar.procedimiento_id !== null) {
        const procedimientoIdNum = parseInt(dataParaEnviar.procedimiento_id);
        
        if (!isNaN(procedimientoIdNum)) {
          dataParaEnviar.procedimiento_id = procedimientoIdNum;
        }
      }
      
      if (dataParaEnviar.duracion !== undefined) {
        dataParaEnviar.duracion = parseInt(dataParaEnviar.duracion) || 60;
      }
      
      return fetchAPI(`/api/agenda-procedimientos/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(dataParaEnviar) 
      });
    });
  },

  deleteAgendaProcedimiento: (id: number) => 
    fetchAPI(`/api/agenda-procedimientos/${id}`, { method: 'DELETE' }),

  verificarDisponibilidad: (fecha: string, hora: string, duracion: number, excludeId?: number, procedimientoId?: number) => {
    const params = new URLSearchParams();
    params.append('fecha', fecha);
    params.append('hora', hora);
    params.append('duracion', duracion.toString());
    
    if (excludeId && excludeId > 0) {
      params.append('exclude_id', excludeId.toString());
    }
    
    if (procedimientoId && procedimientoId > 0) {
      params.append('procedimiento_id', procedimientoId.toString());
    }
    
    const url = `/api/agenda-procedimientos/disponibilidad?${params.toString()}`;
    
    return fetchAPI(url);
  },

  getEstadosProcedimiento: () => 
    fetchAPI('/api/agenda-procedimientos/estados/disponibles'),

  getCalendarioProcedimientos: (year: number, month: number) =>
    fetchAPI(`/api/agenda-procedimientos/calendario/${year}/${month}`),

  getEstadisticasProcedimientos: (fecha_inicio?: string, fecha_fin?: string) => {
    const params = new URLSearchParams();
    if (fecha_inicio) params.append('fecha_inicio', fecha_inicio);
    if (fecha_fin) params.append('fecha_fin', fecha_fin);
    
    return fetchAPI(`/api/agenda-procedimientos/estadisticas?${params.toString()}`);
  },

  getCotizaciones: (limit?: number, offset?: number) =>
    fetchAPI(`/api/cotizaciones?limit=${limit || 50}&offset=${offset || 0}`),
  
  getCotizacion: (id: number) => fetchAPI(`/api/cotizaciones/${id}`),
  
  createCotizacion: (data: any) => {
    return preventDuplicateCall('createCotizacion', async () => {
      const dataParaEnviar = { ...data };
      
      if (dataParaEnviar.total !== undefined) {
        delete dataParaEnviar.total;
      }
      
      if (dataParaEnviar.subtotal_procedimientos !== undefined) {
        dataParaEnviar.subtotal_procedimientos = parseFloat(dataParaEnviar.subtotal_procedimientos) || 0;
      }
      if (dataParaEnviar.subtotal_adicionales !== undefined) {
        dataParaEnviar.subtotal_adicionales = parseFloat(dataParaEnviar.subtotal_adicionales) || 0;
      }
      if (dataParaEnviar.subtotal_otros_adicionales !== undefined) {
        dataParaEnviar.subtotal_otros_adicionales = parseFloat(dataParaEnviar.subtotal_otros_adicionales) || 0;
      }
      
      return fetchAPI('/api/cotizaciones', { 
        method: 'POST', 
        body: JSON.stringify(dataParaEnviar) 
      });
    });
  },
  
  updateCotizacion: (id: number, data: any) => {
    return preventDuplicateCall('updateCotizacion', async () => {
      const dataParaEnviar = { ...data };
      
      if (dataParaEnviar.total !== undefined) {
        delete dataParaEnviar.total;
      }
      
      if (dataParaEnviar.subtotal_procedimientos !== undefined) {
        dataParaEnviar.subtotal_procedimientos = parseFloat(dataParaEnviar.subtotal_procedimientos) || 0;
      }
      if (dataParaEnviar.subtotal_adicionales !== undefined) {
        dataParaEnviar.subtotal_adicionales = parseFloat(dataParaEnviar.subtotal_adicionales) || 0;
      }
      if (dataParaEnviar.subtotal_otros_adicionales !== undefined) {
        dataParaEnviar.subtotal_otros_adicionales = parseFloat(dataParaEnviar.subtotal_otros_adicionales) || 0;
      }
      
      return fetchAPI(`/api/cotizaciones/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(dataParaEnviar) 
      });
    });
  },
  
  deleteCotizacion: (id: number) => 
    fetchAPI(`/api/cotizaciones/${id}`, { method: 'DELETE' }),
  
  getEstadosCotizaciones: () => fetchAPI('/api/estados/cotizaciones'),
  
  getPlantillaServicios: () => fetchAPI('/api/cotizaciones/plantilla-servicios'),
  
  getHistoriasClinicas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/historias-clinicas?limit=${limit || 100}&offset=${offset || 0}`),
  
  getHistoriasByPaciente: async (pacienteId: number) => {
    try {
      return await fetchAPI(`/api/historias-clinicas/paciente/${pacienteId}`);
    } catch (error) {
      const allHistorias = await api.getHistoriasClinicas(100, 0);
      
      if (Array.isArray(allHistorias.historias)) {
        return allHistorias.historias.filter((historia: any) => {
          return historia.paciente_id === pacienteId;
        });
      }
      
      return [];
    }
  },
  
  getHistoriaClinica: (id: number) => fetchAPI(`/api/historias-clinicas/${id}`),
  
  createHistoriaClinica: (data: any) => {
    return preventDuplicateCall('createHistoriaClinica', async () => {
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
        fotos: ""
      };
      
      return fetchAPI('/api/historias-clinicas', {
        method: 'POST',
        body: JSON.stringify(backendData)
      });
    });
  },
  
  updateHistoriaClinica: (id: number, data: any) => {
    return preventDuplicateCall('updateHistoriaClinica', async () => {
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
      
      return fetchAPI(`/api/historias-clinicas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(backendData)
      });
    });
  },
  
  deleteHistoriaClinica: async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/historias-clinicas/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      })
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        
        if (response.status === 404) {
          return { success: true, message: "Historia ya eliminada" }
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      throw error;
    }
  },
  
  uploadHistoriaFoto: async (historiaId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    try {
      const response = await fetch(`${API_URL}/api/upload/historia/${historiaId}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      
      if (!response.ok) {
        let errorDetail = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) {
              errorDetail = text;
            }
          } catch {
          }
        }
        
        throw new Error(errorDetail);
      }
      
      const result = await response.json();
      
      if (result.url && result.url.startsWith('/uploads/')) {
        result.url = `${API_URL}${result.url}`;
      }
      
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        try {
          const dataUrl = await fileToBase64(file);
          return {
            success: true,
            message: "Foto subida (modo simulación - desarrollo)",
            url: dataUrl,
            filename: file.name
          };
        } catch (base64Error) {
        }
      }
      
      throw error;
    }
  },
  
  getEstadosCitas: () => fetchAPI('/api/estados/citas'),
  getEstadosQuirurgicos: () => fetchAPI('/api/estados/quirurgicos'),
  
  getProcedimientos: () => fetchAPI('/api/procedimientos'),
  
  getCatalogoProcedimientos: () => fetchAPI('/api/procedimientos'),
  
  getProcedimiento: (id: number) => fetchAPI(`/api/procedimientos/${id}`),
  
  createProcedimiento: (data: any) => {
    return preventDuplicateCall('createProcedimiento', () => 
      fetchAPI('/api/procedimientos', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  createCatalogoProcedimiento: (data: any) => api.createProcedimiento(data),
  
  updateProcedimiento: (id: number, data: any) => {
    return preventDuplicateCall('updateProcedimiento', () => 
      fetchAPI(`/api/procedimientos/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  updateCatalogoProcedimiento: (id: number, data: any) => api.updateProcedimiento(id, data),
  
  deleteProcedimiento: (id: number) => 
    fetchAPI(`/api/procedimientos/${id}`, { method: 'DELETE' }),
  
  deleteCatalogoProcedimiento: (id: number) => api.deleteProcedimiento(id),

  getAdicionales: () => fetchAPI('/api/adicionales'),
  getAdicional: (id: number) => fetchAPI(`/api/adicionales/${id}`),
  
  createAdicional: (data: any) => {
    return preventDuplicateCall('createAdicional', () => 
      fetchAPI('/api/adicionales', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  updateAdicional: (id: number, data: any) => {
    return preventDuplicateCall('updateAdicional', () => 
      fetchAPI(`/api/adicionales/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  deleteAdicional: (id: number) => 
    fetchAPI(`/api/adicionales/${id}`, { method: 'DELETE' }),

  getOtrosAdicionales: () => fetchAPI('/api/otros-adicionales'),
  getOtroAdicional: (id: number) => fetchAPI(`/api/otros-adicionales/${id}`),
  
  createOtroAdicional: (data: any) => {
    return preventDuplicateCall('createOtroAdicional', () => 
      fetchAPI('/api/otros-adicionales', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  updateOtroAdicional: (id: number, data: any) => {
    return preventDuplicateCall('updateOtroAdicional', () => 
      fetchAPI(`/api/otros-adicionales/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  deleteOtroAdicional: (id: number) => 
    fetchAPI(`/api/otros-adicionales/${id}`, { method: 'DELETE' }),
  
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
      return {
        totalPacientes: 0,
        citasHoy: 0,
        totalCotizaciones: 0,
        ingresosMes: "$0"
      };
    }
  },
  
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
  
  debugUploadDir: () => fetchAPI('/api/debug/upload-dir'),
  debugSalaEspera: () => fetchAPI('/api/debug/sala-espera'),
  
  debugHistoriaFotos: async (historiaId: number) => {
    try {
      const historia = await api.getHistoriaClinica(historiaId);
      return historia;
    } catch (error) {
      throw error;
    }
  },

  getSalaEspera: async (mostrarTodos: boolean = true): Promise<any> => {
    try {
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
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
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
      const response = await fetch(`${API_URL}/api/sala-espera/bulk-estados`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify({ cambios }),
      });
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  getEstadisticasSalaEspera: async (): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/api/sala-espera/estadisticas`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      });
      
      if (!response.ok) {
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
      return data;
    } catch (error) {
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
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateEstadoSalaEspera: async (pacienteId: string, estado: string, citaId?: string): Promise<any> => {
    try {
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
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  crearRegistroSalaEspera: async (pacienteId: number, citaId?: number): Promise<any> => {
    try {
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
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  actualizarEstadoSalaEspera: async (pacienteId: string, datos: { estado: string, cita_id?: string }): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/api/sala-espera/${pacienteId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(datos),
      });
      
      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  getDiagnosticSalaEspera: async (): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/api/debug/sala-espera`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}),
        },
      });
      
      if (!response.ok) {
        return {
          success: false,
          message: 'No se pudo obtener diagnóstico'
        };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo diagnóstico: ' + (error instanceof Error ? error.message : 'Error desconocido')
      };
    }
  },
  
  getActiveCalls: () => {
    return Array.from(callsInProgress);
  },
  
  clearAllCalls: () => {
    callsInProgress.clear();
  }
};

export const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
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
    
    if (message.includes('ya hay una llamada') || message.includes('en proceso')) {
      return 'La operación ya está en proceso. Por favor, espera a que se complete.';
    }
    
    return error.message || 'Error desconocido';
  }
  
  return typeof error === 'string' ? error : 'Error desconocido';
};

export const transformBackendToFrontend = {
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
  
  cotizacion: (backendCotizacion: any) => {
    const estadoMap: Record<number, string> = {
      1: 'pendiente',
      2: 'aceptada', 
      3: 'rechazada',
      4: 'facturada'
    };
    
    let fechaCreacion = '';
    if (backendCotizacion.fecha_creacion) {
      const fechaStr = backendCotizacion.fecha_creacion.toString();
      if (fechaStr.includes(' ')) {
        fechaCreacion = fechaStr.split(' ')[0];
      } else if (fechaStr.includes('T')) {
        fechaCreacion = fechaStr.split('T')[0];
      } else {
        fechaCreacion = fechaStr;
      }
    }
    
    const items = Array.isArray(backendCotizacion.items) ? backendCotizacion.items.map((item: any) => ({
      id: item.id?.toString() || crypto.randomUUID(),
      item_id: item.item_id?.toString() || item.id?.toString() || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 1,
      precio_unitario: parseFloat(item.precio_unitario) || 0,
      subtotal: parseFloat(item.subtotal) || 0,
      tipo: item.tipo || 'procedimiento'
    })) : [];
    
    let serviciosIncluidos = Array.isArray(backendCotizacion.servicios_incluidos) 
      ? backendCotizacion.servicios_incluidos.map((servicio: any) => ({
          id: servicio.id?.toString() || crypto.randomUUID(),
          servicio_nombre: servicio.servicio_nombre || '',
          requiere: servicio.requiere || false
        }))
      : [];
    
    if (serviciosIncluidos.length === 0) {
      serviciosIncluidos = cotizacionHelpers.serviciosIncluidosDefault();
    }
    
    const subtotalProcedimientos = parseFloat(backendCotizacion.subtotal_procedimientos) || 0;
    const subtotalAdicionales = parseFloat(backendCotizacion.subtotal_adicionales) || 0;
    const subtotalOtrosAdicionales = parseFloat(backendCotizacion.subtotal_otros_adicionales) || 0;
    const totalBD = parseFloat(backendCotizacion.total) || 0;
    
    let totalCalculado = totalBD;
    if (totalBD === 0 && items.length > 0) {
      totalCalculado = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    }
    
    return {
      id: backendCotizacion.id?.toString() || '',
      id_paciente: backendCotizacion.paciente_id?.toString() || '',
      fecha_creacion: fechaCreacion || new Date().toISOString().split('T')[0],
      estado: estadoMap[backendCotizacion.estado_id] || backendCotizacion.estado_nombre || 'pendiente',
      items: items,
      servicios_incluidos: serviciosIncluidos,
      total: totalCalculado,
      subtotalProcedimientos: subtotalProcedimientos,
      subtotalAdicionales: subtotalAdicionales,
      subtotalOtrosAdicionales: subtotalOtrosAdicionales,
      observaciones: backendCotizacion.observaciones || '',
      validez_dias: backendCotizacion.validez_dias || 7,
      fecha_vencimiento: backendCotizacion.fecha_vencimiento || '',
      paciente_nombre: backendCotizacion.paciente_nombre || '',
      paciente_apellido: backendCotizacion.paciente_apellido || '',
      usuario_nombre: backendCotizacion.usuario_nombre || '',
      paciente_documento: backendCotizacion.paciente_documento || ''
    };
  },
  
  historiaClinica: (backendHistoria: any) => {
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
    
    let fotosString = '';
    if (backendHistoria.fotos) {
      fotosString = backendHistoria.fotos.toString();
      
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
      medico_id: '3',
      fotos: fotosString
    };
  },
  
  procedimiento: (backendProcedimiento: any) => ({
    id: backendProcedimiento.id?.toString() || '',
    nombre: backendProcedimiento.nombre || '',
    descripcion: backendProcedimiento.descripcion || '',
    precio: backendProcedimiento.precio_base || backendProcedimiento.precio || 0,
    tiempo_promedio: 90,
  }),

  procedimientoCatalogo: (backendProcedimiento: any) => ({
    id: backendProcedimiento.id?.toString() || '',
    nombre: backendProcedimiento.nombre || '',
    precio: backendProcedimiento.precio || 0,
  }),

  adicional: (backendAdicional: any) => ({
    id: backendAdicional.id?.toString() || '',
    nombre: backendAdicional.nombre || '',
    precio: backendAdicional.precio || 0,
  }),

  otroAdicional: (backendOtroAdicional: any) => ({
    id: backendOtroAdicional.id?.toString() || '',
    nombre: backendOtroAdicional.nombre || '',
    precio: backendOtroAdicional.precio || 0,
  }),

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
  
  cotizacionToBackend: (frontendCotizacion: any) => {
    const estadoMap: Record<string, number> = {
      'pendiente': 1,
      'aceptada': 2,
      'rechazada': 3,
      'facturada': 4
    };
    
    const items = Array.isArray(frontendCotizacion.items) 
      ? frontendCotizacion.items.map((item: any) => {
          const processedItem = {
            tipo: item.tipo || 'procedimiento',
            item_id: parseInt(item.item_id) || 0,
            nombre: item.nombre || '',
            descripcion: item.descripcion || '',
            cantidad: item.cantidad || 1,
            precio_unitario: parseFloat(item.precio_unitario) || 0,
            subtotal: parseFloat(item.subtotal) || 0
          };
          
          return processedItem;
        })
      : [];
    
    const servicios_incluidos = Array.isArray(frontendCotizacion.servicios_incluidos)
      ? frontendCotizacion.servicios_incluidos.map((servicio: any) => {
          const processedService = {
            servicio_nombre: servicio.servicio_nombre || '',
            requiere: servicio.requiere !== undefined ? servicio.requiere : false
          };
          return processedService;
        })
      : [];
    
    const subtotalProcedimientos = parseFloat(frontendCotizacion.subtotalProcedimientos) || 
      items.filter((item: any) => item.tipo === 'procedimiento')
           .reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    
    const subtotalAdicionales = parseFloat(frontendCotizacion.subtotalAdicionales) || 
      items.filter((item: any) => item.tipo === 'adicional')
           .reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    
    const subtotalOtrosAdicionales = parseFloat(frontendCotizacion.subtotalOtrosAdicionales) || 
      items.filter((item: any) => item.tipo === 'otroAdicional')
           .reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    
    let fecha_vencimiento = frontendCotizacion.fecha_vencimiento;
    if (!fecha_vencimiento && frontendCotizacion.validez_dias) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + parseInt(frontendCotizacion.validez_dias));
      fecha_vencimiento = fecha.toISOString().split('T')[0];
    }
    
    const data = {
      paciente_id: parseInt(frontendCotizacion.paciente_id || frontendCotizacion.id_paciente || 0),
      usuario_id: parseInt(frontendCotizacion.usuario_id) || 1,
      estado_id: estadoMap[frontendCotizacion.estado] || 1,
      items: items,
      servicios_incluidos: servicios_incluidos,
      subtotal_procedimientos: subtotalProcedimientos,
      subtotal_adicionales: subtotalAdicionales,
      subtotal_otros_adicionales: subtotalOtrosAdicionales,
      validez_dias: parseInt(frontendCotizacion.validez_dias) || 7,
      observaciones: frontendCotizacion.observaciones || '',
      fecha_vencimiento: fecha_vencimiento
    };
    
    return data;
  },
  
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

  salaEsperaToBackend: (frontendPaciente: any) => {
    return {
      paciente_id: parseInt(frontendPaciente.id),
      estado: frontendPaciente.estado_sala,
      cita_id: frontendPaciente.cita_id ? parseInt(frontendPaciente.cita_id) : undefined
    };
  },

  procedimientoCatalogoToBackend: (frontendProcedimiento: any) => {
    return {
      nombre: frontendProcedimiento.nombre || '',
      precio: parseFloat(frontendProcedimiento.precio) || 0,
    };
  },

  adicionalToBackend: (frontendAdicional: any) => {
    return {
      nombre: frontendAdicional.nombre || '',
      precio: parseFloat(frontendAdicional.precio) || 0,
    };
  },

  otroAdicionalToBackend: (frontendOtroAdicional: any) => {
    return {
      nombre: frontendOtroAdicional.nombre || '',
      precio: parseFloat(frontendOtroAdicional.precio) || 0,
    };
  },
};

export const salaEsperaHelpers = {
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

  estadosDisponibles: [
    "pendiente", "llegada", "confirmada", "en_consulta", "completada", "no_asistio"
  ],

  formatTiempoEspera: (minutos: number): string => {
    if (minutos < 60) {
      return `${minutos} min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const minsRestantes = minutos % 60;
      return `${horas}h ${minsRestantes}min`;
    }
  },

  isValidEstado: (estado: string): boolean => {
    const estadosValidos = ["pendiente", "llegada", "confirmada", "en_consulta", "completada", "no_asistio"];
    return estadosValidos.includes(estado);
  }
};

export const cotizacionHelpers = {
  getEstadoColor: (estado: string): string => {
    switch (estado) {
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "aceptada": return "bg-green-100 text-green-800";
      case "rechazada": return "bg-red-100 text-red-800";
      case "facturada": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  },

  getEstadoLabel: (estado: string): string => {
    switch (estado) {
      case "pendiente": return "Pendiente";
      case "aceptada": return "Aceptada";
      case "rechazada": return "Rechazada";
      case "facturada": return "Facturada";
      default: return estado;
    }
  },

  estadosDisponibles: [
    "pendiente", "aceptada", "rechazada", "facturada"
  ],

  calcularTotales: (items: any[]): {
    subtotalProcedimientos: number;
    subtotalAdicionales: number;
    subtotalOtrosAdicionales: number;
    total: number;
  } => {
    let subtotalProcedimientos = 0;
    let subtotalAdicionales = 0;
    let subtotalOtrosAdicionales = 0;
    
    items.forEach((item) => {
      const cantidad = Number(item.cantidad) || 1;
      const precioUnitario = Number(item.precio_unitario) || 0;
      const subtotal = Number(item.subtotal) || (cantidad * precioUnitario);
      
      switch (item.tipo) {
        case 'procedimiento':
          subtotalProcedimientos += subtotal;
          break;
        case 'adicional':
          subtotalAdicionales += subtotal;
          break;
        case 'otroAdicional':
          subtotalOtrosAdicionales += subtotal;
          break;
        default:
          if (item.nombre?.toLowerCase().includes('procedimiento')) {
            subtotalProcedimientos += subtotal;
          } else {
            subtotalAdicionales += subtotal;
          }
      }
    });
    
    const total = subtotalProcedimientos + subtotalAdicionales + subtotalOtrosAdicionales;
    
    return {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      total
    };
  },

  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  serviciosIncluidosDefault: () => [
    { servicio_nombre: "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", requiere: false },
    { servicio_nombre: "ANESTESIOLOGO", requiere: false },
    { servicio_nombre: "CONTROLES CON MEDICO Y ENFERMERA", requiere: false },
    { servicio_nombre: "VALORACION CON ANESTESIOLOGO", requiere: false },
    { servicio_nombre: "HEMOGRAMA DE CONTROL", requiere: false },
    { servicio_nombre: "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", requiere: false },
    { servicio_nombre: "IMPLANTES", requiere: false },
  ],

  calcularFechaVencimiento: (diasValidez: number = 7): string => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasValidez);
    return fecha.toISOString().split('T')[0];
  },

  calcularTotalRapido: (subtotalProcedimientos: number, subtotalAdicionales: number, subtotalOtrosAdicionales: number): number => {
    return subtotalProcedimientos + subtotalAdicionales + subtotalOtrosAdicionales;
  }
};

export { preventDuplicateCall };