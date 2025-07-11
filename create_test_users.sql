-- Usar la base de datos
USE `dini_app_db`;

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
