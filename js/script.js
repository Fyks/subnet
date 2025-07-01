/**
 * Subnet Store - Оптимизированный основной скрипт
 */

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================
function generateId(prefix = 'ORD') {
  return `${prefix}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

function getElementValue(selector, parent = document) {
  const el = parent.querySelector(selector);
  return el ? el.textContent || el.value : '';
}

// ==================== КОРЗИНА ====================
const cart = {
  items: JSON.parse(localStorage.getItem('cart')) || [],
  total: 0,

  // Основные методы
  addItem(product) {
    this.items.push(product);
    this.update();
  },

  removeItem(index) {
    this.items.splice(index, 1);
    this.update();
  },

  clear() {
    this.items = [];
    this.update();
  },

  // Вспомогательные методы
  calculateTotal() {
    this.total = this.items.reduce((sum, item) => sum + item.price, 0);
    return this.total;
  },

  saveToStorage() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    localStorage.setItem('cartTotal', this.total);
  },

  update() {
    this.calculateTotal();
    this.saveToStorage();
    this.updateUI();
  },

  // Методы обновления интерфейса
  updateUI() {
    this.updateCounter();
    this.updateDropdown();
    this.updateCartPage();
    this.updateCheckoutPage();
  },

  updateCounter() {
    const counter = document.getElementById('cart-count');
    if (counter) counter.textContent = this.items.length;
  },

  updateDropdown() {
    const itemsEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if (itemsEl && totalEl) {
      itemsEl.innerHTML = this.items.map((item, i) => this.createCartItemHTML(item, i)).join('');
      totalEl.textContent = `${this.total} руб.`;
    }
  },

  updateCartPage() {
    if (!document.querySelector('.cart-page')) return;
    
    const itemsEl = document.getElementById('cart-items-list');
    if (itemsEl) {
      itemsEl.innerHTML = this.items.length 
        ? this.items.map((item, i) => this.createCartPageItemHTML(item, i)).join('')
        : '<p class="empty-cart">Ваша корзина пуста</p>';
    }
    
    ['cart-subtotal', 'cart-total'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${this.total} руб.`;
    });
  },

  updateCheckoutPage() {
    if (!document.querySelector('.checkout-page')) return;
    
    const itemsEl = document.getElementById('checkout-items');
    if (itemsEl) {
      itemsEl.innerHTML = this.items.map(item => `
        <div class="checkout-item">
          <span>${item.name} ${item.price} руб.</span>
        </div>
      `).join('');
    }
    
    const totalEl = document.getElementById('checkout-total');
    if (totalEl) totalEl.textContent = `${this.total} руб.`;
  },

  // HTML-шаблоны
  createCartItemHTML(item, index) {
    return `
      <div class="cart-item">
        <span>${item.name} ${item.price} руб.</span>
        <button onclick="cart.removeItem(${index})"> ✖ </button>
      </div>`;
  },

  createCartPageItemHTML(item, index) {
  const imgSrc = item.image.includes('logo.png') 
    ? 'images/default-product.png' 
    : item.image;
    
  return `
    <div class="cart-item">
      <img src="${imgSrc}" alt="${item.name}">
      <div class="item-info">
        <h4>${item.name}</h4>
        <span class="item-price">${item.price} руб.</span>
      </div>
      <button onclick="cart.removeItem(${index})"> ✖ </button>
    </div>`;
}
};

// ==================== TELEGRAM УВЕДОМЛЕНИЯ ====================
async function notifySeller(order) {
  const botToken = '7623663107:AAEnjPxKKLvuM37g8XmsTB9UpdmqtLsduDU';
  const chatId = '5756737130';
  
  try {
    const message = this.createOrderMessage(order);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
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
    
    console.log('Уведомление отправлено:', order.id);
    return true;
  } catch (error) {
    console.error('Ошибка отправки:', error);
    return false;
  }
}

function createOrderMessage(order) {
  return `
<b>🛍️ Новый заказ в Subnet Store #${order.id}</b>
<i>${new Date().toLocaleString()}</i>

<b>👤 Клиент:</b> ${order.customer.name}
<b>✉️ Telegram:</b> ${order.customer.telegram}
<b>📧 Email:</b> ${order.customer.email || 'не указан'}

<b>🛒 Товары:</b>
${order.items.map(i => `- ${i.name}: ${i.price} руб.`).join('\n')}

<b>💰 Итого:</b> ${order.total} руб.
<b>📝 Примечания:</b> ${order.notes || 'нет'}`;
}

// ==================== ОБРАБОТКА ТОВАРОВ ====================
function setupBuyButtons() {
  document.addEventListener('click', e => {
    if (e.target.classList.contains('buy-btn')) {
      e.preventDefault();
      const productCard = e.target.closest('.product-card, .product-details');
      if (!productCard) return;

      cart.addItem({
        id: productCard.dataset.id || generateId('PROD'),
        name: getElementValue('h2, h3', productCard),
        price: parseInt(getElementValue('.price', productCard).replace(/\D/g, '')) || 0,
        image: getProductImage(productCard)
      });
      
      showFeedback(e.target);
    }
    
    if (e.target.classList.contains('remove-item')) {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) cart.removeItem(index);
    }
  });
}

function getProductImage(element) {
  // Ищем изображение в карточке товара с классом product-image
  const img = element.querySelector('.product-image') || 
              element.querySelector('img[alt*="Premium"], img[alt*="Nitro"], img[alt*="Plus"]');
  
  if (!img) return 'images/logo.png';
  
  // Возвращаем абсолютный URL для корректного отображения на всех страницах
  return new URL(img.src, window.location.href).href;
}

// Обновите функцию setupBuyButtons для правильного поиска карточки товара:
function setupBuyButtons() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('buy-btn')) {
      e.preventDefault();
      
      // Ищем ближайшую карточку товара с классом product-card или product-details
      const productCard = e.target.closest('.product-card, .product-details');
      if (!productCard) return;

      const product = {
        id: productCard.dataset.id || generateId('PROD'),
        name: getElementValue('h2, h3', productCard),
        price: parseInt(getElementValue('.price', productCard).replace(/\D/g, '')) || 0,
        image: getProductImage(productCard.closest('section') || productCard)
      };

      cart.addItem(product);
      showFeedback(e.target);
    }
  });
}

function showFeedback(button) {
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
  const form = document.getElementById('order-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    
    if (cart.items.length === 0) {
      alert('Ваша корзина пуста!');
      return window.location.href = 'cart.html';
    }
    const telegram = document.getElementById('telegram').value.trim();
    const name = document.getElementById('name').value.trim();

    if (!name || !telegram) {
      return alert('Пожалуйста, заполните обязательные поля');
    }

    showLoader();

    try {
      const order = {
        id: generateId(),
        customer: { 
          name,
          telegram,
          email: document.getElementById('email').value.trim()
        },
        items: [...cart.items],
        total: cart.total,
        notes: document.getElementById('notes').value.trim(),
        date: new Date().toISOString()
      };

      const response = await mockApiSubmit(order);
      
      if (response.success) {
        order.id = response.orderId;
        await notifySeller(order);
        cart.clear();
        window.location.href = `order-success.html?id=${order.id}`;
      }
    } catch (error) {
      console.error('Ошибка оформления:', error);
      alert('Ошибка при оформлении заказа. Попробуйте позже.');
    } finally {
      hideLoader();
    }
  });
}

async function mockApiSubmit(data) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        orderId: data.id
      });
    }, 1500);
  });
}

// ==================== ИНДИКАТОР ЗАГРУЗКИ ====================
function showLoader() {
  const loader = document.createElement('div');
  loader.className = 'loader';
  document.body.appendChild(loader);
}

function hideLoader() {
  document.querySelector('.loader')?.remove();
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
  cart.update();
  setupBuyButtons();
  setupOrderForm();
  
  const orderId = new URLSearchParams(window.location.search).get('id');
  if (orderId && document.getElementById('order-id')) {
    document.getElementById('order-id').textContent = orderId;
  }
});