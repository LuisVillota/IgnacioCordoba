import { api } from '@/lib/api';

export async function testBackendConnection() {
  
  try {
    // 1. Probar conexión básica
    const connection = await api.testConnection?.();
    
    if (!connection?.success) {
      return;
    }
    
    // 2. Probar login usando el método existente
    try {
      // Usar el método login normal
      const loginTest = await api.login?.('admin', 'admin123');
    } catch (loginError) {
    }
    
    // 3. Probar endpoint de test si existe
    try {
      const test = await api.testBackend?.();
    } catch (testError) {
    }
    
    // 4. Probar obtener usuarios si existe
    try {
      const usuarios = await api.getUsuarios?.();
    } catch (usersError) {
    }
    
  } catch (error) {
  }
}