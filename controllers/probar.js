const bcrypt = require('bcryptjs');

bcrypt.hash('tecnico123', 10).then(hash => {
  console.log('Nuevo hash generado:', hash);
});