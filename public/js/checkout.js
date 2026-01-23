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

