const fs = require('fs');
const path = require('path');

const htaccessContent = `# Redirección HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Proxy inverso para Node.js (si Hostinger requiere)
<IfModule mod_proxy.c>
  ProxyPreserveHost On
  ProxyPass / http://localhost:3000/
  ProxyPassReverse / http://localhost:3000/
</IfModule>

# Manejo de rutas SPA (si es necesario)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]
`;

const htaccessPath = path.join(__dirname, '.htaccess');

try {
  fs.writeFileSync(htaccessPath, htaccessContent);
  console.log('✅ .htaccess creado exitosamente para SSR');
} catch (error) {
  console.error('❌ Error creando .htaccess:', error);
  process.exit(1);
}