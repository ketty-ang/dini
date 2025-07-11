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
            $sql = "SELECT a.id, a.numero_albaran, a.fecha_emision, a.estado, c.nombre as cliente_nombre 
                    FROM albaranes a
                    JOIN clientes c ON a.cliente_id = c.id
                    WHERE a.empresa_id = ? 
                    ORDER BY a.fecha_emision DESC";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $albaranes = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            $conexion->close();

            echo json_encode(['success' => true, 'data' => $albaranes]);

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
            // Generar número de albarán (ej. ALB-2025-001)
            $year = date('Y');
            $sql_count = "SELECT COUNT(*) as count FROM albaranes WHERE empresa_id = ? AND YEAR(fecha_emision) = ?";
            $stmt_count = $conexion->prepare($sql_count);
            $stmt_count->bind_param("is", $empresa_id, $year);
            $stmt_count->execute();
            $count = $stmt_count->get_result()->fetch_assoc()['count'] + 1;
            $numero_albaran = "ALB-" . $year . "-" . str_pad($count, 3, '0', STR_PAD_LEFT);

            // Insertar albarán principal
            $sql = "INSERT INTO albaranes (empresa_id, cliente_id, numero_albaran, fecha_emision, notas, estado) VALUES (?, ?, ?, ?, ?, 'borrador')";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("iisss", $empresa_id, $input['cliente_id'], $numero_albaran, $input['fecha_emision'], $input['notas']);
            $stmt->execute();
            $albaran_id = $conexion->insert_id;

            // Insertar líneas de items
            $sql_item = "INSERT INTO albaran_items (albaran_id, descripcion, cantidad) VALUES (?, ?, ?)";
            $stmt_item = $conexion->prepare($sql_item);
            foreach ($input['lineas'] as $linea) {
                $stmt_item->bind_param("isd", $albaran_id, $linea['descripcion'], $linea['cantidad']);
                $stmt_item->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Albarán creado con éxito']);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            if(isset($stmt_count)) $stmt_count->close();
            if(isset($stmt)) $stmt->close();
            if(isset($stmt_item)) $stmt_item->close();
            $conexion->close();
        }
        break;

    case 'crearDesdePresupuesto':
        $presupuesto_id = $_GET['presupuesto_id'] ?? 0;
        if (!$presupuesto_id) {
            echo json_encode(['success' => false, 'error' => 'ID de presupuesto no proporcionado']);
            exit();
        }

        $conexion = conectarDB();
        $conexion->begin_transaction();

        try {
            // 1. Obtener datos del presupuesto y verificar pertenencia
            $sql_presupuesto = "SELECT * FROM presupuestos WHERE id = ? AND empresa_id = ?";
            $stmt_presupuesto = $conexion->prepare($sql_presupuesto);
            $stmt_presupuesto->bind_param("ii", $presupuesto_id, $empresa_id);
            $stmt_presupuesto->execute();
            $presupuesto = $stmt_presupuesto->get_result()->fetch_assoc();

            if (!$presupuesto || $presupuesto['estado'] !== 'aceptado') {
                throw new Exception('Presupuesto no encontrado, no pertenece a la empresa o no está aceptado.');
            }

            // 2. Obtener items del presupuesto
            $sql_items = "SELECT * FROM presupuesto_items WHERE presupuesto_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $presupuesto_id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            // 3. Generar número de albarán
            $year = date('Y');
            $sql_count = "SELECT COUNT(*) as count FROM albaranes WHERE empresa_id = ? AND YEAR(fecha_emision) = ?";
            $stmt_count = $conexion->prepare($sql_count);
            $stmt_count->bind_param("is", $empresa_id, $year);
            $stmt_count->execute();
            $count = $stmt_count->get_result()->fetch_assoc()['count'] + 1;
            $numero_albaran = "ALB-" . $year . "-" . str_pad($count, 3, '0', STR_PAD_LEFT);

            // 4. Insertar albarán principal
            $sql_insert = "INSERT INTO albaranes (empresa_id, cliente_id, presupuesto_id, numero_albaran, fecha_emision, notas, estado) VALUES (?, ?, ?, ?, CURDATE(), ?, 'borrador')";
            $stmt_insert = $conexion->prepare($sql_insert);
            $stmt_insert->bind_param("iiiss", $empresa_id, $presupuesto['cliente_id'], $presupuesto_id, $numero_albaran, $presupuesto['notas']);
            $stmt_insert->execute();
            $albaran_id = $conexion->insert_id;

            // 5. Insertar líneas de items
            $sql_item_insert = "INSERT INTO albaran_items (albaran_id, descripcion, cantidad) VALUES (?, ?, ?)";
            $stmt_item_insert = $conexion->prepare($sql_item_insert);
            foreach ($items as $linea) {
                $stmt_item_insert->bind_param("isd", $albaran_id, $linea['descripcion'], $linea['cantidad']);
                $stmt_item_insert->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Albarán creado desde presupuesto', 'new_albaran_id' => $albaran_id]);

        } catch (Exception $e) {
            $conexion->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        } finally {
            // Cerrar todos los statements
            if(isset($stmt_presupuesto)) $stmt_presupuesto->close();
            if(isset($stmt_items)) $stmt_items->close();
            if(isset($stmt_count)) $stmt_count->close();
            if(isset($stmt_insert)) $stmt_insert->close();
            if(isset($stmt_item_insert)) $stmt_item_insert->close();
            $conexion->close();
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
            // Seguridad: Verificar que el albarán pertenece a la empresa
            $sql_check = "SELECT id FROM albaranes WHERE id = ? AND empresa_id = ?";
            $stmt_check = $conexion->prepare($sql_check);
            $stmt_check->bind_param("ii", $id, $empresa_id);
            $stmt_check->execute();
            if ($stmt_check->get_result()->num_rows === 0) {
                throw new Exception('Permiso denegado o albarán no encontrado.');
            }

            // Actualizar albarán principal
            $sql_update = "UPDATE albaranes SET cliente_id = ?, fecha_emision = ?, notas = ? WHERE id = ?";
            $stmt_update = $conexion->prepare($sql_update);
            $stmt_update->bind_param("issi", $input['cliente_id'], $input['fecha_emision'], $input['notas'], $id);
            $stmt_update->execute();

            // Borrar líneas de items antiguas
            $sql_delete_items = "DELETE FROM albaran_items WHERE albaran_id = ?";
            $stmt_delete = $conexion->prepare($sql_delete_items);
            $stmt_delete->bind_param("i", $id);
            $stmt_delete->execute();

            // Insertar líneas de items nuevas
            $sql_item = "INSERT INTO albaran_items (albaran_id, descripcion, cantidad) VALUES (?, ?, ?)";
            $stmt_item = $conexion->prepare($sql_item);
            foreach ($input['lineas'] as $linea) {
                $stmt_item->bind_param("isd", $id, $linea['descripcion'], $linea['cantidad']);
                $stmt_item->execute();
            }

            $conexion->commit();
            echo json_encode(['success' => true, 'message' => 'Albarán actualizado con éxito']);

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

    case 'getAlbaran':
        $id = $_GET['id'] ?? 0;
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID no proporcionado']);
            exit();
        }

        $conexion = conectarDB();
        try {
            $sql = "SELECT * FROM albaranes WHERE id = ? AND empresa_id = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $albaran = $stmt->get_result()->fetch_assoc();

            if (!$albaran) {
                throw new Exception('Albarán no encontrado o sin permiso.');
            }

            $sql_items = "SELECT * FROM albaran_items WHERE albaran_id = ?";
            $stmt_items = $conexion->prepare($sql_items);
            $stmt_items->bind_param("i", $id);
            $stmt_items->execute();
            $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

            $albaran['lineas'] = $items;

            echo json_encode(['success' => true, 'data' => $albaran]);

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
            // Seguridad: Verificar que el albarán pertenece a la empresa
            $sql_check = "SELECT id FROM albaranes WHERE id = ? AND empresa_id = ?";
            $stmt_check = $conexion->prepare($sql_check);
            $stmt_check->bind_param("ii", $id, $empresa_id);
            $stmt_check->execute();
            if ($stmt_check->get_result()->num_rows === 0) {
                throw new Exception('Permiso denegado o albarán no encontrado.');
            }

            $sql = "DELETE FROM albaranes WHERE id = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $id);
            $stmt->execute();

            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Albarán eliminado']);
            } else {
                throw new Exception('No se pudo eliminar el albarán.');
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
