const express = require('express');
const sql = require('mssql/msnodesqlv8'); 
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

// --- 1. CONFIGURACION DE BASE DE DATOS ---
const dbConfig = {
    server: 'localhost', 
    port: 1433,          
    database: 'PasteleriaDB',
    driver: 'SQL Server', 
    options: {
        trustedConnection: true,
        trustServerCertificate: true,
        connectTimeout: 5000 
    }
};

const poolPromise = sql.connect(dbConfig).then(pool => {
    console.log("Conectado a SQL Server con Autenticación de Windows");
    return pool;
}).catch(err => {
    console.log("Error al conectar BD: ", err.message);
});

// --- 2. RUTAS DE EMPLEADOS ---
app.get('/api/empleados', async (req, res) => {
    try {
        let pool = await poolPromise; 
        // BORRADOR LOGICO: Solo mostramos los activos
        let result = await pool.request().query('SELECT id, nombre, cargo FROM empleados WHERE activo = 1 ORDER BY nombre');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/empleados/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM empleados WHERE id = @id AND activo = 1');
        if (result.recordset.length > 0) res.json(result.recordset[0]);
        else res.status(404).send('Usuario no encontrado');
    } catch (err) { res.status(500).send(err.message); }
});

// --- 3. RUTAS DE CATEGORIAS ---
app.get('/api/categorias', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query('SELECT * FROM categorias ORDER BY nombre');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// --- 4. RUTAS DE PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query(`
            SELECT p.*, 
                   i.nombre as nombre_insumo,
                   c.nombre as nombre_categoria
            FROM productos p 
            LEFT JOIN insumos i ON p.insumo_id = i.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1 -- BORRADOR LOGICO
        `);
        
        const productosFormateados = result.recordset.map(prod => ({
            id: prod.id,
            nombre: prod.nombre,
            precio: prod.precio,
            insumo_id: prod.insumo_id,
            categoria_id: prod.categoria_id,
            insumo: prod.nombre_insumo ? { nombre: prod.nombre_insumo } : null,
            categoria: prod.nombre_categoria ? { nombre: prod.nombre_categoria } : null
        }));

        res.json(productosFormateados);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, insumo_id, categoria_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('precio', sql.Decimal(10,2), precio)
            .input('insumo_id', sql.Int, insumo_id || null)
            .input('categoria_id', sql.Int, categoria_id || null)
            .query('INSERT INTO productos (nombre, precio, insumo_id, categoria_id) VALUES (@nombre, @precio, @insumo_id, @categoria_id)');
            
        res.status(201).send('Producto agregado');
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM productos WHERE id = @id AND activo = 1');
        if (result.recordset.length > 0) res.json(result.recordset[0]);
        else res.status(404).send('Producto no encontrado');
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { nombre, precio, insumo_id, categoria_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('precio', sql.Decimal(10,2), precio)
            .input('insumo_id', sql.Int, insumo_id || null)
            .input('categoria_id', sql.Int, categoria_id || null)
            .query('UPDATE productos SET nombre = @nombre, precio = @precio, insumo_id = @insumo_id, categoria_id = @categoria_id WHERE id = @id');
        res.status(200).send('Producto actualizado');
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            // BORRADOR LOGICO: Solo actualizamos el estado, no borramos la fila
            .query('UPDATE productos SET activo = 0 WHERE id = @id');
        res.status(200).send('Producto eliminado lógicamente');
    } catch (err) { 
        res.status(500).send(err.message); 
    }
});

// --- 5. RUTAS DE PROVEEDORES ---
app.get('/api/proveedores', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query('SELECT * FROM proveedores WHERE activo = 1 ORDER BY id');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/proveedores/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM proveedores WHERE id = @id AND activo = 1');
        if (result.recordset.length > 0) res.json(result.recordset[0]);
        else res.status(404).send('Proveedor no encontrado');
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/proveedores', async (req, res) => {
    try {
        const { nombre, telefono, entrega } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('telefono', sql.VarChar, telefono || null)
            .input('entrega', sql.Date, entrega || null)
            .query('INSERT INTO proveedores (nombre, telefono, entrega) VALUES (@nombre, @telefono, @entrega)');
        res.status(201).send('Proveedor agregado');
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/proveedores/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { nombre, telefono, entrega } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('telefono', sql.VarChar, telefono || null)
            .input('entrega', sql.Date, entrega || null)
            .query('UPDATE proveedores SET nombre = @nombre, telefono = @telefono, entrega = @entrega WHERE id = @id');
        res.status(200).send('Proveedor actualizado');
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/proveedores/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('UPDATE proveedores SET activo = 0 WHERE id = @id');
        res.status(200).send('Proveedor eliminado lógicamente');
    } catch (err) { res.status(500).send(err.message); }
});

// --- 6. RUTAS DE INSUMOS ---
app.get('/api/insumos', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query(`
            SELECT i.*, p.nombre as nombre_proveedor 
            FROM insumos i 
            LEFT JOIN proveedores p ON i.proveedor_id = p.id 
            WHERE i.activo = 1
            ORDER BY i.id
        `);
        
        const insumosFormateados = result.recordset.map(ins => ({
            id: ins.id,
            nombre: ins.nombre,
            unidad: ins.unidad,
            precio: ins.precio,
            proveedor_id: ins.proveedor_id,
            proveedores: ins.nombre_proveedor ? { nombre: ins.nombre_proveedor } : null
        }));

        res.json(insumosFormateados);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/insumos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM insumos WHERE id = @id AND activo = 1');
        if (result.recordset.length > 0) res.json(result.recordset[0]);
        else res.status(404).send('Insumo no encontrado');
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/insumos', async (req, res) => {
    try {
        const { nombre, unidad, precio, proveedor_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('unidad', sql.VarChar, unidad || null)
            .input('precio', sql.Decimal(10,2), precio || null)
            .input('proveedor_id', sql.Int, proveedor_id || null)
            .query('INSERT INTO insumos (nombre, unidad, precio, proveedor_id) VALUES (@nombre, @unidad, @precio, @proveedor_id)');
        res.status(201).send('Insumo agregado');
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/insumos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { nombre, unidad, precio, proveedor_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('unidad', sql.VarChar, unidad || null)
            .input('precio', sql.Decimal(10,2), precio || null)
            .input('proveedor_id', sql.Int, proveedor_id || null)
            .query('UPDATE insumos SET nombre = @nombre, unidad = @unidad, precio = @precio, proveedor_id = @proveedor_id WHERE id = @id');
        res.status(200).send('Insumo actualizado');
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/insumos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('UPDATE insumos SET activo = 0 WHERE id = @id');
        res.status(200).send('Insumo eliminado lógicamente');
    } catch (err) { res.status(500).send(err.message); }
});

// --- 7. RUTAS DE CLIENTES ---
app.get('/api/clientes', async (req, res) => {
    try {
        let pool = await poolPromise;
        let nombre = req.query.nombre;
        
        if(nombre) {
            let result = await pool.request()
                .input('nombre', sql.VarChar, `%${nombre}%`)
                .query('SELECT * FROM clientes WHERE nombre LIKE @nombre AND activo = 1');
            res.json(result.recordset);
        } else {
            let result = await pool.request().query('SELECT * FROM clientes WHERE activo = 1');
            res.json(result.recordset);
        }
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, telefono } = req.body;
        let pool = await poolPromise;
        let result = await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('telefono', sql.VarChar, telefono || null)
            .query('INSERT INTO clientes (nombre, telefono) OUTPUT INSERTED.id VALUES (@nombre, @telefono)');
        
        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) { res.status(500).send(err.message); }
});

// --- 8. RUTAS DE VENTAS ---
app.get('/api/ventas', async (req, res) => {
    try {
        let pool = await poolPromise;
        // OJO: En las ventas NO filtramos por productos activos. 
        // Si borraste un pastel hoy, igual tiene que salir en el historial de ventas del mes pasado.
        let result = await pool.request().query(`
            SELECT v.*, 
                   p.nombre as nombre_producto,
                   c.nombre as nombre_cliente,
                   e.nombre as nombre_empleado
            FROM ventas v
            LEFT JOIN productos p ON v.producto_id = p.id
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN empleados e ON v.empleado_id = e.id
            ORDER BY v.fecha DESC
        `);
        
        const ventasFormateadas = result.recordset.map(v => ({
            id: v.id,
            cantidad: v.cantidad,
            precio_unitario: v.precio_unitario,
            total: v.total,
            fecha: v.fecha,
            producto: v.nombre_producto ? { nombre: v.nombre_producto } : null,
            cliente: v.nombre_cliente ? { nombre: v.nombre_cliente } : null,
            empleado: v.nombre_empleado ? { nombre: v.nombre_empleado } : null
        }));

        res.json(ventasFormateadas);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { producto_id, cantidad, precio_unitario, total, cliente_id, empleado_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('producto_id', sql.Int, producto_id)
            .input('cantidad', sql.Int, cantidad)
            .input('precio_unitario', sql.Decimal(10,2), precio_unitario)
            .input('total', sql.Decimal(10,2), total)
            .input('cliente_id', sql.Int, cliente_id || null)
            .input('empleado_id', sql.Int, empleado_id || null)
            .query('INSERT INTO ventas (producto_id, cantidad, precio_unitario, total, cliente_id, empleado_id) VALUES (@producto_id, @cantidad, @precio_unitario, @total, @cliente_id, @empleado_id)');
        res.status(201).send('Venta registrada');
    } catch (err) { res.status(500).send(err.message); }
});

// --- 9. INICIAR SERVIDOR ---
app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});