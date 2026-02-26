document.addEventListener("DOMContentLoaded", () => {

    // ===== Sidebar Active Link =====
    const navLinks = document.querySelectorAll(".sidebar a");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // ===== Add Variant Button (ADD PRODUCT FORM) =====
    const addVariantBtn = document.getElementById('add-variant-btn');
    const addProductForm = document.getElementById('addProductForm');

    if (addVariantBtn && addProductForm) {
        addVariantBtn.addEventListener('click', () => {
            const variantRow = document.createElement('div');
            variantRow.classList.add('variant-row');
            variantRow.innerHTML = `
                <input type="number" name="stock[]" placeholder="Stock" required>
                <input type="number" name="price[]" placeholder="Price" required>
                <input type="text" name="kilograms[]" placeholder="Kilograms (e.g. 25kg)" required>
                <button type="button" class="remove-variant-btn">Remove</button>
                <br>
            `;

            addProductForm.insertBefore(variantRow, addVariantBtn);

            variantRow.querySelector('.remove-variant-btn').addEventListener('click', () => {
                variantRow.remove();
            });
        });
    }

    // ===== Delete Product =====
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const productId = row.dataset.id;

            if (!confirm("Are you sure you want to delete this product?")) return;

            const res = await fetch(`/admin/product/delete/${productId}`, {
                method: 'POST'
            });

            const data = await res.json();

            if (data.success) {
                row.remove();
                showToast("Product deleted successfully");
            } else {
                showToast("Failed to delete product");
            }
        });
    });

    // ===== EDIT PRODUCT (MULTI VARIANT) =====
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editProductForm');
    const closeModalBtn = document.getElementById('closeModal');
    const variantInputs = document.getElementById('variantInputs');

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const productId = row.dataset.id;

            // Fetch all variants
            const res = await fetch(`/admin/product/${productId}/variants`);
            const data = await res.json();

            if (!data.success) {
                showToast('Failed to load variants');
                return;
            }

            // Populate modal
            variantInputs.innerHTML = ''; // clear old inputs

           data.variants.forEach((v, index) => {
            variantInputs.innerHTML += `
                <div class="variant-row">
                <!-- ✅ CRITICAL -->
                <input type="hidden" name="variant_id[]" value="${v.id}">

                <label>Variant ${index + 1} Price</label>
                <input type="number" name="price[]" value="${v.price}" required>

                <label>Variant ${index + 1} Stock</label>
                <input type="number" name="stock[]" value="${v.stock}" required>

                <label>Variant ${index + 1} Kilograms</label>
                <input type="text" name="kilograms[]" value="${v.kilograms}" required>
                </div>
                <hr/>
            `;
            });


            editForm.dataset.productId = productId;

            // Show modal
            editModal.style.display = 'flex';
        });
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productId = editForm.dataset.productId;

        // 1️⃣ Update product name
        await fetch(`/admin/product/edit/${productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            name: document.getElementById('productName').value
            })
        });

        // 2️⃣ Update variants
        const prices = [...editForm.querySelectorAll('input[name="price[]"]')].map(i => i.value);
        const stocks = [...editForm.querySelectorAll('input[name="stock[]"]')].map(i => i.value);
        const kilograms = [...editForm.querySelectorAll('input[name="kilograms[]"]')].map(i => i.value);
        const variantIds = [...editForm.querySelectorAll('input[name="variant_id[]"]')].map(i => i.value);

        if (variantIds.length > 0){
            const res = await fetch(`/admin/product/edit-variants/${productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                variant_id: variantIds,
                price: prices,
                stock: stocks,
                kilograms
                })
            });

             const data = await res.json();

            if (data.success) {
                showToast("Product updated successfully!");
            } else {
                showToast("Update failed");
            }
            }
        });

    // ===== Close Modal =====
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }

    // ===== EDIT USER =====
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const closeUserModalBtn = editUserModal.querySelector('.close');
    const cancelUserBtn = editUserModal.querySelector('.cancel-btn');

    // Open edit user modal
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const [firstname, lastname] = row.children[0].textContent.split(' ');
            const email = row.children[1].textContent;

            document.getElementById('editUserId').value = id;
            document.getElementById('editFirstname').value = firstname;
            document.getElementById('editLastname').value = lastname;
            document.getElementById('editEmail').value = email;

            editUserModal.style.display = 'flex';
        });
    });

    // Close modal buttons
    if (closeUserModalBtn) {
        closeUserModalBtn.addEventListener('click', () => {
            editUserModal.style.display = 'none';
        });
    }
    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', () => {
            editUserModal.style.display = 'none';
        });
    }

    // Submit edit user form
    if (editUserForm) {
        editUserForm.addEventListener('submit', async e => {
            e.preventDefault();

            const id = document.getElementById('editUserId').value;
            const firstname = document.getElementById('editFirstname').value;
            const lastname = document.getElementById('editLastname').value;
            const email = document.getElementById('editEmail').value;
            const password = document.getElementById('editPassword').value;

            const res = await fetch(`/admin/users/edit/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ firstname, lastname, email, password })
            });

            const data = await res.json();

            if (data.success) {
                showToast("User updated successfully");
            } else {
                showToast("Update failed");
            }
        });
    }

    // ===== Delete User =====
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;

            if (!confirm("Are you sure you want to delete this user?")) return;

            const res = await fetch(`/admin/users/delete/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                row.remove();
            } else {
                showToast('Failed to delete user');
            }
        });
    });

    // ===== SALES CHART =====
    const salesChartEl = document.getElementById("salesChart");
    const revenueDataEl = document.getElementById("monthly-revenue-data");

    if (salesChartEl && revenueDataEl) {
        const monthlyRevenueData = JSON.parse(revenueDataEl.textContent);

        if (monthlyRevenueData.length === 0) {
            console.warn("No revenue data available");
        } else {
            const labels = monthlyRevenueData.map(r => `Month ${r.month}`);
            const values = monthlyRevenueData.map(r => Number(r.revenue));

            new Chart(salesChartEl, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Monthly Revenue',
                        data: values,
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    const openSettingsBtn = document.getElementById('openSettings');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const settingsSidebar = document.getElementById('settingsSidebar');
    const settingsOverlay = document.getElementById('settingsOverlay');

    openSettingsBtn.addEventListener('click', () => {
        settingsSidebar.classList.add('active');
        settingsOverlay.classList.add('active');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsSidebar.classList.remove('active');
        settingsOverlay.classList.remove('active');
    });

    settingsOverlay.addEventListener('click', () => {
        settingsSidebar.classList.remove('active');
        settingsOverlay.classList.remove('active');
    });


    document.getElementById('saveAdminSettings').addEventListener('click', async () => {
        const displayName = document.getElementById('adminDisplayName').value;
        const password = document.getElementById('adminPassword').value;

        try {
            const res = await fetch('/admin/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin', // ✅ REQUIRED
                body: JSON.stringify({ displayName, password })
            });

            const data = await res.json();

            if (data.success) {
                showToast('Profile updated successfully!');
                document.getElementById('adminPassword').value = '';
            } else {
                showToast('Error updating profile: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            showToast('Server error');
        }
    });

document.addEventListener('click', e => {

    // ARCHIVE
    if (e.target.classList.contains('archive-btn')) {
        const row = e.target.closest('tr');
        const id = row.dataset.id;

        fetch(`/admin/product/archive/${id}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('Product archived successfully');

                    // Update button instantly
                    e.target.textContent = 'Unarchive';
                    e.target.classList.remove('archive-btn');
                    e.target.classList.add('unarchive-btn');

                    // Optional: gray out row
                    row.classList.add('archived');
                } else {
                    showToast('Failed to archive product', 'error');
                }
            })
            .catch(() => {
                showToast('Server error', 'error');
            });
    }

    // UNARCHIVE
    if (e.target.classList.contains('unarchive-btn')) {
        const row = e.target.closest('tr');
        const id = row.dataset.id;

        fetch(`/admin/product/unarchive/${id}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('Product restored successfully');

                    e.target.textContent = 'Archive';
                    e.target.classList.remove('unarchive-btn');
                    e.target.classList.add('archive-btn');

                    row.classList.remove('archived');
                } else {
                    showToast('Failed to restore product', 'error');
                }
            })
            .catch(() => {
                showToast('Server error', 'error');
            });
    }
});

});

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `show ${type}`;

  setTimeout(() => {
    toast.className = '';
  }, 2500);
}

const createAdminBtn = document.getElementById('createAdminBtn');

if (createAdminBtn) {
  createAdminBtn.addEventListener('click', async () => {
    const displayName = document.getElementById('newAdminName').value;
    const email = document.getElementById('newAdminEmail').value;
    const password = document.getElementById('newAdminPassword').value;

    const res = await fetch('/admin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email, password })
    });

    const data = await res.json();

    if (data.success) {
      showToast('Admin created successfully');
      document.getElementById('newAdminName').value = '';
      document.getElementById('newAdminEmail').value = '';
      document.getElementById('newAdminPassword').value = '';
    } else {
      showToast(data.message || 'Failed to create admin', 'error');
    }
  });
}

document.addEventListener('click', async (e) => {

  const approveBtn = e.target.closest('.approve-btn');
  const deliveryBtn = e.target.closest('.delivery-btn');
  const deliveredBtn = e.target.closest('.delivered-btn');
  const rejectBtn = e.target.closest('.reject-btn');

  if (!approveBtn && !deliveryBtn && !deliveredBtn && !rejectBtn) return;

  const btn = approveBtn || deliveryBtn || deliveredBtn || rejectBtn;
  const orderItem = btn.closest('.order-item');
  const orderId = orderItem.dataset.id;
  const statusText = orderItem.querySelector('.status-text');

  let url = '';

  if (approveBtn) url = `/admin/order/approve/${orderId}`;
  if (deliveryBtn) url = `/admin/order/out-for-delivery/${orderId}`;
  if (deliveredBtn) url = `/admin/order/delivered/${orderId}`;
  if (rejectBtn) url = `/admin/order/reject/${orderId}`;

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (!data.success) {
    showToast('Update failed', 'error');
    return;
  }

  showToast('Order updated');

  // Update UI without refresh
  // Update UI without refresh
    if (approveBtn) {
    btn.textContent = 'Out for Delivery';
    btn.classList.remove('approve-btn');
    btn.classList.add('delivery-btn');
    statusText.textContent = 'PROCESSING';
    }
    else if (deliveryBtn) {
    btn.textContent = 'Mark as Delivered';
    btn.classList.remove('delivery-btn');
    btn.classList.add('delivered-btn');
    statusText.textContent = 'OUT_FOR_DELIVERY';
    }
    else if (deliveredBtn) {
    btn.remove();
    statusText.textContent = 'DELIVERED';
    }
    else if (rejectBtn) {
    orderItem.remove();
    }

});

const salesFilter = document.getElementById('salesFilter');

if (salesFilter) {
    salesFilter.addEventListener('change', () => {
        const value = salesFilter.value;
        window.location.href = `/admin/dashboard?filter=${value}#sales`;
    });
}