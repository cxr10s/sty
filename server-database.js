// Sistema de base de datos del servidor para usuarios
// Este archivo maneja la persistencia de datos en el servidor

class ServerDatabase {
    constructor() {
        this.usersFile = 'users.json';
        this.ordersFile = 'orders.json';
        this.productsFile = 'products.json';
        this.init();
    }

    // Inicializar archivos de base de datos
    init() {
        this.ensureFileExists(this.usersFile, []);
        this.ensureFileExists(this.ordersFile, []);
        this.ensureFileExists(this.productsFile, []);
    }

    // Asegurar que el archivo existe
    ensureFileExists(filename, defaultData) {
        try {
            const fs = require('fs');
            if (!fs.existsSync(filename)) {
                fs.writeFileSync(filename, JSON.stringify(defaultData, null, 2));
                console.log(`Archivo ${filename} creado con datos por defecto`);
            }
        } catch (error) {
            console.error(`Error al crear archivo ${filename}:`, error);
        }
    }

    // Leer datos de un archivo JSON
    readJSONFile(filename) {
        try {
            const fs = require('fs');
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error al leer archivo ${filename}:`, error);
            return [];
        }
    }

    // Escribir datos a un archivo JSON
    writeJSONFile(filename, data) {
        try {
            const fs = require('fs');
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error al escribir archivo ${filename}:`, error);
            return false;
        }
    }

    // Agregar nuevo usuario
    addUser(userData) {
        try {
            const users = this.readJSONFile(this.usersFile);
            
            // Verificar si el usuario ya existe
            const existingUser = users.find(user => user.email === userData.email);
            if (existingUser) {
                return { success: false, message: 'Usuario ya existe', user: existingUser };
            }

            // Crear nuevo usuario
            const newUser = {
                id: this.generateId(),
                name: userData.name,
                email: userData.email,
                phone: userData.phone || '',
                photo: userData.photo || '',
                provider: userData.provider || 'manual',
                documentType: userData.documentType || '',
                documentNumber: userData.documentNumber || '',
                birthDate: userData.birthDate || '',
                address: userData.address || '',
                city: userData.city || '',
                country: userData.country || 'Colombia',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isActive: true,
                orders: []
            };

            users.push(newUser);
            this.writeJSONFile(this.usersFile, users);

            console.log('Usuario agregado exitosamente:', newUser);
            return { success: true, user: newUser };
        } catch (error) {
            console.error('Error al agregar usuario:', error);
            return { success: false, message: 'Error al agregar usuario' };
        }
    }

    // Obtener usuario por email
    getUserByEmail(email) {
        try {
            const users = this.readJSONFile(this.usersFile);
            return users.find(user => user.email === email);
        } catch (error) {
            console.error('Error al buscar usuario por email:', error);
            return null;
        }
    }

    // Obtener usuario por ID
    getUserById(id) {
        try {
            const users = this.readJSONFile(this.usersFile);
            return users.find(user => user.id === id);
        } catch (error) {
            console.error('Error al buscar usuario por ID:', error);
            return null;
        }
    }

    // Actualizar usuario
    updateUser(userId, updateData) {
        try {
            const users = this.readJSONFile(this.usersFile);
            const userIndex = users.findIndex(user => user.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            // Actualizar datos
            users[userIndex] = { ...users[userIndex], ...updateData };
            users[userIndex].lastLogin = new Date().toISOString();

            this.writeJSONFile(this.usersFile, users);
            console.log('Usuario actualizado exitosamente');
            return { success: true, user: users[userIndex] };
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            return { success: false, message: 'Error al actualizar usuario' };
        }
    }

    // Obtener todos los usuarios
    getAllUsers() {
        try {
            return this.readJSONFile(this.usersFile);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            return [];
        }
    }

    // Agregar orden
    addOrder(userId, orderData) {
        try {
            const orders = this.readJSONFile(this.ordersFile);
            const users = this.readJSONFile(this.usersFile);
            
            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            const newOrder = {
                id: this.generateId(),
                userId: userId,
                items: orderData.items,
                total: orderData.total,
                status: 'completed',
                orderDate: new Date().toISOString(),
                paymentMethod: orderData.paymentMethod || 'unknown',
                paymentNumber: orderData.paymentNumber || '',
                shippingAddress: orderData.shippingAddress || '',
                notes: orderData.notes || ''
            };

            orders.push(newOrder);
            this.writeJSONFile(this.ordersFile, orders);

            // Actualizar usuario con la nueva orden
            users[userIndex].orders.push(newOrder.id);
            this.writeJSONFile(this.usersFile, users);

            console.log('Orden agregada exitosamente');
            return { success: true, order: newOrder };
        } catch (error) {
            console.error('Error al agregar orden:', error);
            return { success: false, message: 'Error al agregar orden' };
        }
    }

    // Obtener órdenes de un usuario
    getUserOrders(userId) {
        try {
            const orders = this.readJSONFile(this.ordersFile);
            return orders.filter(order => order.userId === userId);
        } catch (error) {
            console.error('Error al obtener órdenes del usuario:', error);
            return [];
        }
    }

    // Eliminar usuario
    deleteUser(userId) {
        try {
            const users = this.readJSONFile(this.usersFile);
            const filteredUsers = users.filter(user => user.id !== userId);
            
            if (users.length === filteredUsers.length) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            this.writeJSONFile(this.usersFile, filteredUsers);
            console.log('Usuario eliminado exitosamente');
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            return { success: false, message: 'Error al eliminar usuario' };
        }
    }

    // Generar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Exportar datos
    exportData() {
        try {
            const users = this.readJSONFile(this.usersFile);
            const orders = this.readJSONFile(this.ordersFile);
            
            const exportData = {
                users: users,
                orders: orders,
                exportDate: new Date().toISOString(),
                totalUsers: users.length,
                totalOrders: orders.length
            };

            const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
            this.writeJSONFile(filename, exportData);
            
            console.log('Datos exportados exitosamente');
            return { success: true, filename: filename };
        } catch (error) {
            console.error('Error al exportar datos:', error);
            return { success: false, message: 'Error al exportar datos' };
        }
    }
    // Estadísticas de la base de datos
    getStats() {
        try {
            const users = this.readJSONFile(this.usersFile);
            const orders = this.readJSONFile(this.ordersFile);
            
            const stats = {
                totalUsers: users.length,
                totalOrders: orders.length,
                activeUsers: users.filter(user => user.isActive).length,
                totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
                averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
                usersByProvider: this.getUsersByProvider(users),
                ordersByMonth: this.getOrdersByMonth(orders)
            };

            return stats;
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return null;
        }
    }

    // Obtener usuarios por proveedor
    getUsersByProvider(users) {
        const providers = {};
        users.forEach(user => {
            providers[user.provider] = (providers[user.provider] || 0) + 1;
        });
        return providers;
    }

    // Obtener órdenes por mes
    getOrdersByMonth(orders) {
        const months = {};
        orders.forEach(order => {
            const month = new Date(order.orderDate).toISOString().substr(0, 7);
            months[month] = (months[month] || 0) + 1;
        });
        return months;
    }
}

// Crear instancia global
const serverDB = new ServerDatabase();

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerDatabase;
}
