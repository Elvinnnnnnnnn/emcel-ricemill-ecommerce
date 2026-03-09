// ==========================
// SAVE ADDRESS (OPTIONAL)
// ==========================
const saveAddressBtn = document.getElementById('saveAddressBtn');

if (saveAddressBtn) {
  saveAddressBtn.addEventListener('click', async () => {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      const msg = document.getElementById('addressMessage');
      if (msg) {
        msg.textContent = result.message;
        msg.style.color = result.success ? 'green' : 'red';
      }

    } catch (err) {
      console.error(err);
      const msg = document.getElementById('addressMessage');
      if (msg) msg.textContent = 'Server error';
    }
  });
}

// ==========================
// PLACE ORDER
// ==========================
const checkoutForm = document.getElementById('checkoutForm');

if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // 🔥 REQUIRED

    const data = Object.fromEntries(new FormData(checkoutForm));

    // backend expects this name
    data.payment_method = data.payment;
    delete data.payment;

    try {
      const res = await fetch('/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (result.success) {
        showToast('Order placed successfully!');
        window.location.href = `/payment/${result.orderId}`;
      } else {
        showToast(result.message || 'Error placing order');
      }

    } catch (err) {
      console.error(err);
      showToast('Server error, please try again later.');
    }
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

document.addEventListener("DOMContentLoaded", () => {

  const cityInput = document.querySelector("input[name='city']");
  const subtotalText = document.querySelector(".product-subtotal-text + p");
  const shippingText = document.querySelector(".product-shipping-text + p");
  const totalText = document.querySelector(".product-total strong");

  if (!cityInput || !subtotalText || !shippingText || !totalText) return;

  const subtotal = Number(
    subtotalText.textContent.replace(/[₱,]/g, "")
  );

  function updateShipping() {

    const city = cityInput.value.toLowerCase().trim();

    let SHIPPING_FEE = 0;

    if (
      city.includes("morong") ||
      city.includes("tanay") ||
      city.includes("baras") ||
      city.includes("binangonan") ||
      city.includes("cardona") ||
      city.includes("teresa") ||
      city.includes("pililla") ||
      city.includes("jalajala") ||
      city.includes("rizal")
    ) {
      SHIPPING_FEE = 60;
    }
    else if (
      city.includes("pasig") ||
      city.includes("marikina") ||
      city.includes("quezon city") ||
      city.includes("manila") ||
      city.includes("mandaluyong") ||
      city.includes("taguig") ||
      city.includes("makati")
    ) {
      SHIPPING_FEE = 100;
    }
    else if (
      city.includes("bulacan") ||
      city.includes("laguna") ||
      city.includes("cavite")
    ) {
      SHIPPING_FEE = 140;
    }
    else if (
      city.includes("ilocos") ||
      city.includes("pangasinan") ||
      city.includes("tarlac") ||
      city.includes("bataan") ||
      city.includes("zambales")
    ) {
      SHIPPING_FEE = 180;
    }
    else {
      SHIPPING_FEE = 220;
    }

    const total = subtotal + SHIPPING_FEE;

    shippingText.textContent = "₱" + SHIPPING_FEE.toLocaleString();
    totalText.textContent = "₱" + total.toLocaleString();
  }

  cityInput.addEventListener("input", updateShipping);

});