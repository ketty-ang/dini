ALTER TABLE facturas
ADD COLUMN cliente_id INT,
ADD CONSTRAINT fk_facturas_cliente
FOREIGN KEY (cliente_id) REFERENCES clientes(id)
ON DELETE SET NULL;