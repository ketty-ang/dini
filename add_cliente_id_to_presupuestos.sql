ALTER TABLE presupuestos
ADD COLUMN cliente_id INT,
ADD CONSTRAINT fk_presupuestos_cliente
FOREIGN KEY (cliente_id) REFERENCES clientes(id)
ON DELETE SET NULL;