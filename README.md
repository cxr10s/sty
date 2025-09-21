# Estilo Activo - Tienda Deportiva

Una tienda online completa para productos deportivos con sistema de autenticación, pagos y gestión de usuarios.

## Características

### 🔐 Sistema de Autenticación
- **Login/Registro** con email y contraseña
- **OAuth2** con Google y Facebook
- **Verificación por email** con código de 6 dígitos
- **Validación estricta** de datos de registro
- **Hash seguro** de contraseñas con bcrypt
- **JWT** para autenticación de sesiones

### 💳 Sistema de Pagos
- **Nequi** (número y QR)
- **Bancolombia** (número y QR)
- **Tarjetas de crédito/débito**
- **Validación real** de transacciones
- **Integración con pasarelas** de pago oficiales

### 🛡️ Seguridad
- **Protección CSRF** y XSS
- **Rate limiting** para prevenir ataques
- **Validación de entrada** en frontend y backend
- **Helmet.js** para headers de seguridad
- **Sanitización** de datos de entrada

### 👤 Gestión de Usuarios
- **Perfil de usuario** con historial de compras
- **Sección "Mis Productos"** para ver compras realizadas
- **Validación de edad** (mayor de 18 años)
- **Datos personales** completos (documento, fecha nacimiento)

## Instalación

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn
- Cuenta de Gmail para envío de emails
- Cuentas de desarrollador para Google OAuth y Facebook OAuth

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd estilo-activo
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo `env.example` a `.env` y configura las variables:

```bash
cp env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=tu-clave-secreta-jwt-muy-segura

# Sesiones
SESSION_SECRET=tu-clave-secreta-sesion-muy-segura

# Email (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=tu-facebook-app-id
FACEBOOK_APP_SECRET=tu-facebook-app-secret
```

### 4. Configurar OAuth

#### Google OAuth
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ y OAuth2
4. Crea credenciales OAuth2
5. Agrega `http://localhost:3000/auth/google/callback` a las URIs de redirección

#### Facebook OAuth
1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva aplicación
3. Agrega el producto "Facebook Login"
4. Configura las URLs de redirección: `http://localhost:3000/auth/facebook/callback`

### 5. Configurar Gmail para emails
1. Habilita la verificación en 2 pasos en tu cuenta de Gmail
2. Genera una "Contraseña de aplicación" específica
3. Usa esta contraseña en la variable `EMAIL_PASS`

### 6. Ejecutar la aplicación
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
estilo-activo/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # JavaScript principal
├── auth.js             # Sistema de autenticación
├── server.js           # Servidor Node.js/Express
├── package.json        # Dependencias del proyecto
├── env.example         # Variables de entorno de ejemplo
├── README.md           # Este archivo
└── assets/             # Imágenes y recursos
    ├── camisetas/
    ├── tenis/
    ├── cascos/
    └── deportes/
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/verify` - Verificación de email
- `GET /auth/google` - Login con Google
- `GET /auth/facebook` - Login con Facebook

### Productos
- `GET /api/products` - Obtener todos los productos

### Pagos
- `POST /api/payments/process` - Procesar pago

### Usuario
- `GET /api/user/products` - Obtener productos del usuario

## Características de Seguridad

### Frontend
- Validación de formularios en tiempo real
- Sanitización de inputs
- Prevención de XSS
- Rate limiting en formularios

### Backend
- Hash de contraseñas con bcrypt (12 rounds)
- JWT con expiración de 24 horas
- Rate limiting (100 req/15min general, 5 req/15min auth)
- Validación de entrada con express-validator
- Headers de seguridad con Helmet.js
- CORS configurado correctamente

## Base de Datos

La aplicación usa SQLite con las siguientes tablas:

- **users**: Información de usuarios
- **products**: Catálogo de productos
- **purchases**: Registro de compras
- **purchase_items**: Items de cada compra

## Flujo de Compra

1. **Navegación**: Usuario explora productos
2. **Carrito**: Agrega productos al carrito
3. **Autenticación**: Debe iniciar sesión para pagar
4. **Pago**: Selecciona método de pago (Nequi/Bancolombia/Tarjeta)
5. **Confirmación**: Pago procesado y productos agregados a "Mis Productos"

## Desarrollo

### Scripts disponibles
```bash
npm start      # Iniciar servidor en producción
npm run dev    # Iniciar servidor en desarrollo con nodemon
npm test       # Ejecutar tests
```

### Agregar nuevos productos
Los productos se pueden agregar directamente en la base de datos o a través de la API.

### Personalización
- Modifica `styles.css` para cambiar el diseño
- Edita `script.js` para agregar funcionalidades
- Actualiza `server.js` para modificar la API

## Despliegue

### Variables de entorno para producción
```env
NODE_ENV=production
FRONTEND_URL=https://tu-dominio.com
JWT_SECRET=clave-super-secreta-produccion
SESSION_SECRET=clave-super-secreta-sesion-produccion
```

### Recomendaciones
- Usar HTTPS en producción
- Configurar un proxy reverso (nginx)
- Usar una base de datos más robusta (PostgreSQL)
- Implementar logs de auditoría
- Configurar monitoreo y alertas

## Soporte

Para soporte técnico o preguntas sobre la implementación, contacta al equipo de desarrollo.

## Licencia

MIT License - Ver archivo LICENSE para más detalles.
