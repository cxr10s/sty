// Servidor para manejar la base de datos de usuarios
// Este archivo crea un servidor HTTP para almacenar datos de usuarios

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Importar las clases de base de datos
const ServerDatabase = require('./server-database');
const { MySQLDatabase } = require('./mysql-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Inicializar bases de datos
const jsonDB = new ServerDatabase();
let mysqlDB = null;

// Intentar conectar a MySQL (opcional)
try {
    mysqlDB = new MySQLDatabase();
    console.log('MySQL habilitado');
} catch (error) {
    console.log('MySQL no disponible, usando solo JSON');
}

// Rutas de la API

// Obtener todos los usuarios
app.get('/api/users', async (req, res) => {
    try {
        let users;
        if (mysqlDB) {
            // Usar MySQL si está disponible
            users = await mysqlDB.getAllUsers();
        } else {
            // Usar JSON como fallback
            users = jsonDB.getAllUsers();
        }
        
        res.json({ success: true, users: users });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener usuario por email
app.get('/api/users/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        let user;
        
        if (mysqlDB) {
            user = await mysqlDB.getUserByEmail(email);
        } else {
            user = jsonDB.getUserByEmail(email);
        }
        
        if (user) {
            res.json({ success: true, user: user });
        } else {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al buscar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Agregar nuevo usuario
app.post('/api/users', async (req, res) => {
    try {
        const userData = req.body;
        let result;
        
        if (mysqlDB) {
            result = await mysqlDB.addUser(userData);
        } else {
            result = jsonDB.addUser(userData);
        }
        
        if (result.success) {
            res.json({ success: true, user: result.user });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error al agregar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Actualizar usuario
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        let result;
        
        if (mysqlDB) {
            result = await mysqlDB.updateUser(userId, updateData);
        } else {
            result = jsonDB.updateUser(userId, updateData);
        }
        
        if (result.success) {
            res.json({ success: true, user: result.user });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Agregar orden
app.post('/api/orders', async (req, res) => {
    try {
        const { userId, orderData } = req.body;
        let result;
        
        if (mysqlDB) {
            result = await mysqlDB.addOrder(userId, orderData);
        } else {
            result = jsonDB.addOrder(userId, orderData);
        }
        
        if (result.success) {
            res.json({ success: true, order: result.order });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error al agregar orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener órdenes de usuario
app.get('/api/users/:userId/orders', async (req, res) => {
    try {
        const { userId } = req.params;
        let orders;
        
        if (mysqlDB) {
            orders = await mysqlDB.getUserOrders(userId);
        } else {
            orders = jsonDB.getUserOrders(userId);
        }
        
        res.json({ success: true, orders: orders });
    } catch (error) {
        console.error('Error al obtener órdenes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        let stats;
        
        if (mysqlDB) {
            stats = await mysqlDB.getStats();
        } else {
            stats = jsonDB.getStats();
        }
        
        res.json({ success: true, stats: stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exportar datos
app.get('/api/export', async (req, res) => {
    try {
        const result = jsonDB.exportData();
        
        if (result.success) {
            res.download(result.filename);
        } else {
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error al exportar datos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ruta para servir la aplicación principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejar errores 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Manejar errores generales
app.use((error, req, res, next) => {
    console.error('Error del servidor:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    console.log('Base de datos JSON habilitada');
    if (mysqlDB) {
        console.log('Base de datos MySQL habilitada');
    }
});

// Manejar cierre del servidor
process.on('SIGINT', async () => {
    console.log('\nCerrando servidor...');
    if (mysqlDB) {
        await mysqlDB.close();
    }
    process.exit(0);
});

module.exports = app;