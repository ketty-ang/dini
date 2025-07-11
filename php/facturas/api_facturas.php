<?php
composer require dompdf/dompdf
composer require phpmailer/phpmailer
require_once __DIR__ . '/../config.php';

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['empresa_id'])) {
    echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
    exit();
}

$empresa_id = $_SESSION['empresa_id'];
$accion = $_GET['accion'] ?? '';

switch ($accion) {
    case 'leer':
        try {
            $conexion = conectarDB();
            $searchTerm = $_GET['searchTerm'] ?? '';

            $sql = "SELECT f.id, f.numero_factura, f.fecha_emision, f.total, f.estado, c.nombre as cliente_nombre, c.nie, c.telefono 
                    FROM facturas f
                    JOIN clientes c ON f.cliente_id = c.id
                    WHERE f.empresa_id = ? ";
            
            $params = "i";
            $values = [$empresa_id];

            if (!empty($searchTerm)) {
                $searchTermLike = '%' . $searchTerm . '%';
                $sql .= " AND (c.nie LIKE ? OR c.telefono LIKE ? OR c.nombre LIKE ?)";
                $params .= "sss";
                $values[] = $searchTermLike;
                $values[] = $searchTermLike;
                $values[] = $searchTermLike;
            }

            $sql .= " ORDER BY f.fecha_emision DESC";
            
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param($params, ...$values);
            $stmt->execute();
            $result = $stmt->get_result();
            $facturas = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            $conexion->close();

            echo json_encode(['success' => true, 'data' => $facturas]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'crearDesdeAlbaran':
        $albaran_id = $_GET['albaran_id'] ?? 0;
        if (!$albaran_id) {
            echo json_encode(['success' => false, 'error' => 'ID de albarán no proporcionado']);
            exit();
        }

        $conexion = conectarDB();
        $conexion->begin_transaction();

        try {
            // 1. Obtener datos del albarán y verificar pertenencia
            $sql_albaran = "SELECT * FROM albaranes WHERE id = ? AND empresa_id = ?";
            $stmt_albaran = $conexion->prepare($sql_albaran);
            $stmt_albaran->bind_param("ii", $albaran_id, $empresa_id);
            $stmt_albaran->execute();
            $albaran = $stmt_albaran->get_result()->fetch_assoc();

            if (!$albaran || $albaran['estado'] !== 'entregado') {
                throw new Exception('Albarán no encontrado, no pertenece a la empresa o no está entregado.');
            }

            // 2. Obtener items del albarán
            $sql_items = "SELECT * FROM albaran_items WHERE albaran_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $albaran_id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            if (empty($items)) {
                throw new Exception('El albarán no tiene líneas de items.');
            }

            // 3. Calcular totales y obtener precios/IVA de productos_servicios
            $base_imponible = 0;
            $iva_total = 0;
            $factura_items_data = [];

            foreach ($items as $albaran_item) {
                $sql_ps = "SELECT precio FROM productos_servicios WHERE nombre = ? AND empresa_id = ? LIMIT 1";
                $stmt_ps = $conexion->prepare($sql_ps);
                $stmt_ps->bind_param("si", $albaran_item['descripcion'], $empresa_id);
                $stmt_ps->execute();
                $ps_result = $stmt_ps->get_result()->fetch_assoc();

                if (!$ps_result) {
                    throw new Exception('Producto/Servicio "' . $albaran_item['descripcion'] . '" no encontrado en su catálogo.');
                }
                $precio_unitario = floatval($ps_result['precio']);
                $tipo_iva = 21.00; // Asumimos un IVA del 21% por defecto, esto debería ser configurable o venir del producto/servicio

                $cantidad = floatval($albaran_item['cantidad']);
                $subtotal_linea = $cantidad * $precio_unitario;
                $base_imponible += $subtotal_linea;
                $iva_total += $subtotal_linea * ($tipo_iva / 100);

                $factura_items_data[] = [
                    'descripcion' => $albaran_item['descripcion'],
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precio_unitario,
                    'tipo_iva' => $tipo_iva
                ];
            }
            $total = $base_imponible + $iva_total;

            // 4. Generar número de factura (ej. FAC-2025-001)
            $year = date('Y');
            $sql_count = "SELECT COUNT(*) as count FROM facturas WHERE empresa_id = ? AND YEAR(fecha_emision) = ?";
            $stmt_count = $conexion->prepare($sql_count);
            $stmt_count->bind_param("is", $empresa_id, $year);
            $stmt_count->execute();
            $count = $stmt_count->get_result()->fetch_assoc()['count'] + 1;
            $numero_factura = "FAC-" . $year . "-" . str_pad($count, 3, '0', STR_PAD_LEFT);

            // 5. Insertar factura principal
            $sql_insert_factura = "INSERT INTO facturas (empresa_id, cliente_id, albaran_id, numero_factura, fecha_emision, base_imponible, iva_total, total, estado) 
                                    VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, 'borrador')";
            $stmt_insert_factura = $conexion->prepare($sql_insert_factura);
            $stmt_insert_factura->bind_param("iiisddd", 
                $empresa_id, 
                $albaran['cliente_id'], 
                $albaran_id, 
                $numero_factura, 
                $base_imponible, 
                $iva_total, 
                $total
            );
            $stmt_insert_factura->execute();
            $factura_id = $conexion->insert_id;

            // 6. Insertar líneas de items de factura
            $sql_insert_item = "INSERT INTO factura_items (factura_id, descripcion, cantidad, precio_unitario, tipo_iva) VALUES (?, ?, ?, ?, ?)";
            $stmt_insert_item = $conexion->prepare($sql_insert_item);
            foreach ($factura_items_data as $item) {
                $stmt_insert_item->bind_param("isddd", 
                    $factura_id, 
                    $item['descripcion'], 
                    $item['cantidad'], 
                    $item['precio_unitario'], 
                    $item['tipo_iva']
                );
                $stmt_insert_item->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Factura creada con éxito', 'factura_id' => $factura_id]);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_albaran)) $stmt_albaran->close();
            if(isset($stmt_items)) $stmt_items->close();
            if(isset($stmt_ps)) $stmt_ps->close();
            if(isset($stmt_count)) $stmt_count->close();
            if(isset($stmt_insert_factura)) $stmt_insert_factura->close();
            if(isset($stmt_insert_item)) $stmt_insert_item->close();
            $conexion->close();
        }
        break;

    case 'emitirFactura':
        $id = $_GET['id'] ?? 0;
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID de factura no proporcionado.']);
            exit();
        }

        $conexion = conectarDB();
        $conexion->begin_transaction();

        try {
            // 1. Verificar factura y estado
            $sql_factura = "SELECT f.*, c.nombre as cliente_nombre, c.nie, c.telefono FROM facturas f JOIN clientes c ON f.cliente_id = c.id WHERE f.id = ? AND f.empresa_id = ? AND f.estado = 'borrador'";
            $stmt_factura = $conexion->prepare($sql_factura);
            $stmt_factura->bind_param("ii", $id, $empresa_id);
            $stmt_factura->execute();
            $factura = $stmt_factura->get_result()->fetch_assoc();

            if (!$factura) {
                throw new Exception('Factura no encontrada, no pertenece a la empresa o no está en estado de borrador.');
            }

            // 2. Obtener items de la factura
            $sql_items = "SELECT descripcion, cantidad, precio_unitario, tipo_iva FROM factura_items WHERE factura_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            // 3. Generar hash VeriFactu
            $data_to_hash = [
                'numero_factura' => $factura['numero_factura'],
                'fecha_emision' => $factura['fecha_emision'],
                'total' => $factura['total'],
                'cliente_nie' => $factura['nie'],
                'items' => $items
            ];
            $json_data_to_hash = json_encode($data_to_hash);
            $verifactu_hash = hash('sha256', $json_data_to_hash);

            // 4. Obtener hash anterior para encadenamiento
            $sql_last_hash = "SELECT hash_actual FROM facturas_verifactu_log WHERE empresa_id = ? ORDER BY id DESC LIMIT 1";
            $stmt_last_hash = $conexion->prepare($sql_last_hash);
            $stmt_last_hash->bind_param("i", $empresa_id);
            $stmt_last_hash->execute();
            $last_hash = $stmt_last_hash->get_result()->fetch_assoc()['hash_actual'] ?? null;

            // 5. Actualizar estado de la factura y guardar hash
            $sql_update_factura = "UPDATE facturas SET estado = 'emitida', verifactu_hash = ? WHERE id = ?";
            $stmt_update_factura = $conexion->prepare($sql_update_factura);
            $stmt_update_factura->bind_param("si", $verifactu_hash, $id);
            $stmt_update_factura->execute();

            // 6. Log VeriFactu Event
            $sql_log = "INSERT INTO facturas_verifactu_log (factura_id, evento, datos_registro, hash_anterior, hash_actual) VALUES (?, ?, ?, ?, ?)";
            $stmt_log = $conexion->prepare($sql_log);
            $evento = 'factura_emitida';
            $stmt_log->bind_param("issss", $id, $evento, $json_data_to_hash, $last_hash, $verifactu_hash);
            $stmt_log->execute();

            // 7. Generar QR Code URL (Placeholder)
            $qr_url = "https://verifactu.example.com/verify?hash=" . $verifactu_hash; // URL de ejemplo
            $sql_update_qr = "UPDATE facturas SET verifactu_qr_url = ? WHERE id = ?";
            $stmt_update_qr = $conexion->prepare($sql_update_qr);
            $stmt_update_qr->bind_param("si", $qr_url, $id);
            $stmt_update_qr->execute();

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Factura emitida con éxito.', 'verifactu_hash' => $verifactu_hash, 'qr_url' => $qr_url]);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_factura)) $stmt_factura->close();
            if(isset($stmt_items)) $stmt_items->close();
            if(isset($stmt_last_hash)) $stmt_last_hash->close();
            if(isset($stmt_update_factura)) $stmt_update_factura->close();
            if(isset($stmt_log)) $stmt_log->close();
            if(isset($stmt_update_qr)) $stmt_update_qr->close();
            $conexion->close();
        }
        break;

    case 'crear':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['cliente_id']) || empty($input['fecha_emision']) || empty($input['lineas'])) {
            echo json_encode(['success' => false, 'error' => 'Faltan datos obligatorios.']);
            exit();
        }

        $conexion = conectarDB();
        $conexion->begin_transaction();

        try {
            // 1. Calcular totales desde el servidor
            $base_imponible = 0;
            $iva_total = 0;
            foreach ($input['lineas'] as $linea) {
                $cantidad = floatval($linea['cantidad']);
                $precio = floatval($linea['precio_unitario']);
                $iva_percent = floatval($linea['tipo_iva']);
                
                $subtotal_linea = $cantidad * $precio;
                $base_imponible += $subtotal_linea;
                $iva_total += $subtotal_linea * ($iva_percent / 100);
            }
            $total = $base_imponible + $iva_total;

            // 2. Generar número de factura (ej. FAC-2025-001)
            $year = date('Y');
            $sql_count = "SELECT COUNT(*) as count FROM facturas WHERE empresa_id = ? AND YEAR(fecha_emision) = ?";
            $stmt_count = $conexion->prepare($sql_count);
            $stmt_count->bind_param("is", $empresa_id, $year);
            $stmt_count->execute();
            $count = $stmt_count->get_result()->fetch_assoc()['count'] + 1;
            $numero_factura = "FAC-" . $year . "-" . str_pad($count, 3, '0', STR_PAD_LEFT);

            // 3. Insertar factura principal
            $sql = "INSERT INTO facturas (empresa_id, cliente_id, numero_factura, fecha_emision, base_imponible, iva_total, total, notas, tipo, factura_rectificada_id, estado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador')";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("iisssdddsi", 
                $empresa_id, 
                $input['cliente_id'], 
                $numero_factura, 
                $input['fecha_emision'], 
                $base_imponible, 
                $iva_total, 
                $total, 
                $input['notas'],
                $input['tipo'],
                $input['factura_rectificada_id']
            );
            $stmt->execute();
            $factura_id = $conexion->insert_id;

            // 4. Insertar líneas de items
            $sql_item = "INSERT INTO factura_items (factura_id, descripcion, cantidad, precio_unitario, tipo_iva) VALUES (?, ?, ?, ?, ?)";
            $stmt_item = $conexion->prepare($sql_item);
            foreach ($input['lineas'] as $linea) {
                $stmt_item->bind_param("isddd", 
                    $factura_id, 
                    $linea['descripcion'], 
                    $linea['cantidad'], 
                    $linea['precio_unitario'], 
                    $linea['tipo_iva']
                );
                $stmt_item->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Factura creada con éxito']);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt)) $stmt->close();
            if(isset($stmt_count)) $stmt_count->close();
            if(isset($stmt_item)) $stmt_item->close();
            $conexion->close();
        }
        break;

    break;

    break;

    case 'enviarFacturaEmail':
        $id = $_GET['id'] ?? 0;
        $recipient_email = $_GET['email'] ?? '';

        if (!$id || !filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'error' => 'ID de factura o email no válidos.']);
            exit();
        }

        $conexion = conectarDB();
        try {
            // Obtener datos de la factura (reutilizando lógica de getFactura)
            $sql_factura = "SELECT f.*, c.nombre as cliente_nombre, c.nie, c.telefono, c.direccion 
                            FROM facturas f 
                            JOIN clientes c ON f.cliente_id = c.id 
                            WHERE f.id = ? AND f.empresa_id = ?";
            $stmt_factura = $conexion->prepare($sql_factura);
            $stmt_factura->bind_param("ii", $id, $empresa_id);
            $stmt_factura->execute();
            $factura = $stmt_factura->get_result()->fetch_assoc();

            if (!$factura) {
                throw new Exception('Factura no encontrada o sin permiso.');
            }

            $sql_items = "SELECT descripcion, cantidad, precio_unitario, tipo_iva FROM factura_items WHERE factura_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            // Generar HTML para el PDF (reutilizando el mismo HTML que en generarPdfFactura)
            $html = '<style>
                body { font-family: sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header, .footer { text-align: center; margin-bottom: 20px; }
                .details { margin-bottom: 20px; }
            </style>';
            $html .= '<div class="header"><h1>Factura ' . $factura['numero_factura'] . '</h1></div>';
            $html .= '<div class="details">';
            $html .= '<p><strong>Cliente:</strong> ' . $factura['cliente_nombre'] . '</p>';
            $html .= '<p><strong>NIE/DNI:</strong> ' . $factura['nie'] . '</p>';
            $html .= '<p><strong>Teléfono:</strong> ' . $factura['telefono'] . '</p>';
            $html .= '<p><strong>Dirección:</strong> ' . $factura['direccion'] . '</p>';
            $html .= '<p><strong>Fecha de Emisión:</strong> ' . date('d/m/Y', strtotime($factura['fecha_emision'])) . '</p>';
            $html .= '<p><strong>Tipo:</strong> ' . ucfirst($factura['tipo']) . '</p>';
            if ($factura['tipo'] === 'rectificativa' && $factura['factura_rectificada_id']) {
                $html .= '<p><strong>Rectifica Factura ID:</strong> ' . $factura['factura_rectificada_id'] . '</p>';
            }
            $html .= '<p><strong>Notas:</strong> ' . $factura['notas'] . '</p>';
            $html .= '</div>';

            $html .= '<table>';
            $html .= '<thead><tr><th>Descripción</th><th>Cantidad</th><th>P. Unitario</th><th>IVA (%)</th><th>Total Línea</th></tr></thead>';
            $html .= '<tbody>';
            foreach ($items as $item) {
                $total_linea = $item['cantidad'] * $item['precio_unitario'] * (1 + ($item['tipo_iva'] / 100));
                $html .= '<tr>';
                $html .= '<td>' . $item['descripcion'] . '</td>';
                $html .= '<td>' . $item['cantidad'] . '</td>';
                $html .= '<td>' . number_format($item['precio_unitario'], 2) . ' €</td>';
                $html .= '<td>' . number_format($item['tipo_iva'], 2) . '</td>';
                $html .= '<td>' . number_format($total_linea, 2) . ' €</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody>';
            $html .= '</table>';

            $html .= '<p><strong>Base Imponible:</strong> ' . number_format($factura['base_imponible'], 2) . ' €</p>';
            $html .= '<p><strong>IVA Total:</strong> ' . number_format($factura['iva_total'], 2) . ' €</p>';
            $html .= '<p><strong>Total Factura:</strong> ' . number_format($factura['total'], 2) . ' €</p>';

            // Instanciar y configurar Dompdf
            require_once __DIR__ . '/../vendor/autoload.php';
            use Dompdf\Dompdf;
            use Dompdf\Options;

            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', true);
            $dompdf = new Dompdf($options);

            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            $pdf_content = $dompdf->output();
            $pdf_file_name = "factura_" . $factura['numero_factura'] . ".pdf";
            $pdf_file_path = sys_get_temp_dir() . '/' . $pdf_file_name;
            file_put_contents($pdf_file_path, $pdf_content);

            // Usar PHPMailer para enviar el email
            use PHPMailer\PHPMailer\PHPMailer;
            use PHPMailer\PHPMailer\Exception;

            $mail = new PHPMailer(true);
            try {
                // Configuración del servidor SMTP (EJEMPLO - DEBES CAMBIAR ESTO)
                $mail->isSMTP();
                $mail->Host = 'smtp.example.com'; // Tu servidor SMTP
                $mail->SMTPAuth = true;
                $mail->Username = 'your_email@example.com'; // Tu email
                $mail->Password = 'your_password'; // Tu contraseña
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // O ENCRYPTION_SMTPS
                $mail->Port = 587; // O 465 para SMTPS

                // Remitente y destinatario
                $mail->setFrom('no-reply@yourdomain.com', 'Tu Empresa');
                $mail->addAddress($recipient_email, $factura['cliente_nombre']);
                $mail->addReplyTo('info@yourdomain.com', 'Información');

                // Contenido del email
                $mail->isHTML(true);
                $mail->Subject = 'Tu Factura de ' . $factura['numero_factura'];
                $mail->Body    = 'Hola ' . $factura['cliente_nombre'] . ',<br><br>Adjuntamos tu factura ' . $factura['numero_factura'] . '.<br><br>Gracias por tu negocio.<br><br>Saludos,<br>Tu Empresa';
                $mail->AltBody = 'Hola ' . $factura['cliente_nombre'] . ', Adjuntamos tu factura ' . $factura['numero_factura'] . '. Gracias por tu negocio. Saludos, Tu Empresa';

                // Adjuntar PDF
                $mail->addAttachment($pdf_file_path, $pdf_file_name);

                $mail->send();
                echo json_encode(['success' => true, 'message' => 'Factura enviada con éxito.']);
            } catch (Exception $e) {
                throw new Exception('Error al enviar el email: ' . $mail->ErrorInfo);
            } finally {
                // Limpiar PDF temporal
                if (file_exists($pdf_file_path)) {
                    unlink($pdf_file_path);
                }
            }

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_factura)) $stmt_factura->close();
            if(isset($stmt_items)) $stmt_items->close();
            $conexion->close();
        }
        break;

    case 'generarPdfFactura':
        $id = $_GET['id'] ?? 0;
        if (!$id) {
            die('ID de factura no proporcionado.');
        }

        $conexion = conectarDB();
        try {
            // Obtener datos de la factura (reutilizando lógica de getFactura)
            $sql_factura = "SELECT f.*, c.nombre as cliente_nombre, c.nie, c.telefono, c.direccion 
                            FROM facturas f 
                            JOIN clientes c ON f.cliente_id = c.id 
                            WHERE f.id = ? AND f.empresa_id = ?";
            $stmt_factura = $conexion->prepare($sql_factura);
            $stmt_factura->bind_param("ii", $id, $empresa_id);
            $stmt_factura->execute();
            $factura = $stmt_factura->get_result()->fetch_assoc();

            if (!$factura) {
                die('Factura no encontrada o sin permiso.');
            }

            $sql_items = "SELECT descripcion, cantidad, precio_unitario, tipo_iva FROM factura_items WHERE factura_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            // Generar HTML para el PDF
            $html = '<style>
                body { font-family: sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header, .footer { text-align: center; margin-bottom: 20px; }
                .details { margin-bottom: 20px; }
            </style>';
            $html .= '<div class="header"><h1>Factura ' . $factura['numero_factura'] . '</h1></div>';
            $html .= '<div class="details">';
            $html .= '<p><strong>Cliente:</strong> ' . $factura['cliente_nombre'] . '</p>';
            $html .= '<p><strong>NIE/DNI:</strong> ' . $factura['nie'] . '</p>';
            $html .= '<p><strong>Teléfono:</strong> ' . $factura['telefono'] . '</p>';
            $html .= '<p><strong>Dirección:</strong> ' . $factura['direccion'] . '</p>';
            $html .= '<p><strong>Fecha de Emisión:</strong> ' . date('d/m/Y', strtotime($factura['fecha_emision'])) . '</p>';
            $html .= '<p><strong>Tipo:</strong> ' . ucfirst($factura['tipo']) . '</p>';
            if ($factura['tipo'] === 'rectificativa' && $factura['factura_rectificada_id']) {
                $html .= '<p><strong>Rectifica Factura ID:</strong> ' . $factura['factura_rectificada_id'] . '</p>';
            }
            $html .= '<p><strong>Notas:</strong> ' . $factura['notas'] . '</p>';
            $html .= '</div>';

            $html .= '<table>';
            $html .= '<thead><tr><th>Descripción</th><th>Cantidad</th><th>P. Unitario</th><th>IVA (%)</th><th>Total Línea</th></tr></thead>';
            $html .= '<tbody>';
            foreach ($items as $item) {
                $total_linea = $item['cantidad'] * $item['precio_unitario'] * (1 + ($item['tipo_iva'] / 100));
                $html .= '<tr>';
                $html .= '<td>' . $item['descripcion'] . '</td>';
                $html .= '<td>' . $item['cantidad'] . '</td>
';
                $html .= '<td>' . number_format($item['precio_unitario'], 2) . ' €</td>';
                $html .= '<td>' . number_format($item['tipo_iva'], 2) . '</td>';
                $html .= '<td>' . number_format($total_linea, 2) . ' €</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody>';
            $html .= '</table>';

            $html .= '<p><strong>Base Imponible:</strong> ' . number_format($factura['base_imponible'], 2) . ' €</p>';
            $html .= '<p><strong>IVA Total:</strong> ' . number_format($factura['iva_total'], 2) . ' €</p>
';
            $html .= '<p><strong>Total Factura:</strong> ' . number_format($factura['total'], 2) . ' €</p>';

            // Instanciar y configurar Dompdf
            require_once __DIR__ . '/../vendor/autoload.php';
            use Dompdf\Dompdf;
            use Dompdf\Options;

            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', true);
            $dompdf = new Dompdf($options);

            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            // Enviar PDF al navegador
            $dompdf->stream("factura_" . $factura['numero_factura'] . ".pdf", array("Attachment" => false));

        } catch (Exception $e) {
            die("Error al generar PDF: " . $e->getMessage());
        } finally {
            if(isset($stmt_factura)) $stmt_factura->close();
            if(isset($stmt_items)) $stmt_items->close();
            $conexion->close();
        }
        exit(); // Importante para que no se envíe más JSON

    case 'getFactura':
        $id = $_GET['id'] ?? 0;
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID de factura no proporcionado.']);
            exit();
        }

        $conexion = conectarDB();
        try {
            // Obtener datos de la factura
            $sql_factura = "SELECT f.*, c.nombre as cliente_nombre, c.nie, c.telefono, c.direccion 
                            FROM facturas f 
                            JOIN clientes c ON f.cliente_id = c.id 
                            WHERE f.id = ? AND f.empresa_id = ?";
            $stmt_factura = $conexion->prepare($sql_factura);
            $stmt_factura->bind_param("ii", $id, $empresa_id);
            $stmt_factura->execute();
            $factura = $stmt_factura->get_result()->fetch_assoc();

            if (!$factura) {
                throw new Exception('Factura no encontrada o sin permiso.');
            }

            // Obtener items de la factura
            $sql_items = "SELECT descripcion, cantidad, precio_unitario, tipo_iva FROM factura_items WHERE factura_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            $factura['lineas'] = $items;

            echo json_encode(['success' => true, 'data' => $factura]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_factura)) $stmt_factura->close();
            if(isset($stmt_items)) $stmt_items->close();
            $conexion->close();
        }
        break;

    case 'getFacturasEmitidas':
        try {
            $conexion = conectarDB();
            $sql = "SELECT f.id, f.numero_factura, f.fecha_emision, c.nombre as cliente_nombre 
                    FROM facturas f
                    JOIN clientes c ON f.cliente_id = c.id
                    WHERE f.empresa_id = ? AND f.estado = 'emitida'
                    ORDER BY f.fecha_emision DESC";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $facturas = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            $conexion->close();

            echo json_encode(['success' => true, 'data' => $facturas]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Acción no reconocida']);
        break;
}

?>
