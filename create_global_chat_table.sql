-- SQL Script para la creación de la tabla global_chat_mensajes

USE `dini_app_db`;

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
