document.addEventListener('DOMContentLoaded', function() {
    // Contenedores y botones
    const btnNuevo = document.getElementById('btn-nuevo-albaran');
    const formContainer = document.getElementById('form-albaran-container');
    const tablaContainer = document.getElementById('tabla-albaranes-container');
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnAnadirLinea = document.getElementById('btn-anadir-linea');
    const lineasContainer = document.getElementById('lineas-albaran');
    const selectCliente = document.getElementById('cliente_id');
    const tablaBody = document.querySelector('#tabla-albaranes tbody');
    const form = document.getElementById('form-albaran');

    // --- VISTAS ---
    function mostrarTabla() {
        formContainer.style.display = 'none';
        tablaContainer.style.display = 'block';
        // cargarAlbaranes(); // Se llamará más tarde
    }

    function mostrarFormulario() {
        formContainer.style.display = 'block';
        tablaContainer.style.display = 'none';
    }

    // --- LÓGICA DE DATOS (API) ---
    function cargarAlbaranes() {
        fetch('php/albaranes/api_albaranes.php?accion=leer')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    tablaBody.innerHTML = '';
                    data.data.forEach(a => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${a.numero_albaran}</td>
                            <td>${a.cliente_nombre}</td>
                            <td>${new Date(a.fecha_emision).toLocaleDateString()}</td>
                            <td><span class="badge estado-${a.estado}">${a.estado}</span></td>
                            <td>
                                <button class="btn-editar" data-id="${a.id}">Editar</button>
                                <button class="btn-eliminar" data-id="${a.id}">Eliminar</button>
                                ${a.estado === 'entregado' ? `<button class="btn-facturar" data-id="${a.id}">Facturar</button>` : ''}
                            </td>
                        `;
                        tablaBody.appendChild(tr);
                    });
                } else {
                    alert('Error al cargar albaranes: ' + data.error);
                }
            });
    }

    function cargarClientes() {
        fetch('php/clientes/api_clientes.php?accion=leer_todos')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>';
                    data.clientes.forEach(cliente => { // Note: data.clientes instead of data.data
                        const option = document.createElement('option');
                        option.value = cliente.id;
                        option.textContent = cliente.nombre;
                        selectCliente.appendChild(option);
                    });
                } else {
                    alert('Error al cargar clientes: ' + data.error); // Note: data.error instead of data.message
                }
            });
    }

    // --- LÓGICA DEL FORMULARIO ---
    function anadirLinea(linea = null) {
        const div = document.createElement('div');
        div.classList.add('linea-item');
        div.innerHTML = `
            <input type="text" name="descripcion[]" placeholder="Descripción" class="form-control" required value="${linea ? linea.descripcion : ''}">
            <input type="number" name="cantidad[]" value="${linea ? linea.cantidad : 1}" min="0" step="any" placeholder="Cantidad" class="form-control" required>
            <button type="button" class="btn-eliminar-linea btn btn-danger">X</button>
        `;
        lineasContainer.appendChild(div);
    }

    lineasContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-eliminar-linea')) {
            e.target.parentElement.remove();
        }
    });

    // --- EVENTOS ---
    btnNuevo.addEventListener('click', () => {
        form.reset();
        lineasContainer.innerHTML = '';
        anadirLinea();
        mostrarFormulario();
    });
    btnCancelar.addEventListener('click', mostrarTabla);
    btnAnadirLinea.addEventListener('click', () => anadirLinea());

    tablaBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-eliminar')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este albarán?')) {
                fetch(`php/albaranes/api_albaranes.php?accion=eliminar&id=${id}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            cargarAlbaranes();
                        } else {
                            alert('Error al eliminar: ' + result.error);
                        }
                    });
            }
        }

        if (e.target.classList.contains('btn-editar')) {
            const id = e.target.dataset.id;
            fetch(`php/albaranes/api_albaranes.php?accion=getAlbaran&id=${id}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        form.reset();
                        lineasContainer.innerHTML = '';
                        
                        const a = result.data;
                        document.getElementById('albaran-id').value = a.id;
                        document.getElementById('cliente_id').value = a.cliente_id;
                        document.getElementById('fecha_emision').value = a.fecha_emision.split(' ')[0];
                        document.getElementById('notas').value = a.notas;

                        a.lineas.forEach(linea => anadirLinea(linea));
                        
                        mostrarFormulario();
                    } else {
                        alert('Error al cargar el albarán: ' + result.error);
                    }
                });
        }

        if (e.target.classList.contains('btn-facturar')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres crear una factura a partir de este albarán?')) {
                fetch(`php/facturas/api_facturas.php?accion=crearDesdeAlbaran&albaran_id=${id}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            alert('Factura creada con éxito. Redirigiendo...');
                            window.location.href = 'facturas.html';
                        } else {
                            alert('Error al crear la factura: ' + result.error);
                        }
                    });
            }
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            id: formData.get('id'),
            cliente_id: formData.get('cliente_id'),
            fecha_emision: formData.get('fecha_emision'),
            notas: formData.get('notas'),
            lineas: []
        };

        const descripciones = formData.getAll('descripcion[]');
        const cantidades = formData.getAll('cantidad[]');

        for (let i = 0; i < descripciones.length; i++) {
            data.lineas.push({
                descripcion: descripciones[i],
                cantidad: cantidades[i]
            });
        }

        const accion = data.id ? 'actualizar' : 'crear';

        fetch(`php/albaranes/api_albaranes.php?accion=${accion}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Albarán guardado con éxito');
                form.reset();
                lineasContainer.innerHTML = '';
                anadirLinea();
                mostrarTabla();
            } else {
                alert('Error al guardar: ' + result.error);
            }
        });
    });

    // --- INICIALIZACIÓN ---
    cargarClientes();
    cargarAlbaranes();
});

