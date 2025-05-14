// Elementos del documento
const tituloh1 = document.getElementById('titulo');
const loginForm = document.getElementById('loginForm');
const userDashboard = document.getElementById('userDashboard');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');

// Validación de correo electrónico y contraseña
function validarCredenciales() {
    const emailCorrecto = "admin1@gmail.com";
    const passwordCorrecta = "12345678";

    const emailIngresado = emailInput.value;
    const passwordIngresada = passwordInput.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailIngresado)) {
        alert("Formato de email no válido.");
        return false;
    }

    if (emailIngresado === emailCorrecto && passwordIngresada === passwordCorrecta) {
        return true;
    } else {
        alert("Email o contraseña incorrectos");
        return false;
    }
}

loginButton.addEventListener('click', function (event) {
    event.preventDefault();
    const isValid = validarCredenciales();

    if (isValid) {
        loginForm.style.display = 'none';
        userDashboard.style.display = 'block';
        tituloh1.textContent = 'Sistema de Gestión de Avisos - Finanzas';
    }
});

function cambiarTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');

    if (tabId === 'avisos-diarios') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    }
}

let avisos = [];

document.addEventListener('DOMContentLoaded', function() {
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    document.getElementById('fecha-avisos').value = fechaFormateada;
    cargarAvisosGuardados();
});

function cargarAvisosGuardados() {
    const avisosGuardados = localStorage.getItem('avisos');
    if (avisosGuardados) {
        avisos = JSON.parse(avisosGuardados);
    }
    actualizarTablaAvisos();
}

function guardarAvisosEnStorage() {
    localStorage.setItem('avisos', JSON.stringify(avisos));
}

function cargarAvisosPorFecha() {
    actualizarTablaAvisos();
}

function actualizarTablaAvisos() {
    const fechaSeleccionada = document.getElementById('fecha-avisos').value;
    const avisosFiltrados = avisos.filter(aviso => aviso.fecha === fechaSeleccionada);
    const cuerpoTabla = document.getElementById('cuerpo-tabla-avisos');
    const sinAvisos = document.getElementById('sin-avisos');
    const tablaAvisos = document.getElementById('tabla-avisos-diarios');

    cuerpoTabla.innerHTML = '';

    if (avisosFiltrados.length === 0) {
        sinAvisos.style.display = 'block';
        tablaAvisos.style.display = 'none';
    } else {
        sinAvisos.style.display = 'none';
        tablaAvisos.style.display = 'table';

        avisosFiltrados.forEach((aviso, index) => {
            const indiceReal = avisos.findIndex(a =>
                a.fecha === aviso.fecha &&
                a.hora === aviso.hora &&
                a.cliente === aviso.cliente &&
                a.telefono === aviso.telefono
            );

            const fila = document.createElement('tr');

            if (aviso.estado === 'realizado') fila.classList.add('aviso-realizado');
            else if (aviso.estado === 'anulado') fila.classList.add('aviso-anulado');

            let badgeClass = '';
            switch(aviso.estado) {
                case 'pendiente': badgeClass = 'badge-pendiente'; break;
                case 'realizado': badgeClass = 'badge-realizado'; break;
                case 'anulado': badgeClass = 'badge-anulado'; break;
            }

            const estadoMostrar = aviso.estado.charAt(0).toUpperCase() + aviso.estado.slice(1);

            fila.innerHTML = `
                <td>${aviso.hora}</td>
                <td>${aviso.cliente}</td>
                <td>
                    <a href="tel:${aviso.telefono}" class="contacto">${aviso.telefono}</a>
                    <a href="sms:${aviso.telefono}" class="accion-btn">📱</a>
                    <a href="https://wa.me/${aviso.telefono.replace(/\D/g, '')}" target="_blank" class="accion-btn">💬</a>
                </td>
                <td>${aviso.email ? `<a href="mailto:${aviso.email}" class="contacto">${aviso.email}</a>` : '-'}</td>
                <td><a href="https://www.google.com/maps/search/${encodeURIComponent(aviso.direccion)}" target="_blank" class="contacto">${aviso.direccion}</a></td>
                <td>${aviso.descripcion}</td>
                <td><span class="badge ${badgeClass}">${estadoMostrar}</span></td>
                <td>
                    <a onclick="editarAviso(${indiceReal})" class="accion-btn">✏️</a>
                    <a onclick="eliminarAviso(${indiceReal})" class="accion-btn">🗑️</a>
                </td>
            `;

            cuerpoTabla.appendChild(fila);
        });
    }
}

function abrirModalAviso(index = null) {
    document.getElementById('formulario-aviso').reset();
    document.getElementById('id-aviso').value = '';

    if (index !== null) {
        const aviso = avisos[index];
        document.getElementById('titulo-modal-aviso').textContent = 'Editar Aviso';
        document.getElementById('id-aviso').value = index;
        document.getElementById('hora-aviso').value = aviso.hora;
        document.getElementById('cliente-aviso').value = aviso.cliente;
        document.getElementById('telefono-aviso').value = aviso.telefono;
        document.getElementById('email-aviso').value = aviso.email || '';
        document.getElementById('direccion-aviso').value = aviso.direccion;
        document.getElementById('descripcion-aviso').value = aviso.descripcion;
        document.getElementById('estado-aviso').value = aviso.estado;
    } else {
        document.getElementById('titulo-modal-aviso').textContent = 'Nuevo Aviso';
        const ahora = new Date();
        const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
        document.getElementById('hora-aviso').value = horaActual;
    }

    document.getElementById('modal-aviso').style.display = 'block';
}

function cerrarModalAviso() {
    document.getElementById('modal-aviso').style.display = 'none';
}

function guardarAviso(event) {
    event.preventDefault();

    const idAviso = document.getElementById('id-aviso').value;
    const fechaSeleccionada = document.getElementById('fecha-avisos').value;
    const nuevoAviso = {
        fecha: fechaSeleccionada,
        hora: document.getElementById('hora-aviso').value,
        cliente: document.getElementById('cliente-aviso').value,
        telefono: document.getElementById('telefono-aviso').value,
        email: document.getElementById('email-aviso').value,
        direccion: document.getElementById('direccion-aviso').value,
        descripcion: document.getElementById('descripcion-aviso').value,
        estado: document.getElementById('estado-aviso').value
    };

    if (idAviso !== '') {
        avisos[parseInt(idAviso)] = nuevoAviso;
    } else {
        avisos.push(nuevoAviso);
    }

    guardarAvisosEnStorage();
    actualizarTablaAvisos();
    cerrarModalAviso();
    alert(idAviso !== '' ? 'Aviso actualizado correctamente' : 'Aviso guardado correctamente');
}

function editarAviso(index) {
    abrirModalAviso(index);
}

function eliminarAviso(index) {
    if (confirm('¿Estás seguro de que deseas eliminar este aviso?')) {
        avisos.splice(index, 1);
        guardarAvisosEnStorage();
        actualizarTablaAvisos();
        alert('Aviso eliminado correctamente');
    }
}
