document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("auth-container");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");

  showRegister.addEventListener("click", () => {
    container.classList.add("active");
  });

  showLogin.addEventListener("click", () => {
    container.classList.remove("active");
  });
});

const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('active');
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