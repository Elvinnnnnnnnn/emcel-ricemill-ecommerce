document.addEventListener("DOMContentLoaded", () => {

  const modalStock = document.getElementById('modal-stock');
  const modal = document.getElementById('product-modal');
  const closeBtn = document.querySelector('.close-btn');
  const modalImage = document.getElementById('modal-image');
  const modalName = document.getElementById('modal-name');
  const modalPrice = document.getElementById('modal-price');
  const modalDesc = document.getElementById('modal-desc');
  const modalVariants = document.getElementById('modal-variants');
  const outOfStockText = document.getElementById('out-of-stock');
  const productContainer = document.querySelector('.product-container');

  const cartIcon = document.getElementById("cartIcon");
  const cartContainer = document.querySelector(".cart-container");
  const closeCart = document.getElementById("closeCart");

  cartIcon.addEventListener("click", () => {
    cartContainer.classList.add("show");
  });

  // Close with smooth slide
  closeCart.addEventListener("click", () => {
      cartContainer.classList.remove("show");
  });



  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const addCartButtons = document.querySelectorAll('.add-cart-btn');

  function clearModal() {
    modalImage.src = '';
    modalName.textContent = '';
    modalPrice.textContent = '';
    modalDesc.textContent = '';
    modalVariants.innerHTML = '';
    outOfStockText.style.display = 'none';
  }

  function openModalFromButton(btn) {
    clearModal();

    const id = btn.dataset.id;
    const name = btn.dataset.name || '';
    const description = btn.dataset.description || '';
    const image = btn.dataset.image || '';
    const price = btn.dataset.price ?? '';
    const kg = btn.dataset.kg ?? '';
    const stock = btn.dataset.stock ?? '';

    modalImage.src = image;
    modalName.textContent = name;
    modalDesc.textContent = description;
    modalPrice.textContent = `₱${Number(price).toLocaleString()}`;
    modalStock.textContent = `Available: ${stock} sacks`;

    const serverProduct = Array.isArray(products)
      ? products.find(p => String(p.id) === String(id))
      : null;

    // Populate variants
    modalVariants.innerHTML = '';
    if (serverProduct && serverProduct.variants?.length > 0) {
      serverProduct.variants.forEach(v => {
        const b = document.createElement('button');
        b.className = 'kg-btn';
        b.type = 'button';
        b.textContent = v.kilograms + 'kg';
        b.dataset.price = v.price;
        b.dataset.stock = v.stock;
        b.dataset.variantId = v.id;
        modalVariants.appendChild(b);
      });
    } else if (kg !== '' || price !== '') {
      const b = document.createElement('button');
      b.className = 'kg-btn';
      b.type = 'button';
      b.textContent = kg || 'Default';
      b.dataset.price = price || '0';
      b.dataset.stock = stock || '0';
      modalVariants.appendChild(b);
    } else {
      modalVariants.textContent = 'No variants available';
    }

    // Select first variant by default
    const firstVariantBtn = modalVariants.querySelector('.kg-btn');
    if (firstVariantBtn) {
      firstVariantBtn.classList.add('selected-kg');
      const addCartBtn = modal.querySelector('.add-cart-btn');
      addCartBtn.dataset.price = firstVariantBtn.dataset.price;
      modalStock.textContent = `Available: ${firstVariantBtn.dataset.stock} sacks`;
      addCartBtn.dataset.variantId = firstVariantBtn.dataset.variantId || null;
    }

    modal.style.display = 'flex';

    const addCartBtn = modal.querySelector('.add-cart-btn');
    addCartBtn.dataset.id = id;
    addCartBtn.dataset.name = name;
    addCartBtn.dataset.image = image;
  }

  productContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.buy-button');
    if (!btn) return;
    openModalFromButton(btn);
  });

  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  // Variant selection
  modalVariants.addEventListener('click', (e) => {
    const btn = e.target.closest('.kg-btn');
    if (!btn) return;
    modalVariants.querySelectorAll('.kg-btn').forEach(b => b.classList.remove('selected-kg'));
    btn.classList.add('selected-kg');

    modalPrice.textContent = `₱${Number(btn.dataset.price).toLocaleString()}`;
    modalStock.textContent = `Available: ${btn.dataset.stock} sacks`;
    outOfStockText.style.display = Number(btn.dataset.stock) === 0 ? 'block' : 'none';

    const addCartBtn = modal.querySelector('.add-cart-btn');
    addCartBtn.dataset.price = btn.dataset.price;
    addCartBtn.dataset.variantId = btn.dataset.variantId || null;
  });

  // Add to cart
  addCartButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const selectedVariant = document.querySelector('.kg-btn.selected-kg');
      const product = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(selectedVariant ? selectedVariant.dataset.price : btn.dataset.price),
        image: btn.dataset.image,
        quantity: Number(document.getElementById('quantity')?.value || 1),
        variant_id: selectedVariant ? selectedVariant.dataset.variantId : null
      };

        const res = await fetch('/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            quantity: product.quantity,
            price: product.price,
            variantId: product.variant_id
          })
        });

        const data = await res.json();

        if (!data.success) {
          showToast(data.message, 'error');
          return;
        }

        showToast('Added to cart successfully');
        loadCart();
      });
  });

  // Load cart
  async function loadCart() {
    try {
      const res = await fetch('/cart', {
        credentials: 'include'
      });

      if (!res.ok) {
        console.log('Cart request failed:', res.status);
        return;
      }

      const cart = await res.json();

      if (!Array.isArray(cart)) {
        console.log('Cart is not an array:', cart);
        return;
      }

      let total = 0;
      cartItems.innerHTML = '';

      cart.forEach(item => {
        total += item.price * item.quantity;

        const li = document.createElement('li');
        li.innerHTML = `
          <div class="items-container">
            <div>
              <img class="cart-checkout-image"
                src="/product_photos/${item.image}"
                alt="${item.name}">
            </div>
            <div class="items-content">
              <p class="item-name">
                ${item.name} ${item.variant ? '(' + item.variant + ')' : ''}
              </p>
              <p class="item-value">
                ₱${Number(item.price).toLocaleString()}
              </p>
            </div>
            <div class="quantity-content">
              <input class="quantity-cart"
                type="number"
                data-id="${item.cartId}"
                value="${item.quantity}"
                min="1">
              <p class="remove-item"
                data-id="${item.cartId}">
                Remove
              </p>
            </div>
          </div>
        `;
        cartItems.appendChild(li);
      });

      // Count total quantity
      let totalQuantity = 0;

      cart.forEach(item => {
        totalQuantity += item.quantity;
      });

      // Shipping logic
      let SHIPPING_FEE = 0;

      if (totalQuantity >= 1 && totalQuantity <= 4) {
        SHIPPING_FEE = 100;
      } else if (totalQuantity >= 5) {
        SHIPPING_FEE = 0;
      }

      const subtotal = total;
      const finalTotal = subtotal + SHIPPING_FEE;

      document.getElementById('cartSubtotal').textContent = subtotal.toLocaleString();
      document.getElementById('cartShipping').textContent = SHIPPING_FEE.toLocaleString();
      cartTotal.textContent = finalTotal.toLocaleString();
      setupCartItemListeners();

    } catch (err) {
      console.error('Error loading cart:', err);
    }
  }

  function setupCartItemListeners() {
    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(`/cart/${btn.dataset.id}`, { method: 'DELETE' });
        if (document.body.dataset.loggedIn === "true") {
          loadCart();
        }
      });
    });

    document.querySelectorAll('.quantity-cart').forEach(input => {
      input.addEventListener('change', async () => {
        const quantity = Number(input.value);
        await fetch(`/cart/${input.dataset.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity })
        });
        if (document.body.dataset.loggedIn === "true") {
          loadCart();
        }
      });
    });
  }

    if (document.body.dataset.loggedIn === "true") {
      loadCart();
    }
});


// ===== PROFILE DROPDOWN =====
const profileIcon = document.getElementById('profileIcon');
const profileDropdown = document.getElementById('profileDropdown');

if (profileIcon && profileDropdown) {
  profileIcon.addEventListener('click', () => {
    profileDropdown.classList.toggle('show'); // toggle visibility
  });

  document.addEventListener('click', (e) => {
  if (
    profileDropdown.classList.contains('show') &&
    !profileDropdown.contains(e.target) &&
    !profileIcon.contains(e.target)
  ) {
    profileDropdown.classList.remove('show');
  }
});

}

const closeProfileBtn = document.querySelector('.close-profile');

if (closeProfileBtn) {
  closeProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // ⛔ prevent document click from interfering
    profileDropdown.classList.remove('show');
  });
}


const deliveryBtn = document.getElementById('deliveryBtn');
const deliveryPanel = document.getElementById('deliveryPanel');
const closePanel = document.getElementById('closePanel');

if (deliveryBtn && deliveryPanel) {
  deliveryBtn.addEventListener('click', () => {
    if (profileDropdown && profileDropdown.classList.contains('show')) {
      profileDropdown.classList.remove('show');
    }
    deliveryPanel.classList.add('active');
  });
}

if (closePanel && deliveryPanel) {
  closePanel.addEventListener('click', () => {
    deliveryPanel.classList.remove('active');
  });
}

// Optional: close if clicked outside
window.addEventListener('click', (e) => {
    if (e.target === deliveryPanel) {
        deliveryPanel.classList.remove('active');
    }
});

async function loadAddresses() {
  try {
    const res = await fetch('/delivery', {
      credentials: 'include'
    });

    if (!res.ok) return;

    const addresses = await res.json();

    if (!Array.isArray(addresses)) return;

    const addressesList = document.querySelector('.addresses-list');
    if (!addressesList) return;

    addressesList.innerHTML = '';

    addresses.forEach(addr => {
      const div = document.createElement('div');
      div.className = 'address-card';
      div.innerHTML = `
        <p class="name">${addr.firstname} ${addr.lastname}</p>
        <p class="address">${addr.address}, ${addr.city}</p>
        <p class="phone">${addr.phone}</p>
        <button class="edit-address" data-id="${addr.id}">Edit</button>
        <button class="delete-address" data-id="${addr.id}">Delete</button>
      `;
      addressesList.appendChild(div);
    });

    setupAddressButtons();

  } catch (err) {
    console.error(err);
  }
}

function setupAddressButtons() {
    document.querySelectorAll('.edit-address').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            // fetch address data or prefill a modal form
            const res = await fetch(`/delivery/${id}`);
            const data = await res.json();
            // prefill your delivery form with `data`
            console.log('Edit address:', data);
        });
    });

    document.querySelectorAll('.delete-address').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this address?')) return;
            const res = await fetch(`/delivery/${btn.dataset.id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) loadAddresses();
        });
    });
}

// Load initially
if (document.body.dataset.loggedIn === "true") {
  loadAddresses();
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.querySelector('.add-new-address');
  const saveBtn = document.getElementById('save-address');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const form = document.getElementById('new-address-form');
      if (form) form.style.display = 'block';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const data = {
        firstname: document.getElementById('firstname').value,
        lastname: document.getElementById('lastname').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        region: document.getElementById('region').value,
        postal: document.getElementById('postal').value,
        phone: document.getElementById('phone').value
      };

      const res = await fetch('/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('Address saved!');
        if (document.body.dataset.loggedIn === "true") {
          loadAddresses();
        }// reload addresses dynamically instead of refreshing
        const form = document.getElementById('new-address-form');
        if (form) form.style.display = 'none';
      } else {
        showToast('Failed to save address');
      }
    });
  }
});

function setupAddressButtons() {
    document.querySelectorAll('.edit-address').forEach(btn => {
        btn.onclick = async () => {   // <-- IMPORTANT: overwrite, don’t stack
            const id = btn.dataset.id;
            const res = await fetch(`/delivery/${id}`);
            const data = await res.json();

            console.log('Edit address:', data);

            document.getElementById('firstname').value = data.firstname;
            document.getElementById('lastname').value = data.lastname;
            document.getElementById('address').value = data.address;
            document.getElementById('city').value = data.city;
            document.getElementById('region').value = data.region;
            document.getElementById('postal').value = data.postal;
            document.getElementById('phone').value = data.phone;

            document.getElementById('new-address-form').style.display = 'block';
            document.getElementById('save-address').dataset.editId = data.id;
        };
    });

    document.querySelectorAll('.delete-address').forEach(btn => {
        btn.onclick = async () => {
            if (!confirm('Delete this address?')) return;
            const res = await fetch(`/delivery/${btn.dataset.id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) loadAddresses();
        };
    });
}

// ===== Order History Panel =====
const orderHistoryBtn = document.querySelector('.orderhistory-container');
const orderHistoryPanel = document.getElementById('orderHistoryPanel');
const closeOrderPanel = document.getElementById('closeOrderPanel');

if (orderHistoryBtn && orderHistoryPanel) {
  orderHistoryBtn.addEventListener('click', () => {
    if (profileDropdown && profileDropdown.classList.contains('show')) {
      profileDropdown.classList.remove('show');
    }
    orderHistoryPanel.classList.add('active');
  });
}

if (closeOrderPanel && orderHistoryPanel) {
  closeOrderPanel.addEventListener('click', () => {
    orderHistoryPanel.classList.remove('active');
  });
}

// Elements
const settingsContainer = document.querySelector('.settings-container');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsPanel = document.getElementById('closeSettingsPanel');

// Open Settings Panel
if (settingsContainer && settingsPanel) {
  settingsContainer.addEventListener('click', () => {
    if (profileDropdown && profileDropdown.classList.contains('show')) {
      profileDropdown.classList.remove('show');
    }
    settingsPanel.classList.add('active');
  });
}

// Close Settings Panel
if (closeSettingsPanel && settingsPanel) {
  closeSettingsPanel.addEventListener('click', () => {
    settingsPanel.classList.remove('active');
  });
}

const profilePicInput = document.getElementById('profilePic');
const profilePreview = document.getElementById('profilePreview');
const saveSettingsBtn = document.getElementById('saveSettings');

if (profilePicInput && profilePreview) {
  profilePicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      profilePreview.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', async () => {
    // your existing code hereconst formData = new FormData();
    const file = profilePicInput.files[0];

    if (file) {
        formData.append('profile_photo', file); // matches multer
    }

    formData.append('firstname', document.getElementById('firstName').value);
    formData.append('lastname', document.getElementById('lastName').value);
    formData.append('email', document.getElementById('email').value);

    try {
        const res = await fetch('/auth/profile/update', { // ✅ FIXED
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            showToast('Profile updated successfully!');

            if (data.imageUrl) {
                const dropdownImage = document.querySelector('.usermane-container img');
                if (dropdownImage) dropdownImage.src = data.imageUrl;
            }
        } else {
            showToast('Failed to update profile');
        }
    } catch (err) {
        console.error(err);
        showToast('Error updating profile');
    }
  });
}

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.view-details-btn');
    if (!btn) return;

    const card = btn.closest('.order-history-card');
    const orderId = card.dataset.orderId;
    const itemsContainer = card.querySelector('.order-items');

    const isOpen = card.classList.toggle('active');
    btn.textContent = isOpen ? 'Hide Details' : 'View Details';

    // Load once only
    if (isOpen && !card.dataset.loaded) {
        try {
            const res = await fetch(`/orders/${orderId}/details`);
            const data = await res.json();

            itemsContainer.innerHTML = data.items.map(item => `
              <div class="order-item-row rating-item" data-product-id="${item.product_id}">
                <div class="rating-info">
                  <span>${item.name} (${item.kilograms}kg)</span>
                  <small>x${item.quantity}</small>
                </div>

                <div class="rating-stars">
                  <i class="fa-solid fa-star" data-value="1"></i>
                  <i class="fa-solid fa-star" data-value="2"></i>
                  <i class="fa-solid fa-star" data-value="3"></i>
                  <i class="fa-solid fa-star" data-value="4"></i>
                  <i class="fa-solid fa-star" data-value="5"></i>
                </div>
              </div>
            `).join('');

            card.dataset.loaded = "true";

        } catch (err) {
            itemsContainer.innerHTML = `<p>Failed to load order details</p>`;
        }
    }
});

// ===== RATE PRODUCT (FRONTEND ONLY) =====
document.addEventListener('click', async (e) => {
  const star = e.target.closest('.rating-stars i');
  if (!star) return;

  console.log('⭐ STAR CLICKED'); // ✅ YOU SHOULD SEE THIS

  const starsContainer = star.parentElement;
  const rating = Number(star.dataset.value);

  if (Number.isNaN(rating)) return;

  const productRow = star.closest('.rating-item');
  const productId = productRow.dataset.productId;

  const orderCard = star.closest('.order-history-card');
  const orderId = orderCard.dataset.orderId;

  // UI update
  starsContainer.querySelectorAll('i').forEach(i => {
    i.classList.toggle(
      'active',
      Number(i.dataset.value) <= rating
    );
  });

  try {
    const res = await fetch('/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, orderId, rating })
    });

    const result = await res.json();
    if (!result.success) showToast(result.message || 'Failed to save rating');

  } catch (err) {
    console.error(err);
    showToast('Server error');
  }
});

// ===== MOBILE NAV TOGGLE =====
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('header nav');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
  });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `show ${type}`;

  setTimeout(() => {
    toast.className = '';
  }, 2500);
}
