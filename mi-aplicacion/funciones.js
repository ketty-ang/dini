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
//funcion para el boton flotante

function cambiarTab(tabId) {
    // Ocultar todos los contenidos de pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Quitar clase active de todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar la pestaña seleccionada
    document.getElementById(tabId).style.display = 'block';
    
    // Cerrar el modal de aviso si está abierto (solo si no estás en la pestaña de "avisos-diarios")
    const modalAviso = document.getElementById('modal-aviso');
    if (modalAviso && tabId !== 'avisos-diarios') {
        modalAviso.style.display = 'none';
    }
    
    // Botón flotante (solo visible en la pestaña de avisos diarios)
    const btnFlotante = document.querySelector('.btn-flotante');
    
    if (tabId === 'avisos-diarios') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        // Mostrar el botón flotante solo en la pestaña de avisos
        if (btnFlotante) btnFlotante.style.display = 'flex';
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        // Ocultar el botón flotante en otras pestañas
        if (btnFlotante) btnFlotante.style.display = 'none';
    }
}

let avisos = [];

document.addEventListener('DOMContentLoaded', function() {
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    document.getElementById('fecha-avisos').value = fechaFormateada;
    
    // Configurar pestaña inicial (avisos diarios)
    document.getElementById('avisos-diarios').style.display = 'block';
    document.getElementById('reportes-financieros').style.display = 'none';
     document.querySelectorAll('.tab-btn')[0].classList.add('active');
    
    // Configurar botón flotante (visible solo en avisos diarios)
    const btnFlotante = document.querySelector('.btn-flotante');
    if (btnFlotante) btnFlotante.style.display = 'flex';
    
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
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas-avisos');
    
    // Limpiar tabla y tarjetas
    cuerpoTabla.innerHTML = '';
    contenedorTarjetas.innerHTML = '';

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

            // Crear fila de tabla para vista desktop
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
                    <a onclick="editarAviso(${indiceReal})" class="accion-btn">Editar✏️</a>
                    <a onclick="eliminarAviso(${indiceReal})" class="accion-btn">Eliminar🗑️</a>
                </td>
            `;
            
            cuerpoTabla.appendChild(fila);
            
            // Crear tarjeta para vista móvil
            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-aviso';
            if (aviso.estado === 'realizado') tarjeta.classList.add('aviso-realizado');
            else if (aviso.estado === 'anulado') tarjeta.classList.add('aviso-anulado');
            
            tarjeta.innerHTML = `
                <div class="aviso-cabecera">
                    <h3>${aviso.cliente}</h3>
                    <span class="badge ${badgeClass}">${estadoMostrar}</span>
                </div>
                <div class="aviso-datos">
                    <div class="aviso-dato"><span>Hora:</span> ${aviso.hora}</div>
                    <div class="aviso-dato">
                        <span>Teléfono:</span> 
                        <a href="tel:${aviso.telefono}" class="contacto">${aviso.telefono}</a>
                    </div>
                    <div class="aviso-dato">
                        <span>Contactar:</span>
                        <a href="tel:${aviso.telefono}" class="accion-btn">📞</a>
                        <a href="sms:${aviso.telefono}" class="accion-btn">📱</a>
                        <a href="https://wa.me/${aviso.telefono.replace(/\D/g, '')}" target="_blank" class="accion-btn">💬</a>
                    </div>
                    ${aviso.email ? `<div class="aviso-dato"><span>Email:</span> <a href="mailto:${aviso.email}" class="contacto">${aviso.email}</a></div>` : ''}
                    <div class="aviso-dato">
                        <span>Dirección:</span> 
                        <a href="https://www.google.com/maps/search/${encodeURIComponent(aviso.direccion)}" target="_blank" class="contacto">${aviso.direccion}</a>
                    </div>
                    <div class="aviso-dato"><span>Descripción:</span> ${aviso.descripcion}</div>
                </div>
                <div class="aviso-acciones">
                    <button onclick="editarAviso(${indiceReal})" class="btn btn-primario">Editar</button>
                    <button onclick="eliminarAviso(${indiceReal})" class="btn btn-secundario">Eliminar</button>
                </div>
            `;
            
            contenedorTarjetas.appendChild(tarjeta);
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
function buscarPorTelefono() {

    const telefono = document.getElementById('busqueda-telefono').value.trim();
    const cuerpoTabla = document.getElementById('cuerpo-tabla-resultados');
    const contenedorTarjetas = document.getElementById('tarjetas-resultados');
    const resultadosDiv = document.getElementById('resultados-busqueda');

    // Limpiar contenido previo
    cuerpoTabla.innerHTML = '';
    contenedorTarjetas.innerHTML = '';
    resultadosDiv.innerHTML = '';  // Limpiar mensajes previos

    // Ocultar inicialmente ambos contenedores
    document.getElementById('tabla-resultados').style.display = 'none';
    document.getElementById('tarjetas-resultados').style.display = 'none';

    if (!telefono) {
        resultadosDiv.innerHTML = '<p class="mensaje-error">Ingrese un número de teléfono para buscar.</p>';
        return;
    }

    const avisosEncontrados = avisos.filter(aviso =>
        aviso.telefono.includes(telefono)
    );

    if (avisosEncontrados.length === 0) {
        resultadosDiv.innerHTML = '<p class="mensaje-info">No se encontraron avisos con ese número de teléfono.</p>';
        return;
    }
    if (window.innerWidth > 767) {  // Pantallas mayores a 767px (no móvil)
    document.getElementById('tabla-resultados').style.display = 'table';
} else {
    document.getElementById('tabla-resultados').style.display = 'none';
}

document.getElementById('tarjetas-resultados').style.display = 'flex';

    // Mostrar los contenedores si hay resultados
    
    document.getElementById('tarjetas-resultados').style.display = 'flex';

    avisosEncontrados.forEach(aviso => {
        const badgeClass = {
            pendiente: 'badge-pendiente',
            realizado: 'badge-realizado',
            anulado: 'badge-anulado'
        }[aviso.estado] || '';

        const estadoMostrar = aviso.estado.charAt(0).toUpperCase() + aviso.estado.slice(1);

        // Fila para escritorio
    
        const fila = document.createElement('tr');
        fila.innerHTML = `
           <td>${aviso.fecha}</td>
            <td>${aviso.cliente}</td>
            <td><a href="tel:${aviso.telefono}" class="contacto">${aviso.telefono}</a></td>
            <td>${aviso.email ? `<a href="mailto:${aviso.email}" class="contacto">${aviso.email}</a>` : '-'}</td>
            <td><a href="https://www.google.com/maps/search/${encodeURIComponent(aviso.direccion)}" target="_blank" class="contacto">${aviso.direccion}</a></td>
            <td>${aviso.descripcion}</td>
            <td><span class="badge ${badgeClass}">${estadoMostrar}</span></td>
        `;
        cuerpoTabla.appendChild(fila);

        // Tarjeta para móviles
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-aviso';
        tarjeta.innerHTML = `
            <div class="aviso-cabecera">
                <h3>${aviso.cliente}</h3>
                <span class="badge ${badgeClass}">${estadoMostrar}</span>
            </div>
            <div class="aviso-datos">
                <div><strong>Fecha:</strong> ${aviso.fecha}</div>
                <div><strong>Teléfono:</strong> <a href="tel:${aviso.telefono}" class="contacto">${aviso.telefono}</a></div>
                ${aviso.email ? `<div><strong>Email:</strong> <a href="mailto:${aviso.email}" class="contacto">${aviso.email}</a></div>` : ''}
                <div><strong>Dirección:</strong> <a href="https://www.google.com/maps/search/${encodeURIComponent(aviso.direccion)}" target="_blank">${aviso.direccion}</a></div>
                <div><strong>Descripción:</strong> ${aviso.descripcion}</div>
            </div>
        `;
        contenedorTarjetas.appendChild(tarjeta);
    });
}