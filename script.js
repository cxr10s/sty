// Variables globales
let cart = [];
let currentCustomization = null;
let cartTotal = 0;

// Funcionalidad de navegación móvil
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Smooth scrolling para enlaces de navegación
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animaciones de entrada
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
            }
        });
    }, observerOptions);
    
    // Observar elementos para animaciones
    const animatedElements = document.querySelectorAll('.product-card, .section-header, .sports-banner');
    animatedElements.forEach(el => {
        el.classList.add('loading');
        observer.observe(el);
    });
    
    // Inicializar carrito
    updateCartIcon();
});

// Funcionalidad de carruseles
function moveCarousel(sectionId, direction) {
    const container = document.getElementById(sectionId + '-container');
    if (!container) return;
    
    const cardWidth = 300;
    const scrollAmount = cardWidth * direction;
    
    container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
    });
    
    // Ocultar indicadores después de la primera interacción
    hideScrollIndicators(container);
}

// Función para ocultar indicadores de scroll
function hideScrollIndicators(container) {
    const carousel = container.closest('.products-carousel');
    const section = carousel.closest('section');
    
    if (carousel) {
        carousel.classList.add('user-interacted');
    }
    
    if (section) {
        section.classList.add('user-interacted');
    }
}

// Agregar event listeners para detectar scroll manual
document.addEventListener('DOMContentLoaded', function() {
    const productContainers = document.querySelectorAll('.products-container');
    
    productContainers.forEach(container => {
        let hasScrolled = false;
        
        container.addEventListener('scroll', function() {
            if (!hasScrolled) {
                hasScrolled = true;
                hideScrollIndicators(container);
            }
        });
        
        // También detectar touch/swipe
        container.addEventListener('touchstart', function() {
            if (!hasScrolled) {
                hasScrolled = true;
                hideScrollIndicators(container);
            }
        });
    });
});

// Sistema de carrito de compras
function addToCart(productId, productName, price, image = null) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1,
            image: image || getProductImage(productId)
        });
    }
    
    updateCartDisplay();
    updateCartIcon();
    showNotification(`${productName} agregado al carrito!`);
    
    // Verificar si aplica regalo
    checkGiftEligibility();
}

// Función especial para agregar regalos al carrito
function addGiftToCart(productId, productName, normalPrice, image = null) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isEligibleForGift = subtotal >= 500000;
    
    // Si es elegible para regalo, el precio es 0, sino es el precio normal
    const finalPrice = isEligibleForGift ? 0 : normalPrice;
    const finalName = isEligibleForGift ? `${productName} (REGALO)` : productName;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: finalName,
            price: finalPrice,
            quantity: 1,
            image: image || getProductImage(productId),
            originalPrice: normalPrice,
            isGift: isEligibleForGift
        });
    }
    
    updateCartDisplay();
    updateCartIcon();
    
    if (isEligibleForGift) {
        showNotification(`¡${productName} agregado como REGALO!`);
    } else {
        showNotification(`${productName} agregado al carrito por $${normalPrice.toLocaleString()} COP`);
    }
    
    // Verificar si aplica regalo
    checkGiftEligibility();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    updateCartIcon();
    checkGiftEligibility();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            // Si es un regalo, verificar si sigue siendo elegible
            if (item.isGift && item.originalPrice) {
                const subtotal = cart.reduce((sum, cartItem) => {
                    if (cartItem.id === productId) return sum; // Excluir el item actual del cálculo
                    return sum + (cartItem.price * cartItem.quantity);
                }, 0);
                
                const isEligibleForGift = subtotal >= 500000;
                if (isEligibleForGift) {
                    item.price = 0;
                    item.name = item.name.replace(' (REGALO)', '') + ' (REGALO)';
                } else {
                    item.price = item.originalPrice;
                    item.name = item.name.replace(' (REGALO)', '');
                }
                item.isGift = isEligibleForGift;
            }
            
            updateCartDisplay();
            updateCartIcon();
            checkGiftEligibility();
        }
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotalElement = document.getElementById('cart-total');
    const discountInfo = document.getElementById('discount-info');
    const discountAmount = document.getElementById('discount-amount');
    const giftInfo = document.getElementById('gift-info');
    
    if (!cartItems) return;
    
    cartItems.innerHTML = '';
    
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        let priceDisplay = `$${item.price.toLocaleString()} COP`;
        if (item.isGift && item.originalPrice) {
            priceDisplay = `<span style="text-decoration: line-through; color: #999;">$${item.originalPrice.toLocaleString()} COP</span> <span style="color: #4ecdc4; font-weight: bold;">¡GRATIS!</span>`;
        }
        
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${priceDisplay}</p>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    // Calcular descuentos
    let discount = 0;
    let hasGift = false;
    
    if (subtotal >= 500000) {
        discount = subtotal * 0.1; // 10% de descuento
        hasGift = true;
    } else if (subtotal >= 300000) {
        discount = subtotal * 0.05; // 5% de descuento
    }
    
    const total = subtotal - discount;
    
    cartSubtotal.textContent = `$${subtotal.toLocaleString()} COP`;
    cartTotalElement.textContent = `$${total.toLocaleString()} COP`;
    
    if (discount > 0) {
        discountInfo.style.display = 'block';
        discountAmount.textContent = `$${discount.toLocaleString()} COP`;
    } else {
        discountInfo.style.display = 'none';
    }
    
    if (hasGift) {
        giftInfo.style.display = 'block';
    } else {
        giftInfo.style.display = 'none';
    }
    
    cartTotal = total;
}

function updateCartIcon() {
    let cartIcon = document.querySelector('.cart-icon');
    if (!cartIcon) {
        cartIcon = document.createElement('div');
        cartIcon.className = 'cart-icon';
        cartIcon.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(255, 107, 107, 0.3);
            transition: all 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        cartIcon.onclick = toggleCart;
        document.body.appendChild(cartIcon);
    }
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Crear el ícono del carrito
    cartIcon.innerHTML = `
        <div style="font-size: 20px; margin-bottom: 2px;">🛒</div>
        <div style="font-size: 12px; font-weight: bold; background: rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 2px 6px; min-width: 18px; text-align: center;">${totalItems}</div>
    `;
    
    if (totalItems > 0) {
        cartIcon.style.transform = 'scale(1.1)';
        cartIcon.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
        setTimeout(() => {
            cartIcon.style.transform = 'scale(1)';
            cartIcon.style.boxShadow = '0 5px 15px rgba(255, 107, 107, 0.3)';
        }, 200);
    } else {
        cartIcon.style.transform = 'scale(1)';
        cartIcon.style.boxShadow = '0 5px 15px rgba(255, 107, 107, 0.3)';
    }
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
    }
}

function checkGiftEligibility() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const giftSection = document.getElementById('regalos');
    const giftCards = document.querySelectorAll('.gift-card');
    
    if (subtotal >= 500000) {
        if (giftSection) {
            giftSection.style.display = 'block';
        }
        // Marcar los regalos como elegibles
        giftCards.forEach(card => {
            card.classList.add('gift-eligible');
            const button = card.querySelector('.add-to-cart-btn');
            if (button) {
                button.textContent = 'Agregar Regalo';
                button.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d)';
            }
        });
    } else {
        if (giftSection) {
            giftSection.style.display = 'block'; // Siempre mostrar la sección
        }
        // Quitar la marca de elegibles
        giftCards.forEach(card => {
            card.classList.remove('gift-eligible');
            const button = card.querySelector('.add-to-cart-btn');
            if (button) {
                button.textContent = 'Agregar al Carrito';
                button.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
            }
        });
    }
}

function getProductImage(productId) {
    const productCard = document.querySelector(`[data-product*="${productId}"]`);
    if (productCard) {
        const img = productCard.querySelector('img');
        return img ? img.src : 'https://via.placeholder.com/300x300?text=Producto';
    }
    return 'https://via.placeholder.com/300x300?text=Producto';
}

// Sistema de personalización de cascos
function showCustomizationModal(productId) {
    currentCustomization = productId;
    const modal = document.getElementById('customization-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.add('show');
        overlay.classList.add('show');
    }
    
    // Resetear opciones
    document.getElementById('custom-text').value = '';
    document.getElementById('design-select').value = 'sólido';
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
    updateCustomPrice();
}

function closeCustomizationModal() {
    const modal = document.getElementById('customization-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    currentCustomization = null;
}

function addCustomizedToCart() {
    if (!currentCustomization) return;
    
    const color = document.querySelector('.color-btn.selected')?.dataset.color || 'negro';
    const design = document.getElementById('design-select').value;
    const customText = document.getElementById('custom-text').value;
    
    const productName = `Casco Personalizado (${color}, ${design})`;
    if (customText) {
        productName += ` - "${customText}"`;
    }
    
    const basePrice = getProductPrice(currentCustomization);
    const customPrice = calculateCustomPrice(design, customText);
    const totalPrice = basePrice + customPrice;
    
    addToCart(currentCustomization + '-custom', productName, totalPrice);
    closeCustomizationModal();
}

function calculateCustomPrice(design, customText) {
    let price = 0;
    
    if (design === 'rayas') price += 20000;
    else if (design === 'camuflaje') price += 30000;
    else if (design === 'personalizado') price += 50000;
    
    if (customText) price += 15000;
    
    return price;
}

function updateCustomPrice() {
    const design = document.getElementById('design-select').value;
    const customText = document.getElementById('custom-text').value;
    const price = calculateCustomPrice(design, customText);
    
    document.getElementById('custom-price').textContent = `$${price.toLocaleString()} COP`;
}

function getProductPrice(productId) {
    const productCard = document.querySelector(`[data-product*="${productId}"]`);
    if (productCard) {
        const priceElement = productCard.querySelector('.price');
        if (priceElement) {
            const priceText = priceElement.textContent.replace(/[^\d]/g, '');
            return parseInt(priceText) || 0;
        }
    }
    return 0;
}

// Event listeners para personalización
document.addEventListener('DOMContentLoaded', function() {
    // Color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Design and text changes
    const designSelect = document.getElementById('design-select');
    const customText = document.getElementById('custom-text');
    
    if (designSelect) {
        designSelect.addEventListener('change', updateCustomPrice);
    }
    
    if (customText) {
        customText.addEventListener('input', updateCustomPrice);
    }
});

// Sistema de catálogo
function showCatalog(category) {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('catalog-title');
    const grid = document.getElementById('catalog-grid');
    
    if (!modal || !overlay || !title || !grid) return;
    
    title.textContent = `Catálogo - ${getCategoryName(category)}`;
    grid.innerHTML = '';
    
    // Cargar productos del catálogo
    const products = getCatalogProducts(category);
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h4>${product.name}</h4>
            <p class="price">$${product.price.toLocaleString()} COP</p>
            <button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${product.image}')">Agregar</button>
        `;
        grid.appendChild(item);
    });
    
    modal.classList.add('show');
    overlay.classList.add('show');
}

function closeCatalogModal() {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function getCategoryName(category) {
    const names = {
        'camisetas': 'Camisetas Adidas',
        'tenis': 'Tenis Adidas',
        'jeans': 'Jeans',
        'cascos': 'Cascos para Motos',
        'deportes': 'Equipos Deportivos'
    };
    return names[category] || category;
}

function getCatalogProducts(category) {
    // Productos adicionales para el catálogo
    const catalogProducts = {
        'camisetas': [
            { id: 'camiseta-cat-1', name: 'Camiseta Adidas Originals ', price: 60000, image: 'Camiseta adidas4.webp' },
            { id: 'camiseta-cat-2', name: 'Camiseta Adidas Performance ', price: 65000, image: 'Camiseta Adidas2.jpg' },
            { id: 'camiseta-cat-3', name: 'Camiseta Adidas Arsenal Club ', price: 55000, image: 'Camiseta Arsenal.png' },
            { id: 'camiseta-cat-4', name: 'Camiseta Adidas Al Nassr Club ', price: 55000, image: 'Camiseta Alnassr.webp' },
            { id: 'camiseta-cat-5', name: 'Camiseta Adidas Real Madrid Club ', price: 55000, image: 'Camiseta Madrid black.png' }
        ],
        'tenis': [
            { id: 'tenis-cat-1', name: 'Tenis Adidas Yeezy', price: 800000, image: 'Tenis Adidas Yeezy.webp' },
            { id: 'tenis-cat-2', name: 'Tenis Adidas Boost', price: 350000, image: 'Tenis Adidas Boost.avif' },
            { id: 'tenis-cat-3', name: 'Tenis Adidas Retro', price: 200000, image: 'Tenis Adidas Retro.jpg' }
        ],
        'jeans': [
            { id: 'jeans-cat-1', name: 'Jeans Clasicos', price: 120000, image: 'Jeans clasico hombre.jpg' },
            { id: 'jeans-cat-2', name: 'Jeans Clasicos 2', price: 120000, image: 'Jeans clasicos catalogo.jpg' },
            { id: 'jeans-cat-3', name: 'Jeans Vintage', price: 100000, image: 'jeans ventage dama2.webp' },
            { id: 'jeans-cat-4', name: 'Jeans Vintage 2', price: 100000, image: 'jeans vintage dama.webp' },
            { id: 'jeans-cat-5', name: 'Jeans Rotos', price: 85000, image: 'jeans rotos2.webp' },
            { id: 'jeans-cat-6', name: 'Jeans Relaxed', price: 85000, image: 'jeans relaxed 2.webp' },
            { id: 'jeans-cat-7', name: 'Jeans Modernos', price: 85000, image: 'jeans modernos2.webp' },
            { id: 'jeans-cat-8', name: 'Jeans Modernos 2', price: 85000, image: 'jeans modernos.jpg' }
        ],
        'cascos': [
            { id: 'casco-cat-1', name: 'Casco Premium', price: 300000, image: 'Casco Premium.jpg' },
            { id: 'casco-cat-2', name: 'Casco Premium 2', price: 300000, image: 'Casco Premium2.webp' },
            { id: 'casco-cat-3', name: 'Casco Racing', price: 250000, image: 'Casco Racing.jpg' },
            { id: 'casco-cat-4', name: 'Casco Racing 2', price: 250000, image: 'Casco Racing2.jpg' },
            { id: 'casco-cat-5', name: 'Casco Touring', price: 180000, image: 'Casco Touring.webp' },
            { id: 'casco-cat-6', name: 'Casco Touring 2', price: 180000, image: 'Casco Touring2.webp' }
        ],
        'deportes': [
            { id: 'deportes-cat-1', name: 'Bicicleta Mountain Bike', price: 1500000, image: 'BicicletaCata.jpg' },
            { id: 'deportes-cat-2', name: 'Bicicleta Mountain Bike 2', price: 1500000, image: 'Bicicleta Bike 3.webp' },
            { id: 'deportes-cat-3', name: 'Bicicleta Mountain Bike 3', price: 1500000, image: 'Bicicleta Bike 4.jpg' },
            { id: 'deportes-cat-4', name: 'Bicicleta Mountain Bike 4', price: 1500000, image: 'Bicicleta Bike2.webp' },
            { id: 'deportes-cat-5', name: 'Equipo Completo Ciclismo', price: 800000, image: 'Equipo Completo 1.avif' },
            { id: 'deportes-cat-6', name: 'Equipo Completo Ciclismo 2', price: 800000, image: 'Equipo Completo 2.avif' },
            { id: 'deportes-cat-7', name: 'Equipo Completo Ciclismo 3', price: 800000, image: 'Equipo Completo 3.avif' },
            { id: 'deportes-cat-8', name: 'Accesorios Deportivos', price: 120000, image: 'Acesorios Bici.webp' },
            { id: 'deportes-cat-9', name: 'Accesorios Deportivos 2', price: 120000, image: 'Acesorios Bici2.jpg' },
            { id: 'deportes-cat-10', name: 'Accesorios Deportivos 3', price: 120000, image: 'Acesorios Bici3.jpeg' }
        ]
    };
    
    return catalogProducts[category] || [];
}

// Funcionalidad de checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Tu carrito está vacío');
        return;
    }
    
    // Verificar si el usuario está autenticado
    if (typeof authSystem !== 'undefined' && !authSystem.isAuthenticated) {
        showNotification('Debes iniciar sesión para proceder al pago');
        authSystem.showLoginModal();
        return;
    }
    
    // Mostrar modal de pago
    showPaymentModal();
}

// Mostrar modal de pago
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        // Actualizar resumen de compra
        updatePaymentSummary();
        
        modal.classList.add('show');
        overlay.classList.add('show');
        document.body.classList.add('modal-open');
    }
}

// Actualizar resumen de pago
function updatePaymentSummary() {
    const paymentItems = document.getElementById('payment-items');
    const paymentTotal = document.getElementById('payment-total-amount');
    
    if (!paymentItems || !paymentTotal) return;
    
    let itemsHTML = '';
    cart.forEach(item => {
        const totalPrice = item.price * item.quantity;
        itemsHTML += `
            <div class="payment-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${totalPrice.toLocaleString()} COP</span>
            </div>
        `;
    });
    
    paymentItems.innerHTML = itemsHTML;
    paymentTotal.textContent = `$${cartTotal.toLocaleString()} COP`;
}

// Sistema de notificaciones
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(45deg, #4ecdc4, #44a08d);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-weight: 600;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Funciones de utilidad
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.getElementById('modal-overlay').classList.remove('show');
}

// Efecto parallax en el hero
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.bike-container');
    
    if (heroImage) {
        const rate = scrolled * -0.5;
        heroImage.style.transform = `rotate(-5deg) translateY(${rate}px)`;
    }
});

// Optimización de rendimiento
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Aplicar debounce a eventos de scroll
const debouncedScroll = debounce(function() {
    // Lógica de scroll optimizada
}, 10);

window.addEventListener('scroll', debouncedScroll);

// Funcionalidad de botones de acción
document.addEventListener('DOMContentLoaded', function() {
    // Botón "Ver Más" del hero
    const heroBtn = document.querySelector('.hero .btn-primary');
    if (heroBtn) {
        heroBtn.addEventListener('click', function() {
            document.querySelector('#camisetas').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }
    
    // Efectos hover en las tarjetas de productos
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});