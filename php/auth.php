<?php

require_once 'config.php';

header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => 'Petición no válida',
    'data' => null
];

// Iniciar sesión para manejar variables de sesión
session_start();

// Conectar a la base de datos
$conexion = conectarDB();

if (!$conexion) {
    $response['message'] = 'Error al conectar con la base de datos.';
    echo json_encode($response);
    exit();
}

if (isset($_GET['action'])) {
    $action = $_GET['action'];

    switch ($action) {
        case 'login':
            $input = json_decode(file_get_contents('php://input'), true);

            $username = $conexion->real_escape_string($input['username']);
            $password = $conexion->real_escape_string($input['password']);

            $sql = "SELECT u.id, u.username, u.password, u.rol, u.empresa_id, e.nombre_empresa, e.plan_type 
                    FROM usuarios u 
                    JOIN empresas e ON u.empresa_id = e.id
                    WHERE u.username = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 1) {
                $user = $result->fetch_assoc();
                // Verificar la contraseña hasheada
                if (password_verify($password, $user['password'])) {
                    // Contraseña correcta, iniciar sesión
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['rol'] = $user['rol'];
                    $_SESSION['empresa_id'] = $user['empresa_id'];
                    $_SESSION['nombre_empresa'] = $user['nombre_empresa'];
                    $_SESSION['plan_type'] = $user['plan_type']; // Guardar el tipo de plan

                    $response['success'] = true;
                    $response['message'] = 'Inicio de sesión exitoso.';
                    $response['data'] = ['username' => $user['username'], 'rol' => $user['rol'], 'empresa_id' => $user['empresa_id'], 'plan_type' => $user['plan_type']];
                } else {
                    $response['message'] = 'Contraseña incorrecta.';
                }
            } else {
                $response['message'] = 'Usuario no encontrado.';
            }
            break;

        case 'register':
            $input = json_decode(file_get_contents('php://input'), true);

            $empresa_id = intval($input['empresa_id']);
            $username = $conexion->real_escape_string($input['username']);
            $password = $conexion->real_escape_string($input['password']);
            $rol = $conexion->real_escape_string($input['rol']);

            // 1. Verificar que la empresa_id exista
            $sql_check_empresa = "SELECT id FROM empresas WHERE id = ?";
            $stmt_check_empresa = $conexion->prepare($sql_check_empresa);
            $stmt_check_empresa->bind_param("i", $empresa_id);
            $stmt_check_empresa->execute();
            $result_check_empresa = $stmt_check_empresa->get_result();

            if ($result_check_empresa->num_rows === 0) {
                $response['message'] = 'El ID de empresa proporcionado no existe.';
                break;
            }

            // 2. Verificar si el nombre de usuario ya existe
            $sql_check_username = "SELECT id FROM usuarios WHERE username = ?";
            $stmt_check_username = $conexion->prepare($sql_check_username);
            $stmt_check_username->bind_param("s", $username);
            $stmt_check_username->execute();
            $result_check_username = $stmt_check_username->get_result();

            if ($result_check_username->num_rows > 0) {
                $response['message'] = 'El nombre de usuario ya está en uso.';
                break;
            }

            // 3. Hashear la contraseña
            $hashed_password = password_hash($password, PASSWORD_BCRYPT);

            // 4. Insertar el nuevo usuario
            $sql_insert_user = "INSERT INTO usuarios (empresa_id, username, password, rol) VALUES (?, ?, ?, ?)";
            $stmt_insert_user = $conexion->prepare($sql_insert_user);
            $stmt_insert_user->bind_param("isss", $empresa_id, $username, $hashed_password, $rol);

            if ($stmt_insert_user->execute()) {
                $response['success'] = true;
                $response['message'] = 'Usuario registrado con éxito.';
            } else {
                $response['message'] = 'Error al registrar el usuario: ' . $stmt_insert_user->error;
            }
            break;

        case 'logout':
            session_unset();
            session_destroy();
            $response['success'] = true;
            $response['message'] = 'Sesión cerrada correctamente.';
            break;

        case 'checkSession':
            if (isset($_SESSION['user_id'])) {
                $response['success'] = true;
                $response['message'] = 'Sesión activa.';
                $response['data'] = ['username' => $_SESSION['username'], 'rol' => $_SESSION['rol'], 'empresa_id' => $_SESSION['empresa_id'], 'plan_type' => $_SESSION['plan_type']];
            } else {
                $response['message'] = 'No hay sesión activa.';
            }
            break;

        default:
            $response['message'] = 'Acción no reconocida.';
            break;
    }
}

$conexion->close();

echo json_encode($response);

?>
