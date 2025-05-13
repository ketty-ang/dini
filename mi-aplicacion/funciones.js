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

    // Validación del formato de correo electrónico
    if (!emailRegex.test(emailIngresado)) {
        alert("Formato de email no válido.");
        return false;
    }

    // Validación de las credenciales
    if (emailIngresado === emailCorrecto && passwordIngresada === passwordCorrecta) {
        return true;
    } else {
        alert("Email o contraseña incorrectos");
        return false;
    }
}

// Evento para el botón de inicio de sesión
loginButton.addEventListener('click', function (event) {
    event.preventDefault(); // Evitar que se recargue el formulario

    const isValid = validarCredenciales();

    // Si las credenciales son correctas, mostrar el dashboard
    if (isValid) {
        // Mostrar el dashboard y ocultar el formulario
        loginForm.style.display = 'none';
        userDashboard.style.display = 'block';
        tituloh1.textContent = 'Sistema de Gestión de Avisos - Finanzas';
    } else {
        console.log("Credenciales incorrectas");
    }
});
 // Función para cambiar entre tabs
        function cambiarTab(tabId) {
            // Ocultar todos los contenidos de tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Desactivar todos los botones de tabs
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Mostrar el contenido del tab seleccionado
            document.getElementById(tabId).classList.add('active');
            
            // Activar el botón correspondiente
            if (tabId === 'avisos-diarios') {
                document.querySelectorAll('.tab-btn')[0].classList.add('active');
            } else {
                document.querySelectorAll('.tab-btn')[1].classList.add('active');
            }
        }
         // Variables globales
        let avisos = []; // Aquí guardaremos los avisos
        
        // Inicializar la fecha al día actual
        document.addEventListener('DOMContentLoaded', function() {
            const hoy = new Date();
            const fechaFormateada = hoy.toISOString().split('T')[0];
            document.getElementById('fecha-avisos').value = fechaFormateada;
            
            // Cargar avisos guardados en localStorage si existen
            cargarAvisosGuardados();
            
            // Mostrar mensajes de depuración
            console.log("Sistema de avisos inicializado");
        });
        
        // Función para cargar avisos guardados en localStorage
        function cargarAvisosGuardados() {
            const avisosGuardados = localStorage.getItem('avisos');
            if (avisosGuardados) {
                avisos = JSON.parse(avisosGuardados);
                console.log("Avisos cargados desde localStorage:", avisos.length);
            } else {
                console.log("No se encontraron avisos guardados");
            }
            actualizarTablaAvisos();
        }
        
        // Guardar avisos en localStorage
        function guardarAvisosEnStorage() {
            localStorage.setItem('avisos', JSON.stringify(avisos));
            console.log("Avisos guardados en localStorage:", avisos.length);
        }
        
        // Función para cargar avisos por fecha
        function cargarAvisosPorFecha() {
            const fechaSeleccionada = document.getElementById('fecha-avisos').value;
            console.log("Cargando avisos para fecha:", fechaSeleccionada);
            console.log("Total de avisos guardados:", avisos.length);
            actualizarTablaAvisos();
        }
        
        // Actualizar la tabla de avisos según la fecha seleccionada
        function actualizarTablaAvisos() {
            const fechaSeleccionada = document.getElementById('fecha-avisos').value;
            const avisosFiltrados = avisos.filter(aviso => aviso.fecha === fechaSeleccionada);
            
            const cuerpoTabla = document.getElementById('cuerpo-tabla-avisos');
            const sinAvisos = document.getElementById('sin-avisos');
            const tablaAvisos = document.getElementById('tabla-avisos-diarios');
            
            // Limpiar tabla
            cuerpoTabla.innerHTML = '';
            
            // Mostrar mensaje si no hay avisos o mostrar los avisos
            if (avisosFiltrados.length === 0) {
                sinAvisos.style.display = 'block';
                tablaAvisos.style.display = 'none';
            } else {
                sinAvisos.style.display = 'none';
                tablaAvisos.style.display = 'table';
                
                // Añadir filas a la tabla
                avisosFiltrados.forEach((aviso, index) => {
                    // Buscar el índice real en el array completo
                    const indiceReal = avisos.findIndex(a => 
                        a.fecha === aviso.fecha && 
                        a.hora === aviso.hora && 
                        a.cliente === aviso.cliente && 
                        a.telefono === aviso.telefono);
                    
                    const fila = document.createElement('tr');
                    
                    // Clase para identificar estado
                    if (aviso.estado === 'realizado') {
                        fila.classList.add('aviso-realizado');
                    } else if (aviso.estado === 'anulado') {
                        fila.classList.add('aviso-anulado');
                    }
                    
                    // Preparar la clase de badge según estado
                    let badgeClass = '';
                    switch(aviso.estado) {
                        case 'pendiente':
                            badgeClass = 'badge-pendiente';
                            break;
                        case 'realizado':
                            badgeClass = 'badge-realizado';
                            break;
                        case 'anulado':
                            badgeClass = 'badge-anulado';
                            break;
                    }
                    
                    // Convertir primera letra a mayúscula para el estado
                    const estadoMostrar = aviso.estado.charAt(0).toUpperCase() + aviso.estado.slice(1);
                    
                    // Crear el contenido de la celda según el tipo de dato
                    fila.innerHTML = `
                        <td>${aviso.hora}</td>
                        <td>${aviso.cliente}</td>
                        <td><a href="tel:${aviso.telefono}" class="contacto">${aviso.telefono}</a> <a href="sms:${aviso.telefono}" class="accion-btn">📱</a></td>
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
        
        // Abrir modal para nuevo aviso
        function abrirModalAviso(index = null) {
            // Limpiar formulario
            document.getElementById('formulario-aviso').reset();
            document.getElementById('id-aviso').value = '';
            
            // Si se proporciona un índice, estamos editando un aviso existente
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
                // Establecer hora actual por defecto
                const ahora = new Date();
                const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
                document.getElementById('hora-aviso').value = horaActual;
            }
            
            // Mostrar modal
            document.getElementById('modal-aviso').style.display = 'block';
        }
        
        // Cerrar modal de aviso
        function cerrarModalAviso() {
            document.getElementById('modal-aviso').style.display = 'none';
        }
        
        // Guardar aviso (nuevo o editado)
        function guardarAviso(event) {
            event.preventDefault();
            
            // Obtener datos del formulario
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
            
            // Si id no está vacío, estamos editando un aviso existente
            if (idAviso !== '') {
                avisos[parseInt(idAviso)] = nuevoAviso;
                console.log("Aviso actualizado:", nuevoAviso);
            } else {
                // Agregar nuevo aviso al array
                avisos.push(nuevoAviso);
                console.log("Nuevo aviso añadido:", nuevoAviso);
            }
            
            // Guardar en localStorage
            guardarAvisosEnStorage();
            
            // Actualizar tabla y cerrar modal
            actualizarTablaAvisos();
            cerrarModalAviso();
            
            // Mensaje de confirmación
            alert(idAviso !== '' ? 'Aviso actualizado correctamente' : 'Aviso guardado correctamente');
        }
        
        // Editar aviso existente
        function editarAviso(index) {
            abrirModalAviso(index);
        }
        
        // Eliminar aviso
        function eliminarAviso(index) {
            if (confirm('¿Estás seguro de que deseas eliminar este aviso?')) {
                // Eliminar aviso del array
                avisos.splice(index, 1);
                
                // Guardar en localStorage
                guardarAvisosEnStorage();
                
                // Actualizar tabla
                actualizarTablaAvisos();
                
                // Mensaje de confirmación
                alert('Aviso eliminado correctamente');
            }
        }