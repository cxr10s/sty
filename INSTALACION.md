# 🚀 Instalación Rápida - Estilo Activo

## ⚡ Inicio Rápido (5 minutos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables básicas
Crea un archivo `.env` con:
```env
PORT=3000
JWT_SECRET=mi-clave-secreta-super-segura
SESSION_SECRET=mi-clave-sesion-super-segura
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion
```

### 3. Ejecutar la aplicación
```bash
npm run dev
```

### 4. Abrir en el navegador
```
http://localhost:3000
```

## 🧪 Modo de Prueba

### Usuario de prueba para login:
- **Email:** `admin@test.com`
- **Contraseña:** `password123`

### Código de verificación de prueba:
- **Código:** `123456`

## 🔧 Configuración Completa

### Para usar OAuth (Google/Facebook):

1. **Google OAuth:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un proyecto
   - Habilita Google+ API
   - Crea credenciales OAuth2
   - Agrega `http://localhost:3000/auth/google/callback` a URIs de redirección

2. **Facebook OAuth:**
   - Ve a [Facebook Developers](https://developers.facebook.com/)
   - Crea una aplicación
   - Agrega Facebook Login
   - Configura `http://localhost:3000/auth/facebook/callback`

3. **Agregar al .env:**
   ```env
   GOOGLE_CLIENT_ID=tu-google-client-id
   GOOGLE_CLIENT_SECRET=tu-google-client-secret
   FACEBOOK_APP_ID=tu-facebook-app-id
   FACEBOOK_APP_SECRET=tu-facebook-app-secret
   ```

### Para envío de emails:

1. **Gmail:**
   - Habilita verificación en 2 pasos
   - Genera contraseña de aplicación
   - Usa esa contraseña en `EMAIL_PASS`

## 🎯 Funcionalidades Disponibles

### ✅ Completamente Funcional:
- ✅ Login/Registro con validación
- ✅ Verificación por email
- ✅ OAuth con Google/Facebook
- ✅ Sistema de carrito
- ✅ Procesamiento de pagos
- ✅ Sección "Mis Productos"
- ✅ Validación de edad (18+)
- ✅ Seguridad completa

### 🔄 Modo Simulación:
- 🔄 Pagos con Nequi/Bancolombia (simulados)
- 🔄 Envío de emails (simulado en consola)

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev

# Producción
npm start

# Ver logs
npm run dev | grep "Servidor corriendo"
```

## 🐛 Solución de Problemas

### Error: "Backend no disponible"
- Verifica que el servidor esté corriendo en puerto 3000
- Revisa la consola para errores

### Error: "Email no enviado"
- Verifica las credenciales de Gmail
- Revisa la contraseña de aplicación

### Error: "OAuth no funciona"
- Verifica las URLs de redirección
- Revisa los Client IDs y Secrets

## 📱 Prueba en Móvil

Para probar en dispositivos móviles:
1. Encuentra tu IP local: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)
2. Cambia `localhost` por tu IP en el navegador móvil
3. Ejemplo: `http://192.168.1.100:3000`

## 🎉 ¡Listo!

Tu tienda deportiva está funcionando con:
- Sistema de autenticación completo
- Carrito de compras
- Procesamiento de pagos
- Gestión de usuarios
- Seguridad implementada

¡Disfruta tu nueva tienda online! 🛍️
