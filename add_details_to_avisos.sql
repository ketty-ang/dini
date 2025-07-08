-- SQL Script para añadir columnas a la tabla avisos

USE `dini_app_db`;

ALTER TABLE `avisos`
ADD COLUMN `tecnico_asignado_id` INT NULL AFTER `estado`,
ADD COLUMN `prioridad` ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media' AFTER `tecnico_asignado_id`,
ADD CONSTRAINT `fk_tecnico_asignado` FOREIGN KEY (`tecnico_asignado_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL;
