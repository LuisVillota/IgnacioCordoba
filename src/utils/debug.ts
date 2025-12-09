import { api, debugAPI } from '@/lib/api';

export async function testBackendConnection() {
  console.log('🧪 Probando conexión backend...');
  
  // 1. Probar conexión básica
  const connection = await api.testConnection();
  console.log('📡 Conexión:', connection);
  
  if (!connection.success) {
    console.error('❌ No se puede conectar al backend');
    return;
  }
  
  // 2. Probar login directamente
  console.log('\n🔐 Probando login...');
  const loginTest = await api.testLoginDirect('admin', 'admin123');
  console.log('Login test:', loginTest);
  
  // 3. Probar endpoint de test
  console.log('\n🌐 Probando endpoint de test...');
  try {
    const test = await api.testBackend();
    console.log('Backend test:', test);
  } catch (error) {
    console.error('Error en test:', error);
  }
}