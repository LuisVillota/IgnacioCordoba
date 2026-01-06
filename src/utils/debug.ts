import { api } from '@/lib/api';

export async function testBackendConnection() {
  console.log('🧪 Probando conexión backend...');
  
  try {
    // 1. Probar conexión básica
    const connection = await api.testConnection?.();
    console.log('📡 Conexión:', connection);
    
    if (!connection?.success) {
      console.error('❌ No se puede conectar al backend');
      return;
    }
    
    // 2. Probar login usando el método existente
    console.log('\n🔐 Probando login...');
    try {
      // Usar el método login normal
      const loginTest = await api.login?.('admin', 'admin123');
      console.log('Login test:', loginTest);
    } catch (loginError) {
      console.log('Login falló (posiblemente credenciales incorrectas):', loginError);
    }
    
    // 3. Probar endpoint de test si existe
    console.log('\n🌐 Probando endpoint de test...');
    try {
      const test = await api.testBackend?.();
      console.log('Backend test:', test);
    } catch (testError) {
      console.log('Test endpoint no disponible:', testError);
    }
    
    // 4. Probar obtener usuarios si existe
    console.log('\n👥 Probando obtener usuarios...');
    try {
      const usuarios = await api.getUsuarios?.();
      console.log('Usuarios obtenidos:', usuarios?.length || 0);
    } catch (usersError) {
      console.log('No se pudieron obtener usuarios:', usersError);
    }
    
  } catch (error) {
    console.error('❌ Error en test general:', error);
  }
}