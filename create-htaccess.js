const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');

if (!fs.existsSync(outDir)) {
  console.log('Creando carpeta out/...');
  fs.mkdirSync(outDir, { recursive: true });
}

const htaccessContent = `# Deshabilitar caché
<IfModule mod_headers.c>
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</IfModule>

# Habilitar RewriteEngine
RewriteEngine On
RewriteBase /

# Redireccionar a HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Permitir acceso directo a archivos estáticos
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Para rutas sin extensión, intentar agregar .html
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.*)$ $1.html [L]

# Fallback a index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`;

const htaccessPath = path.join(outDir, '.htaccess');

try {
  fs.writeFileSync(htaccessPath, htaccessContent);
  console.log('✅ .htaccess creado exitosamente en out/');
} catch (error) {
  console.error('❌ Error creando .htaccess:', error);
  process.exit(1);
}