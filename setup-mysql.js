// Script para configurar MySQL
const mysql = require('mysql2/promise');
const fs = require('fs');

// Configuración de conexión
const config = {
    host: 'localhost',
    user: 'root', // Usuario root para crear la base de datos
    password: '', // Cambiar por tu password de root
    port: 3306
};

// Script SQL para crear la base de datos y tablas
const setupSQL = `
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS estilo_activo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE estilo_activo_db;

-- Crear usuario específico para la aplicación
CREATE USER IF NOT EXISTS 'estilo_activo_user'@'localhost' IDENTIFIED BY 'estilo_activo_2024';
GRANT ALL PRIVILEGES ON estilo_activo_db.* TO 'estilo_activo_user'@'localhost';
FLUSH PRIVILEGES;

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
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
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

-- Insertar algunos productos de ejemplo
INSERT IGNORE INTO products (product_id, name, description, price, category, stock) VALUES
('camiseta-1', 'Camiseta Adidas Clásica', 'Camiseta deportiva de alta calidad', 45000.00, 'camisetas', 50),
('tenis-1', 'Tenis Adidas Ultraboost', 'Zapatillas deportivas con tecnología Boost', 450000.00, 'tenis', 25),
('jeans-1', 'Jeans Clásicos', 'Jeans de corte clásico', 89000.00, 'jeans', 30),
('casco-1', 'Casco Integral Negro', 'Casco de moto integral de alta seguridad', 190000.00, 'cascos', 15),
('bici-1', 'Bicicleta Deportiva', 'Bicicleta de montaña para deportes', 1200000.00, 'deportes', 5);
`;

async function setupMySQL() {
    let connection;
    
    try {
        console.log('🔌 Conectando a MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ Conexión establecida');

        console.log('📊 Ejecutando script de configuración...');
        await connection.execute(setupSQL);
        console.log('✅ Base de datos y tablas creadas exitosamente');

        console.log('👤 Usuario de aplicación creado:');
        console.log('   Usuario: estilo_activo_user');
        console.log('   Password: estilo_activo_2024');
        console.log('   Base de datos: estilo_activo_db');

        console.log('🎉 Configuración de MySQL completada exitosamente!');
        
        // Crear archivo de configuración actualizado
        const updatedConfig = `// Configuración de MySQL para la base de datos de usuarios
const mysql = require('mysql2/promise');

// Configuración de la base de datos MySQL
const dbConfig = {
    host: 'localhost',
    user: 'estilo_activo_user',
    password: 'estilo_activo_2024',
    database: 'estilo_activo_db',
    port: 3306,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

module.exports = { dbConfig };
`;

        fs.writeFileSync('mysql-config-updated.js', updatedConfig);
        console.log('📝 Archivo de configuración actualizado: mysql-config-updated.js');

    } catch (error) {
        console.error('❌ Error durante la configuración:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Asegúrate de que MySQL esté ejecutándose:');
            console.log('   sudo systemctl start mysql');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Verifica las credenciales de MySQL en setup-mysql.js');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar configuración
if (require.main === module) {
    setupMySQL();
}

module.exports = { setupMySQL };
