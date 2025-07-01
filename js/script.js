/**
 * Subnet Store - Основной скрипт
 * Включает: корзину, обработку товаров, оформление заказа
 */

// ==================== КОРЗИНА ====================
const cart = {
  items: JSON.parse(localStorage.getItem('cart')) || [],
  total: 0,

  // Добавить товар в корзину
  addItem(product) {
    this.items.push(product);
    this.calculateTotal();
    this.saveToStorage();
    this.updateCartUI();
  },

  // Удалить товар из корзины
  removeItem(index) {
    this.items.splice(index, 1);
    this.calculateTotal();
    this.saveToStorage();
    this.updateCartUI();
  },

  // Пересчитать сумму
  calculateTotal() {
    this.total = this.items.reduce((sum, item) => sum + item.price, 0);
  },

  // Сохранить в localStorage
  saveToStorage() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    localStorage.setItem('cartTotal', this.total);
  },

  // Обновить отображение корзины
  updateCartUI() {
    this.updateCartCounter();
    this.updateDropdownCart();
    this.updateCartPage();
    this.updateCheckoutPage();
  },

  // Обновить счетчик товаров
  updateCartCounter() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.textContent = this.items.length;
  },

  // Обновить выпадающую корзину
  updateDropdownCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (cartItems && cartTotal) {
      cartItems.innerHTML = this.items.map((item, index) => `
        <div class="cart-item">
          <span>${item.name}</span>
          <span>${item.price} руб.</span>
          <button onclick="cart.removeItem(${index})">×</button>
        </div>
      `).join('');
      
      cartTotal.textContent = this.total + ' руб.';
    }
  },

  // Обновить страницу корзины
  updateCartPage() {
    if (!document.querySelector('.cart-page')) return;
    
    const cartItems = document.getElementById('cart-items-list');
    const subtotal = document.getElementById('cart-subtotal');
    const total = document.getElementById('cart-total');
    
    if (this.items.length === 0) {
      if (cartItems) cartItems.innerHTML = '<p class="empty-cart">Ваша корзина пуста</p>';
    } else {
      if (cartItems) {
        cartItems.innerHTML = this.items.map((item, index) => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="item-info">
              <h4>${item.name}</h4>
              <span class="item-price">${item.price} руб.</span>
            </div>
            <button onclick="cart.removeItem(${index});">×</button>
          </div>
        `).join('');
      }
    }
    
    if (subtotal) subtotal.textContent = this.total + ' руб.';
    if (total) total.textContent = this.total + ' руб.';
  },

  // Обновить страницу оформления заказа
  updateCheckoutPage() {
    if (!document.querySelector('.checkout-page')) return;
    
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (checkoutItems) {
      checkoutItems.innerHTML = this.items.map(item => `
        <div class="checkout-item">
          <span>${item.name}</span>
          <span>${item.price} руб.</span>
        </div>
      `).join('');
    }
    
    if (checkoutTotal) checkoutTotal.textContent = this.total + ' руб.';
  }
};

function generateOrderId() {
  return 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ==================== TELEGRAM УВЕДОМЛЕНИЯ ====================
async function notifySeller(orderData) {
  const botToken = '7623663107:AAEnjPxKKLvuM37g8XmsTB9UpdmqtLsduDU';
  const chatId = '5756737130';
  
  try {
    const message = `
<b>🛍️ Новый заказ в Subnet Store #${orderData.id}</b>
<i>${new Date().toLocaleString()}</i>

<b>👤 Клиент:</b> ${orderData.customer.name}
<b>📧 Email:</b> ${orderData.customer.email}
<b>✉️ Telegram:</b> ${orderData.customer.telegram || 'не указан'}

<b>🛒 Товары:</b>
${orderData.items.map(i => `- ${i.name}: ${i.price} руб.`).join('\n')}

<b>💰 Итого:</b> ${orderData.total} руб.
<b>📝 Примечания:</b> ${orderData.notes || 'нет'}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.description);
    
    console.log('Уведомление отправлено:', orderData.id);
    return true;
  } catch (error) {
    console.error('Ошибка отправки:', error);
    return false;
  }
}
// ==================== ОБРАБОТКА ТОВАРОВ ====================
function setupBuyButtons() {
  document.addEventListener('click', function(e) {
    // Обработка кнопок "Купить"
    if (e.target.classList.contains('buy-btn')) {
      e.preventDefault();
      
      const productCard = e.target.closest('.product-card, .product-details');
      if (!productCard) return;

      const product = {
        id: productCard.dataset.id || generateProductId(),
        name: getProductName(productCard),
        price: getProductPrice(productCard),
        image: getProductImage(productCard)
      };

      cart.addItem(product);
      showAddToCartFeedback(e.target);
    }
    
    // Обработка удаления из корзины
    if (e.target.classList.contains('remove-item')) {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) cart.removeItem(index);
    }
  });
}

// Генератор ID для товара
function generateProductId() {
  return 'prod-' + Math.random().toString(36).substr(2, 9);
}

// Получить название товара
function getProductName(element) {
  return element.querySelector('h2, h3')?.textContent || 'Без названия';
}

// Получить цену товара
function getProductPrice(element) {
  const priceText = element.querySelector('.price')?.textContent || '0';
  return parseInt(priceText.replace(/\D/g, '')) || 0;
}

// Получить изображение товара
function getProductImage(element) {
  // Ищем изображение в карточке товара
  const img = element.querySelector('img');
  if (!img) return 'images/logo.png';
  
  // Возвращаем абсолютный URL для корректного отображения на всех страницах
  return new URL(img.src, window.location.href).href;
}

// Показать подтверждение добавления
function showAddToCartFeedback(button) {
  const originalText = button.textContent;
  button.textContent = '✓ Добавлено';
  button.classList.add('added-to-cart');
  
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('added-to-cart');
  }, 2000);
}

// ==================== ОФОРМЛЕНИЕ ЗАКАЗА ====================
function setupOrderForm() {
  const orderForm = document.getElementById('order-form');
  if (!orderForm) return;

  orderForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Проверка пустой корзины
    if (cart.items.length === 0) {
      alert('Ваша корзина пуста!');
      window.location.href = 'cart.html';
      return;
    }

    // Валидация полей
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (!name || !email) {
      alert('Пожалуйста, заполните обязательные поля');
      return;
    }

    // Показать загрузку
    showLoader();

    try {
      // Имитация отправки на сервер
      const orderData = {
        id: generateOrderId(), // Генерируем ID сразу
        customer: { 
          name: document.getElementById('name').value.trim(),
          email: document.getElementById('email').value.trim(),
          telegram: document.getElementById('telegram').value.trim()
        },
        items: cart.items,
        total: cart.total,
        notes: document.getElementById('notes').value.trim(),
        date: new Date().toISOString()
      };

      const response = await mockApiSubmit(orderData);
      
      if (response.success) {
  orderData.id = response.orderId; // Обновляем ID если сервер вернул свой
  await notifySeller(orderData);
        // Очистить корзину после успешного заказа
        cart.items = [];
        cart.total = 0;
        cart.saveToStorage();
        cart.updateCartUI();
        
        // Перенаправить на страницу успеха
        window.location.href = `order-success.html?id=${response.orderId}`;
      }
    } catch (error) {
      console.error('Ошибка оформления заказа:', error);
      alert('Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте позже.');
    } finally {
      hideLoader();
    }
  });
}

// Имитация API
async function mockApiSubmit(data) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        orderId: data.id || 'ORD-' + Date.now() // Используем существующий ID или генерируем новый
      });
    }, 1500);
  });
}

// Показать индикатор загрузки
function showLoader() {
  const loader = document.createElement('div');
  loader.className = 'loader';
  document.body.appendChild(loader);
}

// Скрыть индикатор загрузки
function hideLoader() {
  const loader = document.querySelector('.loader');
  if (loader) loader.remove();
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
  // Инициализация корзины
  cart.calculateTotal();
  cart.updateCartUI();
  
  // Настройка обработчиков
  setupBuyButtons();
  setupOrderForm();
  
  // Инициализация страницы успешного заказа
  if (document.querySelector('.order-success')) {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    if (orderId) {
      document.getElementById('order-id').textContent = orderId;
    }
  }
});