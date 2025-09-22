// Configuración de MySQL para la base de datos de usuarios
// Este archivo contiene la configuración y esquemas para MySQL

const mysql = require('mysql2/promise');

// Configuración de la base de datos MySQL
const dbConfig = {
    host: 'localhost',
    user: 'miweb2_style',               // <-- tu usuario en MySQL
    password: 'Carlos123!',       // <-- tu contraseña en MySQL
    database: 'miweb2',           // <-- tu base de datos creada
    port: 3306,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

// Esquemas de tablas SQL
const createTablesSQL = `
-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS miweb2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE miweb2;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    photo TEXT,
    provider ENUM('Google', 'Facebook', 'manual') DEFAULT 'manual',
    document_type ENUM('CC', 'CE', 'TI', 'PA') NULL,
    document_number VARCHAR(50),
    birth_date DATE NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Colombia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_provider (provider),
    INDEX idx_created_at (created_at),
    INDEX idx_is_active (is_active)
);

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'completed') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_number VARCHAR(100),
    shipping_address TEXT,
    notes TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status (status)
);

-- Tabla de items de órdenes
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    image_url TEXT,
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_is_active (is_active)
);

-- Tabla de sesiones de usuarios
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
);
`;

// Clase para manejar la base de datos MySQL
class MySQLDatabase {
    constructor() {
        this.connection = null;
        this.init();
    }

    // Inicializar conexión
    async init() {
        try {
            this.connection = await mysql.createConnection(dbConfig);
            console.log('Conexión a MySQL establecida exitosamente');
            
            // Crear tablas si no existen
            await this.createTables();
        } catch (error) {
            console.error('Error al conectar con MySQL:', error);
            throw error;
        }
    }

    // Crear tablas
    async createTables() {
        try {
            await this.connection.execute(createTablesSQL);
            console.log('Tablas de MySQL creadas/verificadas exitosamente');
        } catch (error) {
            console.error('Error al crear tablas:', error);
            throw error;
        }
    }

    // ... (el resto de tu código queda igual)
}

// Exportar configuración
module.exports = {
    MySQLDatabase,
    dbConfig,
    createTablesSQL
};

