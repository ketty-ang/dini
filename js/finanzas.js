// Lógica de frontend para el módulo de finanzas

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-finanzas');
    const tbody = document.querySelector('#tabla-finanzas tbody');

    // Función para cargar y mostrar los registros
    function cargarRegistros() {
        fetch('php/finanzas/api_finanzas.php?accion=leer')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    tbody.innerHTML = ''; // Limpiar tabla
                    data.registros.forEach(registro => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${registro.tipo}</td>
                            <td>${registro.descripcion}</td>
                            <td>${registro.monto}</td>
                            <td>${registro.fecha}</td>
                            <td>${registro.fotos.map(foto => `<a href="${foto.ruta_imagen}" target="_blank">Ver Foto</a>`).join('<br>')}</td>
                                                        <td>
                                <button class="descargar" data-id="${registro.id}">Descargar</button>
                                <button class="eliminar" data-id="${registro.id}">Eliminar</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    alert('Error al cargar los registros: ' + data.error);
                }
            });
    }

    // Evento para el formulario de creación
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);

        fetch('php/finanzas/api_finanzas.php?accion=crear', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Registro guardado con éxito');
                form.reset();
                cargarRegistros(); // Recargar la tabla
            } else {
                alert('Error al guardar el registro: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ocurrió un error de conexión.');
        });
    });

    const formDescarga = document.getElementById('form-descarga-zip');

    // Evento para el formulario de descarga ZIP
    formDescarga.addEventListener('submit', function(e) {
        e.preventDefault();
        const ano = formDescarga.querySelector('input[name="ano"]').value;
        const trimestre = formDescarga.querySelector('select[name="trimestre"]').value;
        
        const url = `php/finanzas/api_finanzas.php?accion=descargar_zip&ano=${ano}&trimestre=${trimestre}`;
        // Redirigir para iniciar la descarga
        window.location.href = url;
    });

    // Evento para delegación en la tabla (para botones de eliminar y descargar)
    tbody.addEventListener('click', function(e) {
        if (e.target.classList.contains('eliminar')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
                fetch(`php/finanzas/api_finanzas.php?accion=eliminar&id=${id}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            cargarRegistros(); // Recargar la tabla
                        } else {
                            alert('Error al eliminar el registro: ' + data.error);
                        }
                    });
            }
        } else if (e.target.classList.contains('descargar')) {
            const id = e.target.dataset.id;
            const url = `php/finanzas/api_finanzas.php?accion=descargar_individual&id=${id}`;
            window.location.href = url;
        }
    });

    // Cargar los registros al iniciar la página
    cargarRegistros();

    // Lógica para el modal de Nuevo Cliente
    const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
    const nuevoClienteModal = new bootstrap.Modal(document.getElementById('nuevoClienteModal'));
    const formNuevoCliente = document.getElementById('formNuevoCliente');

    btnNuevoCliente.addEventListener('click', function() {
        nuevoClienteModal.show();
    });

    formNuevoCliente.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(formNuevoCliente);

        fetch('php/clientes/api_clientes.php?accion=crear', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Cliente guardado con éxito');
                formNuevoCliente.reset();
                nuevoClienteModal.hide();
                // Optionally, refresh a client list if one is implemented later
            } else {
                alert('Error al guardar el cliente: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ocurrió un error de conexión al guardar el cliente.');
        });
    });

    // Lógica para buscar cliente y mostrar historial
    const inputBuscarCliente = document.getElementById('inputBuscarCliente');
    const btnBuscarCliente = document.getElementById('btnBuscarCliente');
    const resultadoBusquedaCliente = document.getElementById('resultadoBusquedaCliente');

    const clienteDetalleNombre = document.getElementById('clienteDetalleNombre');
    const clienteDetalleTelefono = document.getElementById('clienteDetalleTelefono');
    const clienteDetalleDNI = document.getElementById('clienteDetalleDNI');
    const clienteDetalleDireccion = document.getElementById('clienteDetalleDireccion');
    const clienteDetalleEmail = document.getElementById('clienteDetalleEmail');

    const tablaFacturasHistorial = document.getElementById('tablaFacturasHistorial');
    const tablaAlbaranesHistorial = document.getElementById('tablaAlbaranesHistorial');
    const tablaPresupuestosHistorial = document.getElementById('tablaPresupuestosHistorial');

    btnBuscarCliente.addEventListener('click', buscarCliente);
    inputBuscarCliente.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarCliente();
        }
    });

    function buscarCliente() {
        const searchTerm = inputBuscarCliente.value.trim();
        if (searchTerm === '') {
            alert('Por favor, introduce un teléfono o DNI/NIE para buscar.');
            return;
        }

        fetch(`php/clientes/api_clientes.php?accion=buscar&term=${searchTerm}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.cliente) {
                    // Mostrar detalles del cliente
                    clienteDetalleNombre.textContent = data.cliente.nombre;
                    clienteDetalleTelefono.textContent = data.cliente.telefono;
                    clienteDetalleDNI.textContent = data.cliente.dni_nie || 'N/A';
                    clienteDetalleDireccion.textContent = data.cliente.direccion || 'N/A';
                    clienteDetalleEmail.textContent = data.cliente.email || 'N/A';

                    // Mostrar historial de facturas
                    tablaFacturasHistorial.innerHTML = '';
                    if (data.facturas.length > 0) {
                        data.facturas.forEach(factura => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${factura.id}</td>
                                <td>${factura.fecha}</td>
                                <td>${factura.monto}</td>
                                <td>${factura.estado}</td>
                                <td><a href="facturas.html?id=${factura.id}" target="_blank">Ver</a></td>
                            `;
                            tablaFacturasHistorial.appendChild(tr);
                        });
                    } else {
                        tablaFacturasHistorial.innerHTML = '<tr><td colspan="5">No hay facturas para este cliente.</td></tr>';
                    }

                    // Mostrar historial de albaranes
                    tablaAlbaranesHistorial.innerHTML = '';
                    if (data.albaranes.length > 0) {
                        data.albaranes.forEach(albaran => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${albaran.id}</td>
                                <td>${albaran.fecha}</td>
                                <td>${albaran.descripcion}</td>
                                <td><a href="albaranes.html?id=${albaran.id}" target="_blank">Ver</a></td>
                            `;
                            tablaAlbaranesHistorial.appendChild(tr);
                        });
                    } else {
                        tablaAlbaranesHistorial.innerHTML = '<tr><td colspan="4">No hay albaranes para este cliente.</td></tr>';
                    }

                    // Mostrar historial de presupuestos
                    tablaPresupuestosHistorial.innerHTML = '';
                    if (data.presupuestos.length > 0) {
                        data.presupuestos.forEach(presupuesto => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${presupuesto.id}</td>
                                <td>${presupuesto.fecha}</td>
                                <td>${presupuesto.monto_estimado}</td>
                                <td>${presupuesto.estado}</td>
                                <td><a href="presupuestos.html?id=${presupuesto.id}" target="_blank">Ver</a></td>
                            `;
                            tablaPresupuestosHistorial.appendChild(tr);
                        });
                    } else {
                        tablaPresupuestosHistorial.innerHTML = '<tr><td colspan="5">No hay presupuestos para este cliente.</td></tr>';
                    }

                    resultadoBusquedaCliente.style.display = 'block'; // Mostrar el contenedor de resultados
                } else {
                    alert(data.error || 'Cliente no encontrado.');
                    resultadoBusquedaCliente.style.display = 'none'; // Ocultar si no se encuentra
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Ocurrió un error de conexión al buscar el cliente.');
                resultadoBusquedaCliente.style.display = 'none';
            });
    }
});


