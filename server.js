const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const pool = require('./db');

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

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/equipos', equipoRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/entrega', entregaRoutes);
app.use('/api/consulta', consultaRoutes);
app.use('/api/recepcionista', recepcionistaRoutes);
app.use('/api/usuarios', usuarioRoutes);

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend activo en puerto ${PORT}`);
});