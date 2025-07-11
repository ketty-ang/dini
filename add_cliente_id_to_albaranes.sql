ALTER TABLE albaranes
ADD COLUMN cliente_id INT,
ADD CONSTRAINT fk_albaranes_cliente
FOREIGN KEY (cliente_id) REFERENCES clientes(id)
ON DELETE SET NULL;