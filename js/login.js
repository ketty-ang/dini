document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessage = document.getElementById('login-message');
    const toggleFormLink = document.getElementById('toggleFormLink');
    const formTitle = document.getElementById('formTitle');
    const toggleText = document.getElementById('toggleText');

    // Función para mostrar mensajes
    function showMessage(message, type = 'danger') {
        loginMessage.classList.remove('alert-danger', 'alert-success');
        loginMessage.classList.add(`alert-${type}`);
        loginMessage.textContent = message;
        loginMessage.classList.remove('d-none');
    }

    // Función para alternar formularios
    function toggleForms() {
        if (loginForm.classList.contains('d-none')) {
            // Mostrar login, ocultar registro
            loginForm.classList.remove('d-none');
            registerForm.classList.add('d-none');
            formTitle.textContent = 'Iniciar Sesión';
            toggleText.textContent = '¿No tienes cuenta?';
            toggleFormLink.textContent = 'Regístrate aquí';
        } else {
            // Mostrar registro, ocultar login
            loginForm.classList.add('d-none');
            registerForm.classList.remove('d-none');
            formTitle.textContent = 'Registrarse';
            toggleText.textContent = '¿Ya tienes cuenta?';
            toggleFormLink.textContent = 'Inicia sesión aquí';
        }
        loginMessage.classList.add('d-none'); // Ocultar mensajes al cambiar de formulario
    }

    // Evento para alternar formularios
    toggleFormLink.addEventListener('click', function(e) {
        e.preventDefault();
        toggleForms();
    });

    // Evento para el formulario de login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('php/auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();

            if (result.success) {
                showMessage(result.message, 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                showMessage(result.message, 'danger');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            showMessage('Error de conexión con el servidor.', 'danger');
        }
    });

    // Evento para el formulario de registro
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('php/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                showMessage(result.message, 'success');
                // Opcional: redirigir al login después de un registro exitoso
                setTimeout(() => {
                    toggleForms(); // Volver al formulario de login
                }, 2000);
            } else {
                showMessage(result.message, 'danger');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            showMessage('Error de conexión con el servidor.', 'danger');
        }
    });
});