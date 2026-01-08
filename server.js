// server.js - Versión optimizada para producción
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Cargar variables de entorno
require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.local' 
});

// Configuración para producción
const dev = process.env.NODE_ENV !== 'production';

// Hostinger proporciona estas variables
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('🚀 Iniciando servidor con configuración:', {
  nodeEnv: process.env.NODE_ENV,
  hostname,
  port,
  apiUrl: process.env.NEXT_PUBLIC_API_URL
});

// Crear la app Next.js
const app = next({ 
  dev,
  hostname,
  port,
  // Configuración para producción
  dir: __dirname
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Headers de seguridad
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error manejando solicitud:', req.url, err);
      res.statusCode = 500;
      res.end('Error interno del servidor');
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`✅ Servidor listo en http://${hostname}:${port}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
  });

  // Manejo de cierre elegante
  process.on('SIGINT', () => {
    console.log('👋 Recibido SIGINT. Cerrando servidor...');
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
  });

}).catch((err) => {
  console.error('❌ Error preparando la app Next.js:', err);
  process.exit(1);
});