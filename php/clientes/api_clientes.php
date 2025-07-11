<?php
require_once __DIR__ . '/../config.php';

session_start();

header('Content-Type: application/json');

$response = ['success' => false, 'error' => 'Acción no válida'];

// Verificar que el usuario haya iniciado sesión
if (!isset($_SESSION['empresa_id'])) {
    $response['error'] = 'Usuario no autenticado. Por favor, inicie sesión.';
    echo json_encode($response);
    exit();
}

$empresa_id = $_SESSION['empresa_id'];

if (isset($_GET['accion'])) {
    $accion = $_GET['accion'];

    if ($accion == 'crear') {
        $nombre = $_POST['nombre'] ?? '';
        $telefono = $_POST['telefono'] ?? '';
        $dni_nie = $_POST['dni_nie'] ?? null;
        $direccion = $_POST['direccion'] ?? null;
        $email = $_POST['email'] ?? null;

        if (empty($nombre) || empty($telefono)) {
            $response['error'] = 'Nombre y teléfono son campos obligatorios.';
            echo json_encode($response);
            exit();
        }

        $conexion = conectarDB();
        try {
            // Verificar si el teléfono o DNI/NIE ya existen para esta empresa
            $sql_check = "SELECT id FROM clientes WHERE empresa_id = ? AND (telefono = ? OR (dni_nie IS NOT NULL AND dni_nie = ?))";
            $stmt_check = $conexion->prepare($sql_check);
            $stmt_check->bind_param("iss", $empresa_id, $telefono, $dni_nie);
            $stmt_check->execute();
            $result_check = $stmt_check->get_result();

            if ($result_check->num_rows > 0) {
                $response['error'] = 'Ya existe un cliente con este teléfono o DNI/NIE para tu empresa.';
                echo json_encode($response);
                exit();
            }

            $sql = "INSERT INTO clientes (empresa_id, nombre, telefono, dni_nie, direccion, email) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("isssss", $empresa_id, $nombre, $telefono, $dni_nie, $direccion, $email);

            if ($stmt->execute()) {
                $response['success'] = true;
                $response['message'] = 'Cliente creado con éxito.';
            } else {
                $response['error'] = 'Error al crear el cliente: ' . $stmt->error;
            }

        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        } finally {
            if (isset($stmt)) $stmt->close();
            if (isset($stmt_check)) $stmt_check->close();
            $conexion->close();
        }
    }
    } elseif ($accion == 'buscar') {
        $term = $_GET['term'] ?? '';

        if (empty($term)) {
            $response['error'] = 'Término de búsqueda es obligatorio.';
            echo json_encode($response);
            exit();
        }

        $conexion = conectarDB();
        try {
            // Buscar cliente por teléfono o DNI/NIE
            $sql_cliente = "SELECT id, nombre, telefono, dni_nie, direccion, email FROM clientes WHERE empresa_id = ? AND (telefono = ? OR dni_nie = ?)";
            $stmt_cliente = $conexion->prepare($sql_cliente);
            $stmt_cliente->bind_param("iss", $empresa_id, $term, $term);
            $stmt_cliente->execute();
            $result_cliente = $stmt_cliente->get_result();

            if ($result_cliente->num_rows > 0) {
                $cliente = $result_cliente->fetch_assoc();
                $cliente_id = $cliente['id'];

                // Obtener facturas del cliente
                $sql_facturas = "SELECT id, fecha, monto, estado FROM facturas WHERE cliente_id = ? ORDER BY fecha DESC";
                $stmt_facturas = $conexion->prepare($sql_facturas);
                $stmt_facturas->bind_param("i", $cliente_id);
                $stmt_facturas->execute();
                $facturas = $stmt_facturas->get_result()->fetch_all(MYSQLI_ASSOC);

                // Obtener albaranes del cliente
                $sql_albaranes = "SELECT id, fecha, descripcion FROM albaranes WHERE cliente_id = ? ORDER BY fecha DESC";
                $stmt_albaranes = $conexion->prepare($sql_albaranes);
                $stmt_albaranes->bind_param("i", $cliente_id);
                $stmt_albaranes->execute();
                $albaranes = $stmt_albaranes->get_result()->fetch_all(MYSQLI_ASSOC);

                // Obtener presupuestos del cliente
                $sql_presupuestos = "SELECT id, fecha, monto_estimado, estado FROM presupuestos WHERE cliente_id = ? ORDER BY fecha DESC";
                $stmt_presupuestos = $conexion->prepare($sql_presupuestos);
                $stmt_presupuestos->bind_param("i", $cliente_id);
                $stmt_presupuestos->execute();
                $presupuestos = $stmt_presupuestos->get_result()->fetch_all(MYSQLI_ASSOC);

                $response['success'] = true;
                $response['cliente'] = $cliente;
                $response['facturas'] = $facturas;
                $response['albaranes'] = $albaranes;
                $response['presupuestos'] = $presupuestos;

            } else {
                $response['error'] = 'Cliente no encontrado.';
            }

        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        } finally {
            if (isset($stmt_cliente)) $stmt_cliente->close();
            if (isset($stmt_facturas)) $stmt_facturas->close();
            if (isset($stmt_albaranes)) $stmt_albaranes->close();
            if (isset($stmt_presupuestos)) $stmt_presupuestos->close();
            $conexion->close();
        }
    } elseif ($accion == 'leer_todos') {
        $conexion = conectarDB();
        try {
            $sql = "SELECT id, nombre FROM clientes WHERE empresa_id = ? ORDER BY nombre ASC";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();

            $clientes = [];
            while ($row = $result->fetch_assoc()) {
                $clientes[] = $row;
            }

            $response['success'] = true;
            $response['clientes'] = $clientes;

        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        } finally {
            if (isset($stmt)) $stmt->close();
            $conexion->close();
        }
    }
}

echo json_encode($response);
?>