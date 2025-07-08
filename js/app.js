document.addEventListener('DOMContentLoaded', function() {

    const listaAvisos = document.getElementById('lista-avisos');
    const detalleAviso = document.getElementById('detalle-aviso');
    const btnNuevoAviso = document.getElementById('btn-nuevo-aviso');
    const nuevoAvisoModal = new bootstrap.Modal(document.getElementById('nuevoAvisoModal'));
    const formNuevoAviso = document.getElementById('formNuevoAviso');

    const editarAvisoModal = new bootstrap.Modal(document.getElementById('editarAvisoModal'));
    const formEditarAviso = document.getElementById('formEditarAviso');

    const buscadorInput = document.getElementById('buscador');
    const btnBuscar = document.querySelector('.navbar .btn-outline-success');
    const btnChatGlobal = document.getElementById('btn-chat-global');
    const globalChatModal = new bootstrap.Modal(document.getElementById('globalChatModal'));
    const globalChatMessagesDiv = document.getElementById('global-chat-messages');
    const formGlobalChatMensaje = document.getElementById('formGlobalChatMensaje');
    const globalChatMensajeTexto = document.getElementById('globalChatMensajeTexto');

    const filtroFechaInput = document.getElementById('filtroFecha');

    const btnGestionUsuarios = document.getElementById('btn-gestion-usuarios');
    const gestionUsuariosModal = new bootstrap.Modal(document.getElementById('gestionUsuariosModal'));
    const listaUsuariosDiv = document.getElementById('lista-usuarios');
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    const formUsuarioContainer = document.getElementById('formUsuarioContainer');
    const formUsuarioTitle = document.getElementById('formUsuarioTitle');
    const formUsuario = document.getElementById('formUsuario');
    const userIdInput = document.getElementById('userId');
    const usernameUserInput = document.getElementById('usernameUser');
    const passwordUserInput = document.getElementById('passwordUser');
    const rolUserInput = document.getElementById('rolUser');
    const btnCancelarUsuario = document.getElementById('btnCancelarUsuario');

    const btnGestionPS = document.getElementById('btn-gestion-ps');
    const gestionPSModal = new bootstrap.Modal(document.getElementById('gestionPSModal'));
    const listaPSDiv = document.getElementById('lista-ps');
    const btnNuevoPS = document.getElementById('btnNuevoPS');
    const formPSContainer = document.getElementById('formPSContainer');
    const formPSTitle = document.getElementById('formPSTitle');
    const formPS = document.getElementById('formPS');
    const psIdInput = document.getElementById('psId');
    const psNombreInput = document.getElementById('psNombre');
    const psDescripcionInput = document.getElementById('psDescripcion');
    const psPrecioInput = document.getElementById('psPrecio');
    const psTipoInput = document.getElementById('psTipo');
    const btnCancelarPS = document.getElementById('btnCancelarPS');

    const btnInformes = document.getElementById('btn-informes');
    const informesModal = new bootstrap.Modal(document.getElementById('informesModal'));
    const reporteAvisosEstadoDiv = document.getElementById('reporte-avisos-estado');

    let currentAvisoData = null; // Para almacenar los datos del aviso que se está viendo
    let userPlanType = 'basico'; // Valor por defecto, se actualizará al verificar la sesión
    let userRole = 'tecnico'; // Valor por defecto, se actualizará al verificar la sesión

    // Definición de características por plan (debe coincidir con el backend)
    const featuresByPlan = {
        'basico': {
            max_avisos_anual: 12,
            max_productos_servicios: 5,
            max_reportes_financieros: 1,
            adjuntar_fotos: false,
            chat_tecnicos: false
        },
        'profesional': {
            max_avisos_anual: 500,
            max_productos_servicios: 50,
            max_reportes_financieros: 12,
            adjuntar_fotos: true,
            chat_tecnicos: true
        },
        'ultimate': {
            max_avisos_anual: -1, // Ilimitado
            max_productos_servicios: -1, // Ilimitado
            adjuntar_fotos: true,
            chat_tecnicos: true
        }
    };

    // Función para verificar el plan y rol del usuario y actualizar la UI
    async function checkUserPlanAndUI() {
        try {
            const response = await fetch('php/auth.php?action=checkSession');
            const result = await response.json();
            if (result.success && result.data) {
                userPlanType = result.data.plan_type;
                userRole = result.data.rol;
            }
        } catch (error) {
            console.error('Error al obtener el tipo de plan y rol del usuario:', error);
        }

        // Controlar visibilidad del botón de chat global
        if (!featuresByPlan[userPlanType].chat_tecnicos) {
            btnChatGlobal.style.display = 'none';
        } else {
            btnChatGlobal.style.display = '';
        }

        // Controlar visibilidad del botón de gestión de usuarios
        if (userRole === 'admin') {
            btnGestionUsuarios.style.display = '';
        } else {
            btnGestionUsuarios.style.display = 'none';
        }
    }

    /**
     * Carga los avisos desde la API y los muestra en la lista
     * @param {string} [searchTerm=''] - Término de búsqueda (teléfono o NIE)
     * @param {string} [dateFilter=''] - Fecha para filtrar avisos (YYYY-MM-DD)
     */
    async function cargarAvisos(searchTerm = '', dateFilter = '') {
        listaAvisos.innerHTML = '<p class="text-center p-3">Cargando avisos...</p>';
        let url = 'php/api.php?action=getAvisos';
        const params = new URLSearchParams();

        if (searchTerm) {
            params.append('term', searchTerm);
            url = 'php/api.php?action=buscarAvisos'; // Cambiar acción si hay término de búsqueda
        }
        if (dateFilter) {
            params.append('date', dateFilter);
        }

        if (params.toString()) {
            url += `&${params.toString()}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                listaAvisos.innerHTML = ''; // Limpiar antes de añadir
                if (data.data.length === 0) {
                    listaAvisos.innerHTML = '<p class="text-center p-3">No hay avisos para mostrar.</p>';
                    return;
                }
                data.data.forEach(aviso => {
                    const avisoHTML = `
                        <a href="#" class="list-group-item list-group-item-action estado-${aviso.estado}" data-id="${aviso.id}">
                            <div class="d-flex w-100 justify-content-between">
                                <h5 class="mb-1">Cliente: ${aviso.cliente}</h5>
                                <small>${aviso.fecha}</small>
                            </div>
                            <p class="mb-1">${aviso.descripcion}</p>
                            <small>Tel: ${aviso.telefono || 'N/A'}</small>
                        </a>
                    `;
                    listaAvisos.innerHTML += avisoHTML;
                });
            } else {
                listaAvisos.innerHTML = `<p class="text-center p-3 text-danger">Error al cargar avisos: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error al conectar con la API:', error);
            listaAvisos.innerHTML = '<p class="text-center p-3 text-danger">Error de conexión con el servidor.</p>';
        }
    }

    /**
     * Muestra los detalles de un aviso seleccionado
     * @param {string} avisoId - El ID del aviso a mostrar
     */
    async function mostrarDetalle(avisoId) {
        detalleAviso.innerHTML = '<div class="text-center text-muted mt-5">Cargando detalles del aviso...</div>';
        try {
            const response = await fetch(`php/api.php?action=getAvisoDetalle&id=${avisoId}`);
            const data = await response.json();

            if (data.success && data.data) {
                currentAvisoData = data.data; // Guardar los datos del aviso actual
                const aviso = currentAvisoData;

                // Formatear la fecha para el input type="date"
                const fechaServicioFormatted = aviso.fecha_servicio ? new Date(aviso.fecha_servicio).toISOString().split('T')[0] : '';

                detalleAviso.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3>Detalles del Aviso #${aviso.id}</h3>
                        <button class="btn btn-secondary btn-sm" id="btnEditarAviso">Editar</button>
                    </div>
                    <p><strong>Cliente:</strong> ${aviso.cliente}</p>
                    <p><strong>Teléfono:</strong> <a href="tel:${aviso.telefono}">${aviso.telefono}</a> <a href="https://wa.me/34${aviso.telefono}" target="_blank" class="btn btn-success btn-sm">WhatsApp</a></p>
                    <p><strong>Dirección:</strong> <a href="https://maps.google.com/?q=${encodeURIComponent(aviso.direccion)}" target="_blank">${aviso.direccion}</a></p>
                    <p><strong>Descripción:</strong></p>
                    <p>${aviso.descripcion}</p>
                    <p><strong>Fecha Servicio:</strong> ${aviso.fecha}</p>
                    <p><strong>Estado:</strong> <span class="badge bg-${aviso.estado === 'pendiente' ? 'warning text-dark' : (aviso.estado === 'realizado' ? 'success' : 'danger')}">${aviso.estado.toUpperCase()}</span></p>
                    <p><strong>Técnico Asignado:</strong> ${aviso.tecnico_asignado || 'N/A'}</p>
                    <p><strong>Prioridad:</strong> ${aviso.prioridad.toUpperCase()}</p>
                    <hr>
                    <h4>Fotos</h4>
                    <div id="aviso-fotos-galeria" class="row mb-3">
                        ${aviso.fotos && aviso.fotos.length > 0 ?
                            aviso.fotos.map(foto => `
                                <div class="col-4 mb-3">
                                    <a href="${foto}" target="_blank">
                                        <img src="${foto}" class="img-fluid rounded" alt="Foto del aviso">
                                    </a>
                                </div>
                            `).join('')
                            : '<p class="text-muted">No hay fotos para este aviso.</p>'
                        }
                    </div>
                    <form id="formUploadPhoto" enctype="multipart/form-data">
                        <input type="hidden" name="aviso_id" value="${aviso.id}">
                        <div class="input-group mb-3">
                            <input type="file" class="form-control" id="avisoPhotoInput" name="photo" accept="image/*" required>
                            <button class="btn btn-success" type="submit">Subir Foto</button>
                        </div>
                    </form>
                    <hr>
                    <h4>Historial de Estados</h4>
                    <ul class="list-group mb-3">
                        ${aviso.historial_estados && aviso.historial_estados.length > 0 ?
                            aviso.historial_estados.map(h => `<li class="list-group-item"><strong>${h.estado_nuevo.toUpperCase()}</strong> - ${h.descripcion_cambio || ''} <small class="text-muted">(${new Date(h.fecha_cambio).toLocaleString()})</small></li>`).join('')
                            : '<li class="list-group-item text-muted">No hay historial de estados.</li>'
                        }
                    </ul>
                `;

                // Añadir evento al botón de editar
                document.getElementById('btnEditarAviso').addEventListener('click', async function() {
                    // Rellenar el formulario de edición con los datos actuales
                    document.getElementById('editAvisoId').value = aviso.id;
                    document.getElementById('editClienteId').value = aviso.cliente_id;
                    document.getElementById('editClienteNombre').value = aviso.cliente;
                    document.getElementById('editClienteTelefono').value = aviso.telefono;
                    document.getElementById('editClienteNIE').value = aviso.nie;
                    document.getElementById('editClienteDireccion').value = aviso.direccion;
                    document.getElementById('editAvisoDescripcion').value = aviso.descripcion;
                    document.getElementById('editAvisoFecha').value = fechaServicioFormatted;
                    document.getElementById('editAvisoEstado').value = aviso.estado;
                    document.getElementById('editEstadoMotivo').value = ''; // Limpiar motivo

                    // Cargar técnicos para el desplegable
                    await populateTecnicosDropdown(document.getElementById('editAvisoTecnico'), aviso.tecnico_asignado_id);
                    document.getElementById('editAvisoPrioridad').value = aviso.prioridad;

                    editarAvisoModal.show();
                });

                // Controlar visibilidad del formulario de subida de fotos
                const formUploadPhoto = document.getElementById('formUploadPhoto');
                if (!featuresByPlan[userPlanType].adjuntar_fotos) {
                    formUploadPhoto.style.display = 'none';
                } else {
                    formUploadPhoto.style.display = '';
                }

                // Evento para subir foto
                formUploadPhoto.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const form = e.target;
                    const formData = new FormData(form);

                    try {
                        const response = await fetch('php/api.php?action=uploadAvisoPhoto', {
                            method: 'POST',
                            body: formData // FormData se envía directamente, sin Content-Type
                        });
                        const result = await response.json();

                        if (result.success) {
                            alert('Foto subida con éxito!');
                            form.reset(); // Limpiar el input de archivo
                            mostrarDetalle(aviso.id); // Recargar el detalle para ver la nueva foto
                        } else {
                            alert('Error al subir foto: ' + result.message);
                        }
                    } catch (error) {
                        console.error('Error al subir foto:', error);
                        alert('Error de conexión al subir foto.');
                    }
                });

            } else {
                detalleAviso.innerHTML = `<div class="text-center text-muted mt-5">Error al cargar detalles: ${data.message}</div>`;
            }
        } catch (error) {
            console.error('Error al conectar con la API para detalles:', error);
            detalleAviso.innerHTML = '<div class="text-center text-muted mt-5">Error de conexión con el servidor al cargar detalles.</div>';
        }
    }

    /**
     * Carga y muestra los mensajes del chat global.
     */
    async function cargarGlobalChatMessages() {
        globalChatMessagesDiv.innerHTML = '<p class="text-muted text-center">Cargando mensajes...</p>';
        try {
            const response = await fetch('php/api.php?action=getGlobalChatMessages');
            const data = await response.json();

            if (data.success) {
                globalChatMessagesDiv.innerHTML = '';
                if (data.data.length === 0) {
                    globalChatMessagesDiv.innerHTML = '<p class="text-muted text-center">No hay mensajes en el chat global.</p>';
                } else {
                    data.data.forEach(msg => {
                        const msgHTML = `
                            <div class="mb-2">
                                <strong>${msg.remitente}:</strong> ${msg.mensaje}
                                <small class="text-muted float-end">${new Date(msg.fecha_envio).toLocaleString()}</small>
                            </div>
                        `;
                        globalChatMessagesDiv.innerHTML += msgHTML;
                    });
                    globalChatMessagesDiv.scrollTop = globalChatMessagesDiv.scrollHeight; // Scroll al final
                }
            } else {
                globalChatMessagesDiv.innerHTML = `<p class="text-danger text-center">Error al cargar chat: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error al conectar con la API para chat global:', error);
            globalChatMessagesDiv.innerHTML = '<p class="text-danger text-center">Error de conexión con el servidor al cargar chat.</p>';
        }
    }

    /**
     * Carga y muestra la lista de usuarios de la empresa.
     */
    async function loadUsers() {
        listaUsuariosDiv.innerHTML = '<p class="text-muted text-center">Cargando usuarios...</p>';
        try {
            const response = await fetch('php/api.php?action=getUsersByCompany');
            const data = await response.json();

            if (data.success) {
                listaUsuariosDiv.innerHTML = '';
                if (data.data.length === 0) {
                    listaUsuariosDiv.innerHTML = '<p class="text-muted text-center">No hay usuarios registrados en esta empresa.</p>';
                } else {
                    data.data.forEach(user => {
                        const userHTML = `
                            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${user.username} (${user.rol})</h6>
                                    <small class="text-muted">ID: ${user.id} | Registrado: ${new Date(user.fecha_registro).toLocaleDateString()}</small>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-warning me-2 btn-edit-user" data-id="${user.id}" data-username="${user.username}" data-rol="${user.rol}">Editar</button>
                                    <button class="btn btn-sm btn-danger btn-delete-user" data-id="${user.id}">Eliminar</button>
                                </div>
                            </div>
                        `;
                        listaUsuariosDiv.innerHTML += userHTML;
                    });

                    // Añadir eventos a los botones de editar y eliminar
                    document.querySelectorAll('.btn-edit-user').forEach(button => {
                        button.addEventListener('click', function() {
                            const userId = this.dataset.id;
                            const username = this.dataset.username;
                            const rol = this.dataset.rol;
                            
                            userIdInput.value = userId;
                            usernameUserInput.value = username;
                            rolUserInput.value = rol;
                            passwordUserInput.value = ''; // Limpiar campo de contraseña
                            formUsuarioTitle.textContent = 'Editar Usuario';
                            formUsuarioContainer.classList.remove('d-none');
                        });
                    });

                    document.querySelectorAll('.btn-delete-user').forEach(button => {
                        button.addEventListener('click', async function() {
                            const userId = this.dataset.id;
                            if (confirm('¿Está seguro de que desea eliminar este usuario?')) {
                                try {
                                    const response = await fetch('php/api.php?action=deleteUser', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ id: userId })
                                    });
                                    const result = await response.json();

                                    if (result.success) {
                                        alert('Usuario eliminado con éxito!');
                                        loadUsers(); // Recargar la lista
                                    } else {
                                        alert('Error al eliminar usuario: ' + result.message);
                                    }
                                } catch (error) {
                                    console.error('Error al eliminar usuario:', error);
                                    alert('Error de conexión al eliminar usuario.');
                                }
                            }
                        });
                    });
                }
            } else {
                listaUsuariosDiv.innerHTML = `<p class="text-danger text-center">Error al cargar usuarios: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error al conectar con la API para usuarios:', error);
            listaUsuariosDiv.innerHTML = '<p class="text-danger text-center">Error de conexión con el servidor al cargar usuarios.</p>';
        }
    }

    /**
     * Carga y muestra la lista de productos/servicios de la empresa.
     */
    async function loadProductosServicios() {
        listaPSDiv.innerHTML = '<p class="text-muted text-center">Cargando productos/servicios...</p>';
        try {
            const response = await fetch('php/api.php?action=getProductosServicios');
            const data = await response.json();

            if (data.success) {
                listaPSDiv.innerHTML = '';
                if (data.data.length === 0) {
                    listaPSDiv.innerHTML = '<p class="text-muted text-center">No hay productos o servicios registrados.</p>';
                } else {
                    data.data.forEach(ps => {
                        const psHTML = `
                            <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${ps.nombre} (${ps.tipo})</h6>
                                    <small class="text-muted">Precio: ${parseFloat(ps.precio).toFixed(2)}€ | Descripción: ${ps.descripcion || 'N/A'}</small>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-warning me-2 btn-edit-ps" data-id="${ps.id}" data-nombre="${ps.nombre}" data-descripcion="${ps.descripcion}" data-precio="${ps.precio}" data-tipo="${ps.tipo}">Editar</button>
                                    <button class="btn btn-sm btn-danger btn-delete-ps" data-id="${ps.id}">Eliminar</button>
                                </div>
                            </div>
                        `;
                        listaPSDiv.innerHTML += psHTML;
                    });

                    // Añadir eventos a los botones de editar y eliminar
                    document.querySelectorAll('.btn-edit-ps').forEach(button => {
                        button.addEventListener('click', function() {
                            const psId = this.dataset.id;
                            const nombre = this.dataset.nombre;
                            const descripcion = this.dataset.descripcion;
                            const precio = this.dataset.precio;
                            const tipo = this.dataset.tipo;
                            
                            psIdInput.value = psId;
                            psNombreInput.value = nombre;
                            psDescripcionInput.value = descripcion;
                            psPrecioInput.value = precio;
                            psTipoInput.value = tipo;
                            formPSTitle.textContent = 'Editar Producto/Servicio';
                            formPSContainer.classList.remove('d-none');
                        });
                    });

                    document.querySelectorAll('.btn-delete-ps').forEach(button => {
                        button.addEventListener('click', async function() {
                            const psId = this.dataset.id;
                            if (confirm('¿Está seguro de que desea eliminar este producto/servicio?')) {
                                try {
                                    const response = await fetch('php/api.php?action=deleteProductoServicio', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ id: psId })
                                    });
                                    const result = await response.json();

                                    if (result.success) {
                                        alert('Producto/Servicio eliminado con éxito!');
                                        loadProductosServicios(); // Recargar la lista
                                    } else {
                                        alert('Error al eliminar producto/servicio: ' + result.message);
                                    }
                                } catch (error) {
                                    console.error('Error al eliminar producto/servicio:', error);
                                    alert('Error de conexión al eliminar producto/servicio.');
                                }
                            }
                        });
                    });
                }
            } else {
                listaPSDiv.innerHTML = `<p class="text-danger text-center">Error al cargar productos/servicios: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error al conectar con la API para productos/servicios:', error);
            listaPSDiv.innerHTML = '<p class="text-danger text-center">Error de conexión con el servidor al cargar productos/servicios.</p>';
        }
    }

    /**
     * Carga la lista de técnicos de la empresa y rellena un select.
     * @param {HTMLSelectElement} selectElement - El elemento select a rellenar.
     * @param {number} [selectedValue=null] - El ID del técnico a seleccionar por defecto.
     */
    async function populateTecnicosDropdown(selectElement, selectedValue = null) {
        selectElement.innerHTML = '<option value="">-- Seleccionar --</option>'; // Limpiar y añadir opción por defecto
        try {
            const response = await fetch('php/api.php?action=getUsersByCompany');
            const data = await response.json();

            if (data.success && data.data) {
                data.data.forEach(user => {
                    // Solo añadir usuarios con rol de técnico o admin (si pueden ser asignados)
                    if (user.rol === 'tecnico' || user.rol === 'admin') {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.username;
                        selectElement.appendChild(option);
                    }
                });
                if (selectedValue) {
                    selectElement.value = selectedValue;
                }
            } else {
                console.error('Error al cargar técnicos:', data.message);
            }
        } catch (error) {
            console.error('Error de conexión al cargar técnicos:', error);
        }
    }

    // --- EVENTOS ---

    // Cargar avisos al iniciar
    cargarAvisos();

    // Verificar el plan y rol del usuario y actualizar la UI al cargar la página
    checkUserPlanAndUI();

    // Evento para mostrar detalles al hacer clic en un aviso
    listaAvisos.addEventListener('click', function(e) {
        const avisoElement = e.target.closest('.list-group-item');
        if (avisoElement) {
            e.preventDefault();
            const avisoId = avisoElement.dataset.id;
            mostrarDetalle(avisoId);
        }
    });

    // Evento para el filtro de fecha
    filtroFechaInput.addEventListener('change', function() {
        const selectedDate = this.value; // Formato YYYY-MM-DD
        cargarAvisos('', selectedDate); // Cargar avisos filtrados por fecha
    });

    // Evento para el botón de búsqueda
    btnBuscar.addEventListener('click', function() {
        const searchTerm = buscadorInput.value.trim();
        cargarAvisos(searchTerm, filtroFechaInput.value); // Pasar también el filtro de fecha
    });

    // Evento para la tecla Enter en el campo de búsqueda
    buscadorInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = buscadorInput.value.trim();
            cargarAvisos(searchTerm, filtroFechaInput.value); // Pasar también el filtro de fecha
        }
    });

    // Evento para abrir el modal de nuevo aviso
    btnNuevoAviso.addEventListener('click', function() {
        // Validar si el plan permite crear más avisos (la validación final es en el backend)
        if (userPlanType === 'basico' && featuresByPlan.basico.max_avisos_anual !== -1) {
            alert('Su plan Básico tiene un límite de ' + featuresByPlan.basico.max_avisos_anual + ' avisos anuales. Si necesita más, actualice su plan.');
        }
        formNuevoAviso.reset(); // Limpiar el formulario cada vez que se abre
        nuevoAvisoModal.show();
    });

    // Evento para enviar el formulario de nuevo aviso
    formNuevoAviso.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(formNuevoAviso);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('php/api.php?action=crearAviso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                alert('Aviso creado con éxito!');
                nuevoAvisoModal.hide(); // Cerrar el modal
                cargarAvisos(); // Recargar la lista de avisos
            } else {
                alert('Error al crear aviso: ' + result.message);
            }
        } catch (error) {
            console.error('Error al enviar formulario:', error);
            alert('Error de conexión al intentar crear el aviso.');
        }
    });

    // Evento para enviar el formulario de edición de aviso
    formEditarAviso.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(formEditarAviso);
        const data = Object.fromEntries(formData.entries());

        // Añadir el estado anterior para el historial
        if (currentAvisoData && currentAvisoData.estado) {
            data.estado_anterior = currentAvisoData.estado;
        }

        try {
            const response = await fetch('php/api.php?action=editarAviso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                alert('Aviso actualizado con éxito!');
                editarAvisoModal.hide(); // Cerrar el modal
                cargarAvisos(); // Recargar la lista de avisos
                mostrarDetalle(data.id); // Recargar los detalles del aviso actual
            } else {
                alert('Error al actualizar aviso: ' + result.message);
            }
        } catch (error) {
            console.error('Error al enviar formulario de edición:', error);
            alert('Error de conexión al intentar actualizar el aviso.');
        }
    });

    // Evento para abrir el modal de chat global
    btnChatGlobal.addEventListener('click', function() {
        cargarGlobalChatMessages(); // Cargar mensajes al abrir el chat
        globalChatModal.show();
    });

    // Evento para enviar mensaje en el chat global
    formGlobalChatMensaje.addEventListener('submit', async function(e) {
        e.preventDefault();
        const mensajeTexto = globalChatMensajeTexto.value;

        if (!mensajeTexto.trim()) return; // No enviar mensajes vacíos

        try {
            const response = await fetch('php/api.php?action=sendGlobalChatMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    remitente: 'Técnico Actual', // Esto debería venir de la sesión del usuario
                    mensaje: mensajeTexto
                })
            });
            const result = await response.json();

            if (result.success) {
                globalChatMensajeTexto.value = ''; // Limpiar input
                cargarGlobalChatMessages(); // Recargar el chat para ver el nuevo mensaje
            } else {
                alert('Error al enviar mensaje al chat global: ' + result.message);
            }
        } catch (error) {
            console.error('Error al enviar mensaje al chat global:', error);
            alert('Error de conexión al enviar mensaje al chat global.');
        }
    });

    // Evento para abrir el modal de gestión de usuarios
    btnGestionUsuarios.addEventListener('click', function() {
        loadUsers(); // Cargar usuarios al abrir el modal
        gestionUsuariosModal.show();
    });

    // Evento para el botón "Nuevo Usuario"
    btnNuevoUsuario.addEventListener('click', function() {
        formUsuario.reset();
        userIdInput.value = '';
        formUsuarioTitle.textContent = 'Crear Nuevo Usuario';
        passwordUserInput.setAttribute('required', 'required'); // Contraseña requerida al crear
        formUsuarioContainer.classList.remove('d-none');
    });

    // Evento para el botón "Cancelar" en el formulario de usuario
    btnCancelarUsuario.addEventListener('click', function() {
        formUsuarioContainer.classList.add('d-none');
    });

    // Evento para enviar el formulario de creación/edición de usuario
    formUsuario.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(formUsuario);
        const data = Object.fromEntries(formData.entries());

        let action = 'createUser';
        if (data.id) {
            action = 'updateUser';
        }

        // Si la contraseña está vacía en edición, no enviarla
        if (action === 'updateUser' && !data.password) {
            delete data.password;
        }

        try {
            const response = await fetch(`php/api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                formUsuarioContainer.classList.add('d-none');
                loadUsers(); // Recargar la lista de usuarios
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            alert('Error de conexión al guardar usuario.');
        }
    });

    // Evento para abrir el modal de gestión de productos/servicios
    btnGestionPS.addEventListener('click', function() {
        loadProductosServicios(); // Cargar productos/servicios al abrir el modal
        gestionPSModal.show();
    });

    // Evento para el botón "Nuevo Producto/Servicio"
    btnNuevoPS.addEventListener('click', function() {
        formPS.reset();
        psIdInput.value = '';
        formPSTitle.textContent = 'Crear Nuevo Producto/Servicio';
        formPSContainer.classList.remove('d-none');
    });

    // Evento para el botón "Cancelar" en el formulario de producto/servicio
    btnCancelarPS.addEventListener('click', function() {
        formPSContainer.classList.add('d-none');
    });

    // Evento para enviar el formulario de creación/edición de producto/servicio
    formPS.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(formPS);
        const data = Object.fromEntries(formData.entries());

        let action = 'createProductoServicio';
        if (data.id) {
            action = 'updateProductoServicio';
        }

        try {
            const response = await fetch(`php/api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                formPSContainer.classList.add('d-none');
                loadProductosServicios(); // Recargar la lista
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al guardar producto/servicio:', error);
            alert('Error de conexión al guardar producto/servicio.');
        }
    });

});