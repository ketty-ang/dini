<?php
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
            $sql = "SELECT p.id, p.numero_presupuesto, p.fecha_emision, p.total, p.estado, c.nombre as cliente_nombre 
                    FROM presupuestos p
                    JOIN clientes c ON p.cliente_id = c.id
                    WHERE p.empresa_id = ? 
                    ORDER BY p.fecha_emision DESC";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $presupuestos = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            $conexion->close();

            echo json_encode(['success' => true, 'data' => $presupuestos]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
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

            // 2. Generar número de presupuesto (ej. PRE-2025-001)
            $year = date('Y');
            $sql_count = "SELECT COUNT(*) as count FROM presupuestos WHERE empresa_id = ? AND YEAR(fecha_emision) = ?";
            $stmt_count = $conexion->prepare($sql_count);
            $stmt_count->bind_param("is", $empresa_id, $year);
            $stmt_count->execute();
            $count = $stmt_count->get_result()->fetch_assoc()['count'] + 1;
            $numero_presupuesto = "PRE-" . $year . "-" . str_pad($count, 3, '0', STR_PAD_LEFT);

            // 3. Insertar presupuesto principal
            $sql = "INSERT INTO presupuestos (empresa_id, cliente_id, numero_presupuesto, fecha_emision, fecha_validez, base_imponible, iva_total, total, notas, estado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador')";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("iisssddds", 
                $empresa_id, 
                $input['cliente_id'], 
                $numero_presupuesto, 
                $input['fecha_emision'], 
                $input['fecha_validez'], 
                $base_imponible, 
                $iva_total, 
                $total, 
                $input['notas']
            );
            $stmt->execute();
            $presupuesto_id = $conexion->insert_id;

            // 4. Insertar líneas de items
            $sql_item = "INSERT INTO presupuesto_items (presupuesto_id, descripcion, cantidad, precio_unitario, tipo_iva) VALUES (?, ?, ?, ?, ?)";
            $stmt_item = $conexion->prepare($sql_item);
            foreach ($input['lineas'] as $linea) {
                $stmt_item->bind_param("isddd", 
                    $presupuesto_id, 
                    $linea['descripcion'], 
                    $linea['cantidad'], 
                    $linea['precio_unitario'], 
                    $linea['tipo_iva']
                );
                $stmt_item->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Presupuesto creado con éxito']);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'actualizar':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? 0;

        if (!$id || empty($input['cliente_id']) || empty($input['fecha_emision']) || empty($input['lineas'])) {
            echo json_encode(['success' => false, 'error' => 'Faltan datos obligatorios.']);
            exit();
        }

        $conexion = conectarDB();
        $conexion->begin_transaction();

        try {
            // Seguridad: Verificar que el presupuesto pertenece a la empresa
            $sql_check = "SELECT id FROM presupuestos WHERE id = ? AND empresa_id = ?";
            $stmt_check = $conexion->prepare($sql_check);
            $stmt_check->bind_param("ii", $id, $empresa_id);
            $stmt_check->execute();
            if ($stmt_check->get_result()->num_rows === 0) {
                throw new Exception('Permiso denegado o presupuesto no encontrado.');
            }

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

            // 2. Actualizar presupuesto principal
            $sql_update = "UPDATE presupuestos SET cliente_id = ?, fecha_emision = ?, fecha_validez = ?, base_imponible = ?, iva_total = ?, total = ?, notas = ? WHERE id = ?";
            $stmt_update = $conexion->prepare($sql_update);
            $stmt_update->bind_param("issdddsi", 
                $input['cliente_id'], 
                $input['fecha_emision'], 
                $input['fecha_validez'], 
                $base_imponible, 
                $iva_total, 
                $total, 
                $input['notas'],
                $id
            );
            $stmt_update->execute();

            // 3. Borrar líneas de items antiguas
            $sql_delete_items = "DELETE FROM presupuesto_items WHERE presupuesto_id = ?";
            $stmt_delete = $conexion->prepare($sql_delete_items);
            $stmt_delete->bind_param("i", $id);
            $stmt_delete->execute();

            // 4. Insertar líneas de items nuevas
            $sql_item = "INSERT INTO presupuesto_items (presupuesto_id, descripcion, cantidad, precio_unitario, tipo_iva) VALUES (?, ?, ?, ?, ?)";
            $stmt_item = $conexion->prepare($sql_item);
            foreach ($input['lineas'] as $linea) {
                $stmt_item->bind_param("isddd", $id, $linea['descripcion'], $linea['cantidad'], $linea['precio_unitario'], $linea['tipo_iva']);
                $stmt_item->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Presupuesto actualizado con éxito']);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_check)) $stmt_check->close();
            if(isset($stmt_update)) $stmt_update->close();
            if(isset($stmt_delete)) $stmt_delete->close();
            if(isset($stmt_item)) $stmt_item->close();
            $conexion->close();
        }
        break;

    case 'getPresupuesto':
        $id = $_GET['id'] ?? 0;
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID no proporcionado']);
            exit();
        }

        $conexion = conectarDB();
        try {
            $sql = "SELECT * FROM presupuestos WHERE id = ? AND empresa_id = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $presupuesto = $stmt->get_result()->fetch_assoc();

            if (!$presupuesto) {
                throw new Exception('Presupuesto no encontrado o sin permiso.');
            }

            $sql_items = "SELECT * FROM presupuesto_items WHERE presupuesto_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            $presupuesto['lineas'] = $items;

            echo json_encode(['success' => true, 'data' => $presupuesto]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt)) $stmt->close();
            if(isset($stmt_items)) $stmt_items->close();
            $conexion->close();
        }
        break;

    case 'eliminar':
        $id = $_GET['id'] ?? 0;
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID no proporcionado']);
            exit();
        }

        $conexion = conectarDB();
        try {
            // Seguridad: Verificar que el presupuesto pertenece a la empresa
            $sql_check = "SELECT id FROM presupuestos WHERE id = ? AND empresa_id = ?";
            $stmt_check = $conexion->prepare($sql_check);
            $stmt_check->bind_param("ii", $id, $empresa_id);
            $stmt_check->execute();
            if ($stmt_check->get_result()->num_rows === 0) {
                throw new Exception('Permiso denegado o presupuesto no encontrado.');
            }

            $sql = "DELETE FROM presupuestos WHERE id = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $id);
            $stmt->execute();

            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Presupuesto eliminado']);
            } else {
                throw new Exception('No se pudo eliminar el presupuesto.');
            }

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_check)) $stmt_check->close();
            if(isset($stmt)) $stmt->close();
            $conexion->close();
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Acción no reconocida']);
        break;
}

?>
