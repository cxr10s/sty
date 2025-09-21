const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://accounts.google.com", "https://connect.facebook.net"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});

app.use(limiter);

// Rate limiting más estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos.'
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(session({
    store: new SQLiteStore({ db: 'sessions.db' }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Configuración de base de datos
const db = new sqlite3.Database('estilo_activo.db');

// Inicializar base de datos
db.serialize(() => {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        lastname TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        doc_type TEXT NOT NULL,
        doc_number TEXT NOT NULL,
        birthdate DATE NOT NULL,
        provider TEXT DEFAULT 'local',
        provider_id TEXT,
        verified BOOLEAN DEFAULT 0,
        verification_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de productos
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        description TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de compras
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_data TEXT,
        transaction_id TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Tabla de items de compra
    db.run(`CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        product_price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (purchase_id) REFERENCES purchases (id)
    )`);

    // Insertar productos de ejemplo
    const products = [
        { name: 'Camiseta Adidas Clásica', price: 45000, category: 'camisetas', image_url: 'Camiseta Adidas clasica.webp' },
        { name: 'Camiseta Adidas Deportiva', price: 60000, category: 'camisetas', image_url: 'Camiseta adidas Madrid.webp' },
        { name: 'Tenis Adidas Ultraboost', price: 450000, category: 'tenis', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop' },
        { name: 'Casco Integral Negro', price: 190000, category: 'cascos', image_url: 'CascoIntegral.webp' },
        { name: 'Bicicleta Deportiva', price: 1200000, category: 'deportes', image_url: 'BicicletaVenta.jpg' }
    ];

    products.forEach(product => {
        db.run(`INSERT OR IGNORE INTO products (name, price, category, image_url) VALUES (?, ?, ?, ?)`,
            [product.name, product.price, product.category, product.image_url]);
    });
});

// Configuración de Passport
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        done(err, user);
    });
});

// Estrategia de Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name = profile.name.givenName;
        const lastname = profile.name.familyName;

        // Buscar usuario existente
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) return done(err);

            if (user) {
                return done(null, user);
            } else {
                // Crear nuevo usuario
                const newUser = {
                    name,
                    lastname,
                    email,
                    provider: 'google',
                    provider_id: profile.id,
                    verified: true
                };

                db.run(`INSERT INTO users (name, lastname, email, provider, provider_id, verified) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                    [newUser.name, newUser.lastname, newUser.email, newUser.provider, newUser.provider_id, newUser.verified],
                    function(err) {
                        if (err) return done(err);
                        newUser.id = this.lastID;
                        return done(null, newUser);
                    });
            }
        });
    } catch (error) {
        return done(error);
    }
}));

// Estrategia de Facebook OAuth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'your-facebook-app-id',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'your-facebook-app-secret',
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name = profile.name.givenName;
        const lastname = profile.name.familyName;

        // Buscar usuario existente
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) return done(err);

            if (user) {
                return done(null, user);
            } else {
                // Crear nuevo usuario
                const newUser = {
                    name,
                    lastname,
                    email,
                    provider: 'facebook',
                    provider_id: profile.id,
                    verified: true
                };

                db.run(`INSERT INTO users (name, lastname, email, provider, provider_id, verified) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                    [newUser.name, newUser.lastname, newUser.email, newUser.provider, newUser.provider_id, newUser.verified],
                    function(err) {
                        if (err) return done(err);
                        newUser.id = this.lastID;
                        return done(null, newUser);
                    });
            }
        });
    } catch (error) {
        return done(error);
    }
}));

// Configuración de email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rutas de autenticación
app.post('/api/auth/register', authLimiter, [
    body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('lastname').trim().isLength({ min: 2 }).withMessage('Los apellidos deben tener al menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('docType').notEmpty().withMessage('Tipo de documento requerido'),
    body('docNumber').isLength({ min: 6 }).withMessage('Número de documento inválido'),
    body('birthdate').isISO8601().withMessage('Fecha de nacimiento inválida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const { name, lastname, email, password, docType, docNumber, birthdate } = req.body;

        // Verificar si el usuario ya existe
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error del servidor' });
            }

            if (existingUser) {
                return res.status(400).json({ success: false, message: 'El email ya está registrado' });
            }

            // Verificar edad
            const birthDate = new Date(birthdate);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18) {
                return res.status(400).json({ success: false, message: 'Debes ser mayor de 18 años' });
            }

            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 12);
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Crear usuario
            db.run(`INSERT INTO users (name, lastname, email, password, doc_type, doc_number, birthdate, verification_code) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, lastname, email, hashedPassword, docType, docNumber, birthdate, verificationCode],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error al crear usuario' });
                    }

                    // Enviar email de verificación
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: 'Verificación de cuenta - Estilo Activo',
                        html: `
                            <h2>Bienvenido a Estilo Activo</h2>
                            <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
                            <p>Este código expira en 10 minutos.</p>
                        `
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error enviando email:', error);
                        }
                    });

                    res.json({
                        success: true,
                        message: 'Usuario creado exitosamente. Revisa tu email para verificar tu cuenta.',
                        verificationCode: verificationCode // Solo para desarrollo
                    });
                });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.post('/api/auth/login', authLimiter, [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const { email, password } = req.body;

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error del servidor' });
            }

            if (!user) {
                return res.status(400).json({ success: false, message: 'Credenciales incorrectas' });
            }

            if (!user.verified) {
                return res.status(400).json({ success: false, message: 'Cuenta no verificada' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ success: false, message: 'Credenciales incorrectas' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET || 'your-jwt-secret',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    verified: user.verified
                }
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.post('/api/auth/verify', [
    body('email').isEmail().withMessage('Email inválido'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Código inválido')
], (req, res) => {
    try {
        const { email, code } = req.body;

        db.get('SELECT * FROM users WHERE email = ? AND verification_code = ?', [email, code], (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error del servidor' });
            }

            if (!user) {
                return res.status(400).json({ success: false, message: 'Código incorrecto' });
            }

            // Marcar como verificado
            db.run('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?', [user.id], (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error al verificar cuenta' });
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email },
                    process.env.JWT_SECRET || 'your-jwt-secret',
                    { expiresIn: '24h' }
                );

                res.json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        lastname: user.lastname,
                        email: user.email,
                        verified: true
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Rutas OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );
        
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}`);
    }
);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );
        
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}`);
    }
);

// Rutas de productos
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', (err, products) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al obtener productos' });
        }
        res.json({ success: true, products });
    });
});

// Rutas de pagos
app.post('/api/payments/process', authenticateToken, [
    body('method').notEmpty().withMessage('Método de pago requerido'),
    body('amount').isFloat({ min: 0 }).withMessage('Monto inválido')
], (req, res) => {
    try {
        const { method, data, amount, items } = req.body;
        const userId = req.user.id;

        // Simular procesamiento de pago
        const transactionId = 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Crear registro de compra
        db.run(`INSERT INTO purchases (user_id, total_amount, payment_method, payment_data, transaction_id) 
                VALUES (?, ?, ?, ?, ?)`,
            [userId, amount, method, JSON.stringify(data), transactionId],
            function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error al procesar pago' });
                }

                const purchaseId = this.lastID;

                // Agregar items de compra
                if (items && items.length > 0) {
                    const stmt = db.prepare(`INSERT INTO purchase_items (purchase_id, product_name, product_price, quantity) 
                                           VALUES (?, ?, ?, ?)`);
                    
                    items.forEach(item => {
                        stmt.run([purchaseId, item.name, item.price, item.quantity]);
                    });
                    
                    stmt.finalize();
                }

                res.json({
                    success: true,
                    transactionId,
                    purchaseId
                });
            });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Ruta para obtener productos del usuario
app.get('/api/user/products', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(`SELECT p.*, pi.quantity, pi.product_name, pi.product_price 
            FROM purchases p 
            JOIN purchase_items pi ON p.id = pi.purchase_id 
            WHERE p.user_id = ? AND p.status = 'completed'
            ORDER BY p.created_at DESC`,
        [userId], (err, purchases) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al obtener compras' });
            }

            const products = purchases.map(purchase => ({
                id: purchase.id,
                name: purchase.product_name,
                price: purchase.product_price,
                quantity: purchase.quantity,
                purchaseDate: purchase.created_at,
                image: 'https://via.placeholder.com/300x300?text=Producto'
            }));

            res.json({ success: true, products });
        });
});

// Servir archivos estáticos
app.use(express.static('.'));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Cerrar base de datos al terminar
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Base de datos cerrada.');
        process.exit(0);
    });
});
