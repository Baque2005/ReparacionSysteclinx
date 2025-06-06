const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path'); // ✅ Necesario para servir React

const app = express();
const pool = require('./db');

// Middleware
app.use(cors());
app.use(express.json());

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const equipoRoutes = require('./routes/equipoRoutes');
const ordenRoutes = require('./routes/ordenRoutes');
const facturaRoutes = require('./routes/facturaRoutes');
const entregaRoutes = require('./routes/entregaRoutes');
const consultaRoutes = require('./routes/consultaRoutes');
const recepcionistaRoutes = require('./routes/recepcionistaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

// Usar rutas API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/equipos', equipoRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/entrega', entregaRoutes);
app.use('/api/consulta', consultaRoutes);
app.use('/api/recepcionista', recepcionistaRoutes);
app.use('/api/usuarios', usuarioRoutes);

// ✅ Servir archivos estáticos de React (build)
app.use(express.static(path.join(__dirname, 'build')));

// ✅ Redirigir todo lo que no sea API al index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend activo en puerto ${PORT}`);
});

pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err);
  } else {
    console.log('✅ Conexión a la base de datos exitosa:', result.rows);
  }
});