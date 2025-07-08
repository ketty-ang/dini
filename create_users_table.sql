-- SQL Script para la creación de la tabla usuarios

USE `dini_app_db`;

-- 9. Tabla `usuarios`
-- Almacena la información de los usuarios de la aplicación
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL, -- Para almacenar la contraseña hasheada
    `rol` ENUM('admin', 'tecnico') DEFAULT 'tecnico',
    `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
