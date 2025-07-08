<?php

require_once 'config.php';

header('Content-Type: application/json');

session_start(); // Iniciar sesión

$response = [
    'success' => false,
    'message' => 'Petición no válida',
    'data' => null
];

// Verificar si el usuario está autenticado
if (!isset($_SESSION['user_id']) || !isset($_SESSION['empresa_id']) || !isset($_SESSION['plan_type'])) {
    $response['message'] = 'Acceso denegado. No autenticado o sesión incompleta.';
    echo json_encode($response);
    exit();
}

$empresa_id_actual = $_SESSION['empresa_id']; 
$plan_type_actual = $_SESSION['plan_type'];

// Función para verificar si el plan permite una característica
function checkPlanFeature($feature) {
    global $plan_type_actual;

    $features_by_plan = [
        'basico' => [
            'max_avisos_anual' => 12,
            'max_productos_servicios' => 5,
            'max_reportes_financieros' => 1,
            'adjuntar_fotos' => false,
            'chat_tecnicos' => false,
            'exportacion_datos' => false
        ],
        'profesional' => [
            'max_avisos_anual' => 500,
            'max_productos_servicios' => 50,
            'max_reportes_financieros' => 12,
            'adjuntar_fotos' => true,
            'chat_tecnicos' => true,
            'exportacion_datos' => true
        ],
        'ultimate' => [
            'max_avisos_anual' => -1, // Ilimitado
            'max_productos_servicios' => -1, // Ilimitado
            'max_reportes_financieros' => -1, // Ilimitado
            'adjuntar_fotos' => true,
            'chat_tecnicos' => true,
            'exportacion_datos' => true
        ]
    ];

    if (isset($features_by_plan[$plan_type_actual][$feature])) {
        return $features_by_plan[$plan_type_actual][$feature];
    }
    return false; // Característica no definida para el plan
}

// Conectar a la base de datos
$conexion = conectarDB();

if (!$conexion) {
    $response['message'] = 'Error al conectar con la base de datos.';
    echo json_encode($response);
    exit();
}

if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];

    switch ($action) {
        case 'getAvisos':
            $dateFilter = $_GET['date'] ?? '';
            $searchTerm = $_GET['term'] ?? ''; 

            $sql = "SELECT 
                        a.id, 
                        a.descripcion, 
                        a.estado, 
                        a.fecha_servicio, 
                        c.nombre AS cliente_nombre, 
                        c.telefono AS cliente_telefono,
                        u.username AS tecnico_asignado_nombre,
                        a.prioridad
                    FROM 
                        avisos a
                    JOIN 
                        clientes c ON a.cliente_id = c.id
                    LEFT JOIN
                        usuarios u ON a.tecnico_asignado_id = u.id
                    WHERE 
                        a.empresa_id = ?";
            
            $params = "i";
            $values = [$empresa_id_actual];

            if (!empty($dateFilter)) {
                $sql .= " AND a.fecha_servicio = ?";
                $params .= "s";
                $values[] = $dateFilter;
            }

            if (!empty($searchTerm)) {
                $searchTermLike = '%' . $searchTerm . '%';
                $sql .= " AND (c.telefono LIKE ? OR c.nie LIKE ?)";
                $params .= "ss";
                $values[] = $searchTermLike;
                $values[] = $searchTermLike;
            }

            $sql .= " ORDER BY a.fecha_servicio DESC, a.id DESC";
            
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param($params, ...$values);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $avisos = [];
            while ($row = $result->fetch_assoc()) {
                $fecha_formateada = date('d/m/Y', strtotime($row['fecha_servicio']));
                $row['fecha'] = $fecha_formateada;
                $row['cliente'] = $row['cliente_nombre'];
                $row['telefono'] = $row['cliente_telefono'];
                $row['tecnico_asignado'] = $row['tecnico_asignado_nombre'] ?? 'N/A';
                unset($row['cliente_nombre']);
                unset($row['cliente_telefono']);
                unset($row['tecnico_asignado_nombre']);
                $avisos[] = $row;
            }
            
            $response['success'] = true;
            $response['message'] = 'Avisos obtenidos correctamente.';
            $response['data'] = $avisos;
            break;

        case 'getAvisoDetalle':
            $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            if ($id > 0) {
                $sql = "SELECT 
                            a.id, 
                            a.descripcion, 
                            a.estado, 
                            a.fecha_servicio, 
                            a.tecnico_asignado_id, 
                            a.prioridad, 
                            c.nombre AS cliente_nombre, 
                            c.telefono AS cliente_telefono, 
                            c.direccion AS cliente_direccion,
                            c.nie AS cliente_nie,
                            u.username AS tecnico_asignado_nombre
                        FROM 
                            avisos a
                        JOIN 
                            clientes c ON a.cliente_id = c.id
                        LEFT JOIN
                            usuarios u ON a.tecnico_asignado_id = u.id
                        WHERE 
                            a.id = ? AND a.empresa_id = ?";
                
                $stmt = $conexion->prepare($sql);
                $stmt->bind_param("ii", $id, $empresa_id_actual);
                $stmt->execute();
                $result = $stmt->get_result();
                $aviso = $result->fetch_assoc();

                if ($aviso) {
                    $aviso['fecha'] = date('d/m/Y', strtotime($aviso['fecha_servicio']));
                    $aviso['cliente'] = $aviso['cliente_nombre'];
                    $aviso['telefono'] = $aviso['cliente_telefono'];
                    $aviso['direccion'] = $aviso['cliente_direccion'];
                    $aviso['nie'] = $aviso['cliente_nie'];
                    
                    unset($aviso['cliente_nombre']);
                    unset($aviso['cliente_telefono']);
                    unset($aviso['cliente_direccion']);
                    unset($aviso['nie']);

                    // Obtener fotos del aviso
                    $sql_fotos = "SELECT ruta_imagen FROM aviso_fotos WHERE aviso_id = ?";
                    $stmt_fotos = $conexion->prepare($sql_fotos);
                    $stmt_fotos->bind_param("i", $id);
                    $stmt_fotos->execute();
                    $result_fotos = $stmt_fotos->get_result();
                    $fotos = [];
                    while ($row_foto = $result_fotos->fetch_assoc()) {
                        $fotos[] = $row_foto['ruta_imagen'];
                    }
                    $aviso['fotos'] = $fotos;

                    // Obtener historial de estados
                    $sql_historial = "SELECT estado_nuevo, descripcion_cambio, fecha_cambio FROM aviso_historial_estados WHERE aviso_id = ? ORDER BY fecha_cambio DESC";
                    $stmt_historial = $conexion->prepare($sql_historial);
                    $stmt_historial->bind_param("i", $id);
                    $stmt_historial->execute();
                    $result_historial = $stmt_historial->get_result();
                    $historial = [];
                    while ($row_historial = $result_historial->fetch_assoc()) {
                        $historial[] = $row_historial;
                    }
                    $aviso['historial_estados'] = $historial;

                    $response['success'] = true;
                    $response['message'] = 'Detalle de aviso obtenido correctamente.';
                    $response['data'] = $aviso;
                } else {
                    $response['message'] = 'Aviso no encontrado o no pertenece a la empresa.';
                }
            } else {
                $response['message'] = 'ID de aviso no proporcionado o inválido.';
            }
            break;

        case 'crearAviso':
            // Comprobar límite de avisos para planes Básico y Profesional
            $max_avisos = checkPlanFeature('max_avisos_anual');
            if ($max_avisos !== -1) { // -1 significa ilimitado
                $current_year = date('Y');
                $sql_count_avisos = "SELECT COUNT(*) AS total_avisos FROM avisos WHERE empresa_id = ? AND YEAR(fecha_creacion) = ?";
                $stmt_count_avisos = $conexion->prepare($sql_count_avisos);
                $stmt_count_avisos->bind_param("ii", $empresa_id_actual, $current_year);
                $stmt_count_avisos->execute();
                $result_count_avisos = $stmt_count_avisos->get_result();
                $row_count_avisos = $result_count_avisos->fetch_assoc();
                
                if ($row_count_avisos['total_avisos'] >= $max_avisos) {
                    $response['message'] = 'Límite de avisos anuales alcanzado para su plan (Máx: ' . $max_avisos . '). Actualice su plan para crear más avisos.';
                    break;
                }
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $nombre = $conexion->real_escape_string($input['nombre']);
            $telefono = $conexion->real_escape_string($input['telefono']);
            $nie = $conexion->real_escape_string($input['nie']);
            $direccion = $conexion->real_escape_string($input['direccion']);
            $descripcion = $conexion->real_escape_string($input['descripcion']);
            $fecha_servicio = $conexion->real_escape_string($input['fecha_servicio']);
            $estado = $conexion->real_escape_string($input['estado']);
            $tecnico_asignado_id = isset($input['tecnico_asignado_id']) && $input['tecnico_asignado_id'] !== '' ? intval($input['tecnico_asignado_id']) : NULL;
            $prioridad = $conexion->real_escape_string($input['prioridad'] ?? 'media');

            $cliente_id = 0;

            $sql_cliente = "SELECT id FROM clientes WHERE (telefono = ? OR nie = ?) AND empresa_id = ? LIMIT 1";
            $stmt_cliente = $conexion->prepare($sql_cliente);
            $stmt_cliente->bind_param("ssi", $telefono, $nie, $empresa_id_actual);
            $stmt_cliente->execute();
            $result_cliente = $stmt_cliente->get_result();

            if ($result_cliente->num_rows > 0) {
                $cliente_id = $result_cliente->fetch_assoc()['id'];
            } else {
                $sql_insert_cliente = "INSERT INTO clientes (empresa_id, nombre, telefono, nie, direccion) VALUES (?, ?, ?, ?, ?)";
                $stmt_insert_cliente = $conexion->prepare($sql_insert_cliente);
                $stmt_insert_cliente->bind_param("issss", $empresa_id_actual, $nombre, $telefono, $nie, $direccion);
                
                if ($stmt_insert_cliente->execute()) {
                    $cliente_id = $conexion->insert_id;
                } else {
                    $response['message'] = 'Error al crear el cliente: ' . $stmt_insert_cliente->error;
                    break;
                }
            }

            if ($cliente_id > 0) {
                $sql_insert_aviso = "INSERT INTO avisos (empresa_id, cliente_id, descripcion, fecha_servicio, estado, tecnico_asignado_id, prioridad) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt_insert_aviso = $conexion->prepare($sql_insert_aviso);
                $stmt_insert_aviso->bind_param("iisssis", $empresa_id_actual, $cliente_id, $descripcion, $fecha_servicio, $estado, $tecnico_asignado_id, $prioridad);

                if ($stmt_insert_aviso->execute()) {
                    $response['success'] = true;
                    $response['message'] = 'Aviso creado con éxito.';
                } else {
                    $response['message'] = 'Error al crear el aviso: ' . $stmt_insert_aviso->error;
                }
            } else {
                $response['message'] = 'No se pudo obtener o crear el ID del cliente.';
            }
            break;

        case 'editarAviso':
            $input = json_decode(file_get_contents('php://input'), true);

            $aviso_id = intval($input['id']);
            $cliente_id = intval($input['cliente_id']);
            $nombre = $conexion->real_escape_string($input['nombre']);
            $telefono = $conexion->real_escape_string($input['telefono']);
            $nie = $conexion->real_escape_string($input['nie']);
            $direccion = $conexion->real_escape_string($input['direccion']);
            $descripcion = $conexion->real_escape_string($input['descripcion']);
            $fecha_servicio = $conexion->real_escape_string($input['fecha_servicio']);
            $estado_nuevo = $conexion->real_escape_string($input['estado']);
            $estado_anterior = $conexion->real_escape_string($input['estado_anterior'] ?? '');
            $motivo_cambio = $conexion->real_escape_string($input['motivo_cambio'] ?? '');
            $tecnico_asignado_id = isset($input['tecnico_asignado_id']) && $input['tecnico_asignado_id'] !== '' ? intval($input['tecnico_asignado_id']) : NULL;
            $prioridad = $conexion->real_escape_string($input['prioridad'] ?? 'media');

            $conexion->begin_transaction();

            try {
                $sql_update_cliente = "UPDATE clientes SET nombre = ?, telefono = ?, nie = ?, direccion = ? WHERE id = ? AND empresa_id = ?";
                $stmt_update_cliente = $conexion->prepare($sql_update_cliente);
                $stmt_update_cliente->bind_param("ssssii", $nombre, $telefono, $nie, $direccion, $cliente_id, $empresa_id_actual);
                $stmt_update_cliente->execute();

                $sql_update_aviso = "UPDATE avisos SET descripcion = ?, fecha_servicio = ?, estado = ?, tecnico_asignado_id = ?, prioridad = ? WHERE id = ? AND empresa_id = ?";
                $stmt_update_aviso = $conexion->prepare($sql_update_aviso);
                $stmt_update_aviso->bind_param("sssisii", $descripcion, $fecha_servicio, $estado_nuevo, $tecnico_asignado_id, $prioridad, $aviso_id, $empresa_id_actual);
                $stmt_update_aviso->execute();

                if ($estado_nuevo !== $estado_anterior) {
                    $sql_insert_historial = "INSERT INTO aviso_historial_estados (aviso_id, estado_anterior, estado_nuevo, descripcion_cambio) VALUES (?, ?, ?, ?)";
                    $stmt_insert_historial = $conexion->prepare($sql_insert_historial);
                    $stmt_insert_historial->bind_param("isss", $aviso_id, $estado_anterior, $estado_nuevo, $motivo_cambio);
                    $stmt_insert_historial->execute();
                }

                $conexion->commit();
                $response['success'] = true;
                $response['message'] = 'Aviso actualizado con éxito.';

            } catch (Exception $e) {
                $conexion->rollback();
                $response['message'] = 'Error al actualizar el aviso: ' . $e->getMessage();
            }
            break;

        case 'buscarAvisos':
            $searchTerm = $conexion->real_escape_string($_GET['term'] ?? '');
            
            if (empty($searchTerm)) {
                $sql = "SELECT 
                            a.id, 
                            a.descripcion, 
                            a.estado, 
                            a.fecha_servicio, 
                            c.nombre AS cliente_nombre, 
                            c.telefono AS cliente_telefono,
                            u.username AS tecnico_asignado_nombre,
                            a.prioridad
                        FROM 
                            avisos a
                        JOIN 
                            clientes c ON a.cliente_id = c.id
                        LEFT JOIN
                            usuarios u ON a.tecnico_asignado_id = u.id
                        WHERE 
                            a.empresa_id = ?
                        ORDER BY 
                            a.fecha_servicio DESC, a.id DESC";
                
                $stmt = $conexion->prepare($sql);
                $stmt->bind_param("i", $empresa_id_actual);
            } else {
                $searchTermLike = '%' . $searchTerm . '%';
                $sql = "SELECT 
                            a.id, 
                            a.descripcion, 
                            a.estado, 
                            a.fecha_servicio, 
                            c.nombre AS cliente_nombre, 
                            c.telefono AS cliente_telefono,
                            u.username AS tecnico_asignado_nombre,
                            a.prioridad
                        FROM 
                            avisos a
                        JOIN 
                            clientes c ON a.cliente_id = c.id
                        LEFT JOIN
                            usuarios u ON a.tecnico_asignado_id = u.id
                        WHERE 
                            a.empresa_id = ? AND (c.telefono LIKE ? OR c.nie LIKE ?)
                        ORDER BY 
                            a.fecha_servicio DESC, a.id DESC";
                
                $stmt = $conexion->prepare($sql);
                $stmt->bind_param("iss", $empresa_id_actual, $searchTermLike, $searchTermLike);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            
            $avisos = [];
            while ($row = $result->fetch_assoc()) {
                $fecha_formateada = date('d/m/Y', strtotime($row['fecha_servicio']));
                $row['fecha'] = $fecha_formateada;
                $row['cliente'] = $row['cliente_nombre'];
                $row['telefono'] = $row['cliente_telefono'];
                $row['tecnico_asignado'] = $row['tecnico_asignado_nombre'] ?? 'N/A';
                unset($row['cliente_nombre']);
                unset($row['cliente_telefono']);
                unset($row['tecnico_asignado_nombre']);
                $avisos[] = $row;
            }
            
            $response['success'] = true;
            $response['message'] = 'Avisos encontrados correctamente.';
            $response['data'] = $avisos;
            break;

        case 'getGlobalChatMessages':
            // Comprobar si el plan permite chat entre técnicos
            if (!checkPlanFeature('chat_tecnicos')) {
                $response['message'] = 'Su plan actual no incluye la comunicación entre técnicos. Actualice su plan para acceder a esta función.';
                break;
            }

            $sql = "SELECT remitente, mensaje, fecha_envio FROM global_chat_mensajes WHERE empresa_id = ? ORDER BY fecha_envio ASC";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $empresa_id_actual);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $mensajes = [];
            while ($row = $result->fetch_assoc()) {
                $mensajes[] = $row;
            }
            
            $response['success'] = true;
            $response['message'] = 'Mensajes de chat global obtenidos correctamente.';
            $response['data'] = $mensajes;
            break;

        case 'sendGlobalChatMessage':
            // Comprobar si el plan permite chat entre técnicos
            if (!checkPlanFeature('chat_tecnicos')) {
                $response['message'] = 'Su plan actual no incluye la comunicación entre técnicos. Actualice su plan para acceder a esta función.';
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $remitente = $conexion->real_escape_string($input['remitente']);
            $mensaje = $conexion->real_escape_string($input['mensaje']);

            $sql_insert_mensaje = "INSERT INTO global_chat_mensajes (empresa_id, remitente, mensaje) VALUES (?, ?, ?)";
            $stmt_insert_mensaje = $conexion->prepare($sql_insert_mensaje);
            $stmt_insert_mensaje->bind_param("iss", $empresa_id_actual, $remitente, $mensaje);

            if ($stmt_insert_mensaje->execute()) {
                $response['success'] = true;
                $response['message'] = 'Mensaje global enviado con éxito.';
            } else {
                $response['message'] = 'Error al enviar mensaje global: ' . $stmt_insert_mensaje->error;
            }
            break;

        case 'uploadAvisoPhoto':
            // Comprobar si el plan permite adjuntar fotos
            if (!checkPlanFeature('adjuntar_fotos')) {
                $response['message'] = 'Su plan actual no incluye la opción de adjuntar fotos a los avisos. Actualice su plan para acceder a esta función.';
                break;
            }

            $aviso_id = isset($_POST['aviso_id']) ? intval($_POST['aviso_id']) : 0;

            if ($aviso_id === 0) {
                $response['message'] = 'ID de aviso no proporcionado.';
                break;
            }

            if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
                $response['message'] = 'Error al subir el archivo.';
                break;
            }

            $file_tmp_path = $_FILES['photo']['tmp_name'];
            $file_name = $_FILES['photo']['name'];
            $file_size = $_FILES['photo']['size'];
            $file_type = $_FILES['photo']['type'];
            $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));

            $allowed_ext = ['jpg', 'jpeg', 'png', 'gif'];
            if (!in_array($file_ext, $allowed_ext)) {
                $response['message'] = 'Tipo de archivo no permitido. Solo JPG, JPEG, PNG, GIF.';
                break;
            }

            $new_file_name = uniqid('aviso_') . '.' . $file_ext;
            $upload_dir = '../uploads/avisos/';
            $dest_path = $upload_dir . $new_file_name;

            if (move_uploaded_file($file_tmp_path, $dest_path)) {
                $ruta_imagen_db = 'uploads/avisos/' . $new_file_name;
                $sql_insert_photo = "INSERT INTO aviso_fotos (aviso_id, ruta_imagen) VALUES (?, ?)";
                $stmt_insert_photo = $conexion->prepare($sql_insert_photo);
                $stmt_insert_photo->bind_param("is", $aviso_id, $ruta_imagen_db);

                if ($stmt_insert_photo->execute()) {
                    $response['success'] = true;
                    $response['message'] = 'Foto subida y registrada con éxito.';
                } else {
                    $response['message'] = 'Error al registrar la foto en la base de datos: ' . $stmt_insert_photo->error;
                    unlink($dest_path);
                }
            } else {
                $response['message'] = 'Error al mover el archivo subido.';
            }
            break;

        

        case 'createUser':
            // Solo administradores pueden crear usuarios
            if ($_SESSION['rol'] !== 'admin') {
                $response['message'] = 'Acceso denegado. Solo administradores pueden crear usuarios.';
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $username = $conexion->real_escape_string($input['username']);
            $password = $conexion->real_escape_string($input['password']);
            $rol = $conexion->real_escape_string($input['rol']);

            // Verificar si el nombre de usuario ya existe en esta empresa
            $sql_check_username = "SELECT id FROM usuarios WHERE username = ? AND empresa_id = ?";
            $stmt_check_username = $conexion->prepare($sql_check_username);
            $stmt_check_username->bind_param("si", $username, $empresa_id_actual);
            $stmt_check_username->execute();
            $result_check_username = $stmt_check_username->get_result();

            if ($result_check_username->num_rows > 0) {
                $response['message'] = 'El nombre de usuario ya está en uso en esta empresa.';
                break;
            }

            $hashed_password = password_hash($password, PASSWORD_BCRYPT);

            $sql_insert_user = "INSERT INTO usuarios (empresa_id, username, password, rol) VALUES (?, ?, ?, ?)";
            $stmt_insert_user = $conexion->prepare($sql_insert_user);
            $stmt_insert_user->bind_param("isss", $empresa_id_actual, $username, $hashed_password, $rol);

            if ($stmt_insert_user->execute()) {
                $response['success'] = true;
                $response['message'] = 'Usuario creado con éxito.';
            } else {
                $response['message'] = 'Error al crear el usuario: ' . $stmt_insert_user->error;
            }
            break;

        case 'updateUser':
            // Solo administradores pueden actualizar usuarios
            if ($_SESSION['rol'] !== 'admin') {
                $response['message'] = 'Acceso denegado. Solo administradores pueden actualizar usuarios.';
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $user_id = intval($input['id']);
            $username = $conexion->real_escape_string($input['username']);
            $rol = $conexion->real_escape_string($input['rol']);
            $password = $input['password'] ?? null; // La contraseña es opcional para actualizar

            $sql_update_user = "UPDATE usuarios SET username = ?, rol = ? ";
            $params = "ss";
            $values = [$username, $rol];

            if ($password) {
                $hashed_password = password_hash($password, PASSWORD_BCRYPT);
                $sql_update_user .= ", password = ? ";
                $params .= "s";
                $values[] = $hashed_password;
            }

            $sql_update_user .= " WHERE id = ? AND empresa_id = ?";
            $params .= "ii";
            $values[] = $user_id;
            $values[] = $empresa_id_actual;

            $stmt_update_user = $conexion->prepare($sql_update_user);
            $stmt_update_user->bind_param($params, ...$values);

            if ($stmt_update_user->execute()) {
                $response['success'] = true;
                $response['message'] = 'Usuario actualizado con éxito.';
            } else {
                $response['message'] = 'Error al actualizar el usuario: ' . $stmt_update_user->error;
            }
            break;

        case 'deleteUser':
            // Solo administradores pueden eliminar usuarios
            if ($_SESSION['rol'] !== 'admin') {
                $response['message'] = 'Acceso denegado. Solo administradores pueden eliminar usuarios.';
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $user_id = intval($input['id']);

            // No permitir que un usuario se elimine a sí mismo
            if ($user_id === $_SESSION['user_id']) {
                $response['message'] = 'No puedes eliminar tu propia cuenta.';
                break;
            }

            $sql_delete_user = "DELETE FROM usuarios WHERE id = ? AND empresa_id = ?";
            $stmt_delete_user = $conexion->prepare($sql_delete_user);
            $stmt_delete_user->bind_param("ii", $user_id, $empresa_id_actual);

            if ($stmt_delete_user->execute()) {
                $response['success'] = true;
                $response['message'] = 'Usuario eliminado con éxito.';
            } else {
                $response['message'] = 'Error al eliminar el usuario: ' . $stmt_delete_user->error;
            }
            break;

        

        case 'createProductoServicio':
            // Comprobar límite de productos/servicios para planes Básico y Profesional
            $max_productos_servicios = checkPlanFeature('max_productos_servicios');
            if ($max_productos_servicios !== -1) { // -1 significa ilimitado
                $sql_count_ps = "SELECT COUNT(*) AS total_ps FROM productos_servicios WHERE empresa_id = ?";
                $stmt_count_ps = $conexion->prepare($sql_count_ps);
                $stmt_count_ps->bind_param("i", $empresa_id_actual);
                $stmt_count_ps->execute();
                $result_count_ps = $stmt_count_ps->get_result();
                $row_count_ps = $result_count_ps->fetch_assoc();
                
                if ($row_count_ps['total_ps'] >= $max_productos_servicios) {
                    $response['message'] = 'Límite de productos/servicios alcanzado para su plan (Máx: ' . $max_productos_servicios . '). Actualice su plan para crear más.';
                    break;
                }
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $nombre = $conexion->real_escape_string($input['nombre']);
            $descripcion = $conexion->real_escape_string($input['descripcion'] ?? '');
            $precio = floatval($input['precio']);
            $tipo = $conexion->real_escape_string($input['tipo']);

            $sql_insert_ps = "INSERT INTO productos_servicios (empresa_id, nombre, descripcion, precio, tipo) VALUES (?, ?, ?, ?, ?)";
            $stmt_insert_ps = $conexion->prepare($sql_insert_ps);
            $stmt_insert_ps->bind_param("issds", $empresa_id_actual, $nombre, $descripcion, $precio, $tipo);

            if ($stmt_insert_ps->execute()) {
                $response['success'] = true;
                $response['message'] = 'Producto/Servicio creado con éxito.';
            } else {
                $response['message'] = 'Error al crear producto/servicio: ' . $stmt_insert_ps->error;
            }
            break;

        case 'updateProductoServicio':
            $input = json_decode(file_get_contents('php://input'), true);

            $id = intval($input['id']);
            $nombre = $conexion->real_escape_string($input['nombre']);
            $descripcion = $conexion->real_escape_string($input['descripcion'] ?? '');
            $precio = floatval($input['precio']);
            $tipo = $conexion->real_escape_string($input['tipo']);

            $sql_update_ps = "UPDATE productos_servicios SET nombre = ?, descripcion = ?, precio = ?, tipo = ? WHERE id = ? AND empresa_id = ?";
            $stmt_update_ps = $conexion->prepare($sql_update_ps);
            $stmt_update_ps->bind_param("ssdsii", $nombre, $descripcion, $precio, $tipo, $id, $empresa_id_actual);

            if ($stmt_update_ps->execute()) {
                $response['success'] = true;
                $response['message'] = 'Producto/Servicio actualizado con éxito.';
            } else {
                $response['message'] = 'Error al actualizar producto/servicio: ' . $stmt_update_ps->error;
            }
            break;

        case 'deleteProductoServicio':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = intval($input['id']);

            $sql_delete_ps = "DELETE FROM productos_servicios WHERE id = ? AND empresa_id = ?";
            $stmt_delete_ps = $conexion->prepare($sql_delete_ps);
            $stmt_delete_ps->bind_param("ii", $id, $empresa_id_actual);

            if ($stmt_delete_ps->execute()) {
                $response['success'] = true;
                $response['message'] = 'Producto/Servicio eliminado con éxito.';
            } else {
                $response['message'] = 'Error al eliminar producto/servicio: ' . $stmt_delete_ps->error;
            }
            break;

        case 'deleteProductoServicio':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = intval($input['id']);

            $sql_delete_ps = "DELETE FROM productos_servicios WHERE id = ? AND empresa_id = ?";
            $stmt_delete_ps = $conexion->prepare($sql_delete_ps);
            $stmt_delete_ps->bind_param("ii", $id, $empresa_id_actual);

            if ($stmt_delete_ps->execute()) {
                $response['success'] = true;
                $response['message'] = 'Producto/Servicio eliminado con éxito.';
            } else {
                $response['message'] = 'Error al eliminar producto/servicio: ' . $stmt_delete_ps->error;
            }
            break;

        case 'generateReport':
            // Comprobar si el plan permite generar informes
            $max_reportes = checkPlanFeature('max_reportes_financieros');
            if ($max_reportes !== -1) { // -1 significa ilimitado
                // Para simplificar, no estamos contando los reportes generados por el usuario
                // en la base de datos. Esto sería una mejora futura.
                // Por ahora, solo verificamos si el plan permite al menos 1 reporte.
                if ($max_reportes < 1) {
                    $response['message'] = 'Su plan actual no incluye la generación de informes. Actualice su plan para acceder a esta función.';
                    break;
                }
            }

            // Ejemplo de informe: Conteo de avisos por estado
            $sql_report = "SELECT estado, COUNT(*) as total FROM avisos WHERE empresa_id = ? GROUP BY estado";
            $stmt_report = $conexion->prepare($sql_report);
            $stmt_report->bind_param("i", $empresa_id_actual);
            $stmt_report->execute();
            $result_report = $stmt_report->get_result();

            $report_data = [];
            while ($row = $result_report->fetch_assoc()) {
                $report_data[] = $row;
            }

            $response['success'] = true;
            $response['message'] = 'Informe generado correctamente.';
            $response['data'] = $report_data;
            break;

        default:
            $response['message'] = 'Acción no reconocida.';
            break;
    }
}

$conexion->close();

echo json_encode($response);

?>
