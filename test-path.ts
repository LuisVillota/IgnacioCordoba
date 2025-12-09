// test-path.ts (en la raíz, temporal)
import * as path from 'path';

console.log('🔍 Diagnóstico de rutas:');
console.log('Directorio actual:', __dirname);
console.log('Ruta a src:', path.resolve(__dirname, 'src'));
console.log('Ruta a src/lib:', path.resolve(__dirname, 'src/lib'));

// Verificar si existe src
import * as fs from 'fs';
const srcExists = fs.existsSync(path.resolve(__dirname, 'src'));
console.log('src existe:', srcExists);

if (srcExists) {
  const files = fs.readdirSync(path.resolve(__dirname, 'src'));
  console.log('Contenido de src:', files);
}