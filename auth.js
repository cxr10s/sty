// Sistema de Autenticación para Estilo Activo
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.verificationCode = null;
        this.pendingUser = null;
        
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.initializeOAuth();
    }

    // Verificar estado de autenticación al cargar la página
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                this.updateUI();
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Verification form
        const verificationForm = document.getElementById('verification-form');
        if (verificationForm) {
            verificationForm.addEventListener('submit', (e) => this.handleVerification(e));
        }

        // Password strength indicator
        const passwordInput = document.getElementById('register-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }

        // Payment tabs
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchPaymentMethod(e.target.dataset.method));
        });

        // Card form
        const cardForm = document.getElementById('card-form');
        if (cardForm) {
            cardForm.addEventListener('submit', (e) => this.handleCardPayment(e));
        }

        // Formatear inputs
        this.setupInputFormatting();
    }

    // Inicializar OAuth
    initializeOAuth() {
        // Google OAuth
        if (typeof google !== 'undefined') {
            google.accounts.id.initialize({
                client_id: 'YOUR_GOOGLE_CLIENT_ID', // Reemplazar con tu Client ID real
                callback: this.handleGoogleCallback.bind(this)
            });
        }

        // Facebook OAuth
        if (typeof FB !== 'undefined') {
            FB.init({
                appId: 'YOUR_FACEBOOK_APP_ID', // Reemplazar con tu App ID real
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
        }
    }

    // Manejar login con email/contraseña
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Validar campos
        if (!this.validateEmail(email)) {
            this.showError('login-email-error', 'Ingresa un correo electrónico válido');
            return;
        }
        
        if (!password) {
            this.showError('login-password-error', 'La contraseña es requerida');
            return;
        }

        try {
            // Simular llamada al backend
            const response = await this.simulateApiCall('/api/auth/login', {
                email,
                password
            });

            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                
                this.closeLoginModal();
                this.updateUI();
                this.showNotification('¡Bienvenido de vuelta!');
            } else {
                this.showError('login-password-error', response.message || 'Credenciales incorrectas');
            }
        } catch (error) {
            this.showError('login-password-error', 'Error al iniciar sesión. Intenta de nuevo.');
        }
    }

    // Manejar registro
    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        
        // Validar datos
        const validation = this.validateRegistration(userData);
        if (!validation.isValid) {
            this.showError(validation.field + '-error', validation.message);
            return;
        }

        // Verificar edad
        if (!this.isAdult(userData.birthdate)) {
            this.showError('register-birthdate-error', 'Debes ser mayor de 18 años');
            return;
        }

        try {
            // Simular llamada al backend
            const response = await this.simulateApiCall('/api/auth/register', userData);
            
            if (response.success) {
                this.pendingUser = userData;
                this.verificationCode = response.verificationCode;
                this.closeRegisterModal();
                this.showEmailVerificationModal(userData.email);
            } else {
                this.showError('register-email-error', response.message || 'Error al crear la cuenta');
            }
        } catch (error) {
            this.showError('register-email-error', 'Error al crear la cuenta. Intenta de nuevo.');
        }
    }

    // Manejar verificación de email
    async handleVerification(e) {
        e.preventDefault();
        
        const code = document.getElementById('verification-code').value;
        
        if (!code || code.length !== 6) {
            this.showError('verification-code-error', 'Ingresa un código de 6 dígitos');
            return;
        }

        try {
            // Simular verificación
            const response = await this.simulateApiCall('/api/auth/verify', {
                email: this.pendingUser.email,
                code: code
            });

            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                
                this.closeEmailVerificationModal();
                this.updateUI();
                this.showNotification('¡Cuenta verificada exitosamente!');
            } else {
                this.showError('verification-code-error', 'Código incorrecto');
            }
        } catch (error) {
            this.showError('verification-code-error', 'Error al verificar el código');
        }
    }

    // Login con Google
    async loginWithGoogle() {
        try {
            if (typeof google !== 'undefined') {
                google.accounts.id.prompt();
            } else {
                // Fallback para desarrollo
                const mockUser = {
                    id: 'google_' + Date.now(),
                    name: 'Usuario Google',
                    email: 'usuario@google.com',
                    provider: 'google',
                    verified: true
                };
                this.handleOAuthSuccess(mockUser);
            }
        } catch (error) {
            this.showNotification('Error al iniciar sesión con Google');
        }
    }

    // Login con Facebook
    async loginWithFacebook() {
        try {
            if (typeof FB !== 'undefined') {
                FB.login((response) => {
                    if (response.authResponse) {
                        FB.api('/me', { fields: 'name,email' }, (userInfo) => {
                            const user = {
                                id: 'facebook_' + userInfo.id,
                                name: userInfo.name,
                                email: userInfo.email,
                                provider: 'facebook',
                                verified: true
                            };
                            this.handleOAuthSuccess(user);
                        });
                    }
                }, { scope: 'email' });
            } else {
                // Fallback para desarrollo
                const mockUser = {
                    id: 'facebook_' + Date.now(),
                    name: 'Usuario Facebook',
                    email: 'usuario@facebook.com',
                    provider: 'facebook',
                    verified: true
                };
                this.handleOAuthSuccess(mockUser);
            }
        } catch (error) {
            this.showNotification('Error al iniciar sesión con Facebook');
        }
    }

    // Manejar éxito de OAuth
    async handleOAuthSuccess(user) {
        try {
            const response = await this.simulateApiCall('/api/auth/oauth', user);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                
                this.closeLoginModal();
                this.updateUI();
                this.showNotification(`¡Bienvenido, ${user.name}!`);
            }
        } catch (error) {
            this.showNotification('Error al procesar el login');
        }
    }

    // Callback de Google
    handleGoogleCallback(response) {
        const user = {
            id: 'google_' + response.credential,
            name: response.name,
            email: response.email,
            provider: 'google',
            verified: true
        };
        this.handleOAuthSuccess(user);
    }

    // Cerrar sesión
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.updateUI();
        this.showNotification('Sesión cerrada');
    }

    // Actualizar UI según estado de autenticación
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const myProductsBtn = document.getElementById('my-products-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (this.isAuthenticated) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (myProductsBtn) myProductsBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (myProductsBtn) myProductsBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    // Validaciones
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateRegistration(data) {
        // Validar nombre
        if (!data.name || data.name.trim().length < 2) {
            return { isValid: false, field: 'register-name', message: 'El nombre debe tener al menos 2 caracteres' };
        }

        // Validar apellidos
        if (!data.lastname || data.lastname.trim().length < 2) {
            return { isValid: false, field: 'register-lastname', message: 'Los apellidos deben tener al menos 2 caracteres' };
        }

        // Validar tipo de documento
        if (!data.docType) {
            return { isValid: false, field: 'register-doc-type', message: 'Selecciona un tipo de documento' };
        }

        // Validar número de documento
        if (!data.docNumber || data.docNumber.trim().length < 6) {
            return { isValid: false, field: 'register-doc-number', message: 'El número de documento debe tener al menos 6 dígitos' };
        }

        // Validar email
        if (!this.validateEmail(data.email)) {
            return { isValid: false, field: 'register-email', message: 'Ingresa un correo electrónico válido' };
        }

        // Validar fecha de nacimiento
        if (!data.birthdate) {
            return { isValid: false, field: 'register-birthdate', message: 'La fecha de nacimiento es requerida' };
        }

        // Validar contraseña
        if (!data.password || data.password.length < 8) {
            return { isValid: false, field: 'register-password', message: 'La contraseña debe tener al menos 8 caracteres' };
        }

        // Validar confirmación de contraseña
        if (data.password !== data.confirmPassword) {
            return { isValid: false, field: 'register-confirm-password', message: 'Las contraseñas no coinciden' };
        }

        // Validar términos
        if (!data.terms) {
            return { isValid: false, field: 'register-terms', message: 'Debes aceptar los términos y condiciones' };
        }

        return { isValid: true };
    }

    isAdult(birthdate) {
        const today = new Date();
        const birth = new Date(birthdate);
        const age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            return age - 1 >= 18;
        }
        return age >= 18;
    }

    checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('password-strength');
        if (!strengthIndicator) return;

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        strengthIndicator.className = 'password-strength';
        
        if (strength < 2) {
            strengthIndicator.classList.add('weak');
        } else if (strength < 3) {
            strengthIndicator.classList.add('fair');
        } else if (strength < 4) {
            strengthIndicator.classList.add('good');
        } else {
            strengthIndicator.classList.add('strong');
        }
    }

    // Configurar formateo de inputs
    setupInputFormatting() {
        // Formatear número de tarjeta
        const cardNumber = document.getElementById('card-number');
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Formatear fecha de vencimiento
        const cardExpiry = document.getElementById('card-expiry');
        if (cardExpiry) {
            cardExpiry.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // Solo números para CVV
        const cardCvv = document.getElementById('card-cvv');
        if (cardCvv) {
            cardCvv.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }
    }

    // Métodos de UI
    showLoginModal() {
        if (!this.isAuthenticated) {
            this.openModal('login-modal');
        }
    }

    showRegisterModal() {
        this.closeLoginModal();
        this.openModal('register-modal');
    }

    closeLoginModal() {
        this.closeModal('login-modal');
        this.clearForm('login-form');
    }

    closeRegisterModal() {
        this.closeModal('register-modal');
        this.clearForm('register-form');
    }

    showEmailVerificationModal(email) {
        document.getElementById('verification-email').textContent = email;
        this.openModal('email-verification-modal');
    }

    closeEmailVerificationModal() {
        this.closeModal('email-verification-modal');
        this.clearForm('verification-form');
    }

    showTermsModal() {
        this.openModal('terms-modal');
    }

    closeTermsModal() {
        this.closeModal('terms-modal');
    }

    showMyProductsModal() {
        if (this.isAuthenticated) {
            this.loadUserProducts();
            this.openModal('my-products-modal');
        }
    }

    closeMyProductsModal() {
        this.closeModal('my-products-modal');
    }

    // Métodos de pago
    switchPaymentMethod(method) {
        // Actualizar tabs
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-method="${method}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.payment-method').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${method}-payment`).classList.add('active');
    }

    async processNequiPayment() {
        const number = document.getElementById('nequi-number').value;
        if (!number || number.length !== 10) {
            this.showNotification('Ingresa un número de Nequi válido');
            return;
        }

        await this.processPayment('nequi', { number });
    }

    async processBancolombiaPayment() {
        const number = document.getElementById('bancolombia-number').value;
        if (!number || number.length !== 10) {
            this.showNotification('Ingresa un número de Bancolombia válido');
            return;
        }

        await this.processPayment('bancolombia', { number });
    }

    async handleCardPayment(e) {
        e.preventDefault();
        
        const cardData = {
            number: document.getElementById('card-number').value.replace(/\s/g, ''),
            expiry: document.getElementById('card-expiry').value,
            cvv: document.getElementById('card-cvv').value,
            name: document.getElementById('card-name').value
        };

        if (!this.validateCardData(cardData)) {
            return;
        }

        await this.processPayment('card', cardData);
    }

    validateCardData(cardData) {
        if (!cardData.number || cardData.number.length < 16) {
            this.showNotification('Número de tarjeta inválido');
            return false;
        }

        if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
            this.showNotification('Fecha de vencimiento inválida');
            return false;
        }

        if (!cardData.cvv || cardData.cvv.length < 3) {
            this.showNotification('CVV inválido');
            return false;
        }

        if (!cardData.name || cardData.name.trim().length < 2) {
            this.showNotification('Nombre en la tarjeta inválido');
            return false;
        }

        return true;
    }

    async processPayment(method, data) {
        if (!this.isAuthenticated) {
            this.showNotification('Debes iniciar sesión para realizar el pago');
            this.showLoginModal();
            return;
        }

        try {
            // Obtener items del carrito
            const items = window.cart || [];
            const amount = window.cartTotal || 0;

            // Procesar pago
            const response = await this.simulateApiCall('/api/payments/process', {
                method,
                data,
                amount,
                items
            });

            if (response.success) {
                this.closePaymentModal();
                
                // Limpiar carrito
                if (window.cart) {
                    window.cart = [];
                    if (typeof updateCartDisplay === 'function') {
                        updateCartDisplay();
                    }
                    if (typeof updateCartIcon === 'function') {
                        updateCartIcon();
                    }
                }
                
                this.showNotification('¡Pago procesado exitosamente!');
                
                // Actualizar productos del usuario
                setTimeout(() => {
                    this.loadUserProducts();
                }, 1000);
            } else {
                this.showNotification('Error al procesar el pago: ' + response.message);
            }
        } catch (error) {
            this.showNotification('Error al procesar el pago: ' + error.message);
        }
    }

    // Utilidades
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.add('show');
            overlay.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Limpiar errores
            form.querySelectorAll('.error-message').forEach(error => {
                error.classList.remove('show');
            });
        }
    }

    showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    showNotification(message) {
        // Usar la función existente del script principal
        if (typeof showNotification === 'function') {
            showNotification(message);
        } else {
            alert(message);
        }
    }

    // Llamadas API reales
    async apiCall(endpoint, data, method = 'POST') {
        try {
            const url = `http://localhost:3000${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            // Agregar token de autenticación si existe
            const token = localStorage.getItem('authToken');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error en la solicitud');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Simular llamadas API (fallback para desarrollo)
    async simulateApiCall(endpoint, data) {
        // Si el backend no está disponible, usar simulación
        try {
            return await this.apiCall(endpoint, data);
        } catch (error) {
            console.log('Backend no disponible, usando simulación');
            
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simular respuestas según el endpoint
            switch (endpoint) {
                case '/api/auth/login':
                    if (data.email === 'admin@test.com' && data.password === 'password123') {
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: {
                                id: 'user_1',
                                name: 'Usuario Test',
                                email: data.email,
                                verified: true
                            }
                        };
                    }
                    return { success: false, message: 'Credenciales incorrectas' };

                case '/api/auth/register':
                    return {
                        success: true,
                        verificationCode: '123456'
                    };

                case '/api/auth/verify':
                    if (data.code === '123456') {
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: {
                                id: 'user_' + Date.now(),
                                name: this.pendingUser.name + ' ' + this.pendingUser.lastname,
                                email: this.pendingUser.email,
                                verified: true
                            }
                        };
                    }
                    return { success: false, message: 'Código incorrecto' };

                case '/api/auth/oauth':
                    return {
                        success: true,
                        token: 'mock_jwt_token_' + Date.now(),
                        user: data
                    };

                case '/api/payments/process':
                    return { success: true, transactionId: 'txn_' + Date.now() };

                case '/api/user/products':
                    return { success: true, products: [] };

                default:
                    return { success: false, message: 'Endpoint no encontrado' };
            }
        }
    }

    // Cargar productos del usuario
    async loadUserProducts() {
        const content = document.getElementById('my-products-content');
        if (!content) return;

        try {
            const response = await this.simulateApiCall('/api/user/products', {
                userId: this.currentUser.id
            });

            if (response.success && response.products.length > 0) {
                content.innerHTML = this.renderUserProducts(response.products);
            } else {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <p>No tienes productos comprados aún</p>
                        <button class="btn-primary" onclick="closeMyProductsModal()">Comenzar a comprar</button>
                    </div>
                `;
            }
        } catch (error) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <p>Error al cargar tus productos</p>
                    <button class="btn-primary" onclick="closeMyProductsModal()">Cerrar</button>
                </div>
            `;
        }
    }

    renderUserProducts(products) {
        return `
            <div class="user-products">
                <h4>Tus Compras</h4>
                <div class="products-list">
                    ${products.map(product => `
                        <div class="user-product-item">
                            <img src="${product.image}" alt="${product.name}">
                            <div class="product-info">
                                <h5>${product.name}</h5>
                                <p>Precio: $${product.price.toLocaleString()} COP</p>
                                <p>Fecha: ${new Date(product.purchaseDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    addToUserProducts() {
        // Simular agregar productos comprados al perfil del usuario
        const products = window.cart || [];
        if (products.length > 0) {
            this.showNotification(`Se agregaron ${products.length} productos a tu perfil`);
        }
    }
}

// Funciones globales para compatibilidad
function showLoginModal() {
    authSystem.showLoginModal();
}

function showRegisterModal() {
    authSystem.showRegisterModal();
}

function closeLoginModal() {
    authSystem.closeLoginModal();
}

function closeRegisterModal() {
    authSystem.closeRegisterModal();
}

function closeEmailVerificationModal() {
    authSystem.closeEmailVerificationModal();
}

function showTermsModal() {
    authSystem.showTermsModal();
}

function closeTermsModal() {
    authSystem.closeTermsModal();
}

function showMyProductsModal() {
    authSystem.showMyProductsModal();
}

function closeMyProductsModal() {
    authSystem.closeMyProductsModal();
}

function loginWithGoogle() {
    authSystem.loginWithGoogle();
}

function loginWithFacebook() {
    authSystem.loginWithFacebook();
}

function logout() {
    authSystem.logout();
}

function resendVerificationCode() {
    authSystem.showNotification('Código reenviado');
}

function processNequiPayment() {
    authSystem.processNequiPayment();
}

function processBancolombiaPayment() {
    authSystem.processBancolombiaPayment();
}

function closePaymentModal() {
    authSystem.closeModal('payment-modal');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.getElementById('modal-overlay').classList.remove('show');
    document.body.classList.remove('modal-open');
}

// Inicializar sistema de autenticación
let authSystem;
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});
