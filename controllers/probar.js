const bcrypt = require('bcryptjs');

async function generarHash() {
  const contraseña = 'jordy.a.1';
  const hash = await bcrypt.hash(contraseña, 10);
  console.log('Hash generado:', hash);
}

generarHash();