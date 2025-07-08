-- SQL Script para la creación de la tabla productos_servicios

USE `dini_app_db`;

-- 10. Tabla `productos_servicios`


-- Almacena los productos y servicios que ofrece cada empresa
CREATE TABLE IF NOT EXISTS `productos_servicios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT,
    `precio` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tipo` ENUM('producto', 'servicio') NOT NULL,
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
