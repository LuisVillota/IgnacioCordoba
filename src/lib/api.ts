const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Variable global para rastrear llamadas en progreso y prevenir duplicados
const callsInProgress = new Set<string>();

// Cliente HTTP reutilizable - VERSIÓN CORREGIDA CON MEJOR MANEJO DE ERRORES
export const fetchAPI = async (endpoint: string, options?: RequestInit) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // 🛠️ CORRECCIÓN: Manejo seguro del body para logging
  let bodyForLog = undefined;
  try {
    if (options?.body) {
      if (typeof options.body === 'string') {
        bodyForLog = JSON.parse(options.body);
      } else {
        bodyForLog = options.body;
      }
    }
  } catch (e) {
    console.log('⚠️ No se pudo parsear body para logging:', options?.body);
  }
  
  console.log(`📤 API Request: ${API_URL}${endpoint}`, { 
    method: options?.method || 'GET',
    body: bodyForLog
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
    
    console.log(`📥 API Response Status: ${response.status} ${response.statusText}`);
    
    // **CORRECCIÓN: Leer respuesta como texto primero**
    const responseText = await response.text();
    
    let responseData;
    try {
      // Intentar parsear como JSON
      responseData = responseText ? JSON.parse(responseText) : {};
      console.log(`📥 API Response Body (parsed):`, responseData);
    } catch (parseError) {
      console.log(`⚠️ Response is not JSON, treating as text`);
      responseData = responseText;
    }
    
    if (!response.ok) {
      console.log(`⚠️ API Error ${response.status}:`, responseData);
      
      let errorMessage = `Error HTTP ${response.status}`;
      
      // **CORRECCIÓN: Manejar diferentes formatos de error**
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // Backend puede devolver error en formato {detail: string} o {message: string}
        if (responseData.detail) {
          if (typeof responseData.detail === 'string') {
            errorMessage = responseData.detail;
          } else if (Array.isArray(responseData.detail)) {
            // Manejar lista de errores de Pydantic
            errorMessage = responseData.detail.map((err: any) => {
              if (typeof err === 'string') return err;
              if (err && typeof err === 'object' && err.msg && err.loc) {
                const field = Array.isArray(err.loc) ? err.loc.slice(1).join('.') : err.loc;
                return `${field}: ${err.msg}`;
              }
              return JSON.stringify(err);
            }).join(', ');
          } else if (responseData.detail && typeof responseData.detail === 'object') {
            // Si detail es un objeto (como {error: "message"})
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
          // Para validaciones
          const errorKeys = Object.keys(responseData).filter(key => 
            key.toLowerCase().includes('error') || 
            key.toLowerCase().includes('detail') ||
            key.toLowerCase().includes('message')
          );
          
          if (errorKeys.length > 0) {
            errorMessage = responseData[errorKeys[0]];
          } else {
            errorMessage = JSON.stringify(responseData);
          }
        }
      }
      
      console.log('📝 Error message extracted:', errorMessage);
      
      // **DEVOLVER OBJETO DE ERROR**
      return {
        success: false,
        error: true,
        status: response.status,
        message: errorMessage,
        data: responseData,
        isValidationError: response.status === 400 || response.status === 422,
        isConflictError: response.status === 409,
        isNotFoundError: response.status === 404
      };
    }
    
    // **SI ES ÉXITO, devolver el dato normalmente**
    return responseData;
    
  } catch (error) {
    console.error('❌ API Fetch Error (network):', error);
    
    // Para errores de red, devolver objeto de error
    return {
      success: false,
      error: true,
      message: 'Error de conexión: ' + (error instanceof Error ? error.message : 'Error desconocido'),
      isNetworkError: true
    };
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

// Helper para prevenir llamadas duplicadas
// Helper para prevenir llamadas duplicadas - VERSIÓN SIMPLIFICADA
const preventDuplicateCall = async (callType: string, callFn: () => Promise<any>): Promise<any> => {
  // Crear una clave única para esta llamada
  const callKey = `${callType}_${Date.now()}`;
  
  // Verificar si ya hay una llamada similar en progreso
  if (callsInProgress.has(callType)) {
    console.warn(`⚠️ Ya hay una llamada ${callType} en proceso, ignorando llamada duplicada`);
    return {
      success: false,
      error: true,
      message: `Ya hay una llamada ${callType} en proceso`,
      isDuplicateError: true
    };
  }
  
  callsInProgress.add(callType);
  console.log(`🔄 [${callType}] Iniciando llamada protegida`);
  
  try {
    const result = await callFn();
    console.log(`✅ [${callType}] Llamada completada exitosamente`);
    return result;
  } catch (error) {
    console.error(`❌ [${callType}] Error en llamada:`, error);
    
    // Si el error ya es un objeto de error, retornarlo
    if (error && typeof error === 'object' && 'error' in error) {
      return error;
    }
    
    // Convertir error a objeto de error
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : String(error)
    };
  } finally {
    // Siempre limpiar después de completar
    callsInProgress.delete(callType);
    console.log(`🧹 [${callType}] Llamada limpiada de registro`);
  }
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
  createUsuario: (data: any) => 
      fetchAPI('/api/usuarios', { 
          method: 'POST', 
          body: JSON.stringify(data) 
      }),
  updateUsuario: (id: number, data: any) =>
      fetchAPI(`/api/usuarios/${id}`, { 
          method: 'PUT', 
          body: JSON.stringify(data) 
      }),
  deleteUsuario: (id: number) =>
      fetchAPI(`/api/usuarios/${id}`, { method: 'DELETE' }),

  // ===== ROLES Y PERMISOS =====
  getRoles: () => fetchAPI('/api/roles'),
  getPermisos: () => fetchAPI('/api/permisos'),
  getPermisosRol: (rolId: number) => fetchAPI(`/api/roles/${rolId}/permisos`),

  // ===== DEBUG =====
  debugUsuariosTabla: () => fetchAPI('/api/debug/usuarios-tabla'),
  
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

  // AGREGAR ESTO en la sección de pacientes del objeto api:

  getTodosPacientes: async () => {
    try {
      console.log("📥 Llamando a /api/pacientes para obtener todos los pacientes...");
      
      const response = await fetchAPI('/api/pacientes?limit=1000&offset=0');
      
      console.log("✅ Respuesta cruda del backend:", response);
      
      if (response && response.pacientes && Array.isArray(response.pacientes)) {
        console.log(`✅ Encontrados ${response.pacientes.length} pacientes`);
        return response.pacientes;
      } else if (Array.isArray(response)) {
        console.log(`✅ Encontrados ${response.length} pacientes (formato array)`);
        return response;
      } else {
        console.warn("⚠️ Formato de respuesta inesperado:", response);
        return [];
      }
    } catch (error) {
      console.error("❌ Error en getTodosPacientes:", error);
      return [];
    }
  },

  // Asegúrate de que también tengas la función buscarPacientes:
  buscarPacientes: (query: string, limit: number = 10) =>
    fetchAPI(`/api/pacientes/buscar?q=${encodeURIComponent(query)}&limit=${limit}`),

  // ===== CITAS =====
  getCitas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/citas?limit=${limit || 100}&offset=${offset || 0}`),
  getCita: (id: number) => fetchAPI(`/api/citas/${id}`),
  createCita: (data: any) => fetchAPI('/api/citas', { method: 'POST', body: JSON.stringify(data) }),
  updateCita: (id: number, data: any) => fetchAPI(`/api/citas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCita: (id: number) => fetchAPI(`/api/citas/${id}`, { method: 'DELETE' }),
  
  // ===== AGENDA DE PROCEDIMIENTOS =====
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
      console.log("📤 Creando procedimiento agendado, datos recibidos EN API:", data);
      
      // **CORRECCIÓN CRÍTICA: Crear una copia profunda y convertir tipos**
      const dataParaEnviar = { ...data };
      
      // Asegurar que procedimiento_id sea un NÚMERO
      if (dataParaEnviar.procedimiento_id !== undefined && dataParaEnviar.procedimiento_id !== null) {
        console.log("🔧 API: Convirtiendo procedimiento_id a número:", {
          original: dataParaEnviar.procedimiento_id,
          tipo_original: typeof dataParaEnviar.procedimiento_id
        });
        
        // Intentar convertir a número
        const procedimientoIdNum = parseInt(dataParaEnviar.procedimiento_id);
        
        if (isNaN(procedimientoIdNum)) {
          console.error("❌ API: Error - procedimiento_id no es un número válido:", dataParaEnviar.procedimiento_id);
          // Devolver error en lugar de lanzar excepción
          return {
            success: false,
            error: true,
            message: "El ID del procedimiento debe ser un número válido",
            isValidationError: true
          };
        }
        
        // Asignar el número convertido
        dataParaEnviar.procedimiento_id = procedimientoIdNum;
        console.log("✅ API: procedimiento_id convertido a número:", dataParaEnviar.procedimiento_id);
      } else {
        console.error("❌ API: Error - procedimiento_id es undefined o null");
        return {
          success: false,
          error: true,
          message: "Se requiere un ID de procedimiento",
          isValidationError: true
        };
      }
      
      // Asegurar que otros campos numéricos también sean números
      if (dataParaEnviar.duracion !== undefined) {
        dataParaEnviar.duracion = parseInt(dataParaEnviar.duracion) || 60;
      }
      
      console.log("📤 API: Datos finales para enviar al backend (después de conversión):", dataParaEnviar);
      console.log("📤 API: Tipo de procedimiento_id final:", typeof dataParaEnviar.procedimiento_id);
      
      return fetchAPI('/api/agenda-procedimientos', { 
        method: 'POST', 
        body: JSON.stringify(dataParaEnviar) 
      });
    });
  },

  updateAgendaProcedimiento: (id: number, data: any) => {
    return preventDuplicateCall('updateAgendaProcedimiento', () => {
      console.log("📤 Actualizando procedimiento agendado ID:", id, "datos recibidos:", data);
      
      const dataParaEnviar = { ...data };
      
      // **CORRECCIÓN: Convertir procedimiento_id si existe**
      if (dataParaEnviar.procedimiento_id !== undefined && dataParaEnviar.procedimiento_id !== null) {
        const procedimientoIdNum = parseInt(dataParaEnviar.procedimiento_id);
        
        if (!isNaN(procedimientoIdNum)) {
          dataParaEnviar.procedimiento_id = procedimientoIdNum;
          console.log("✅ API: procedimiento_id convertido para update:", dataParaEnviar.procedimiento_id);
        } else {
          console.warn("⚠️ API: procedimiento_id no es número válido para update, manteniendo valor original");
        }
      }
      
      // Asegurar que otros campos numéricos sean números
      if (dataParaEnviar.duracion !== undefined) {
        dataParaEnviar.duracion = parseInt(dataParaEnviar.duracion) || 60;
      }
      
      console.log("📤 API: Datos para update:", dataParaEnviar);
      
      return fetchAPI(`/api/agenda-procedimientos/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(dataParaEnviar) 
      });
    });
  },

  deleteAgendaProcedimiento: (id: number) => 
    fetchAPI(`/api/agenda-procedimientos/${id}`, { method: 'DELETE' }),
  
  verificarDisponibilidad: (
    fecha: string,
    hora: string,
    duracion: number,
    excludeId?: number,
    procedimiento_id?: string | number
  ) => {
    
    const params = new URLSearchParams();
      params.append('fecha', fecha);
      params.append('hora', hora);
      params.append('duracion', duracion.toString());

      if (excludeId && excludeId > 0) {
        params.append('exclude_id', excludeId.toString());
      }

      const url = `/api/agenda-procedimientos/disponibilidad?${params.toString()}`;
      console.log("📤 URL completa para disponibilidad:", url);

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

  // ===== COTIZACIONES =====
  getCotizaciones: (limit?: number, offset?: number) =>
    fetchAPI(`/api/cotizaciones?limit=${limit || 50}&offset=${offset || 0}`),
  
  getCotizacion: (id: number) => fetchAPI(`/api/cotizaciones/${id}`),
  
  createCotizacion: (data: any) => {
    return preventDuplicateCall('createCotizacion', async () => {
      console.log("📤 Creando cotización, datos recibidos:", data);
      
      // Primero preparar los datos usando la transformación
      let dataParaEnviar = { ...transformBackendToFrontend.cotizacionToBackend(data) };
      
      // **CORRECCIÓN CRÍTICA: Eliminar campos que la BD calcula automáticamente**
      // 1. Eliminar 'total' (es GENERATED en la BD)
      delete dataParaEnviar.total;
      
      // 2. Eliminar 'id' si existe (para creación nueva)
      delete dataParaEnviar.id;
      
      // 3. También eliminar cualquier campo que pueda ser calculado automáticamente
      // como subtotales si es que también son GENERATED (depende de tu esquema de BD)
      
      console.log("📤 Datos para crear (SIN 'total' y SIN 'id'):", dataParaEnviar);
      console.log("🔍 Campos que se enviarán:", Object.keys(dataParaEnviar));
      
      const url = '/api/cotizaciones';
      
      try {
        const result = await fetchAPI(url, { 
          method: 'POST', 
          body: JSON.stringify(dataParaEnviar) 
        });
        console.log("✅ Cotización creada exitosamente:", result);
        return result;
      } catch (error: any) {
        console.error("❌ Error creando cotización:", error);
        
        // Manejar específicamente el error de columna GENERATED
        if (error.message && error.message.includes("generated column 'total'")) {
          console.error("⚠️ Error de columna GENERATED detectado:");
          console.error("Datos que intentaron enviarse:", dataParaEnviar);
          
          // Verificar si 'total' sigue presente
          if (dataParaEnviar.total !== undefined) {
            console.error("❌ 'total' aún estaba presente en los datos!");
            delete dataParaEnviar.total;
          }
          
          // Intentar nuevamente sin campos problemáticos
          console.log("🔄 Reintentando con datos limpiados...");
          const cleanData = { ...dataParaEnviar };
          
          // Asegurarse de eliminar cualquier campo que pueda causar problemas
          const problematicFields = ['total', 'id', 'fecha_creacion', 'fecha_emision'];
          problematicFields.forEach(field => {
            if (cleanData[field] !== undefined) {
              console.log(`Eliminando campo problemático: ${field}`);
              delete cleanData[field];
            }
          });
          
          try {
            const retryResult = await fetchAPI(url, { 
              method: 'POST', 
              body: JSON.stringify(cleanData) 
            });
            console.log("✅ Reintento exitoso:", retryResult);
            return retryResult;
          } catch (retryError: any) {
            console.error("❌ Error en reintento:", retryError);
            throw new Error(`No se pudo crear la cotización después de intentar corregir el error: ${retryError.message}`);
          }
        }
        throw error;
      }
    });
  },

  updateCotizacion: (id: number, data: any) => {
    return preventDuplicateCall('updateCotizacion', async () => {
      console.log("📤 Actualizando cotización ID:", id, "datos recibidos:", data);
      
      // Usar la transformación
      let dataParaEnviar = { ...transformBackendToFrontend.cotizacionToBackend(data) };
      
      // **CRÍTICO: ELIMINAR 'total' porque es GENERATED**
      delete dataParaEnviar.total;
      
      // También eliminar 'id' del objeto de datos (no del endpoint)
      delete dataParaEnviar.id;
      
      console.log("📤 Datos para enviar al backend (SIN 'total' y SIN 'id'):", dataParaEnviar);
      console.log("🔍 Campos que se enviarán:", Object.keys(dataParaEnviar));
      
      try {
        const result = await fetchAPI(`/api/cotizaciones/${id}`, { 
          method: 'PUT', 
          body: JSON.stringify(dataParaEnviar) 
        });
        console.log("✅ Cotización actualizada exitosamente:", result);
        return result;
      } catch (error: any) {
        console.error("❌ Error actualizando cotización:", error);
        
        // Manejar específicamente el error de columna GENERATED
        if (error.message && error.message.includes("generated column 'total'")) {
          console.error("⚠️ Error de columna GENERATED detectado en update:");
          console.error("Datos que intentaron enviarse:", dataParaEnviar);
          
          // Limpiar aún más los datos
          const cleanData = { ...dataParaEnviar };
          const fieldsToRemove = ['total', 'fecha_creacion', 'fecha_emision', 'created_at', 'updated_at'];
          
          fieldsToRemove.forEach(field => {
            if (cleanData[field] !== undefined) {
              console.log(`Eliminando campo problemático en update: ${field}`);
              delete cleanData[field];
            }
          });
          
          // Asegurar que solo enviamos campos que pueden ser actualizados
          const allowedFields = [
            'paciente_id', 'usuario_id', 'estado_id', 'items', 'servicios_incluidos',
            'subtotal_procedimientos', 'subtotal_adicionales', 'subtotal_otros_adicionales',
            'observaciones', 'fecha_vencimiento', 'validez_dias'
          ];
          
          const filteredData: any = {};
          allowedFields.forEach(field => {
            if (cleanData[field] !== undefined) {
              filteredData[field] = cleanData[field];
            }
          });
          
          console.log("🔄 Reintentando update con datos filtrados:", filteredData);
          
          try {
            const retryResult = await fetchAPI(`/api/cotizaciones/${id}`, { 
              method: 'PUT', 
              body: JSON.stringify(filteredData) 
            });
            console.log("✅ Reintento de update exitoso:", retryResult);
            return retryResult;
          } catch (retryError: any) {
            console.error("❌ Error en reintento de update:", retryError);
            throw new Error(`No se pudo actualizar la cotización después de intentar corregir el error: ${retryError.message}`);
          }
        }
        throw error;
      }
    });
  },

  deleteCotizacion: (id: number) => 
    fetchAPI(`/api/cotizaciones/${id}`, { method: 'DELETE' }),
  
  getEstadosCotizaciones: () => fetchAPI('/api/estados/cotizaciones'),
  
  getPlantillaServicios: () => fetchAPI('/api/cotizaciones/plantilla-servicios'),
  
  // ===== HISTORIA CLÍNICA =====
  getHistoriasClinicas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/historias-clinicas?limit=${limit || 100}&offset=${offset || 0}`),
  
  getHistoriasByPaciente: async (pacienteId: number) => {
    console.log(`📋 Obteniendo historias para paciente ${pacienteId}...`);
    
    try {
      return await fetchAPI(`/api/historias-clinicas/paciente/${pacienteId}`);
    } catch (error) {
      console.log(`⚠️ Endpoint específico falló, usando endpoint general para paciente ${pacienteId}`);
      const allHistorias = await api.getHistoriasClinicas(100, 0);
      
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
    return preventDuplicateCall('createHistoriaClinica', async () => {
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
        fotos: ""
      };
      
      console.log("📤 Enviando al backend:", backendData);
      
      return fetchAPI('/api/historias-clinicas', {
        method: 'POST',
        body: JSON.stringify(backendData)
      });
    });
  },
  
  updateHistoriaClinica: (id: number, data: any) => {
    return preventDuplicateCall('updateHistoriaClinica', async () => {
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
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
        
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
      
      if (result.url && result.url.startsWith('/uploads/')) {
        result.url = `${API_URL}${result.url}`;
        console.log("🔗 URL convertida a absoluta:", result.url);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error subiendo foto:', error);
      
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
  
  // ===== PROCEDIMIENTOS =====
  getProcedimientos: () => fetchAPI('/api/procedimientos'),
  
  // Alias para compatibilidad con ProcedimientosPage.tsx
  getCatalogoProcedimientos: () => fetchAPI('/api/procedimientos'),
  
  // Métodos de CRUD
  getProcedimiento: (id: number) => fetchAPI(`/api/procedimientos/${id}`),
  
  // Crear - versión protegida
  createProcedimiento: (data: any) => {
    return preventDuplicateCall('createProcedimiento', () => 
      fetchAPI('/api/procedimientos', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  // Alias para compatibilidad
  createCatalogoProcedimiento: (data: any) => api.createProcedimiento(data),
  
  // Actualizar - versión protegida
  updateProcedimiento: (id: number, data: any) => {
    return preventDuplicateCall('updateProcedimiento', () => 
      fetchAPI(`/api/procedimientos/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  // Alias para compatibilidad
  updateCatalogoProcedimiento: (id: number, data: any) => api.updateProcedimiento(id, data),
  
  // Eliminar
  deleteProcedimiento: (id: number) => 
    fetchAPI(`/api/procedimientos/${id}`, { method: 'DELETE' }),
  
  // Alias para compatibilidad
  deleteCatalogoProcedimiento: (id: number) => api.deleteProcedimiento(id),

  // ===== ADICIONALES =====
  getAdicionales: () => fetchAPI('/api/adicionales'),
  getAdicional: (id: number) => fetchAPI(`/api/adicionales/${id}`),
  
  // Crear - versión protegida
  createAdicional: (data: any) => {
    return preventDuplicateCall('createAdicional', () => 
      fetchAPI('/api/adicionales', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  // Actualizar - versión protegida
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

  // ===== OTROS ADICIONALES =====
  getOtrosAdicionales: () => fetchAPI('/api/otros-adicionales'),
  getOtroAdicional: (id: number) => fetchAPI(`/api/otros-adicionales/${id}`),
  
  // Crear - versión protegida
  createOtroAdicional: (data: any) => {
    return preventDuplicateCall('createOtroAdicional', () => 
      fetchAPI('/api/otros-adicionales', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
    );
  },
  
  // Actualizar - versión protegida
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
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // Si falla todo
          }
        }
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

  getPlanesQuirurgicos: (limit?: number, offset?: number) => {
    // Crear una clave única basada en los parámetros
    const callKey = `getPlanesQuirurgicos_${limit || 50}_${offset || 0}`;
    
    return preventDuplicateCall(callKey, async () => {
      try {
        console.log("📥 Obteniendo planes quirúrgicos...", { limit, offset });
        
        // Usar fetchAPI directamente sin preventDuplicateCall adicional
        const response = await fetchAPI(`/api/planes-quirurgicos?limit=${limit || 50}&offset=${offset || 0}`);
        
        console.log("✅ Respuesta cruda de planes quirúrgicos:", response);
        
        // Si hay error, devolverlo directamente
        if (response && response.error === true) {
          return response;
        }
        
        // Transformar los datos para el frontend
        let planesTransformados = [];
        let total = 0;
        let limitRes = limit || 50;
        let offsetRes = offset || 0;
        
        if (response && response.planes && Array.isArray(response.planes)) {
          planesTransformados = response.planes.map((plan: any) => 
            transformBackendToFrontend.planQuirurgico(plan)
          );
          total = response.total || 0;
          limitRes = response.limit || limitRes;
          offsetRes = response.offset || offsetRes;
        } else if (Array.isArray(response)) {
          // Si la respuesta es directamente un array
          planesTransformados = response.map((plan: any) => 
            transformBackendToFrontend.planQuirurgico(plan)
          );
          total = response.length;
        }
        
        console.log(`✅ Transformados ${planesTransformados.length} planes quirúrgicos`);
        
        return {
          success: true,
          total: total,
          limit: limitRes,
          offset: offsetRes,
          planes: planesTransformados
        };
        
      } catch (error: any) {
        console.error("❌ Error obteniendo planes quirúrgicos:", error);
        return {
          success: false,
          error: true,
          message: error.message || "Error obteniendo planes quirúrgicos",
          total: 0,
          limit: limit || 50,
          offset: offset || 0,
          planes: []
        };
      }
    });
  },

  downloadPlanFile: async (nombreArchivo: string, planId: string) => {
    const callKey = `downloadPlanFile_${planId}_${nombreArchivo}_${Date.now()}`;
    
    return preventDuplicateCall(callKey, async () => {
      try {
        console.log("📥 Descargando archivo:", { nombreArchivo, planId });
        
        // Obtener el token de autenticación
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        // Extraer el ID numérico del plan (sin el prefijo 'plan_')
        const planIdClean = planId.replace('plan_', '');
        
        // Crear la URL completa
        const url = `${API_URL}/api/planes-quirurgicos/${planIdClean}/descargar-archivo`;
        
        console.log("📤 Enviando solicitud a:", url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ nombreArchivo }),
        });
        
        console.log("📥 Respuesta de descarga:", {
          status: response.status,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          // Si hay error, leer el mensaje
          const errorText = await response.text();
          console.error("❌ Error en respuesta:", errorText);
          
          let errorMessage = `Error ${response.status}: ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText;
          }
          
          throw new Error(errorMessage);
        }
        
        // Verificar si es un JSON (error) o un archivo
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // Es un error en formato JSON
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.message || 'Error desconocido');
        }
        
        // Es un archivo, proceder con la descarga
        const blob = await response.blob();
        
        // Crear URL para el blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Crear elemento <a> temporal para descargar
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(a);
        }, 100);
        
        console.log("✅ Archivo descargado exitosamente:", nombreArchivo);
        
        return { 
          success: true, 
          filename: nombreArchivo,
          size: blob.size
        };
        
      } catch (error: any) {
        console.error("❌ Error descargando archivo:", error);
        
        return {
          success: false,
          error: true,
          message: error.message || "Error al descargar el archivo"
        };
      }
    });
  },

  // También agrega un método para verificar si hay archivos
  checkPlanFiles: async (planId: string) => {
    try {
      console.log("🔍 Verificando archivos para plan:", planId);
      
      const plan = await api.getPlanQuirurgico(planId);
      
      if (plan.success && plan.imagenes_adjuntas) {
        const archivos = plan.imagenes_adjuntas;
        console.log("📁 Archivos encontrados:", archivos);
        return {
          success: true,
          archivos: Array.isArray(archivos) ? archivos : [],
          total: Array.isArray(archivos) ? archivos.length : 0
        };
      }
      
      return {
        success: false,
        archivos: [],
        total: 0,
        message: "No se encontraron archivos"
      };
    } catch (error) {
      console.error("❌ Error verificando archivos:", error);
      return {
        success: false,
        archivos: [],
        total: 0,
        message: "Error verificando archivos"
      };
    }
  },

  getPlanQuirurgico: (id: string) => {
    const callKey = `getPlanQuirurgico_${id}_${Date.now()}`;
    
    return preventDuplicateCall(callKey, async () => {
      try {
        console.log(`📥 [GET] Obteniendo plan quirúrgico ID: ${id}`);
        
        // Limpiar el ID si viene con prefijo 'plan_'
        const planIdClean = id.replace('plan_', '');
        
        // Obtener el plan específico
        const response = await fetchAPI(`/api/planes-quirurgicos/${planIdClean}`);
        
        console.log(`📥 [GET] Respuesta para plan ID ${planIdClean}:`, response);
        
        // Si hay error, devolverlo directamente
        if (response && response.error === true) {
          console.error(`❌ [GET] Error en respuesta para plan ${id}:`, response.message);
          return {
            success: false,
            error: true,
            message: response.message || "Error obteniendo plan quirúrgico",
            data: null
          };
        }
        
        // Si la respuesta viene directa (sin wrapper), transformarla
        let planData = response;
        
        // Si viene con wrapper {success: true, plan: {...}}, extraer el plan
        if (response && response.success && response.plan) {
          planData = response.plan;
        }
        
        // Transformar los datos para el frontend
        let planTransformado = {};
        
        if (planData && typeof planData === 'object' && Object.keys(planData).length > 0) {
          planTransformado = transformBackendToFrontend.planQuirurgico(planData);
          console.log(`✅ [GET] Plan ${id} transformado exitosamente`, planTransformado);
        } else {
          console.warn(`⚠️ [GET] Plan ${id} tiene datos vacíos o inválidos`);
          return {
            success: false,
            error: true,
            message: "El plan no contiene datos válidos",
            data: null
          };
        }
        
        return {
          success: true,
          ...planTransformado
        };
        
      } catch (error: any) {
        console.error(`❌ [GET] Error obteniendo plan quirúrgico ${id}:`, error);
        return {
          success: false,
          error: true,
          message: error.message || "Error obteniendo plan quirúrgico",
          data: null
        };
      }
    });
  },

  createPlanQuirurgico: (data: any) => {
    const callKey = `createPlanQuirurgico_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return preventDuplicateCall(callKey, async () => {
      console.log("📤 Creando plan quirúrgico con datos:", data);
      
      // Transformar datos para el backend
      const backendData = transformBackendToFrontend.planQuirurgicoToBackend(data);
      
      console.log("📤 Datos para enviar al backend:", backendData);
      
      try {
        const result = await fetchAPI('/api/planes-quirurgicos', {
          method: 'POST',
          body: JSON.stringify(backendData)
        });
        
        console.log("✅ Resultado de fetchAPI:", result);
        
        // 🔴 VERIFICACIÓN SEGURA: Asegurar que result es válido
        if (!result) {
          return {
            success: false,
            error: true,
            message: "No se recibió respuesta del servidor"
          };
        }
        
        // Si result ya tiene error, devolverlo
        if (result.error === true) {
          return result;
        }
        
        // Si es éxito, devolver con success: true
        return {
          success: true,
          ...result
        };
        
      } catch (error: any) {
        console.error("❌ Error creando plan quirúrgico:", error);
        return {
          success: false,
          error: true,
          message: error.message || "Error creando plan quirúrgico"
        };
      }
    });
  },

  updatePlanQuirurgico: (id: string, data: any) => {
    const callKey = `updatePlanQuirurgico_${id}_${Date.now()}`;
    
    return preventDuplicateCall(callKey, async () => {
      console.log("📤 Actualizando plan quirúrgico ID:", id, "datos:", data);
      
      // Transformar datos para el backend
      const backendData = transformBackendToFrontend.planQuirurgicoToBackend(data);
      
      console.log("📤 Datos para enviar al backend:", backendData);
      
      try {
        const result = await fetchAPI(`/api/planes-quirurgicos/${id}`, {
          method: 'PUT',
          body: JSON.stringify(backendData)
        });
        
        // fetchAPI ya devuelve los datos parseados
        if (result && result.error === true) {
          return result; // 🔴 NO lanzar error, devolver objeto de error
        }
        
        return {
          success: true,
          ...result
        };
      } catch (error: any) {
        console.error("❌ Error actualizando plan quirúrgico:", error);
        return {
          success: false,
          error: true,
          message: error.message || "Error actualizando plan quirúrgico"
        };
      }
    });
  },

  deletePlanQuirurgico: (id: string) => {
    const callKey = `deletePlanQuirurgico_${id}_${Date.now()}`;
    
    return preventDuplicateCall(callKey, async () => {
      console.log("🗑️ Eliminando plan quirúrgico ID:", id);
      
      try {
        const result = await fetchAPI(`/api/planes-quirurgicos/${id}`, { 
          method: 'DELETE' 
        });
        
        if (result.error) {
          throw new Error(result.message || "Error eliminando plan");
        }
        
        return result;
      } catch (error: any) {
        console.error("❌ Error eliminando plan quirúrgico:", error);
        return {
          success: false,
          error: true,
          message: error.message || "Error eliminando plan quirúrgico"
        };
      }
    });
  },

  // Buscar pacientes para autocompletar
  buscarPacientes: (query: string, limit: number = 10) =>
    fetchAPI(`/api/pacientes/buscar?q=${encodeURIComponent(query)}&limit=${limit}`),

  // ===== Obtener datos completos de un paciente para pre-llenar formulario =====
  getPacienteCompleto: async (pacienteId: string) => {
    try {
      const paciente = await api.getPaciente(parseInt(pacienteId));
      
      // Obtener historias clínicas del paciente
      const historias = await api.getHistoriasByPaciente(parseInt(pacienteId));
      
      // Obtener la última cita del paciente
      const citasResponse = await api.getCitas(100, 0);
      const citasPaciente = citasResponse.citas?.filter((cita: any) => 
        cita.paciente_id === parseInt(pacienteId)
      ) || [];
      
      const ultimaCita = citasPaciente.length > 0 ? citasPaciente[0] : null;
      
      return {
        paciente: paciente,
        ultimaHistoria: historias.length > 0 ? historias[0] : null,
        ultimaCita: ultimaCita
      };
    } catch (error) {
      console.error("Error obteniendo datos del paciente:", error);
      return { paciente: null, ultimaHistoria: null, ultimaCita: null };
    }
  },

  // ===== DEBUG DE LLAMADAS DUPLICADAS =====
  getActiveCalls: () => {
    console.log("📊 Llamadas activas:", Array.from(callsInProgress));
    return Array.from(callsInProgress);
  },
  
  clearAllCalls: () => {
    console.log("🧹 Limpiando todas las llamadas en progreso");
    callsInProgress.clear();
  }
};

// Helper para manejar errores
export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
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
    
    // Manejar error de llamada duplicada
    if (message.includes('ya hay una llamada') || message.includes('en proceso')) {
      return 'La operación ya está en proceso. Por favor, espera a que se complete.';
    }
    
    return error.message || 'Error desconocido';
  }
  
  return typeof error === 'string' ? error : 'Error desconocido';
};

// Funciones helper para transformar datos - VERSIÓN MEJORADA
export const transformBackendToFrontend = {

  usuario: (backendUsuario: any) => ({
      id: backendUsuario.id?.toString() || '',
      username: backendUsuario.username || '',
      nombre: backendUsuario.nombre || '',
      email: backendUsuario.email || '',
      rol: backendUsuario.rol || backendUsuario.tipo_rol || '',
      activo: Boolean(backendUsuario.activo),
      estado_usuario: backendUsuario.activo ? "activo" : "inactivo" as "activo" | "inactivo",
      fecha_registro: backendUsuario.fecha_creacion || new Date().toISOString(),
  }),

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
  
  // Transformar cotización del backend al formato del frontend - MEJORADO
  cotizacion: (backendCotizacion: any) => {
    console.log("🔄 Transformando cotización del backend:", backendCotizacion);
    
    // Mapear estado ID a nombre
    const estadoMap: Record<number, string> = {
      1: 'pendiente',
      2: 'aceptada', 
      3: 'rechazada',
      4: 'facturada'
    };
    
    // Procesar fecha de creación
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
    
    // Procesar items
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
    
    // 🔴 CORRECCIÓN: Procesar servicios incluidos CORRECTAMENTE
    let serviciosIncluidos = [];
    
    if (backendCotizacion.servicios_incluidos && Array.isArray(backendCotizacion.servicios_incluidos)) {
      // Si el backend envía servicios incluidos, usarlos
      serviciosIncluidos = backendCotizacion.servicios_incluidos.map((servicio: any) => ({
        id: servicio.id?.toString() || crypto.randomUUID(),
        servicio_nombre: servicio.servicio_nombre || '',
        requiere: servicio.requiere || false
      }));
    } else {
      // Si no, usar los por defecto
      serviciosIncluidos = cotizacionHelpers.serviciosIncluidosDefault();
    }
    
    console.log("🔍 Servicios incluidos procesados:", {
      tieneServiciosEnBackend: 'servicios_incluidos' in backendCotizacion,
      esArray: Array.isArray(backendCotizacion.servicios_incluidos),
      cantidad: serviciosIncluidos.length,
      servicios: serviciosIncluidos
    });
    
    // Obtener los subtotales
    const subtotalProcedimientos = parseFloat(backendCotizacion.subtotal_procedimientos) || 0;
    const subtotalAdicionales = parseFloat(backendCotizacion.subtotal_adicionales) || 0;
    const subtotalOtrosAdicionales = parseFloat(backendCotizacion.subtotal_otros_adicionales) || 0;
    const totalBD = parseFloat(backendCotizacion.total) || 0;
    
    // Calcular total basado en items si el de la BD es 0
    let totalCalculado = totalBD;
    if (totalBD === 0 && items.length > 0) {
      totalCalculado = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    }
    
    console.log("📊 Transformación completa:", {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      totalCalculado,
      serviciosIncluidosLength: serviciosIncluidos.length
    });
    
    return {
      id: backendCotizacion.id?.toString() || '',
      paciente_id: backendCotizacion.paciente_id?.toString() || '',
      fecha_creacion: fechaCreacion || new Date().toISOString().split('T')[0],
      estado: estadoMap[backendCotizacion.estado_id] || backendCotizacion.estado_nombre || 'pendiente',
      items: items,
      servicios_incluidos: serviciosIncluidos, // 🔴 Esto debe estar aquí
      serviciosIncluidos: serviciosIncluidos, // Para compatibilidad
      total: totalCalculado,
      subtotalProcedimientos: subtotalProcedimientos,
      subtotalAdicionales: subtotalAdicionales,
      subtotalOtrosAdicionales: subtotalOtrosAdicionales,
      observaciones: backendCotizacion.observaciones || '',
      validez_dias: backendCotizacion.validez_dias || 7,
      fecha_vencimiento: backendCotizacion.fecha_vencimiento || '',
      // Datos adicionales para mostrar en tabla
      paciente_nombre: backendCotizacion.paciente_nombre || '',
      paciente_apellido: backendCotizacion.paciente_apellido || '',
      usuario_nombre: backendCotizacion.usuario_nombre || '',
      paciente_documento: backendCotizacion.paciente_documento || ''
    };
  },

  // Transformar historia clínica del backend al formato del frontend
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
    
    // Procesar URLs de fotos
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
  
  // Función completa para transformBackendToFrontend.planQuirurgico
  planQuirurgico: (backendPlan: any) => {
    console.log("🔄 TRANSFORMANDO PLAN desde backend:", backendPlan);
    
    // Si el plan ya viene transformado del frontend, devolverlo tal cual
    if (backendPlan && backendPlan.id_paciente && backendPlan.historia_clinica) {
      console.log("✅ Plan ya está transformado, devolviendo tal cual");
      return backendPlan;
    }

    // Si no hay datos, devolver vacío
    if (!backendPlan || typeof backendPlan !== 'object' || Object.keys(backendPlan).length === 0) {
      console.warn("❌ backendPlan vacío o inválido");
      return transformBackendToFrontend.createEmptyPlan();
    }

    // FUNCIÓN PARA PARSEAR JSON
    const parseJson = (field: any, defaultValue: any = {}) => {
      if (!field) return defaultValue;
      if (typeof field === 'object') return field;
      if (typeof field !== 'string') return defaultValue;
      
      try {
        const trimmed = field.trim();
        if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '{}' || trimmed === '[]') {
          return defaultValue;
        }
        return JSON.parse(trimmed);
      } catch (e) {
        console.warn(`⚠️ Error parseando JSON: ${field}`, e);
        return defaultValue;
      }
    };

    // ==================== EXTRACCIÓN DE DATOS ====================
    
    // ID y relaciones
    const id = backendPlan.id ? `plan_${backendPlan.id}` : '';
    const paciente_id = backendPlan.paciente_id ? String(backendPlan.paciente_id) : '';
    const usuario_id = backendPlan.usuario_id ? String(backendPlan.usuario_id) : '1';
    
    // 🔴 DATOS PERSONALES - PRIORIZAR JOIN CON PACIENTE
    const nombre_completo = backendPlan.nombre_completo_paciente || 
                          backendPlan.nombre_completo || 
                          'Paciente no identificado';
    
    const identificacion = backendPlan.paciente_documento || 
                          backendPlan.identificacion || 
                          '';
    
    const ocupacion = backendPlan.ocupacion || '';
    const entidad = backendPlan.entidad || '';
    
    // Datos médicos
    const peso = backendPlan.peso ? parseFloat(backendPlan.peso) : 0;
    const altura = backendPlan.altura ? parseFloat(backendPlan.altura) : 0;
    const imc = backendPlan.imc ? parseFloat(backendPlan.imc) : 0;
    const categoriaIMC = backendPlan.categoriaIMC || '';
    
    // Edad - priorizar edad_calculada, luego edad
    let edad_calculada = 0;
    if (backendPlan.edad_calculada) {
      edad_calculada = parseInt(backendPlan.edad_calculada);
    } else if (backendPlan.edad) {
      edad_calculada = parseInt(backendPlan.edad);
    }
    
    // Fechas
    const fecha_consulta = backendPlan.fecha_consulta || '';
    const hora_consulta = backendPlan.hora_consulta ? 
      (typeof backendPlan.hora_consulta === 'string' ? 
        backendPlan.hora_consulta.substring(0, 5) : 
        String(backendPlan.hora_consulta).substring(0, 5)) : 
      '';
    
    const fecha_nacimiento = backendPlan.fecha_nacimiento || '';
    
    // Datos de contacto
    const telefono = backendPlan.telefono || '';
    const celular = backendPlan.celular || '';
    const direccion = backendPlan.direccion || '';
    const email = backendPlan.email || '';
    
    // Motivo de consulta y procedimiento
    const motivo_consulta = backendPlan.motivo_consulta || '';
    const procedimiento_desc = backendPlan.procedimiento_desc || '';
    const descripcion_procedimiento = backendPlan.descripcion_procedimiento || '';
    const plan_conducta = backendPlan.plan_conducta || '';
    const detalles = backendPlan.detalles || '';
    
    // Antecedentes (texto plano)
    const farmacologicos_text = backendPlan.farmacologicos || '';
    const traumaticos_text = backendPlan.traumaticos || '';
    const quirurgicos_text = backendPlan.quirurgicos || '';
    const alergicos_text = backendPlan.alergicos || '';
    const toxicos_text = backendPlan.toxicos || '';
    const habitos_text = backendPlan.habitos || '';
    
    // Examen físico (texto plano)
    const cabeza_text = backendPlan.cabeza || '';
    const mamas_text = backendPlan.mamas || '';
    const tcs_text = backendPlan.tcs || '';
    const abdomen_text = backendPlan.abdomen || '';
    const gluteos_text = backendPlan.gluteos || '';
    const extremidades_text = backendPlan.extremidades || '';
    const pies_faneras_text = backendPlan.pies_faneras || '';
    
    // Conducta quirúrgica
    const duracion_estimada = backendPlan.duracion_estimada ? parseInt(backendPlan.duracion_estimada) : 0;
    const tipo_anestesia = backendPlan.tipo_anestesia || 'general';
    const requiere_hospitalizacion = Boolean(backendPlan.requiere_hospitalizacion);
    const tiempo_hospitalizacion = backendPlan.tiempo_hospitalizacion || '';
    const reseccion_estimada = backendPlan.reseccion_estimada || '';
    const firma_cirujano = backendPlan.firma_cirujano || '';
    const firma_paciente = backendPlan.firma_paciente || '';
    
    // Notas
    const notas_doctor = backendPlan.notas_doctor || backendPlan.notas_preoperatorias || '';
    const materiales_requeridos = backendPlan.materiales_requeridos || '';
    const riesgos = backendPlan.riesgos || '';
    const anestesiologo = backendPlan.anestesiologo || '';
    const tiempo_cirugia_minutos = backendPlan.tiempo_cirugia_minutos || duracion_estimada;
    
    // ==================== PARSEAR CAMPOS JSON ====================
    
    const enfermedad_actual_json = parseJson(backendPlan.enfermedad_actual, {});
    const antecedentes_json = parseJson(backendPlan.antecedentes, {});
    const notas_corporales_json = parseJson(backendPlan.notas_corporales, {});
    const esquema_mejorado_json = parseJson(backendPlan.esquema_mejorado, {
      zoneMarkings: {},
      selectionHistory: [],
      currentStrokeWidth: 3,
      currentTextSize: 16,
      selectedProcedure: 'liposuction'
    });
    
    // Combinar datos de texto plano con JSON
    const enfermedad_actual_combined = {
      hepatitis: false,
      discrasia_sanguinea: false,
      cardiopatias: false,
      hipertension: false,
      reumatologicas: false,
      diabetes: false,
      neurologicas: false,
      enfermedad_mental: false,
      no_refiere: true,
      ...enfermedad_actual_json
    };
    
    const antecedentes_combined = {
      farmacologicos: farmacologicos_text,
      traumaticos: traumaticos_text,
      quirurgicos: quirurgicos_text,
      alergicos: alergicos_text,
      toxicos: toxicos_text,
      habitos: habitos_text,
      ginecologicos: '',
      fuma: 'no',
      planificacion: '',
      ...antecedentes_json
    };
    
    const notas_corporales_combined = {
      cabeza: cabeza_text,
      mamas: mamas_text,
      tcs: tcs_text,
      abdomen: abdomen_text,
      gluteos: gluteos_text,
      extremidades: extremidades_text,
      pies_faneras: pies_faneras_text,
      ...notas_corporales_json
    };
    
    // Imágenes adjuntas
    const imagenes_adjuntas = parseJson(backendPlan.imagen_procedimiento, []);
    
    // ==================== CONSTRUIR PLAN TRANSFORMADO ====================
    
    const planTransformado = {
      id: id,
      id_paciente: paciente_id,
      id_usuario: usuario_id,
      fecha_creacion: backendPlan.fecha_creacion || new Date().toISOString(),
      fecha_modificacion: backendPlan.fecha_modificacion || backendPlan.fecha_creacion || '',
      
      // DATOS PACIENTE
      datos_paciente: {
        id: paciente_id,
        identificacion: identificacion,
        edad: edad_calculada,
        nombre_completo: nombre_completo,
        peso: peso,
        altura: altura,
        imc: imc,
        categoriaIMC: categoriaIMC,
        fecha_consulta: fecha_consulta,
        hora_consulta: hora_consulta
      },
      
      // HISTORIA CLÍNICA
      historia_clinica: {
        nombre_completo: nombre_completo,
        identificacion: identificacion,
        ocupacion: ocupacion,
        fecha_nacimiento: fecha_nacimiento,
        edad_calculada: edad_calculada,
        entidad: entidad,
        telefono: telefono,
        celular: celular,
        direccion: direccion,
        email: email,
        motivo_consulta: motivo_consulta,
        motivo_consulta_detalle: procedimiento_desc,
        enfermedad_actual: enfermedad_actual_combined,
        antecedentes: antecedentes_combined,
        enfermedades_piel: false,
        tratamientos_esteticos: '',
        antecedentes_familiares: '',
        peso: peso,
        altura: altura,
        imc: imc,
        contextura: '',
        notas_corporales: notas_corporales_combined,
        diagnostico: descripcion_procedimiento || detalles,
        plan_conducta: plan_conducta
      },
      
      // CONDUCTA QUIRÚRGICA
      conducta_quirurgica: {
        duracion_estimada: duracion_estimada,
        tipo_anestesia: tipo_anestesia,
        requiere_hospitalizacion: requiere_hospitalizacion,
        tiempo_hospitalizacion: tiempo_hospitalizacion,
        reseccion_estimada: reseccion_estimada,
        firma_cirujano: firma_cirujano,
        firma_paciente: firma_paciente
      },
      
      cirugias_previas: [],
      dibujos_esquema: [],
      notas_doctor: notas_doctor,
      materiales_requeridos: materiales_requeridos,
      riesgos: riesgos,
      anestesiologo: anestesiologo,
      tiempo_cirugia_minutos: tiempo_cirugia_minutos,
      imagenes_adjuntas: imagenes_adjuntas,
      esquema_mejorado: esquema_mejorado_json
    };

    console.log("✅ PLAN TRANSFORMADO COMPLETO:", {
      id: planTransformado.id,
      nombre: planTransformado.datos_paciente.nombre_completo,
      identificacion: planTransformado.datos_paciente.identificacion,
      tienePeso: !!peso,
      tieneAltura: !!altura,
      tieneIMC: !!imc
    });

    return planTransformado;
  },

  createEmptyPlan: () => ({
    id: '',
    id_paciente: '',
    id_usuario: '',
    fecha_creacion: '',
    fecha_modificacion: '',
    datos_paciente: {
      id: '',
      identificacion: '',
      edad: 0,
      nombre_completo: '',
      peso: 0,
      altura: 0,
      imc: 0,
      categoriaIMC: '',
      fecha_consulta: '',
      hora_consulta: ''
    },
    historia_clinica: {
      nombre_completo: '',
      identificacion: '',
      ocupacion: '',
      fecha_nacimiento: '',
      edad_calculada: 0,
      entidad: '',
      telefono: '',
      celular: '',
      direccion: '',
      email: '',
      motivo_consulta: '',
      motivo_consulta_detalle: '',
      enfermedad_actual: {
        hepatitis: false,
        discrasia_sanguinea: false,
        cardiopatias: false,
        hipertension: false,
        reumatologicas: false,
        diabetes: false,
        neurologicas: false,
        enfermedad_mental: false,
        no_refiere: true
      },
      antecedentes: {
        farmacologicos: '',
        traumaticos: '',
        quirurgicos: '',
        alergicos: '',
        toxicos: '',
        habitos: '',
        ginecologicos: '',
        fuma: 'no',
        planificacion: ''
      },
      enfermedades_piel: false,
      tratamientos_esteticos: '',
      antecedentes_familiares: '',
      peso: 0,
      altura: 0,
      imc: 0,
      contextura: '',
      notas_corporales: {
        cabeza: '',
        mamas: '',
        tcs: '',
        abdomen: '',
        gluteos: '',
        extremidades: '',
        pies_faneras: ''
      },
      diagnostico: '',
      plan_conducta: ''
    },
    conducta_quirurgica: {
      duracion_estimada: 0,
      tipo_anestesia: 'general',
      requiere_hospitalizacion: false,
      tiempo_hospitalizacion: '',
      reseccion_estimada: '',
      firma_cirujano: '',
      firma_paciente: ''
    },
    cirugias_previas: [],
    dibujos_esquema: [],
    notas_doctor: '',
    materiales_requeridos: '',
    riesgos: '',
    anestesiologo: '',
    tiempo_cirugia_minutos: 0,
    imagenes_adjuntas: [],
    esquema_mejorado: {
      zoneMarkings: {},
      selectionHistory: [],
      currentStrokeWidth: 3,
      currentTextSize: 16,
      selectedProcedure: 'liposuction'
    }
  }),

  // ==================== TRANSFORMACIONES INVERSAS (BACKEND) ====================

  // Transformación inversa - Usuario para enviar al backend
  usuarioToBackend: (frontendUsuario: any) => {
    const backendData: any = {
      username: frontendUsuario.username || '',
      nombre: frontendUsuario.nombre || '',
      email: frontendUsuario.email || '',
      rol_id: parseInt(frontendUsuario.rol) || 1,
      activo: frontendUsuario.estado_usuario === 'activo' || frontendUsuario.activo
    };
    
    // Solo incluir password si se proporcionó (para edición)
    if (frontendUsuario.password && frontendUsuario.password.trim() !== '') {
      backendData.password = frontendUsuario.password;
    }
    
    return backendData;
  },

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
  
  // Transformación inversa - Cotización para enviar al backend
  cotizacionToBackend: (frontendCotizacion: any) => {
    console.log("🚀 Transformando cotización para enviar al backend:", {
      id: frontendCotizacion.id,
      estado_frontend: frontendCotizacion.estado,
      paciente_id: frontendCotizacion.paciente_id,
      // Debug: mostrar todas las propiedades que contienen 'estado'
      propiedades_estado: Object.keys(frontendCotizacion).filter(key => 
        key.toLowerCase().includes('estado')
      )
    });
    
    const estadoMap: Record<string, number> = {
      'pendiente': 1,
      'aceptada': 2,
      'rechazada': 3,
      'facturada': 4
    };
    
    // **CORRECCIÓN CRÍTICA: Obtener estado de múltiples fuentes posibles**
    let estado = frontendCotizacion.estado;
    
    // Debug de todas las propiedades del objeto
    if (!estado) {
      console.log("🔍 Buscando estado en otras propiedades...");
      const posiblesEstados = [
        frontendCotizacion.estado_cotizacion,
        frontendCotizacion.estadoNombre,
        frontendCotizacion.estado_nombre,
        frontendCotizacion.estado_cotizacion_nombre
      ].filter(Boolean);
      
      if (posiblesEstados.length > 0) {
        estado = posiblesEstados[0];
        console.log("✅ Estado encontrado en otra propiedad:", estado);
      }
    }
    
    // Si aún no hay estado, buscar en _backendData
    if (!estado && frontendCotizacion._backendData && frontendCotizacion._backendData.estado_id) {
      // Convertir estado_id a nombre
      const estadoId = frontendCotizacion._backendData.estado_id;
      const estadoName = Object.keys(estadoMap).find(key => estadoMap[key] === estadoId);
      if (estadoName) {
        estado = estadoName;
        console.log("✅ Estado derivado de _backendData.estado_id:", estadoId, "->", estado);
      }
    }
    
    // Si aún no hay estado, usar pendiente por defecto
    if (!estado) {
      console.warn("⚠️ Estado no encontrado en frontendCotizacion, usando 'pendiente' por defecto");
      estado = 'pendiente';
    }
    
    // **CORRECCIÓN: Asegurar que el estado es un string válido y está en minúsculas**
    estado = estado.toString().toLowerCase();
    
    let estado_id = estadoMap[estado];
    
    // Si el estado no se encuentra en el mapa, usar pendiente (1)
    if (estado_id === undefined) {
      console.warn("⚠️ Estado no encontrado en mapa:", estado, 
                  "usando 'pendiente' por defecto");
      estado_id = 1;
      estado = 'pendiente';
    }
    
    console.log("📊 Estado transformado:", {
      estado_original: estado,
      estado_id_backend: estado_id,
      es_valido: estado_id !== undefined
    });
    
    // Determinar si es creación (sin id) o actualización (con id)
    const esCreacion = !frontendCotizacion.id || frontendCotizacion.id === '';
    
    // Procesar items
    const items = Array.isArray(frontendCotizacion.items) ? frontendCotizacion.items.map((item: any) => ({
      tipo: item.tipo || 'procedimiento',
      item_id: parseInt(item.item_id) || 0,
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 1,
      precio_unitario: parseFloat(item.precio_unitario) || 0,
      subtotal: parseFloat(item.subtotal) || 0
    })) : [];
    
    // Procesar servicios incluidos
    let servicios_incluidos = [];
    
    // Buscar servicios en diferentes propiedades
    if (Array.isArray(frontendCotizacion.servicios_incluidos)) {
      servicios_incluidos = frontendCotizacion.servicios_incluidos.map((servicio: any) => ({
        servicio_nombre: servicio.servicio_nombre || '',
        requiere: servicio.requiere !== undefined ? servicio.requiere : false
      }));
    } else if (Array.isArray(frontendCotizacion.serviciosIncluidos)) {
      servicios_incluidos = frontendCotizacion.serviciosIncluidos.map((servicio: any) => ({
        servicio_nombre: servicio.servicio_nombre || servicio.nombre || '',
        requiere: servicio.requiere !== undefined ? servicio.requiere : false
      }));
    } else {
      // Usar servicios por defecto
      servicios_incluidos = [
        { servicio_nombre: "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", requiere: false },
        { servicio_nombre: "ANESTESIOLOGO", requiere: false },
        { servicio_nombre: "CONTROLES CON MEDICO Y ENFERMERA", requiere: false },
        { servicio_nombre: "VALORACION CON ANESTESIOLOGO", requiere: false },
        { servicio_nombre: "HEMOGRAMA DE CONTROL", requiere: false },
        { servicio_nombre: "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", requiere: false },
        { servicio_nombre: "IMPLANTES", requiere: false },
      ];
    }
    
    // Calcular subtotales desde los items
    const subtotalProcedimientos = items
      .filter((item: any) => item.tipo === 'procedimiento')
      .reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    
    const subtotalAdicionales = items
      .filter((item: any) => item.tipo === 'adicional')
      .reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    
    const subtotalOtrosAdicionales = items
      .filter((item: any) => item.tipo === 'otroAdicional')
      .reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    
    console.log("💰 Subtotal calculados:", {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales
    });
    
    // Calcular fecha de vencimiento
    let fecha_vencimiento = frontendCotizacion.fecha_vencimiento;
    if (!fecha_vencimiento && frontendCotizacion.validez_dias) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + parseInt(frontendCotizacion.validez_dias));
      fecha_vencimiento = fecha.toISOString().split('T')[0];
    } else if (!fecha_vencimiento) {
      // Valor por defecto: 7 días desde hoy
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 7);
      fecha_vencimiento = fecha.toISOString().split('T')[0];
    }
    
    // **CONSTRUIR DATOS PARA ENVIAR**
    const data: any = {
      // Campos básicos siempre requeridos
      paciente_id: parseInt(frontendCotizacion.paciente_id || frontendCotizacion.id_paciente || 0),
      usuario_id: parseInt(frontendCotizacion.usuario_id) || 1,
      estado_id: estado_id,  // **USAR EL ESTADO_ID CALCULADO**
      
      // Campos opcionales - solo incluirlos si tienen valor
      ...(frontendCotizacion.observaciones ? { observaciones: frontendCotizacion.observaciones } : {}),
      ...(fecha_vencimiento ? { fecha_vencimiento } : {}),
      ...(frontendCotizacion.validez_dias ? { validez_dias: parseInt(frontendCotizacion.validez_dias) } : { validez_dias: 7 }),
      
      // Campos de lista
      ...(items.length > 0 ? { items } : { items: [] }),
      ...(servicios_incluidos.length > 0 ? { servicios_incluidos } : { servicios_incluidos: [] }),
      
      // **NUNCA incluir 'total' - se calcula automáticamente en la BD**
      // Pero SÍ incluir subtotales que se usan para calcular el total
      subtotal_procedimientos: subtotalProcedimientos,
      subtotal_adicionales: subtotalAdicionales,
      subtotal_otros_adicionales: subtotalOtrosAdicionales,
    };
    
    // **Solo para actualización, podemos incluir el plan_id si existe**
    if (frontendCotizacion.plan_id) {
      data.plan_id = parseInt(frontendCotizacion.plan_id);
    }
    
    console.log("📤 Datos finales para enviar al backend:", {
      ...data,
      estado_id_enviado: data.estado_id,
      estado_nombre: Object.keys(estadoMap).find(key => estadoMap[key] === data.estado_id),
      numero_items: items.length,
      numero_servicios: servicios_incluidos.length
    });
    console.log("🚫 Campos EXPLÍCITAMENTE excluidos: 'total', 'id' (en body)");
    
    return data;
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

  planQuirurgicoToBackend: (frontendPlan: any) => {
    console.log("🚀 Transformando plan quirúrgico para backend:", {
      id: frontendPlan.id,
      paciente_id: frontendPlan.id_paciente,
      hasEsquema: !!frontendPlan.esquema_mejorado
    });
    
    // Calcular IMC
    const peso = frontendPlan.datos_paciente?.peso ? parseFloat(frontendPlan.datos_paciente.peso) : null;
    const altura = frontendPlan.datos_paciente?.altura ? parseFloat(frontendPlan.datos_paciente.altura) : null;
    let imc = frontendPlan.datos_paciente?.imc ? parseFloat(frontendPlan.datos_paciente.imc) : null;
    let categoriaIMC = frontendPlan.datos_paciente?.categoriaIMC || '';
    
    if (!imc && peso && altura && altura > 0) {
      imc = peso / (altura * altura);
      
      // Determinar categoría IMC
      if (imc < 18.5) {
        categoriaIMC = "Bajo peso";
      } else if (imc < 25) {
        categoriaIMC = "Saludable";
      } else if (imc < 30) {
        categoriaIMC = "Sobrepeso";
      } else {
        categoriaIMC = "Obesidad";
      }
    }
    
    // Calcular edad si no está presente
    let edad_calculada = frontendPlan.datos_paciente?.edad || frontendPlan.historia_clinica?.edad_calculada || 0;
    let edad = edad_calculada; // Nuevo campo 'edad' (distinto de edad_calculada)
    
    if (!edad_calculada && frontendPlan.historia_clinica?.fecha_nacimiento) {
      const fechaNacimiento = new Date(frontendPlan.historia_clinica.fecha_nacimiento);
      const hoy = new Date();
      edad_calculada = hoy.getFullYear() - fechaNacimiento.getFullYear();
      edad = edad_calculada;
      
      // Ajustar si aún no ha cumplido años este año
      const mesCumple = fechaNacimiento.getMonth();
      const diaCumple = fechaNacimiento.getDate();
      const mesActual = hoy.getMonth();
      const diaActual = hoy.getDate();
      
      if (mesActual < mesCumple || (mesActual === mesCumple && diaActual < diaCumple)) {
        edad_calculada--;
        edad = edad_calculada;
      }
    }
    
    // Obtener datos del paciente si existen
    const pacienteNombre = frontendPlan.datos_paciente?.nombre_completo || 
                          frontendPlan.historia_clinica?.nombre_completo || '';
    const pacienteIdentificacion = frontendPlan.datos_paciente?.identificacion || 
                                  frontendPlan.historia_clinica?.identificacion || '';
    
    // Preparar imagen_procedimiento
    const imagen_procedimiento = frontendPlan.imagenes_adjuntas && frontendPlan.imagenes_adjuntas.length > 0 ?
      (Array.isArray(frontendPlan.imagenes_adjuntas) ? 
      JSON.stringify(frontendPlan.imagenes_adjuntas) : 
      frontendPlan.imagenes_adjuntas) : null;
    
    // Preparar campos JSON
    const enfermedad_actual = frontendPlan.historia_clinica?.enfermedad_actual || {};
    const antecedentes = frontendPlan.historia_clinica?.antecedentes || {};
    const notas_corporales = frontendPlan.historia_clinica?.notas_corporales || {};
    const esquema_mejorado = frontendPlan.esquema_mejorado || {};
    
    return {
      // 1. IDs básicos (2 campos)
      paciente_id: parseInt(frontendPlan.id_paciente) || 0,
      usuario_id: parseInt(frontendPlan.id_usuario || '1'),
      
      // 2. Datos quirúrgicos básicos (6 campos)
      procedimiento_desc: frontendPlan.historia_clinica?.diagnostico || 
                        frontendPlan.historia_clinica?.motivo_consulta || '',
      anestesiologo: frontendPlan.conducta_quirurgica?.tipo_anestesia || '',
      materiales_requeridos: frontendPlan.historia_clinica?.diagnostico || '',
      notas_preoperatorias: frontendPlan.notas_doctor || '',
      riesgos: frontendPlan.historia_clinica?.diagnostico || '',
      hora: frontendPlan.conducta_quirurgica?.duracion_estimada ? 
            `00:${frontendPlan.conducta_quirurgica.duracion_estimada}:00` : null,
      
      // 3. Fecha programada (1 campo)
      fecha_programada: frontendPlan.datos_paciente?.fecha_consulta || null,
      
      // 4. Datos personales básicos (5 campos)
      nombre_completo: pacienteNombre,
      peso: peso,
      altura: altura,
      fecha_nacimiento: frontendPlan.historia_clinica?.fecha_nacimiento || null,
      imc: imc,
      
      // 5. Imagen y procedimiento (4 campos)
      imagen_procedimiento: imagen_procedimiento,
      fecha_ultimo_procedimiento: null, // No disponible en frontend
      descripcion_procedimiento: frontendPlan.historia_clinica?.plan_conducta || '',
      detalles: frontendPlan.historia_clinica?.motivo_consulta || '',
      
      // 6. Notas y tiempo cirugía (2 campos)
      notas_doctor: frontendPlan.notas_doctor || '', // CAMBIADO: notas_del_doctor → notas_doctor
      tiempo_cirugia_minutos: frontendPlan.conducta_quirurgica?.duracion_estimada || null,
      
      // 7. Entidad y datos contacto (7 campos)
      entidad: frontendPlan.historia_clinica?.entidad || '',
      edad: edad, // NUEVO CAMPO: edad (no confundir con edad_calculada)
      telefono: frontendPlan.historia_clinica?.telefono || '', // CAMBIADO: telefono_fijo → telefono
      celular: frontendPlan.historia_clinica?.celular || '',
      direccion: frontendPlan.historia_clinica?.direccion || '',
      email: frontendPlan.historia_clinica?.email || '',
      motivo_consulta: frontendPlan.historia_clinica?.motivo_consulta || '',
      
      // 8. Antecedentes (texto plano) (6 campos)
      farmacologicos: frontendPlan.historia_clinica?.antecedentes?.farmacologicos || '',
      traumaticos: frontendPlan.historia_clinica?.antecedentes?.traumaticos || '',
      quirurgicos: frontendPlan.historia_clinica?.antecedentes?.quirurgicos || '',
      alergicos: frontendPlan.historia_clinica?.antecedentes?.alergicos || '',
      toxicos: frontendPlan.historia_clinica?.antecedentes?.toxicos || '',
      habitos: frontendPlan.historia_clinica?.antecedentes?.habitos || '',
      
      // 9. Examen físico (texto plano) (7 campos)
      cabeza: frontendPlan.historia_clinica?.notas_corporales?.cabeza || '',
      mamas: frontendPlan.historia_clinica?.notas_corporales?.mamas || '',
      tcs: frontendPlan.historia_clinica?.notas_corporales?.tcs || '',
      abdomen: frontendPlan.historia_clinica?.notas_corporales?.abdomen || '',
      gluteos: frontendPlan.historia_clinica?.notas_corporales?.gluteos || '',
      extremidades: frontendPlan.historia_clinica?.notas_corporales?.extremidades || '',
      pies_faneras: frontendPlan.historia_clinica?.notas_corporales?.pies_faneras || '',
      
      // 10. Identificación y consulta (6 campos)
      identificacion: pacienteIdentificacion,
      fecha_consulta: frontendPlan.datos_paciente?.fecha_consulta || new Date().toISOString().split('T')[0],
      hora_consulta: frontendPlan.datos_paciente?.hora_consulta || new Date().toTimeString().slice(0, 5),
      categoriaIMC: categoriaIMC,
      edad_calculada: edad_calculada,
      ocupacion: frontendPlan.historia_clinica?.ocupacion || '',
      
      // 11. Campos JSON (3 campos)
      enfermedad_actual: enfermedad_actual,
      antecedentes: antecedentes,
      notas_corporales: notas_corporales,
      
      // 12. Datos quirúrgicos específicos (7 campos)
      duracion_estimada: frontendPlan.conducta_quirurgica?.duracion_estimada || null,
      tipo_anestesia: frontendPlan.conducta_quirurgica?.tipo_anestesia || '',
      requiere_hospitalizacion: frontendPlan.conducta_quirurgica?.requiere_hospitalizacion || false,
      tiempo_hospitalizacion: frontendPlan.conducta_quirurgica?.tiempo_hospitalizacion || '',
      reseccion_estimada: frontendPlan.conducta_quirurgica?.reseccion_estimada || '',
      firma_cirujano: frontendPlan.conducta_quirurgica?.firma_cirujano || '',
      firma_paciente: frontendPlan.conducta_quirurgica?.firma_paciente || '',
      
      // 13. NUEVOS CAMPOS AGREGADOS (3 campos)
      plan_conducta: frontendPlan.historia_clinica?.plan_conducta || '',
      esquema_mejorado: esquema_mejorado
      // fecha_modificacion se maneja automáticamente en el backend
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

// Funciones helper para cotizaciones - VERSIÓN MEJORADA
export const cotizacionHelpers = {
  // Mapear estado a color
  getEstadoColor: (estado: string): string => {
    switch (estado) {
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "aceptada": return "bg-green-100 text-green-800";
      case "rechazada": return "bg-red-100 text-red-800";
      case "facturada": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  },

  // Mapear estado a etiqueta
  getEstadoLabel: (estado: string): string => {
    switch (estado) {
      case "pendiente": return "Pendiente";
      case "aceptada": return "Aceptada";
      case "rechazada": return "Rechazada";
      case "facturada": return "Facturada";
      default: return estado;
    }
  },

  // Estados disponibles
  estadosDisponibles: [
    "pendiente", "aceptada", "rechazada", "facturada"
  ],

  // Calcular totales de una cotización - FUNCIÓN CRÍTICA MEJORADA
  calcularTotales: (items: any[]): {
    subtotalProcedimientos: number;
    subtotalAdicionales: number;
    subtotalOtrosAdicionales: number;
    total: number;
  } => {
    console.log("🔢 Calculando totales para items:", items);
    
    let subtotalProcedimientos = 0;
    let subtotalAdicionales = 0;
    let subtotalOtrosAdicionales = 0;
    
    items.forEach((item, index) => {
      // Asegurarse de que los valores sean números
      const cantidad = Number(item.cantidad) || 1;
      const precioUnitario = Number(item.precio_unitario) || 0;
      const subtotal = Number(item.subtotal) || (cantidad * precioUnitario);
      
      console.log(`Item ${index} (${item.tipo}):`, {
        nombre: item.nombre,
        cantidad,
        precioUnitario,
        subtotal,
        tipo: item.tipo
      });
      
      // Clasificar por tipo
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
          // Si no tiene tipo, asumir procedimiento
          if (item.nombre?.toLowerCase().includes('procedimiento')) {
            subtotalProcedimientos += subtotal;
          } else {
            subtotalAdicionales += subtotal;
          }
      }
    });
    
    const total = subtotalProcedimientos + subtotalAdicionales + subtotalOtrosAdicionales;
    
    console.log("🧮 Resultados del cálculo:", {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      total
    });
    
    return {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      total
    };
  },

  // Formatear número a moneda colombiana
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Servicios incluidos por defecto
  serviciosIncluidosDefault: () => [
    { servicio_nombre: "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", requiere: false },
    { servicio_nombre: "ANESTESIOLOGO", requiere: false },
    { servicio_nombre: "CONTROLES CON MEDICO Y ENFERMERA", requiere: false },
    { servicio_nombre: "VALORACION CON ANESTESIOLOGO", requiere: false },
    { servicio_nombre: "HEMOGRAMA DE CONTROL", requiere: false },
    { servicio_nombre: "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", requiere: false },
    { servicio_nombre: "IMPLANTES", requiere: false },
  ],

  // Calcular fecha de vencimiento
  calcularFechaVencimiento: (diasValidez: number = 7): string => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasValidez);
    return fecha.toISOString().split('T')[0];
  },

  // Función auxiliar para calcular total rápido
  calcularTotalRapido: (subtotalProcedimientos: number, subtotalAdicionales: number, subtotalOtrosAdicionales: number): number => {
    return subtotalProcedimientos + subtotalAdicionales + subtotalOtrosAdicionales;
  }
};

// Exportar también la función de prevención de duplicados
export { preventDuplicateCall };