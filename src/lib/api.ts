// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Función helper para formatear fecha/hora para MySQL
const formatDateTimeForDB = (fecha: string, hora: string): string => {
  // Asegurar que la fecha esté en formato YYYY-MM-DD
  let fechaFormateada = fecha;
  if (fecha.includes('T')) {
    // Si viene como '2025-12-09T00:00:00.000Z', extraer solo la fecha
    fechaFormateada = fecha.split('T')[0];
  }
  
  // Asegurar que la hora esté en formato HH:MM:SS
  let horaFormateada = hora;
  if (!hora.includes(':')) {
    horaFormateada = '09:00:00';
  } else if (hora.split(':').length === 2) {
    // Si es HH:MM, agregar segundos
    horaFormateada = `${hora}:00`;
  }
  
  return `${fechaFormateada} ${horaFormateada}`;
};

// Función helper para formatear fecha de consulta
const formatDateForDB = (fecha: string): string => {
  if (!fecha) return new Date().toISOString().split('T')[0];
  
  let fechaFormateada = fecha;
  if (fecha.includes('T')) {
    fechaFormateada = fecha.split('T')[0];
  }
  
  return fechaFormateada;
};

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
      let errorDetail = '';
      
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
        errorMessage = errorDetail;
      } catch {
        // Si no se puede parsear como JSON, intentar como texto
        try {
          const text = await response.text();
          if (text) errorMessage = text;
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

// Función para acortar tipos de cita para la BD
const shortenCitaType = (tipo: string): string => {
  const typeMap: Record<string, string> = {
    "programacion_quirurgica": "program_quir",
    "consulta": "consulta",
    "control": "control",
    "valoracion": "valoracion"
  };
  return typeMap[tipo] || "consulta";
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
  
  createCita: (data: any) => {
    console.log("📤 Creando cita con datos:", data);
    
    // Validar y formatear fecha_hora
    if (!data.fecha || !data.hora) {
      throw new Error("Fecha y hora son requeridas");
    }
    
    const fecha_hora = formatDateTimeForDB(data.fecha, data.hora);
    console.log("🔄 Formateado fecha_hora:", fecha_hora);
    
    // Mapear estado a estado_id según tu tabla Estado_Cita
    const estadoMap: Record<string, number> = {
      "pendiente": 1,      // ID del estado "Pendiente"
      "confirmada": 2,     // ID del estado "Confirmada"
      "completada": 3,     // ID del estado "Completada"
      "cancelada": 4       // ID del estado "Cancelada"
    };
    
    const backendData = {
      paciente_id: parseInt(data.id_paciente),
      usuario_id: parseInt(data.id_usuario) || 1,
      fecha_hora: fecha_hora,
      tipo: shortenCitaType(data.tipo_cita), // Usar tipo acortado
      duracion_minutos: data.duracion,
      estado_id: estadoMap[data.estado] || 1, // Default a "Pendiente"
      notas: data.observaciones || ''
    };
    
    console.log("📤 Enviando al backend:", backendData);
    
    return fetchAPI('/api/citas', { 
      method: 'POST', 
      body: JSON.stringify(backendData) 
    });
  },
  
  updateCita: (id: number, data: any) => {
    console.log("📤 Actualizando cita ID:", id, "con datos:", data);
    
    // Validar y formatear fecha_hora
    if (!data.fecha || !data.hora) {
      throw new Error("Fecha y hora son requeridas");
    }
    
    const fecha_hora = formatDateTimeForDB(data.fecha, data.hora);
    console.log("🔄 Formateado fecha_hora:", fecha_hora);
    
    // Mapear estado a estado_id
    const estadoMap: Record<string, number> = {
      "pendiente": 1,
      "confirmada": 2,
      "completada": 3,
      "cancelada": 4
    };
    
    const backendData = {
      paciente_id: parseInt(data.id_paciente),
      usuario_id: parseInt(data.id_usuario) || 1,
      fecha_hora: fecha_hora,
      tipo: shortenCitaType(data.tipo_cita), // Usar tipo acortado
      duracion_minutos: data.duracion,
      estado_id: estadoMap[data.estado] || 1,
      notas: data.observaciones || ''
    };
    
    console.log("📤 Enviando al backend:", backendData);
    
    return fetchAPI(`/api/citas/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(backendData) 
    });
  },
  
  deleteCita: (id: number) =>
    fetchAPI(`/api/citas/${id}`, { method: 'DELETE' }),
  
  // ===== HISTORIA CLÍNICA =====
  getHistoriasClinicas: (limit?: number, offset?: number) =>
    fetchAPI(`/api/historias-clinicas?limit=${limit || 100}&offset=${offset || 0}`),
  
  getHistoriasByPaciente: (pacienteId: number) =>
    fetchAPI(`/api/historias-clinicas/paciente/${pacienteId}`),
  
  getHistoriaClinica: (id: number) => fetchAPI(`/api/historias-clinicas/${id}`),
  
  createHistoriaClinica: (data: any) => {
    console.log("📤 Creando historia clínica con datos:", data);
    
    // Convertir antecedentes en un objeto JSON
    const antecedentesData = {
      medicos: data.antecedentes_medicos || '',
      quirurgicos: data.antecedentes_quirurgicos || '',
      alergicos: data.antecedentes_alergicos || '',
      farmacologicos: data.antecedentes_farmacologicos || ''
    };
    
    const backendData = {
      paciente_id: parseInt(data.paciente_id),
      usuario_id: parseInt(data.medico_id) || 1,
      fecha_consulta: data.fecha_consulta ? `${formatDateForDB(data.fecha_consulta)} 00:00:00` : new Date().toISOString().split('T')[0] + ' 00:00:00',
      motivo_consulta: data.motivo_consulta || '',
      antecedentes: JSON.stringify(antecedentesData),
      exploracion_fisica: data.exploracion_fisica || '',
      diagnostico: data.diagnostico || '',
      tratamiento: data.tratamiento || '',
      recomendaciones: data.recomendaciones || ''
    };
    
    console.log("📤 Enviando al backend:", backendData);
    
    return fetchAPI('/api/historias-clinicas', {
      method: 'POST',
      body: JSON.stringify(backendData)
    });
  },
  
  updateHistoriaClinica: (id: number, data: any) => {
    console.log("📤 Actualizando historia clínica ID:", id, "con datos:", data);
    
    // Convertir antecedentes en un objeto JSON
    const antecedentesData = {
      medicos: data.antecedentes_medicos || '',
      quirurgicos: data.antecedentes_quirurgicos || '',
      alergicos: data.antecedentes_alergicos || '',
      farmacologicos: data.antecedentes_farmacologicos || ''
    };
    
    const backendData = {
      paciente_id: parseInt(data.paciente_id),
      usuario_id: parseInt(data.medico_id) || 1,
      fecha_consulta: data.fecha_consulta ? `${formatDateForDB(data.fecha_consulta)} 00:00:00` : new Date().toISOString().split('T')[0] + ' 00:00:00',
      motivo_consulta: data.motivo_consulta || '',
      antecedentes: JSON.stringify(antecedentesData),
      exploracion_fisica: data.exploracion_fisica || '',
      diagnostico: data.diagnostico || '',
      tratamiento: data.tratamiento || '',
      recomendaciones: data.recomendaciones || ''
    };
    
    console.log("📤 Enviando al backend:", backendData);
    
    return fetchAPI(`/api/historias-clinicas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendData)
    });
  },
  
  deleteHistoriaClinica: (id: number) =>
    fetchAPI(`/api/historias-clinicas/${id}`, { method: 'DELETE' }),
  
  // ===== ESTADOS =====
  getEstadosCitas: () => fetchAPI('/api/estados/citas'),
  getEstadosQuirurgicos: () => fetchAPI('/api/estados/quirurgicos'),
  
  // ===== PROCEDIMIENTOS =====
  getProcedimientos: () => fetchAPI('/api/procedimientos'),
  getProcedimiento: (id: number) => fetchAPI(`/api/procedimientos/${id}`),
  
  // ===== DASHBOARD =====
  async getDashboardStats() {
    try {
      // Obtener pacientes y citas en paralelo para mejor rendimiento
      const [pacientesResponse, citasResponse] = await Promise.all([
        this.getPacientes(10000),
        this.getCitas(1000)
      ]);
      
      const totalPacientes = pacientesResponse.pacientes?.length || 0;
      
      // Contar citas de hoy
      const today = new Date().toISOString().split('T')[0];
      let citasHoy = 0;
      
      if (citasResponse && citasResponse.length) {
        citasHoy = citasResponse.filter((cita: any) => {
          if (cita.fecha_hora) {
            try {
              const citaDate = new Date(cita.fecha_hora);
              const citaDateStr = citaDate.toISOString().split('T')[0];
              return citaDateStr === today;
            } catch (dateError) {
              console.warn('Error procesando fecha de cita:', cita.fecha_hora, dateError);
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
      throw error;
    }
  },
  
  async getTotalPacientesCount() {
    const response = await this.getPacientes(10000);
    return response.pacientes?.length || 0;
  },
  
  async getCitasHoyCount() {
    const today = new Date().toISOString().split('T')[0];
    const response = await this.getCitas(1000);
    
    if (!response || !response.length) return 0;
    
    return response.filter((cita: any) => {
      if (cita.fecha_hora) {
        try {
          const citaDate = new Date(cita.fecha_hora);
          const citaDateStr = citaDate.toISOString().split('T')[0];
          return citaDateStr === today;
        } catch (dateError) {
          console.warn('Error procesando fecha de cita:', cita.fecha_hora, dateError);
          return false;
        }
      }
      return false;
    }).length;
  },
  
  // ===== TEST =====
  testBackend: () => fetchAPI('/api/test-frontend'),
  
  // ===== DIAGNÓSTICO =====
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
  
  testLoginDirect: async (username: string, password: string) => {
    try {
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      const response = await fetch(
        `${API_URL}/api/login?username=${encodedUsername}&password=${encodedPassword}`
      );
      
      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          status: response.status,
          message: `Login falló: ${response.status} ${response.statusText}`,
          body: text
        };
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: `Error en login: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

// Helper para manejar errores
export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
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
      
      // Si es string como '2024-01-15 14:30:00'
      if (fechaHoraStr.includes(' ')) {
        const [datePart, timePart] = fechaHoraStr.split(' ');
        fecha = datePart;
        hora = timePart ? timePart.substring(0, 5) : '09:00';
      }
      // Si es string como '2024-01-15T14:30:00.000Z'
      else if (fechaHoraStr.includes('T')) {
        const dateObj = new Date(fechaHoraStr);
        fecha = dateObj.toISOString().split('T')[0];
        hora = dateObj.toTimeString().substring(0, 5);
      }
    }
    
    // Mapear tipo acortado a tipo completo
    let tipoCompleto = "consulta";
    if (backendCita.tipo === "program_quir") tipoCompleto = "programacion_quirurgica";
    else if (backendCita.tipo === "consulta") tipoCompleto = "consulta";
    else if (backendCita.tipo === "control") tipoCompleto = "control";
    else if (backendCita.tipo === "valoracion") tipoCompleto = "valoracion";
    
    // Mapear estado_id a estado nombre
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
  
  // Transformar historia clínica del backend al formato del frontend
  historiaClinica: (backendHistoria: any) => {
    // Parsear antecedentes JSON
    let antecedentes = {
      medicos: '',
      quirurgicos: '',
      alergicos: '',
      farmacologicos: ''
    };
    
    try {
      if (backendHistoria.antecedentes) {
        if (typeof backendHistoria.antecedentes === 'string') {
          antecedentes = JSON.parse(backendHistoria.antecedentes);
        } else {
          antecedentes = backendHistoria.antecedentes;
        }
      }
    } catch (error) {
      console.warn('Error parseando antecedentes:', error);
    }
    
    // Extraer fecha de fecha_consulta
    let fechaCreacion = '';
    if (backendHistoria.fecha_consulta) {
      const fechaStr = backendHistoria.fecha_consulta.toString();
      if (fechaStr.includes(' ')) {
        fechaCreacion = fechaStr.split(' ')[0];
      } else if (fechaStr.includes('T')) {
        fechaCreacion = fechaStr.split('T')[0];
      } else {
        fechaCreacion = fechaStr;
      }
    } else if (backendHistoria.fecha_creacion) {
      const fechaStr = backendHistoria.fecha_creacion.toString();
      if (fechaStr.includes(' ')) {
        fechaCreacion = fechaStr.split(' ')[0];
      } else if (fechaStr.includes('T')) {
        fechaCreacion = fechaStr.split('T')[0];
      } else {
        fechaCreacion = fechaStr;
      }
    }
    
    return {
      id: backendHistoria.id?.toString() || '',
      id_paciente: backendHistoria.paciente_id?.toString() || '',
      fecha_creacion: fechaCreacion || new Date().toISOString().split('T')[0],
      motivo_consulta: backendHistoria.motivo_consulta || '',
      antecedentes_medicos: antecedentes.medicos || '',
      antecedentes_quirurgicos: antecedentes.quirurgicos || '',
      antecedentes_alergicos: antecedentes.alergicos || '',
      antecedentes_farmacologicos: antecedentes.farmacologicos || '',
      exploracion_fisica: backendHistoria.exploracion_fisica || '',
      diagnostico: backendHistoria.diagnostico || '',
      tratamiento: backendHistoria.tratamiento || '',
      recomendaciones: backendHistoria.recomendaciones || '',
      medico_id: backendHistoria.usuario_id?.toString() || '',
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
    // Convertir antecedentes en un objeto JSON
    const antecedentesData = {
      medicos: frontendHistoria.antecedentes_medicos || '',
      quirurgicos: frontendHistoria.antecedentes_quirurgicos || '',
      alergicos: frontendHistoria.antecedentes_alergicos || '',
      farmacologicos: frontendHistoria.antecedentes_farmacologicos || ''
    };
    
    return {
      paciente_id: parseInt(frontendHistoria.paciente_id),
      usuario_id: parseInt(frontendHistoria.medico_id) || 1,
      fecha_consulta: frontendHistoria.fecha_consulta ? `${formatDateForDB(frontendHistoria.fecha_consulta)} 00:00:00` : new Date().toISOString().split('T')[0] + ' 00:00:00',
      motivo_consulta: frontendHistoria.motivo_consulta || '',
      antecedentes: JSON.stringify(antecedentesData),
      exploracion_fisica: frontendHistoria.exploracion_fisica || '',
      diagnostico: frontendHistoria.diagnostico || '',
      tratamiento: frontendHistoria.tratamiento || '',
      recomendaciones: frontendHistoria.recomendaciones || ''
    };
  },
};

// Helper para debugging
export const debugAPI = {
  logRequest: (endpoint: string, options?: any) => {
    console.log('🔍 API Debug - Request:', {
      url: `${API_URL}${endpoint}`,
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body ? JSON.parse(options.body as string) : undefined
    });
  },
  
  logResponse: (response: any) => {
    console.log('🔍 API Debug - Response:', response);
  },
  
  testAllEndpoints: async () => {
    console.log('🧪 Probando conexión con backend...');
    
    const tests = [
      { name: 'Test Backend', fn: () => api.testBackend() },
      { name: 'Login (admin/admin123)', fn: () => api.login('admin', 'admin123') },
      { name: 'Usuarios', fn: () => api.getUsuarios() },
      { name: 'Pacientes', fn: () => api.getPacientes(5, 0) },
      { name: 'Citas', fn: () => api.getCitas(5, 0) },
      { name: 'Historia Clínica', fn: () => api.getHistoriasClinicas(5, 0) },
      { name: 'Procedimientos', fn: () => api.getProcedimientos() },
      { name: 'Dashboard Stats', fn: () => api.getDashboardStats() },
    ];
    
    const results = [];
    for (const test of tests) {
      try {
        console.log(`\n🧪 Probando: ${test.name}`);
        const result = await test.fn();
        console.log(`✅ ${test.name}: OK`);
        results.push({ test: test.name, success: true, data: result });
      } catch (error) {
        console.error(`❌ ${test.name}: ${error}`);
        results.push({ test: test.name, success: false, error });
      }
    }
    
    return results;
  }
};