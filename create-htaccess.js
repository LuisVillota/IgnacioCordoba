const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');

// Crear carpeta out si no existe
if (!fs.existsSync(outDir)) {
  console.log('Creando carpeta out/...');
  fs.mkdirSync(outDir, { recursive: true });
}

const htaccessContent = `# Deshabilitar caché completamente
<IfModule mod_headers.c>
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</IfModule>

# Forzar revalidación
<FilesMatch "\\.(html|htm|js|css)$">
  FileETag None
  <IfModule mod_headers.c>
    Header unset ETag
    Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "Wed, 11 Jan 1984 05:00:00 GMT"
  </IfModule>
</FilesMatch>

# Redireccionar a HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Manejo de rutas de Next.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^.]+)$ $1.html [NC,L]
`;

const htaccessPath = path.join(outDir, '.htaccess');

try {
  fs.writeFileSync(htaccessPath, htaccessContent);
  console.log('✅ .htaccess creado exitosamente en out/');
} catch (error) {
  console.error('❌ Error creando .htaccess:', error);
  process.exit(1);
}