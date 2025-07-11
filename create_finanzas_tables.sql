USE `dini_app_db`;

-- 1. Tabla para Ingresos y Gastos
CREATE TABLE IF NOT EXISTS `finanzas_registros` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `tipo` ENUM('ingreso', 'gasto') NOT NULL,
    `descripcion` TEXT,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fecha` DATE NOT NULL,
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla para las fotos de los registros financieros
CREATE TABLE IF NOT EXISTS `finanzas_fotos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `registro_id` INT NOT NULL,
    `ruta_imagen` VARCHAR(255) NOT NULL,
    `fecha_subida` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`registro_id`) REFERENCES `finanzas_registros`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
