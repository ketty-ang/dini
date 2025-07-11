<?php
require_once 'config.php';

$conn = conectarDB();

if ($conn) {
    $result = $conn->query('SHOW TABLES');
    if ($result) {
        echo "Tablas en la base de datos dini_app_db:\n";
        while ($row = $result->fetch_row()) {
            echo "- " . $row[0] . "\n";
        }
    } else {
        echo "Error al ejecutar la consulta: " . $conn->error;
    }
    $conn->close();
} else {
    echo "No se pudo conectar a la base de datos.";
}
?>