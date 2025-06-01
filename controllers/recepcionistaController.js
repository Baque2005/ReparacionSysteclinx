const pool = require('../db');
const bcrypt = require('bcryptjs');
const { enviarCorreoBienvenida, generarPassword } = require('../utils/mailer');

exports.registrarOrdenCompleta = async (req, res) => {
  const {
    nombre,
    correo,
    telefono,
    marca,
    modelo,
    imei,
    descripcion,
    fotos
  } = req.body;

  try {
    // 1. Verificar si el cliente ya existe por correo
    let clienteRes = await pool.query(
      'SELECT id FROM clientes WHERE correo = $1',
      [correo]
    );

    let clienteId;

    if (clienteRes.rows.length === 0) {
      // 2. Crear nuevo cliente con fecha
      const nuevoCliente = await pool.query(
        'INSERT INTO clientes (nombre, telefono, correo, creado_en) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [nombre, telefono, correo]
      );
      clienteId = nuevoCliente.rows[0].id;

      // 3. Generar y encriptar contraseña
      const nuevaPass = generarPassword();
      const hashedPassword = await bcrypt.hash(nuevaPass, 10);

      // 4. Crear usuario con rol 'cliente'
      await pool.query(
        'INSERT INTO usuarios (nombre, correo, contraseña, rol) VALUES ($1, $2, $3, $4)',
        [nombre, correo, hashedPassword, 'cliente']
      );

      // 5. Enviar correo con bienvenida
      await enviarCorreoBienvenida(correo, nombre, nuevaPass);
    } else {
      clienteId = clienteRes.rows[0].id;
    }

    // 6. Registrar equipo
    let fotosArray = [];

    if (fotos && fotos.trim() !== '') {
      fotosArray = fotos.split(',').map(f => f.trim());
    }

    const equipoRes = await pool.query(
      'INSERT INTO equipos (cliente_id, marca, modelo, imei, descripcion, fotos) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [clienteId, marca, modelo, imei, descripcion, fotosArray]
    );

    const equipoId = equipoRes.rows[0].id;

    // 7. Crear orden
    const ordenRes = await pool.query(
      'INSERT INTO ordenes (equipo_id, estado_actual) VALUES ($1, $2) RETURNING id',
      [equipoId, 'en revisión']
    );

    const ordenId = ordenRes.rows[0].id;

    // 8. Historial de estado inicial
    await pool.query(
      'INSERT INTO estados (orden_id, estado) VALUES ($1, $2)',
      [ordenId, 'en revisión']
    );

    res.status(201).json({
      mensaje: 'Orden registrada con éxito',
      clienteId,
      equipoId,
      ordenId
    });
  } catch (error) {
    console.error('Error real:', error);
    res.status(500).json({ mensaje: 'Error al registrar la orden', detalle: error.message });
  }
};

// NUEVO: Obtener historial de clientes
exports.obtenerClientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, correo, telefono, creado_en
      FROM clientes
      ORDER BY creado_en DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener los clientes' });
  }
};