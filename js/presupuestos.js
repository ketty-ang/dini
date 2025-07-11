    const tablaBody = document.querySelector('#tabla-presupuestos tbody');

    // --- VISTAS ---
    function mostrarTabla() {
        formContainer.style.display = 'none';
        tablaContainer.style.display = 'block';
        cargarPresupuestos(); // Recargar la tabla al volver
    }

    function mostrarFormulario() {
        formContainer.style.display = 'block';
        tablaContainer.style.display = 'none';
        // Resetear formulario para nueva entrada
        // (se implementará más adelante)
    }

    // --- LÓGICA DE DATOS (API) ---

    // Cargar la tabla de presupuestos
    function cargarPresupuestos() {
        fetch('php/presupuestos/api_presupuestos.php?accion=leer')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    tablaBody.innerHTML = '';
                    data.data.forEach(p => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${p.numero_presupuesto}</td>
                            <td>${p.cliente_nombre}</td>
                            <td>${new Date(p.fecha_emision).toLocaleDateString()}</td>
                            <td>${p.total} €</td>
                            <td><span class="badge estado-${p.estado}">${p.estado}</span></td>
                            <td>
                                <button class="btn-editar" data-id="${p.id}">Editar</button>
                                <button class="btn-eliminar" data-id="${p.id}">Eliminar</button>
                                ${p.estado === 'aceptado' ? `<button class="btn-crear-albaran" data-id="${p.id}">Crear Albarán</button>` : ''}
                            </td>
                        `;
                        tablaBody.appendChild(tr);
                    });
                } else {
                    alert('Error al cargar presupuestos: ' + data.error);
                }
            });
    }

    // Cargar clientes en el select
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

    // Añadir una nueva línea de item al presupuesto (opcionalmente con datos)
    function anadirLinea(linea = null) {
        const div = document.createElement('div');
        div.classList.add('linea-item');
        div.innerHTML = `
            <input type="text" name="descripcion[]" placeholder="Descripción" class="form-control" required value="${linea ? linea.descripcion : ''}">
            <input type="number" name="cantidad[]" value="${linea ? linea.cantidad : 1}" min="0" step="any" placeholder="Cantidad" class="form-control" required>
            <input type="number" name="precio_unitario[]" value="${linea ? linea.precio_unitario : ''}" min="0" step="any" placeholder="Precio Unitario" class="form-control" required>
            <input type="number" name="tipo_iva[]" value="${linea ? linea.tipo_iva : 21}" min="0" step="any" placeholder="% IVA" class="form-control" required>
            <button type="button" class="btn-eliminar-linea btn btn-danger">X</button>
        `;
        lineasContainer.appendChild(div);
    }
    
    // Resetear y limpiar el formulario
    function resetFormulario() {
        form.reset();
        document.getElementById('presupuesto-id').value = '';
        lineasContainer.innerHTML = '';
    }

    // Eliminar una línea de item
    lineasContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-eliminar-linea')) {
            e.target.parentElement.remove();
        }
    });

    const form = document.getElementById('form-presupuesto');

    // --- EVENTOS ---
    btnNuevo.addEventListener('click', () => {
        resetFormulario();
        anadirLinea(); // Añadir una línea en blanco para el nuevo presupuesto
        mostrarFormulario();
    });
    btnCancelar.addEventListener('click', mostrarTabla);
    btnAnadirLinea.addEventListener('click', () => anadirLinea()); // Pasar sin argumentos

    tablaBody.addEventListener('click', function(e) {
        const id = e.target.dataset.id;

        if (e.target.classList.contains('btn-eliminar')) {
            if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
                fetch(`php/presupuestos/api_presupuestos.php?accion=eliminar&id=${id}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            cargarPresupuestos();
                        } else {
                            alert('Error al eliminar: ' + result.error);
                        }
                    });
            }
        }

        if (e.target.classList.contains('btn-editar')) {
            fetch(`php/presupuestos/api_presupuestos.php?accion=getPresupuesto&id=${id}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        resetFormulario();
                        const p = result.data;
                        document.getElementById('presupuesto-id').value = p.id;
                        document.getElementById('cliente_id').value = p.cliente_id;
                        document.getElementById('fecha_emision').value = p.fecha_emision.split(' ')[0]; // Formato YYYY-MM-DD
                        document.getElementById('fecha_validez').value = p.fecha_validez ? p.fecha_validez.split(' ')[0] : '';
                        document.getElementById('notas').value = p.notas;

                        p.lineas.forEach(linea => anadirLinea(linea));
                        
                        mostrarFormulario();
                    } else {
                        alert('Error al cargar el presupuesto: ' + result.error);
                    }
                });
        }

        if (e.target.classList.contains('btn-crear-albaran')) {
            if (confirm('¿Estás seguro de que quieres crear un albarán a partir de este presupuesto?')) {
                fetch(`php/albaranes/api_albaranes.php?accion=crearDesdePresupuesto&presupuesto_id=${id}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            alert('Albarán creado con éxito. Redirigiendo...');
                            window.location.href = 'albaranes.html';
                        } else {
                            alert('Error al crear el albarán: ' + result.error);
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
            fecha_validez: formData.get('fecha_validez'),
            notas: formData.get('notas'),
            lineas: []
        };

        const descripciones = formData.getAll('descripcion[]');
        const cantidades = formData.getAll('cantidad[]');
        const precios = formData.getAll('precio_unitario[]');
        const ivas = formData.getAll('tipo_iva[]');

        for (let i = 0; i < descripciones.length; i++) {
            data.lineas.push({
                descripcion: descripciones[i],
                cantidad: cantidades[i],
                precio_unitario: precios[i],
                tipo_iva: ivas[i]
            });
        }

        const accion = data.id ? 'actualizar' : 'crear';

        fetch(`php/presupuestos/api_presupuestos.php?accion=${accion}`,
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
                alert('Presupuesto guardado con éxito');
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
    cargarPresupuestos();
    anadirLinea(); // Añadir una línea por defecto al abrir el formulario
});

