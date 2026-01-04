// src/test-diagnostic.ts
console.log('🔍 Diagnóstico completo del sistema\n');

// 1. Probar import de permissions
try {
  const { rolePermissions } = require('@/types/permissions');
  console.log('✅ Permissions importado correctamente');
  console.log('📋 Roles disponibles:', Object.keys(rolePermissions));
  console.log('Permisos de admin:', rolePermissions.admin?.slice(0, 5), '...');
} catch (error: any) {
  console.log('❌ Error importando permissions:', error.message);
  
  // Intentar con ruta relativa
  try {
    const { rolePermissions } = require('../types/permissions');
    console.log('✅ Permissions importado con ruta relativa');
  } catch (error2: any) {
    console.log('❌ También falló con ruta relativa:', error2.message);
  }
}

// 2. Probar ruta física del archivo
const path = require('path');
const fs = require('fs');

console.log('\n📁 Verificando archivos:');
const permissionsPath = path.resolve(__dirname, '../types/permissions.ts');
const permissionsPath2 = path.resolve(__dirname, 'types/permissions.ts');

console.log('   Ruta 1:', permissionsPath, '- Existe:', fs.existsSync(permissionsPath));
console.log('   Ruta 2:', permissionsPath2, '- Existe:', fs.existsSync(permissionsPath2));

// 3. Probar estructura de directorios
console.log('\n📂 Estructura del directorio types:');
const typesDir = path.resolve(__dirname, '../types');
if (fs.existsSync(typesDir)) {
  const files = fs.readdirSync(typesDir);
  console.log('   Archivos en types:', files);
} else {
  console.log('   ❌ Directorio types no existe');
}

// 4. Probar tsconfig
console.log('\n⚙️ Verificando tsconfig.json:');
const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  console.log('   baseUrl:', tsconfig.compilerOptions?.baseUrl);
  console.log('   paths:', JSON.stringify(tsconfig.compilerOptions?.paths, null, 2));
}

// 5. Leer directamente el archivo permissions.ts
console.log('\n📄 Contenido de permissions.ts (primeras líneas):');
if (fs.existsSync(permissionsPath)) {
  const content = fs.readFileSync(permissionsPath, 'utf8');
  const lines = content.split('\n').slice(0, 10);
  lines.forEach((line: string, i: number) => console.log(`   ${i + 1}: ${line}`));
}