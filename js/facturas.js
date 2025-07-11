document.addEventListener('DOMContentLoaded', function() {
    const btnSearch = document.getElementById('btn-search-facturas');
    const btnNuevaFactura = document.getElementById('btn-nueva-factura');
    const formContainer = document.getElementById('form-factura-container');
    const tablaContainer = document.getElementById('tabla-facturas-container');
    const form = document.getElementById('form-factura');
    const btnCancelar = document.getElementById('btn-cancelar'); // Referencia directa al botón Cancelar
    const btnAnadirLinea = document.getElementById('btn-anadir-linea');
    const lineasContainer = form.querySelector('#lineas-factura');
    const selectCliente = form.querySelector('#cliente_id');
    const selectFacturaRectificada = form.querySelector('#factura_rectificada_id');
    const originalInvoiceSelectDiv = document.getElementById('original-invoice-select');

    // Elementos de visualización de totales
    const baseImponibleDisplay = document.getElementById('base-imponible-display');
    const ivaTotalDisplay = document.getElementById('iva-total-display');
    const retencionDisplay = document.getElementById('retencion-display'); // Nuevo elemento para retención
    const totalFacturaDisplay = document.getElementById('total-factura-display');

    // Elementos del modal de detalles de factura
    const modalVerFactura = document.getElementById('modal-ver-factura');
    const closeButton = modalVerFactura.querySelector('.btn-close'); // Usar clase de Bootstrap para cerrar modal
    const modalFacturaNumero = document.getElementById('modal-factura-numero');
    const modalFacturaCliente = document.getElementById('modal-factura-cliente');
    const modalFacturaFecha = document.getElementById('modal-factura-fecha');
    const modalFacturaTipo = document.getElementById('modal-factura-tipo');
    const modalFacturaBase = document.getElementById('modal-factura-base');
    const modalFacturaIVA = document.getElementById('modal-factura-iva');
    const modalFacturaTotal = document.getElementById('modal-factura-total');
    const modalFacturaNotas = document.getElementById('modal-factura-notas');
    const modalFacturaItemsTableBody = modalVerFactura.querySelector('#modal-factura-items-table tbody');

    // Referencias a elementos de la tabla principal
    const searchInput = document.getElementById('search-facturas');
    const tablaBody = document.querySelector('#tabla-facturas tbody');

    // --- VISTAS ---
    function mostrarTabla() {
        formContainer.style.display = 'none';
        tablaContainer.style.display = 'block';
        btnNuevaFactura.style.display = 'block';
        cargarFacturas();
    }

    function mostrarFormulario() {
        formContainer.style.display = 'block';
        tablaContainer.style.display = 'none';
        btnNuevaFactura.style.display = 'none';
        calcularTotales(); // Calcular totales al mostrar el formulario
    }

    // --- LÓGICA DEL FORMULARIO ---

    // Añadir una nueva línea de item a la factura (opcionalmente con datos)
    function anadirLinea(linea = null) {
        const div = document.createElement('div');
        div.classList.add('linea-item', 'row', 'g-2', 'align-items-center'); // Clases de Bootstrap para grid
        div.innerHTML = `
            <div class="col-md-4 col-12">
                <input type="text" name="descripcion[]" placeholder="Concepto" class="form-control" required value="${linea ? linea.descripcion : ''}">
            </div>
            <div class="col-md-2 col-12">
                <input type="number" name="precio_unitario[]" value="${linea ? linea.precio_unitario : ''}" min="0" step="any" placeholder="Base imponible" class="form-control" required>
            </div>
            <div class="col-md-2 col-12">
                <input type="number" name="cantidad[]" value="${linea ? linea.cantidad : 1}" min="0" step="any" placeholder="Cantidad" class="form-control" required>
            </div>
            <div class="col-md-2 col-12">
                <select name="tipo_iva[]" class="form-select">
                    <option value="21" ${linea && linea.tipo_iva == 21 ? 'selected' : ''}>21%</option>
                    <option value="10" ${linea && linea.tipo_iva == 10 ? 'selected' : ''}>10%</option>
                    <option value="4" ${linea && linea.tipo_iva == 4 ? 'selected' : ''}>4%</option>
                    <option value="0" ${linea && linea.tipo_iva == 0 ? 'selected' : ''}>0%</option>
                </select>
            </div>
            <div class="col-md-1 col-12 text-end">
                <span class="total-linea-display fw-bold">0.00 €</span>
            </div>
            <div class="col-md-1 col-12 text-end">
                <button type="button" class="btn-eliminar-linea btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>
            </div>
        `;
        lineasContainer.appendChild(div);

        // Añadir listeners de eventos para cambios en los inputs para recalcular
        const inputs = div.querySelectorAll('input[type="text"], input[type="number"], select');
        inputs.forEach(input => {
            input.addEventListener('input', calcularTotales);
        });

        // Añadir listener para el botón de eliminar
        div.querySelector('.btn-eliminar-linea').addEventListener('click', function() {
            div.remove();
            calcularTotales(); // Recalcular totales después de eliminar una línea
        });

        calcularTotales(); // Calcular totales después de añadir una nueva línea
    }

    // Resetear y limpiar el formulario
    function resetFormulario() {
        form.reset();
        document.getElementById('factura-id').value = '';
        document.getElementById('factura-tipo').value = 'ordinaria';
        lineasContainer.innerHTML = '';
        originalInvoiceSelectDiv.style.display = 'none';
        baseImponibleDisplay.textContent = '0,00 €';
        ivaTotalDisplay.textContent = '0,00 €';
        retencionDisplay.textContent = '0,00 €'; // Resetear retención
        totalFacturaDisplay.textContent = '0,00 €';

        // Establecer fechas por defecto (hoy y 30 días después)
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0!
        const yyyy = today.getFullYear();
        document.getElementById('fecha_emision').value = `${yyyy}-${mm}-${dd}`;

        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);
        const fdd = String(futureDate.getDate()).padStart(2, '0');
        const fmm = String(futureDate.getMonth() + 1).padStart(2, '0');
        const fyyyy = futureDate.getFullYear();
        document.getElementById('fecha_vencimiento').value = `${fyyyy}-${fmm}-${fdd}`;

        // Establecer número de factura (ejemplo, esto debería venir del backend)
        document.getElementById('factura-numero').value = '2025-00XX'; // Placeholder
    }

    // Calcular totales de la factura
    function calcularTotales() {
        let baseImponible = 0;
        let ivaTotal = 0;
        let retencion = 0; // Asumimos 0 por ahora, se podría añadir lógica para calcularla

        const lineas = lineasContainer.querySelectorAll('.linea-item');
        lineas.forEach(linea => {
            const cantidad = parseFloat(linea.querySelector('input[name="cantidad[]"]').value) || 0;
            const precioUnitario = parseFloat(linea.querySelector('input[name="precio_unitario[]"]').value) || 0;
            const tipoIva = parseFloat(linea.querySelector('select[name="tipo_iva[]"]').value) || 0; // Ahora es un select

            const subtotalLinea = cantidad * precioUnitario;
            const ivaLinea = subtotalLinea * (tipoIva / 100);
            const totalLinea = subtotalLinea + ivaLinea;

            baseImponible += subtotalLinea;
            ivaTotal += ivaLinea;

            linea.querySelector('.total-linea-display').textContent = totalLinea.toFixed(2).replace('.', ',') + ' €';
        });

        const totalFactura = baseImponible + ivaTotal - retencion; // Restar retención del total

        baseImponibleDisplay.textContent = baseImponible.toFixed(2).replace('.', ',') + ' €';
        ivaTotalDisplay.textContent = ivaTotal.toFixed(2).replace('.', ',') + ' €';
        retencionDisplay.textContent = retencion.toFixed(2).replace('.', ',') + ' €';
        totalFacturaDisplay.textContent = totalFactura.toFixed(2).replace('.', ',') + ' €';
    }

    // Cargar clientes en el select
    function cargarClientes() {
        fetch('php/clientes/api_clientes.php?accion=leer_todos')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    selectCliente.innerHTML = '<option value="">Selecciona el cliente</option>'; // Texto actualizado
                    data.clientes.forEach(cliente => {
                        const option = document.createElement('option');
                        option.value = cliente.id;
                        option.textContent = cliente.nombre;
                        selectCliente.appendChild(option);
                    });
                } else {
                    alert('Error al cargar clientes: ' + data.error);
                }
            });
    }

    // Cargar facturas emitidas para el select de rectificativas
    function cargarFacturasEmitidas() {
        fetch('php/facturas/api_facturas.php?accion=getFacturasEmitidas')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    selectFacturaRectificada.innerHTML = '<option value="">Seleccione factura a rectificar</option>';
                    data.data.forEach(factura => {
                        const option = document.createElement('option');
                        option.value = factura.id;
                        option.textContent = `${factura.numero_factura} - ${factura.cliente_nombre} (${new Date(factura.fecha_emision).toLocaleDateString()})`;
                        selectFacturaRectificada.appendChild(option);
                    });
                } else {
                    alert('Error al cargar facturas emitidas: ' + data.error);
                }
            });
    }

    // --- LÓGICA DE DATOS (API) ---
    function cargarFacturas(searchTerm = '') {
        let url = 'php/facturas/api_facturas.php?accion=leer';
        if (searchTerm) {
            url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    tablaBody.innerHTML = '';
                    data.data.forEach(f => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${f.numero_factura}</td>
                            <td>${new Date(f.fecha_emision).toLocaleDateString()}</td>
                            <td>${f.cliente_nombre}</td>
                            <td>${f.base_imponible.toFixed(2).replace('.', ',')} €</td>
                            <td>${f.iva_total.toFixed(2).replace('.', ',')} €</td>
                            <td>0%</td> <!-- Placeholder for Retención -->
                            <td>${f.total.toFixed(2).replace('.', ',')} €</td>
                            <td>
                                <button class="btn btn-sm btn-info btn-ver" data-id="${f.id}">PDF</button>
                            </td>
                        `;
                        tablaBody.appendChild(tr);
                    });
                } else {
                    alert('Error al cargar facturas: ' + data.error);
                }
            });
    }

    // --- EVENTOS ---
    const searchInput = document.getElementById('search-facturas');

    btnSearch.addEventListener('click', () => {
        cargarFacturas(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            cargarFacturas(searchInput.value);
        }
    });

    btnNuevaFactura.addEventListener('click', () => {
        resetFormulario();
        anadirLinea(); // Añadir una línea vacía por defecto
        cargarClientes(); // Cargar clientes al abrir el formulario
        mostrarFormulario();
    });

    btnCancelar.addEventListener('click', mostrarTabla);
    btnAnadirLinea.addEventListener('click', () => anadirLinea());

    tablaBody.addEventListener('click', function(e) {
        const id = e.target.dataset.id;

        if (e.target.classList.contains('btn-ver')) {
            // Lógica para ver detalles de factura (modal) - se mantiene similar
            fetch(`php/facturas/api_facturas.php?accion=getFactura&id=${id}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        const f = result.data;
                        modalFacturaNumero.textContent = f.numero_factura;
                        modalFacturaCliente.textContent = `${f.cliente_nombre} (${f.nie || f.telefono})`;
                        modalFacturaFecha.textContent = new Date(f.fecha_emision).toLocaleDateString();
                        modalFacturaTipo.textContent = f.tipo;
                        modalFacturaBase.textContent = f.base_imponible.toFixed(2).replace('.', ',');
                        modalFacturaIVA.textContent = f.iva_total.toFixed(2).replace('.', ',');
                        modalFacturaTotal.textContent = f.total.toFixed(2).replace('.', ',');
                        modalFacturaNotas.textContent = f.notas;

                        // Botones de acción en el modal (se mantienen, pero se pueden refactorizar)
                        const facturaId = f.id;
                        const pdfUrl = `php/facturas/api_facturas.php?accion=generarPdfFactura&id=${facturaId}`;

                        // Limpiar y añadir botones al body del modal (o a un div específico)
                        const modalBody = document.getElementById('modal-factura-body');
                        // Eliminar botones existentes si los hay (para evitar duplicados al reabrir)
                        const existingButtonsContainer = modalBody.querySelector('.d-flex.justify-content-end.mt-3');
                        if (existingButtonsContainer) {
                            existingButtonsContainer.innerHTML = '';
                            const btnDescargarPdf = document.createElement('button');
                            btnDescargarPdf.textContent = 'Descargar PDF';
                            btnDescargarPdf.classList.add('btn', 'btn-primary', 'me-2');
                            btnDescargarPdf.addEventListener('click', () => {
                                window.location.href = pdfUrl;
                            });
                            existingButtonsContainer.appendChild(btnDescargarPdf);

                            const btnEnviarEmail = document.createElement('button');
                            btnEnviarEmail.textContent = 'Enviar por Email';
                            btnEnviarEmail.classList.add('btn', 'btn-info', 'me-2');
                            btnEnviarEmail.addEventListener('click', () => {
                                const email = prompt('Introduce la dirección de correo electrónico:');
                                if (email) {
                                    fetch(`php/facturas/api_facturas.php?accion=enviarFacturaEmail&id=${facturaId}&email=${encodeURIComponent(email)}`)
                                        .then(response => response.json())
                                        .then(result => {
                                            if (result.success) {
                                                alert('Factura enviada por correo electrónico con éxito.');
                                            } else {
                                                alert('Error al enviar por correo electrónico: ' + result.error);
                                            }
                                        });
                                }
                            });
                            existingButtonsContainer.appendChild(btnEnviarEmail);

                            const btnEnviarWhatsapp = document.createElement('button');
                            btnEnviarWhatsapp.textContent = 'Enviar por WhatsApp';
                            btnEnviarWhatsapp.classList.add('btn', 'btn-success');
                            btnEnviarWhatsapp.addEventListener('click', () => {
                                const mensaje = `Hola, aquí tienes tu factura: ${window.location.origin}/dini-app/${pdfUrl}`;
                                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
                                window.open(whatsappUrl, '_blank');
                            });
                            existingButtonsContainer.appendChild(btnEnviarWhatsapp);
                        }

                        modalFacturaItemsTableBody.innerHTML = '';
                        f.lineas.forEach(item => {
                            const tr = document.createElement('tr');
                            const totalLinea = item.cantidad * item.precio_unitario * (1 + (item.tipo_iva / 100));
                            tr.innerHTML = `
                                <td>${item.descripcion}</td>
                                <td>${item.cantidad}</td>
                                <td>${item.precio_unitario.toFixed(2).replace('.', ',')} €</td>
                                <td>${item.tipo_iva} %</td>
                                <td>${totalLinea.toFixed(2).replace('.', ',')} €</td>
                            `;
                            modalFacturaItemsTableBody.appendChild(tr);
                        });

                        // Usar la clase de Bootstrap para mostrar el modal
                        const bsModal = new bootstrap.Modal(modalVerFactura);
                        bsModal.show();
                    } else {
                        alert('Error al cargar detalles de factura: ' + result.error);
                    }
                });
        }

        if (e.target.classList.contains('btn-emitir')) {
            if (confirm('¿Estás seguro de que quieres EMITIR esta factura? Una vez emitida, no podrá ser modificada.')) {
                fetch(`php/facturas/api_facturas.php?accion=emitirFactura&id=${id}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            alert('Factura emitida con éxito.');
                            cargarFacturas(); // Recargar la tabla
                        } else {
                            alert('Error al emitir la factura: ' + result.error);
                        }
                    });
            }
        }

        if (e.target.classList.contains('btn-rectificativa')) {
            resetFormulario();
            document.getElementById('factura-tipo').value = 'rectificativa';
            originalInvoiceSelectDiv.style.display = 'block';
            cargarClientes(); // Cargar clientes
            cargarFacturasEmitidas(); // Cargar facturas emitidas para seleccionar
            anadirLinea(); // Añadir una línea en blanco
            mostrarFormulario();
            // Opcional: precargar líneas con valores negativos de la factura original
            // Esto requeriría una llamada a getFactura para obtener los detalles
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
            tipo: formData.get('tipo'),
            factura_rectificada_id: formData.get('factura_rectificada_id'),
            lineas: []
        };

        const descripciones = formData.getAll('descripcion[]');
        const cantidades = formData.getAll('cantidad[]');
        const precios = formData.getAll('precio_unitario[]');
        const ivas = formData.getAll('tipo_iva[]');

        for (let i = 0; i < descripciones.length; i++) {
            data.lineas.push({
                descripcion: descripciones[i],
                cantidad: parseFloat(cantidades[i]),
                precio_unitario: parseFloat(precios[i]),
                tipo_iva: parseFloat(ivas[i])
            });
        }

        const accion = data.id ? 'actualizar' : 'crear';

        fetch(`php/facturas/api_facturas.php?accion=${accion}`,
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
                alert('Factura guardada con éxito');
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
    cargarClientes(); // Cargar clientes al inicio para el formulario de nueva factura
    cargarFacturas();
    anadirLinea(); // Añadir una línea por defecto al abrir el formulario
});