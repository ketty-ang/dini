<?php

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---

// Reemplaza con tus credenciales de MySQL
define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // Usuario por defecto en XAMPP
define('DB_PASS', '');     // Contraseña por defecto en XAMPP es vacía
define('DB_NAME', 'dini_app_db'); // Crearemos esta base de datos


// --- CONFIGURACIÓN GENERAL ---

// Habilitar el reporte de errores para desarrollo
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Establecer la zona horaria
date_default_timezone_set('Europe/Madrid');

/**
 * Función para conectar a la base de datos
 * @return mysqli|false
 */
function conectarDB() {
    $conexion = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conexion->connect_error) {
        // En un caso real, podrías registrar este error en un log
        // en lugar de mostrarlo directamente.
        die('Error de Conexión (' . $conexion->connect_errno . ') ' . $conexion->connect_error);
    }

    $conexion->set_charset('utf8');
    return $conexion;
}

?>
