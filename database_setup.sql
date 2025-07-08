-- SQL Script para la creación de la base de datos y tablas de Dini App

-- 1. Crear la base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS `dini_app_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dini_app_db`;

-- 2. Tabla `empresas`
-- Almacena la información de cada empresa que usará la aplicación
CREATE TABLE IF NOT EXISTS `empresas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre_empresa` VARCHAR(255) NOT NULL UNIQUE,
    `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla `clientes`
-- Almacena la información de los clientes de cada empresa
CREATE TABLE IF NOT EXISTS `clientes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(20) UNIQUE,
    `nie` VARCHAR(20) UNIQUE,
    `direccion` VARCHAR(255),
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla `avisos`
-- Almacena los avisos o servicios de cada empresa
CREATE TABLE IF NOT EXISTS `avisos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `cliente_id` INT NOT NULL,
    `descripcion` TEXT NOT NULL,
    `fecha_servicio` DATE NOT NULL,
    `estado` ENUM('pendiente', 'realizado', 'anulado') DEFAULT 'pendiente',
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla `aviso_fotos`
-- Almacena las rutas de las fotos asociadas a cada aviso
CREATE TABLE IF NOT EXISTS `aviso_fotos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `aviso_id` INT NOT NULL,
    `ruta_imagen` VARCHAR(255) NOT NULL,
    `fecha_subida` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla `aviso_historial_estados`
-- Almacena el historial de cambios de estado de cada aviso
CREATE TABLE IF NOT EXISTS `aviso_historial_estados` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `aviso_id` INT NOT NULL,
    `estado_anterior` ENUM('pendiente', 'realizado', 'anulado'),
    `estado_nuevo` ENUM('pendiente', 'realizado', 'anulado') NOT NULL,
    `descripcion_cambio` TEXT,
    `fecha_cambio` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla `chat_mensajes` (Revisada para incluir empresa_id)
-- Para el chat interno de cada aviso, ahora con empresa_id para consistencia
CREATE TABLE IF NOT EXISTS `chat_mensajes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `aviso_id` INT NOT NULL,
    `remitente` VARCHAR(100) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `fecha_envio` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
