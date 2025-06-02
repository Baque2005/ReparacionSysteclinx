const nodemailer = require('nodemailer');

// 🔐 Generador de contraseña aleatoria
const generarPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// 📬 Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'systeclinx.reparaciones@gmail.com',
    pass: 'rhnw ekjs fcyw rxqd' // ← Asegúrate de proteger esto en .env en producción
  }
});

// ✉️ Correo de bienvenida
const enviarCorreoBienvenida = async (destinatario, nombreCliente, contraseña) => {
  const mailOptions = {
    from: '"SYSTECLINX Reparaciones" <systeclinx.reparaciones@gmail.com>',
    to: destinatario,
    subject: '🛠️ Bienvenido a SYSTECLINX - Accede a tu cuenta',
    html: `
      <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; background-color: #f9f9f9; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <div style="background-color: #004080; padding: 20px; text-align: center;">
          <img src="https://raw.githubusercontent.com/Baque2005/Organizador/master/Imagen%20de%20WhatsApp%202025-05-25%20a%20las%2016.33.51_c758d0e9.jpg" alt="SYSTECLINX Logo" style="max-height: 60px; border-radius: 8px; margin-bottom: 10px;">
          <h1 style="color: white; margin: 0;">SYSTECLINX</h1>
          <p style="color: #ccc; margin: 0;">Reparaciones Profesionales</p>
        </div>

        <div style="padding: 30px; color: #333;">
          <h2 style="color: #004080;">¡Hola ${nombreCliente}!</h2>
          <p>Tu cuenta ha sido creada exitosamente en <strong>SYSTECLINX</strong>. Desde nuestra plataforma podrás:</p>
          <ul>
            <li>📱 Ver el estado de tus reparaciones en tiempo real</li>
            <li>💬 Recibir notificaciones sobre tus equipos</li>
            <li>📄 Acceder a tus facturas y presupuestos</li>
          </ul>

          <div style="background-color: #e8f0ff; border-left: 4px solid #004080; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0;">🔐 Tus credenciales de acceso:</h3>
            <p style="margin: 0;"><strong>📧 Correo:</strong> ${destinatario}</p>
            <p style="margin: 0;"><strong>🔑 Contraseña temporal:</strong> ${contraseña}</p>
          </div>

          <p>Puedes iniciar sesión haciendo clic en el siguiente enlace:</p>
          <p style="text-align: center;">
            <a href="https://reparacionsysteclinx.onrender.com" style="background-color: #004080; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Acceder a mi cuenta</a>
          </p>

          <p style="font-size: 0.9em; color: #777; margin-top: 30px;">
            Te recomendamos cambiar esta contraseña después del primer ingreso para mayor seguridad.
          </p>
        </div>

        <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 0.85em; color: #888;">
          © 2025 SYSTECLINX. Todos los derechos reservados.<br/>
          Sistema de gestión de reparaciones técnicas.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Correo de bienvenida enviado a', destinatario);
  } catch (err) {
    console.error('❌ Error enviando correo de bienvenida:', err);
  }
};

// 🔁 Correo para restablecer contraseña
const enviarCorreoReset = async (destinatario, token) => {
  const mailOptions = {
    from: '"SYSTECLINX Reparaciones" <systeclinx.reparaciones@gmail.com>',
    to: destinatario,
    subject: '🔐 Restablecimiento de contraseña - SYSTECLINX',
    html: `
      <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
        <h2>Restablecer tu contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el botón de abajo para establecer una nueva:</p>
        <p style="text-align: center;">
          <a href="https://reparacionsysteclinx.onrender.com/cambiar-contraseña?token=${token}" style="background-color: #004080; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Cambiar mi contraseña
          </a>
        </p>
        <p style="font-size: 0.9em; color: #777;">Este enlace caduca en 30 minutos.</p>
        <hr>
        <p style="font-size: 0.8em; color: #aaa;">Si no solicitaste esto, ignora este correo.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Correo de restablecimiento enviado a', destinatario);
  } catch (err) {
    console.error('❌ Error enviando correo de reset:', err);
  }
};

// 🔔 Correo para notificar al cliente de un nuevo presupuesto
const enviarCorreoPresupuesto = async (destinatario, ordenId) => {
  const mailOptions = {
    from: '"SYSTECLINX Reparaciones" <systeclinx.reparaciones@gmail.com>',
    to: destinatario,
    subject: `🔔 Presupuesto disponible para la orden #${ordenId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>📋 Presupuesto disponible</h2>
        <p>El técnico ha registrado un presupuesto para tu orden <strong>#${ordenId}</strong>.</p>
        <p>Por favor, entra a tu cuenta para revisar los detalles y aprobar o rechazar el presupuesto.</p>
        <p style="text-align: center;">
          <a href="https://reparacionsysteclinx.onrender.com" style="background-color: #004080; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ingresar a SYSTECLINX
          </a>
        </p>
        <p style="font-size: 0.9em; color: #777; margin-top: 20px;">Gracias por confiar en SYSTECLINX.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📨 Correo de presupuesto enviado a', destinatario);
  } catch (err) {
    console.error('❌ Error enviando correo de presupuesto:', err);
  }
};

// ✅ Exportar funciones
module.exports = {
  enviarCorreoBienvenida,
  enviarCorreoReset,
  enviarCorreoPresupuesto,
  generarPassword
};