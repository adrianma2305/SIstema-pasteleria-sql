const express = require('express');
const sql = require('mssql'); 
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

const dbConfig = {
    user: 'adminsory',
    password: 'sep.23059', 
    server: 'servidor-adrian.database.windows.net', 
    database: 'PasteleriaDB',
    options: {
        encrypt: true, 
        trustServerCertificate: false,
        connectTimeout: 30000 
    }
};

const poolPromise = sql.connect(dbConfig).then(pool => {
    console.log("🚀 ¡Conectado a la nube de Azure SQL Database con éxito!");
    return pool;
}).catch(err => {
    console.log("❌ Error al conectar a la BD en Azure: ", err.message);
});

// RUTAS EMPLEADOS
app.get('/api/empleados', async (req, res) => {
    try {
        let pool = await poolPromise; 
        let result = await pool.request().query('SELECT id, nombre, cargo FROM empleados WHERE activo = 1 ORDER BY nombre');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/empleados/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM empleados WHERE id = @id AND activo = 1');
        if (result.recordset.length > 0) res.json(result.recordset[0]);
        else res.status(404).send('Usuario no encontrado');
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, cargo, password, es_recuperacion } = req.body;
        let pool = await poolPromise;

        if (es_recuperacion) {
            await pool.request().input('id', sql.Int, id).input('pass', sql.VarChar, password).query('UPDATE Empleados SET contraseña = @pass WHERE id = @id');
            return res.json({ success: true });
        } else {
            let query = 'UPDATE Empleados SET nombre = @nombre, cargo = @cargo';
            if (password) query += ', contraseña = @pass';
            query += ' WHERE id = @id';

            let peticion = pool.request().input('id', sql.Int, id).input('nombre', sql.VarChar, nombre).input('cargo', sql.VarChar, cargo);
            if (password) peticion.input('pass', sql.VarChar, password);
            await peticion.query(query);
            return res.json({ success: true });
        }
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/empleados', async (req, res) => {
    try {
        const { nombre, cargo, contraseña } = req.body;
        let pool = await poolPromise;
        await pool.request().input('nombre', sql.VarChar, nombre).input('cargo', sql.VarChar, cargo).input('pass', sql.VarChar, contraseña).query('INSERT INTO Empleados (nombre, cargo, contraseña, activo) VALUES (@nombre, @cargo, @pass, 1)');
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/empleados/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('UPDATE empleados SET activo = 0 WHERE id = @id');
        res.status(200).send('Empleado eliminado');
    } catch (err) { res.status(500).send(err.message); }
});

// CATEGORIAS
app.get('/api/categorias', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query('SELECT * FROM categorias ORDER BY nombre');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query(`
            SELECT p.*, i.nombre as nombre_insumo, i.precio as precio_insumo, c.nombre as nombre_categoria
            FROM productos p 
            LEFT JOIN insumos i ON p.insumo_id = i.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1
        `);
        const formated = result.recordset.map(prod => ({
            id: prod.id,
            nombre: prod.nombre,
            precio: prod.precio,
            costo: prod.precio_insumo || 0,
            insumo_id: prod.insumo_id,
            categoria_id: prod.categoria_id,
            insumo: prod.nombre_insumo ? { nombre: prod.nombre_insumo, precio: prod.precio_insumo } : null,
            categoria: prod.nombre_categoria ? { nombre: prod.nombre_categoria } : null
        }));
        res.json(formated);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, insumo_id, categoria_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('precio', sql.Int, precio)
            .input('insumo_id', sql.Int, insumo_id || null)
            .input('categoria_id', sql.Int, categoria_id || null)
            .query('INSERT INTO productos (nombre, precio, insumo_id, categoria_id) VALUES (@nombre, @precio, @insumo_id, @categoria_id)');
        res.status(201).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM productos WHERE id = @id AND activo = 1');
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { nombre, precio, insumo_id, categoria_id } = req.body;
        let pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nombre', sql.VarChar, nombre)
            .input('precio', sql.Int, precio)
            .input('insumo_id', sql.Int, insumo_id || null)
            .input('categoria_id', sql.Int, categoria_id || null)
            .query('UPDATE productos SET nombre = @nombre, precio = @precio, insumo_id = @insumo_id, categoria_id = @categoria_id, fecha_actualizacion = GETDATE() WHERE id = @id');
        res.status(200).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

// PROVEEDORES
app.get('/api/proveedores', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query('SELECT * FROM proveedores WHERE activo = 1');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/proveedores/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM proveedores WHERE id = @id AND activo = 1');
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/proveedores', async (req, res) => {
    try {
        const { nombre, telefono, entrega } = req.body;
        let pool = await poolPromise;
        await pool.request().input('nombre', sql.VarChar, nombre).input('telefono', sql.VarChar, telefono || null).input('entrega', sql.Date, entrega || null).query('INSERT INTO proveedores (nombre, telefono, entrega) VALUES (@nombre, @telefono, @entrega)');
        res.status(201).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/proveedores/:id', async (req, res) => {
    try {
        const { nombre, telefono, entrega } = req.body;
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).input('nombre', sql.VarChar, nombre).input('telefono', sql.VarChar, telefono || null).input('entrega', sql.Date, entrega || null).query('UPDATE proveedores SET nombre = @nombre, telefono = @telefono, entrega = @entrega, fecha_actualizacion = GETDATE() WHERE id = @id');
        res.status(200).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/proveedores/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('UPDATE proveedores SET activo = 0 WHERE id = @id');
        res.status(200).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

// INSUMOS
app.get('/api/insumos', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query('SELECT i.*, p.nombre as nombre_proveedor FROM insumos i LEFT JOIN proveedores p ON i.proveedor_id = p.id WHERE i.activo = 1');
        const formated = result.recordset.map(ins => ({
            id: ins.id, nombre: ins.nombre, unidad: ins.unidad, precio: ins.precio, proveedor_id: ins.proveedor_id, proveedores: ins.nombre_proveedor ? { nombre: ins.nombre_proveedor } : null
        }));
        res.json(formated);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/insumos/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM insumos WHERE id = @id AND activo = 1');
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/insumos', async (req, res) => {
    try {
        const { nombre, unidad, precio, proveedor_id } = req.body;
        let pool = await poolPromise;
        await pool.request().input('nombre', sql.VarChar, nombre).input('unidad', sql.VarChar, unidad || null).input('precio', sql.Int, precio || null).input('proveedor_id', sql.Int, proveedor_id || null).query('INSERT INTO insumos (nombre, unidad, precio, proveedor_id) VALUES (@nombre, @unidad, @precio, @proveedor_id)');
        res.status(201).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/insumos/:id', async (req, res) => {
    try {
        const { nombre, unidad, precio, proveedor_id } = req.body;
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).input('nombre', sql.VarChar, nombre).input('unidad', sql.VarChar, unidad || null).input('precio', sql.Int, precio || null).input('proveedor_id', sql.Int, proveedor_id || null).query('UPDATE insumos SET nombre = @nombre, unidad = @unidad, precio = @precio, proveedor_id = @proveedor_id, fecha_actualizacion = GETDATE() WHERE id = @id');
        res.status(200).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/insumos/:id', async (req, res) => {
    try {
        let pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('UPDATE insumos SET activo = 0 WHERE id = @id');
        res.status(200).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

// CLIENTES Y VENTAS
app.get('/api/clientes', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query('SELECT * FROM clientes WHERE activo = 1');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/clientes', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().input('nombre', sql.VarChar, req.body.nombre).input('telefono', sql.VarChar, req.body.telefono || null).query('INSERT INTO clientes (nombre, telefono) OUTPUT INSERTED.id VALUES (@nombre, @telefono)');
        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/ventas', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query("SELECT v.id, v.fecha, v.total, ISNULL(c.nombre, 'Consumidor Final') as cliente, ISNULL(e.nombre, 'Admin') as empleado FROM Ventas v LEFT JOIN Clientes c ON v.cliente_id = c.id LEFT JOIN Empleados e ON v.empleado_id = e.id WHERE v.activo = 1 ORDER BY v.fecha DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/ventas', async (req, res) => {
    let transaction;
    try {
        const { cliente_id, empleado_id, total, detalles } = req.body;
        let pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const reqCab = new sql.Request(transaction);
        let resCab = await reqCab.input('c_id', sql.Int, cliente_id || null).input('e_id', sql.Int, empleado_id || null).input('total', sql.Int, total).query('INSERT INTO Ventas (cliente_id, empleado_id, total) OUTPUT INSERTED.id VALUES (@c_id, @e_id, @total)');
        const vId = resCab.recordset[0].id;

        for (let item of detalles) {
            const reqDet = new sql.Request(transaction);
            await reqDet.input('v_id', sql.Int, vId).input('p_id', sql.Int, item.producto_id).input('cant', sql.Int, item.cantidad).input('pu', sql.Int, item.precio_unitario).input('sub', sql.Int, item.subtotal).query('INSERT INTO Ventas_Detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (@v_id, @p_id, @cant, @pu, @sub)');
        }
        await transaction.commit();
        res.status(201).json({ id: vId });
    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).send(err.message);
    }
});

app.get('/api/ventas/:id/detalles', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT dv.cantidad, p.nombre, dv.subtotal FROM Ventas_Detalle dv INNER JOIN productos p ON dv.producto_id = p.id WHERE dv.venta_id = @id');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// DASHBOARD
app.get('/api/dashboard/resumen', async (req, res) => {
    try {
        let pool = await poolPromise;
        let qDia = await pool.request().query(`SELECT ISNULL(SUM(total), 0) as total FROM Ventas WHERE CAST(fecha as DATE) = CAST(GETDATE() as DATE) AND activo = 1`);
        let qSemana = await pool.request().query(`SELECT ISNULL(SUM(total), 0) as total FROM Ventas WHERE fecha >= DATEADD(day, -7, GETDATE()) AND activo = 1`);
        let qMes = await pool.request().query(`SELECT ISNULL(SUM(total), 0) as total FROM Ventas WHERE MONTH(fecha) = MONTH(GETDATE()) AND YEAR(fecha) = YEAR(GETDATE()) AND activo = 1`);
        res.json({ dia: qDia.recordset[0].total, semana: qSemana.recordset[0].total, mes: qMes.recordset[0].total });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/dashboard/top-productos', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query("SELECT TOP 5 p.nombre, SUM(vd.cantidad) as total_vendido FROM Ventas_Detalle vd JOIN Ventas v ON vd.venta_id = v.id JOIN Productos p ON vd.producto_id = p.id WHERE v.activo = 1 GROUP BY p.nombre ORDER BY total_vendido DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/dashboard/ventas-mes', async (req, res) => {
    try {
        let pool = await poolPromise;
        let result = await pool.request().query("SELECT FORMAT(fecha, 'dd-MM') as dia, SUM(total) as total_dia FROM Ventas WHERE activo = 1 GROUP BY FORMAT(fecha, 'dd-MM'), CAST(fecha as DATE) ORDER BY CAST(fecha as DATE)");
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(3000, () => console.log('Servidor corriendo en el puerto 3000'));