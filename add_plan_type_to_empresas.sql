-- SQL Script para añadir la columna plan_type a la tabla empresas

USE `dini_app_db`;

ALTER TABLE `empresas`
ADD COLUMN `plan_type` ENUM('basico', 'profesional', 'ultimate') NOT NULL DEFAULT 'basico';
