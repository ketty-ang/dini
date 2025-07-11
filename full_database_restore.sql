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

-- 8. Tabla `global_chat_mensajes`
-- Para el chat general entre técnicos de una empresa
CREATE TABLE IF NOT EXISTS `global_chat_mensajes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa_id` INT NOT NULL,
    `remitente` VARCHAR(100) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `fecha_envio` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- 11. Tabla para Ingresos y Gastos
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

-- 12. Tabla para las fotos de los registros financieros
CREATE TABLE IF NOT EXISTS `finanzas_fotos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `registro_id` INT NOT NULL,
    `ruta_imagen` VARCHAR(255) NOT NULL,
    `fecha_subida` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`registro_id`) REFERENCES `finanzas_registros`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MODIFICACIONES DE TABLAS --

ALTER TABLE `avisos`
ADD COLUMN `tecnico_asignado_id` INT NULL AFTER `estado`,
ADD COLUMN `prioridad` ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media' AFTER `tecnico_asignado_id`,
ADD CONSTRAINT `fk_tecnico_asignado` FOREIGN KEY (`tecnico_asignado_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL;

ALTER TABLE `empresas`
ADD COLUMN `plan_type` ENUM('basico', 'profesional', 'ultimate') NOT NULL DEFAULT 'basico';

-- DATOS DE PRUEBA --

-- Insertar las empresas con sus respectivos planes
INSERT INTO `empresas` (`nombre_empresa`, `plan_type`) VALUES
('Empresa Básica', 'basico'),
('Empresa Profesional', 'profesional'),
('Empresa Ultimate', 'ultimate');

-- Obtener los IDs de las empresas recién creadas
SET @empresa_basico_id = LAST_INSERT_ID();
SET @empresa_profesional_id = LAST_INSERT_ID() + 1;
SET @empresa_ultimate_id = LAST_INSERT_ID() + 2;

-- Insertar los usuarios y asociarlos a cada empresa
-- La contraseña para todos es 'password123'. Se hashea con SHA2 para seguridad.
INSERT INTO `usuarios` (`empresa_id`, `username`, `password`, `rol`) VALUES
(@empresa_basico_id, 'user_basico', SHA2('password123', 256), 'admin'),
(@empresa_profesional_id, 'user_profesional', SHA2('password123', 256), 'admin'),
(@empresa_ultimate_id, 'user_ultimate', SHA2('password123', 256), 'admin');

-- Insertar un cliente de prueba (asociado a la empresa_id = 1)
-- Asegúrate de que la empresa con ID 1 ya existe.
INSERT INTO `clientes` (`empresa_id`, `nombre`, `telefono`, `nie`, `direccion`)
VALUES
    (1, 'Juan Pérez García', '600123456', '12345678A', 'Calle Falsa 123, Springfield');

-- Insertar avisos de prueba para el cliente anterior (asociado a la empresa_id = 1)
-- Asumimos que el ID del cliente insertado es 1. Si no, ajusta el `cliente_id`.
INSERT INTO `avisos` (`empresa_id`, `cliente_id`, `descripcion`, `fecha_servicio`, `estado`)
VALUES
    (1, (SELECT id FROM clientes WHERE telefono = '600123456'), 'Reparar fuga de agua en el baño. La junta de la bañera parece estar desgastada.', CURDATE(), 'pendiente'),
    (1, (SELECT id FROM clientes WHERE telefono = '600123456'), 'Revisión de instalación eléctrica en cocina.', CURDATE() + INTERVAL 1 DAY, 'pendiente'),
    (1, (SELECT id FROM clientes WHERE telefono = '600123456'), 'Instalación de nueva lámpara en salón.', CURDATE() - INTERVAL 2 DAY, 'realizado');
