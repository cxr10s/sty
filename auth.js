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
                
                // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
                this.forcePurchaseFlow();
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
                
                // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
                this.forcePurchaseFlow();
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
            if (typeof google !== 'undefined' && google.accounts) {
                // Usar Google Identity Services
                google.accounts.id.initialize({
                    client_id: 'YOUR_GOOGLE_CLIENT_ID', // Reemplazar con tu Client ID real
                    callback: this.handleGoogleCallback.bind(this),
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                
                // Mostrar el popup de Google
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.log('Google Sign-In no se pudo mostrar');
                    }
                });
            } else {
                // Fallback para desarrollo - simular autenticación
                this.showNotification('Iniciando sesión con Google...');
                
                // Simular delay de autenticación
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const mockUser = {
                    id: 'google_' + Date.now(),
                    name: 'Usuario Google',
                    email: 'usuario@google.com',
                    provider: 'google',
                    verified: true,
                    picture: 'https://via.placeholder.com/150/4285f4/ffffff?text=G'
                };
                this.handleOAuthSuccess(mockUser);
            }
        } catch (error) {
            console.error('Error en Google Sign-In:', error);
            this.showNotification('Error al iniciar sesión con Google');
        }
    }

    // Login con Facebook
    async loginWithFacebook() {
        try {
            if (typeof FB !== 'undefined') {
                FB.login((response) => {
                    if (response.authResponse) {
                        // Obtener información del usuario
                        FB.api('/me', { fields: 'name,email,picture' }, (userInfo) => {
                            const user = {
                                id: 'facebook_' + userInfo.id,
                                name: userInfo.name,
                                email: userInfo.email,
                                provider: 'facebook',
                                verified: true,
                                picture: userInfo.picture?.data?.url || 'https://via.placeholder.com/150/1877f2/ffffff?text=F'
                            };
                            this.handleOAuthSuccess(user);
                        });
                    } else {
                        this.showNotification('Error al autenticar con Facebook');
                    }
                }, { scope: 'email,public_profile' });
            } else {
                // Fallback para desarrollo - simular autenticación
                this.showNotification('Iniciando sesión con Facebook...');
                
                // Simular delay de autenticación
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const mockUser = {
                    id: 'facebook_' + Date.now(),
                    name: 'Usuario Facebook',
                    email: 'usuario@facebook.com',
                    provider: 'facebook',
                    verified: true,
                    picture: 'https://via.placeholder.com/150/1877f2/ffffff?text=F'
                };
                this.handleOAuthSuccess(mockUser);
            }
        } catch (error) {
            console.error('Error en Facebook Login:', error);
            this.showNotification('Error al iniciar sesión con Facebook');
        }
    }

    // Manejar éxito de OAuth
    async handleOAuthSuccess(user) {
        try {
            this.showNotification('Procesando autenticación...');
            
            // VERIFICAR SI EL USUARIO ESTÁ REGISTRADO EN LA BASE DE DATOS
            const isUserRegistered = await this.verifyUserRegistration(user.email);
            
            if (!isUserRegistered) {
                // Usuario no registrado - obligar a completar registro
                this.showNotification('Debes completar tu registro para continuar');
                this.forceUserRegistration(user);
                return;
            }
            
            const response = await this.simulateApiCall('/api/auth/oauth', user);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                
                // Cerrar todos los modales de autenticación
                this.closeLoginModal();
                this.closeRegisterModal();
                this.closeEmailVerificationModal();
                
                this.updateUI();
                
                // Mostrar mensaje de bienvenida personalizado
                if (response.isNewUser) {
                    this.showNotification(`¡Bienvenido a Estilo Activo, ${user.name}! Tu cuenta ha sido creada exitosamente.`);
                } else {
                    this.showNotification(`¡Bienvenido de vuelta, ${user.name}!`);
                }
                
                // Actualizar la UI con la foto del usuario si está disponible
                this.updateUserProfile(user);
                
                // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
                this.forcePurchaseFlow();
            } else {
                this.showNotification('Error al autenticar: ' + (response.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error en OAuth:', error);
            this.showNotification('Error al procesar el login');
        }
    }

    // Callback de Google
    handleGoogleCallback(response) {
        try {
            // Decodificar el JWT token para obtener información del usuario
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            
            const user = {
                id: 'google_' + payload.sub,
                name: payload.name,
                email: payload.email,
                provider: 'google',
                verified: payload.email_verified,
                picture: payload.picture
            };
            
            this.handleOAuthSuccess(user);
        } catch (error) {
            console.error('Error decodificando Google token:', error);
            this.showNotification('Error al procesar la información de Google');
        }
    }

    // Actualizar perfil del usuario en la UI
    updateUserProfile(user) {
        // Actualizar avatar si está disponible
        if (user.picture) {
            const userAvatar = document.querySelector('.user-avatar');
            if (userAvatar) {
                userAvatar.src = user.picture;
                userAvatar.style.display = 'block';
            }
        }
        
        // Actualizar nombre del usuario en la UI
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = user.name;
        });
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
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (this.isAuthenticated && this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (myProductsBtn) myProductsBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'flex';
            
            // Mostrar información del usuario
            if (userName) userName.textContent = this.currentUser.name;
            if (userAvatar && this.currentUser.picture) {
                userAvatar.src = this.currentUser.picture;
                userAvatar.style.display = 'block';
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (myProductsBtn) myProductsBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    // Validaciones
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateColombianPhone(phone) {
        // Validar formato colombiano: +57 seguido de 10 dígitos
        const phoneRegex = /^\+57\s?\d{10}$/;
        return phoneRegex.test(phone);
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

        // Validar teléfono colombiano
        if (!this.validateColombianPhone(data.phone)) {
            return { isValid: false, field: 'register-phone', message: 'El teléfono debe tener formato +57 seguido de 10 dígitos' };
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

        // Formatear teléfono colombiano
        const phoneInput = document.getElementById('register-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                // Si empieza con 57, agregar +57
                if (value.startsWith('57') && value.length > 2) {
                    value = '+57' + value.substring(2);
                } else if (!value.startsWith('+57') && value.length > 0) {
                    value = '+57' + value;
                }
                
                // Limitar a +57 + 10 dígitos
                if (value.startsWith('+57')) {
                    const digits = value.substring(3);
                    if (digits.length > 10) {
                        value = '+57' + digits.substring(0, 10);
                    }
                }
                
                e.target.value = value;
            });
            
            // Validar en tiempo real
            phoneInput.addEventListener('blur', (e) => {
                if (e.target.value && !this.validateColombianPhone(e.target.value)) {
                    this.showError('register-phone-error', 'Formato inválido. Debe ser +57 seguido de 10 dígitos');
                } else {
                    this.clearError('register-phone-error');
                }
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

            // SOLO REGISTRAR TRANSACCIÓN SI EL PAGO ES EXITOSO
            const paymentSuccess = await this.simulatePaymentProcessing(method, data);

            if (paymentSuccess) {
                // Procesar pago exitoso
                const response = await this.simulateApiCall('/api/payments/process', {
                    method,
                    data,
                    amount,
                    items
                });

                if (response.success) {
                    // GUARDAR ORDEN EN LA BASE DE DATOS SOLO SI EL PAGO FUE EXITOSO
                    const orderData = {
                        items: items.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity
                        })),
                        total: amount,
                        paymentMethod: method,
                        paymentData: data,
                        status: 'completed',
                        orderDate: new Date().toISOString(),
                        transactionId: method + '_' + Date.now()
                    };
                    
                    await this.saveUserOrder(orderData);
                    
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
                    
                    this.showNotification('¡Pago procesado exitosamente! Transacción registrada.');
                    
                    // Actualizar productos del usuario
                    setTimeout(() => {
                        this.loadUserProducts();
                    }, 1000);
                } else {
                    this.showNotification('Error al procesar el pago: ' + response.message);
                }
            } else {
                this.showNotification('Error en el procesamiento del pago. Intenta de nuevo.');
            }
        } catch (error) {
            this.showNotification('Error al procesar el pago: ' + error.message);
        }
    }

    // SIMULAR PROCESAMIENTO DE PAGO (solo registra si es exitoso)
    async simulatePaymentProcessing(method, data) {
        // Simular validación según el método
        if (method === 'card') {
            if (!data.number || data.number.length < 16) {
                return false;
            }
            if (!data.expiry || !/^\d{2}\/\d{2}$/.test(data.expiry)) {
                return false;
            }
            if (!data.cvv || data.cvv.length < 3) {
                return false;
            }
        } else if (method === 'nequi' || method === 'bancolombia') {
            if (!data.number || data.number.length < 10) {
                return false;
            }
        }
        
        // Simular probabilidad de éxito (90% de éxito)
        const success = Math.random() > 0.1;
        
        if (success) {
            console.log(`Pago exitoso con ${method}`);
            return true;
        } else {
            console.log(`Pago fallido con ${method}`);
            return false;
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

    clearError(fieldId) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
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
                    // Simular verificación si el usuario ya existe
                    const existingUsers = JSON.parse(localStorage.getItem('oauth_users') || '[]');
                    const existingUser = existingUsers.find(u => u.email === data.email);
                    
                    if (existingUser) {
                        // Usuario existente - solo login
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: existingUser,
                            isNewUser: false
                        };
                    } else {
                        // Usuario nuevo - crear cuenta
                        const newUser = {
                            ...data,
                            id: data.id,
                            created_at: new Date().toISOString(),
                            phone: null, // Los usuarios OAuth no tienen teléfono inicialmente
                            docType: null,
                            docNumber: null
                        };
                        
                        existingUsers.push(newUser);
                        localStorage.setItem('oauth_users', JSON.stringify(existingUsers));
                        
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: newUser,
                            isNewUser: true
                        };
                    }

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

    // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
    forcePurchaseFlow() {
        // Mostrar modal obligatorio de compra
        setTimeout(() => {
            this.showMandatoryPurchaseModal();
        }, 2000); // Esperar 2 segundos para que el usuario vea el mensaje de bienvenida
    }

    // Mostrar modal obligatorio de compra
    showMandatoryPurchaseModal() {
        // Crear modal si no existe
        let modal = document.getElementById('mandatory-purchase-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mandatory-purchase-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content mandatory-purchase-modal">
                    <div class="modal-header">
                        <h3>¡Continúa con tu Compra!</h3>
                    </div>
                    <div class="modal-body">
                        <div class="mandatory-purchase-content">
                            <div class="purchase-icon">🛒</div>
                            <p class="mandatory-text">Para completar tu experiencia en Estilo Activo, debes continuar con el proceso de compra.</p>
                            <p class="mandatory-subtext">Selecciona al menos un producto para proceder con el pago.</p>
                            <div class="mandatory-actions">
                                <button class="btn-primary" onclick="startMandatoryPurchase()">Continuar Comprando</button>
                                <button class="btn-secondary" onclick="closeMandatoryPurchaseModal()">Ver Catálogo</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Mostrar modal
        this.openModal('mandatory-purchase-modal');
        
        // Prevenir que el usuario cierre el modal
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.onclick = null; // Deshabilitar click en overlay
        }
    }

    // Cerrar modal obligatorio (solo si hay productos en el carrito)
    closeMandatoryPurchaseModal() {
        const cart = window.cart || [];
        if (cart.length > 0) {
            this.closeModal('mandatory-purchase-modal');
            this.showNotification('¡Perfecto! Continúa con el proceso de pago.');
        } else {
            this.showNotification('Debes agregar al menos un producto al carrito para continuar.');
        }
    }

    // VERIFICAR SI EL USUARIO ESTÁ REGISTRADO EN LA BASE DE DATOS
    async verifyUserRegistration(email) {
        try {
            // Intentar verificar en el servidor primero
            try {
                const response = await fetch(`/api/users/email/${email}`);
                const result = await response.json();
                return result.success && result.user;
            } catch (serverError) {
                console.log('Servidor no disponible, verificando en base de datos local');
                
                // Fallback a base de datos local
                if (this.database) {
                    const user = await this.database.getUserByEmail(email);
                    return !!user;
                } else {
                    // Fallback a localStorage
                    const users = JSON.parse(localStorage.getItem('users')) || [];
                    return users.some(user => user.email === email);
                }
            }
        } catch (error) {
            console.error('Error al verificar registro del usuario:', error);
            return false;
        }
    }

    // FORZAR AL USUARIO A COMPLETAR SU REGISTRO
    forceUserRegistration(oauthUser) {
        // Crear modal de registro obligatorio
        let modal = document.getElementById('mandatory-registration-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mandatory-registration-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content mandatory-registration-modal">
                    <div class="modal-header">
                        <h3>Completa tu Registro</h3>
                    </div>
                    <div class="modal-body">
                        <div class="mandatory-registration-content">
                            <div class="registration-icon">📝</div>
                            <p class="mandatory-text">Para continuar, debes completar tu información personal.</p>
                            <p class="mandatory-subtext">Esta información es obligatoria para procesar tus compras.</p>
                            
                            <form id="mandatory-registration-form" class="auth-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="mandatory-name">Nombre</label>
                                        <input type="text" id="mandatory-name" name="name" value="${oauthUser.name.split(' ')[0] || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="mandatory-lastname">Apellidos</label>
                                        <input type="text" id="mandatory-lastname" name="lastname" value="${oauthUser.name.split(' ').slice(1).join(' ') || ''}" required>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="mandatory-doc-type">Tipo de documento</label>
                                        <select id="mandatory-doc-type" name="docType" required>
                                            <option value="">Seleccionar</option>
                                            <option value="CC">Cédula de Ciudadanía</option>
                                            <option value="CE">Cédula de Extranjería</option>
                                            <option value="TI">Tarjeta de Identidad</option>
                                            <option value="PA">Pasaporte</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="mandatory-doc-number">Número de documento</label>
                                        <input type="text" id="mandatory-doc-number" name="docNumber" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="mandatory-email">Correo electrónico</label>
                                    <input type="email" id="mandatory-email" name="email" value="${oauthUser.email}" readonly>
                                </div>
                                
                                <div class="form-group">
                                    <label for="mandatory-birthdate">Fecha de nacimiento</label>
                                    <input type="date" id="mandatory-birthdate" name="birthdate" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="mandatory-phone">Número de teléfono</label>
                                    <input type="tel" id="mandatory-phone" name="phone" placeholder="+57 300 123 4567" required>
                                    <small style="color: #666; font-size: 0.8rem; margin-top: 0.3rem; display: block;">
                                        Formato requerido: +57 seguido de 10 dígitos (ej: +57 300 123 4567)
                                    </small>
                                </div>
                                
                                <div class="mandatory-actions">
                                    <button type="submit" class="btn-primary">Completar Registro</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Mostrar modal
        this.openModal('mandatory-registration-modal');
        
        // Configurar event listener para el formulario
        const form = document.getElementById('mandatory-registration-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleMandatoryRegistration(e, oauthUser));
        }
        
        // Prevenir que el usuario cierre el modal
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.onclick = null; // Deshabilitar click en overlay
        }
    }

    // MANEJAR REGISTRO OBLIGATORIO
    async handleMandatoryRegistration(e, oauthUser) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        
        // Validar datos
        const validation = this.validateRegistration(userData);
        if (!validation.isValid) {
            this.showNotification(validation.message);
            return;
        }

        // Verificar edad
        if (!this.isAdult(userData.birthdate)) {
            this.showNotification('Debes ser mayor de 18 años');
            return;
        }

        try {
            // Crear usuario completo con datos OAuth + datos del formulario
            const completeUserData = {
                ...oauthUser,
                ...userData,
                provider: oauthUser.provider,
                verified: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            // Guardar en la base de datos
            await this.saveUserToDatabase(completeUserData);
            
            // Establecer como usuario actual
            this.currentUser = completeUserData;
            this.isAuthenticated = true;
            localStorage.setItem('authToken', 'oauth_token_' + Date.now());
            localStorage.setItem('userData', JSON.stringify(completeUserData));
            
            // Cerrar modal de registro
            this.closeModal('mandatory-registration-modal');
            
            // Actualizar UI
            this.updateUI();
            this.updateUserProfile(completeUserData);
            
            this.showNotification('¡Registro completado exitosamente!');
            
            // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
            this.forcePurchaseFlow();
            
        } catch (error) {
            console.error('Error al completar registro:', error);
            this.showNotification('Error al completar el registro. Intenta de nuevo.');
        }
    }

    // GUARDAR USUARIO EN LA BASE DE DATOS
    async saveUserToDatabase(userData) {
        try {
            // Intentar guardar en el servidor primero
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message);
                }
                return result.user;
            } catch (serverError) {
                console.log('Servidor no disponible, guardando en base de datos local');
                
                // Fallback a base de datos local
                if (this.database) {
                    return await this.database.addUser(userData);
                } else {
                    // Fallback a localStorage
                    const users = JSON.parse(localStorage.getItem('users')) || [];
                    users.push(userData);
                    localStorage.setItem('users', JSON.stringify(users));
                    return userData;
                }
            }
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            throw error;
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

// Funciones para el modal obligatorio de compra
function startMandatoryPurchase() {
    // Cerrar modal obligatorio
    authSystem.closeModal('mandatory-purchase-modal');
    
    // Scroll a la primera sección de productos
    const firstProductSection = document.querySelector('#camisetas');
    if (firstProductSection) {
        firstProductSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    // Mostrar notificación
    authSystem.showNotification('¡Perfecto! Explora nuestros productos y agrega al menos uno al carrito.');
}

function closeMandatoryPurchaseModal() {
    authSystem.closeMandatoryPurchaseModal();
}

// Inicializar sistema de autenticación
let authSystem;
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});
