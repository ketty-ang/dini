-- SQL Script para insertar datos de prueba en dini_app_db

USE `dini_app_db`;

-- Insertar un cliente de prueba (asociado a la empresa_id = 1)
-- Asegúrate de que la empresa con ID 1 ya existe.
INSERT INTO `clientes` (`empresa_id`, `nombre`, `telefono`, `nie`, `direccion`)
VALUES
    (1, 'Juan Pérez García', '600123456', '12345678A', 'Calle Falsa 123, Springfield');

-- Insertar avisos de prueba para el cliente anterior (asociado a la empresa_id = 1)
-- Asumimos que el ID del cliente insertado es 1. Si no, ajusta el `cliente_id`.
INSERT INTO `avisos

` (`empresa_id`, `cliente_id`, `descripcion`, `fecha_servicio`, `estado`)
VALUES
    (1, (SELECT id FROM clientes WHERE telefono = '600123456'), 'Reparar fuga de agua en el baño. La junta de la bañera parece estar desgastada.', CURDATE(), 'pendiente'),
    (1, (SELECT id FROM clientes WHERE telefono = '600123456'), 'Revisión de instalación eléctrica en cocina.', CURDATE() + INTERVAL 1 DAY, 'pendiente'),
    (1, (SELECT id FROM clientes WHERE telefono = '600123456'), 'Instalación de nueva lámpara en salón.', CURDATE() - INTERVAL 2 DAY, 'realizado');

-- Puedes añadir más datos de prueba si lo deseas.
