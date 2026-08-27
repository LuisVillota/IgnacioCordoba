const fs = require('fs');
const path = require('path');

// Next.js 16 puede usar diferentes carpetas de salida
const possibleDirs = [
  path.join(__dirname, 'out'),
  path.join(__dirname, '.next', 'standalone'),
  path.join(__dirname, '.next', 'server', 'pages')
];

let buildDir = null;

// Encontrar la carpeta correcta
for (const dir of possibleDirs) {
  if (fs.existsSync(dir)) {
    buildDir = dir;
    break;
  }
}

if (!buildDir) {
  
  // Crear carpeta out manualmente desde .next
  const nextDir = path.join(__dirname, '.next');
  const outDir = path.join(__dirname, 'out');
  
  if (fs.existsSync(nextDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    
    // Copiar archivos necesarios
    const staticDir = path.join(nextDir, 'static');
    const serverDir = path.join(nextDir, 'server', 'pages');
    
    if (fs.existsSync(staticDir)) {
      const destStatic = path.join(outDir, '_next', 'static');
      fs.mkdirSync(destStatic, { recursive: true });
      fs.cpSync(staticDir, destStatic, { recursive: true });
    }
    
    if (fs.existsSync(serverDir)) {
      fs.cpSync(serverDir, outDir, { recursive: true });
    }
    
    buildDir = outDir;
  } else {
    process.exit(1);
  }
}

// Tu lógica adicional de postbuild aquí...
