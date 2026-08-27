// test-path.ts (en la raíz, temporal)
import * as path from 'path';


// Verificar si existe src
import * as fs from 'fs';
const srcExists = fs.existsSync(path.resolve(__dirname, 'src'));

if (srcExists) {
  const files = fs.readdirSync(path.resolve(__dirname, 'src'));
}