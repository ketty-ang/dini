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
        // ... (código de creación existente)
    } elseif ($accion == 'leer') {
        $conexion = conectarDB();
        try {
            $sql = "SELECT * FROM finanzas_registros WHERE empresa_id = ? ORDER BY fecha DESC";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();

            $registros = [];
            while ($row = $result->fetch_assoc()) {
                // Por cada registro, buscar sus fotos
                $sql_fotos = "SELECT ruta_imagen FROM finanzas_fotos WHERE registro_id = ?";
                $stmt_fotos = $conexion->prepare($sql_fotos);
                $stmt_fotos->bind_param("i", $row['id']);
                $stmt_fotos->execute();
                $result_fotos = $stmt_fotos->get_result();
                
                $fotos = [];
                while ($row_foto = $result_fotos->fetch_assoc()) {
                    $fotos[] = $row_foto;
                }
                $row['fotos'] = $fotos;
                $registros[] = $row;
            }

            $response['success'] = true;
            $response['registros'] = $registros;

        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        } finally {
            if (isset($stmt)) $stmt->close();
            if (isset($stmt_fotos)) $stmt_fotos->close();
            $conexion->close();
        }
    }
    } elseif ($accion == 'eliminar') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $response['error'] = 'No se proporcionó un ID de registro.';
            echo json_encode($response);
            exit();
        }

        $conexion = conectarDB();
        $conexion->begin_transaction();
        try {
            // Seguridad: Verificar que el registro pertenece a la empresa del usuario
            $sql_check = "SELECT empresa_id FROM finanzas_registros WHERE id = ?";
            $stmt_check = $conexion->prepare($sql_check);
            $stmt_check->bind_param("i", $id);
            $stmt_check->execute();
            $result_check = $stmt_check->get_result();
            if ($result_check->num_rows === 0) {
                throw new Exception('El registro no existe.');
            }
            $registro = $result_check->fetch_assoc();
            if ($registro['empresa_id'] != $empresa_id) {
                throw new Exception('No tienes permiso para eliminar este registro.');
            }

            // Obtener rutas de las fotos para eliminarlas del servidor
            $sql_fotos = "SELECT ruta_imagen FROM finanzas_fotos WHERE registro_id = ?";
            $stmt_fotos = $conexion->prepare($sql_fotos);
            $stmt_fotos->bind_param("i", $id);
            $stmt_fotos->execute();
            $result_fotos = $stmt_fotos->get_result();
            while ($foto = $result_fotos->fetch_assoc()) {
                if (file_exists(__DIR__ . '/../../' . $foto['ruta_imagen'])) {
                    unlink(__DIR__ . '/../../' . $foto['ruta_imagen']);
                }
            }

            // Eliminar el registro (ON DELETE CASCADE se encarga de las fotos en la DB)
            $sql_delete = "DELETE FROM finanzas_registros WHERE id = ?";
            $stmt_delete = $conexion->prepare($sql_delete);
            $stmt_delete->bind_param("i", $id);
            $stmt_delete->execute();

            $conexion->commit();
            $response['success'] = true;

        } catch (Exception $e) {
            $conexion->rollback();
            $response['error'] = $e->getMessage();
        } finally {
            if(isset($stmt_check)) $stmt_check->close();
            if(isset($stmt_fotos)) $stmt_fotos->close();
            if(isset($stmt_delete)) $stmt_delete->close();
            $conexion->close();
        }
    }
    } elseif ($accion == 'descargar_zip') {
        $ano = $_GET['ano'] ?? null;
        $trimestre = $_GET['trimestre'] ?? null;

        if (!$ano || !$trimestre) {
            header("HTTP/1.1 400 Bad Request");
            echo "Año y trimestre son requeridos.";
            exit();
        }

        // Calcular fechas del trimestre
        $start_date = date('Y-m-d', mktime(0, 0, 0, ($trimestre - 1) * 3 + 1, 1, $ano));
        $end_date = date('Y-m-t', mktime(0, 0, 0, $trimestre * 3, 1, $ano));

        $conexion = conectarDB();
        try {
            $sql = "SELECT * FROM finanzas_registros WHERE empresa_id = ? AND fecha BETWEEN ? AND ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("iss", $empresa_id, $start_date, $end_date);
            $stmt->execute();
            $result = $stmt->get_result();

            $registros = $result->fetch_all(MYSQLI_ASSOC);

            if (empty($registros)) {
                die('No hay registros para el periodo seleccionado.');
            }

            // Crear ZIP
            $zip = new ZipArchive();
            $zip_file_name = "liquidacion_" . $ano . "_T" . $trimestre . "_" . uniqid() . ".zip";
            $zip_path = sys_get_temp_dir() . '/' . $zip_file_name;

            if ($zip->open($zip_path, ZipArchive::CREATE) !== TRUE) {
                die("No se pudo crear el archivo ZIP");
            }

            // Crear CSV
            $csv_file_name = 'registros.csv';
            $csv_handle = fopen('php://temp', 'r+');
            fputcsv($csv_handle, ['ID', 'Tipo', 'Descripcion', 'Monto', 'Fecha']);
            foreach ($registros as $registro) {
                fputcsv($csv_handle, [$registro['id'], $registro['tipo'], $registro['descripcion'], $registro['monto'], $registro['fecha']]);
            }
            rewind($csv_handle);
            $zip->addFromString($csv_file_name, stream_get_contents($csv_handle));
            fclose($csv_handle);

            // Añadir fotos
            foreach ($registros as $registro) {
                $sql_fotos = "SELECT ruta_imagen FROM finanzas_fotos WHERE registro_id = ?";
                $stmt_fotos = $conexion->prepare($sql_fotos);
                $stmt_fotos->bind_param("i", $registro['id']);
                $stmt_fotos->execute();
                $result_fotos = $stmt_fotos->get_result();
                while ($foto = $result_fotos->fetch_assoc()) {
                    $photo_path = __DIR__ . '/../../' . $foto['ruta_imagen'];
                    if (file_exists($photo_path)) {
                        $zip->addFile($photo_path, 'fotos/' . basename($photo_path));
                    }
                }
            }

            $zip->close();

            // Forzar descarga
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zip_file_name . '"');
            header('Content-Length: ' . filesize($zip_path));
            readfile($zip_path);

            // Limpiar
            unlink($zip_path);

        } catch (Exception $e) {
            die("Error: " . $e->getMessage());
        } finally {
            if(isset($stmt)) $stmt->close();
            if(isset($stmt_fotos)) $stmt_fotos->close();
            $conexion->close();
        }
        exit(); // Terminar script después de la descarga
    }
    } elseif ($accion == 'descargar_individual') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            header("HTTP/1.1 400 Bad Request");
            echo "ID de registro es requerido.";
            exit();
        }

        $conexion = conectarDB();
        try {
            // Seguridad y obtener datos del registro
            $sql = "SELECT * FROM finanzas_registros WHERE id = ? AND empresa_id = ?";
            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $registro = $result->fetch_assoc();

            if (!$registro) {
                die('Registro no encontrado o no tienes permiso.');
            }

            // Crear ZIP
            $zip = new ZipArchive();
            $zip_file_name = "registro_" . $id . "_" . uniqid() . ".zip";
            $zip_path = sys_get_temp_dir() . '/' . $zip_file_name;

            if ($zip->open($zip_path, ZipArchive::CREATE) !== TRUE) {
                die("No se pudo crear el archivo ZIP");
            }

            // Añadir detalles del registro a un archivo de texto
            $detalles = "Detalles del Registro Financiero\n";
            $detalles .= "------------------------------------\n";
            $detalles .= "ID: " . $registro['id'] . "\n";
            $detalles .= "Tipo: " . $registro['tipo'] . "\n";
            $detalles .= "Descripción: " . $registro['descripcion'] . "\n";
            $detalles .= "Monto: " . $registro['monto'] . "\n";
            $detalles .= "Fecha: " . $registro['fecha'] . "\n";
            $zip->addFromString("detalles.txt", $detalles);

            // Añadir fotos
            $sql_fotos = "SELECT ruta_imagen FROM finanzas_fotos WHERE registro_id = ?";
            $stmt_fotos = $conexion->prepare($sql_fotos);
            $stmt_fotos->bind_param("i", $id);
            $stmt_fotos->execute();
            $result_fotos = $stmt_fotos->get_result();
            while ($foto = $result_fotos->fetch_assoc()) {
                $photo_path = __DIR__ . '/../../' . $foto['ruta_imagen'];
                if (file_exists($photo_path)) {
                    $zip->addFile($photo_path, 'fotos/' . basename($photo_path));
                }
            }

            $zip->close();

            // Forzar descarga
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zip_file_name . '"');
            header('Content-Length: ' . filesize($zip_path));
            readfile($zip_path);

            // Limpiar
            unlink($zip_path);

        } catch (Exception $e) {
            die("Error: " . $e->getMessage());
        } finally {
            if(isset($stmt)) $stmt->close();
            if(isset($stmt_fotos)) $stmt_fotos->close();
            $conexion->close();
        }
        exit();
    }
}

echo json_encode($response);
?>

