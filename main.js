const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();
app.set('view engine', 'ejs');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Configurar motor de plantillas
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Configuración de MySQL
const connection = mysql.createConnection({
  host: process.env.DB_HOST,       // Host desde .env
  user: process.env.DB_USER,       // Usuario desde .env
  password: process.env.DB_PASS,   // Contraseña desde .env
  database: process.env.DB_NAME    
});

connection.connect(err => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conexión exitosa a MySQL');
});
connection.connect(err => {
  if (err) throw err;
  console.log('Conectado a la base de datos');
});

// Configuración de Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de puerto
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en funcionamiento en el puerto ${PORT}`));

// Configuración de la sesión
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
}));



app.use(bodyParser.urlencoded({ extended: true }));

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }
  next();
}

//Autorizacion de roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.session.userId && roles.includes(req.session.tipo_usuario)) {
      next();
    } else {
      let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Acceso denegado</title>
      </head>
      <body>
        <h1>Acceso denegado</h1>
        <button onclick="window.location.href='/'">Volver</button>
      </body>
      </html>
    `;
      res.status(403).send(html);
    }
  };
}

// Ruta donde se guardarán los archivos subidos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // crea la carpeta "uploads" si no existe
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Filtro para aceptar solo Excel y PDF
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({ storage, fileFilter });
app.get('/subir-archivo', requireLogin, (req, res) => {
  res.render('subir_archivo');
});


app.post('/subir-archivo', requireLogin, upload.single('archivo'), (req, res) => {
  const { originalname, filename, mimetype } = req.file;

  // Guarda la referencia en la base de datos
  const query = 'INSERT INTO archivos (nombre_original, nombre_guardado, tipo) VALUES (?, ?, ?)';
  connection.query(query, [originalname, filename, mimetype], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send(`
        <div class="mensaje-error">
          <div class="contenedor-mensaje">
            <i class="fas fa-exclamation-circle icono-error"></i>
            <h2>Error al subir archivo</h2>
            <p>Ocurrió un error al guardar el archivo en la base de datos.</p>
            <button class="btn-volver" onclick="window.location.href='/subir-archivo'">
              Volver a intentar
            </button>
          </div>
        </div>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          /* Estilos para mensajes de error */
          .mensaje-error {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            padding: 20px;
          }
          
          .contenedor-mensaje {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
            border-top: 4px solid #e74c3c;
          }
          
          .icono-error {
            font-size: 3.5rem;
            color: #e74c3c;
            margin-bottom: 20px;
          }
          
          .mensaje-error h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-weight: 600;
          }
          
          .mensaje-error p {
            color: #7f8c8d;
            margin-bottom: 25px;
            font-size: 1.1rem;
          }
        </style>
      `);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Archivo Subido - GEB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f9fc;
            margin: 0;
            padding: 0;
          }
          
          .mensaje-exito {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .contenedor-mensaje {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
            border-top: 4px solid #3498db;
          }
          
          .icono-exito {
            font-size: 3.5rem;
            color: #3498db;
            margin-bottom: 20px;
          }
          
          h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-weight: 600;
          }
          
          p {
            color: #7f8c8d;
            margin-bottom: 25px;
            font-size: 1.1rem;
          }
          
          .btn-volver {
            margin-top: 20px;
            padding: 12px 25px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          
          .btn-volver:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }
        </style>
      </head>
      <body>
        <div class="mensaje-exito">
          <div class="contenedor-mensaje">
            <i class="fas fa-check-circle icono-exito"></i>
            <h2>Archivo subido correctamente</h2>
            <p>El archivo "${originalname}" ha sido procesado y almacenado en el sistema.</p>
            <button class="btn-volver" onclick="window.location.href='/subir-archivo'">
              Subir otro archivo
            </button>
            <button class="btn-volver" onclick="window.location.href='/archivos-subidos'" style="margin-left: 10px;">
              Ver archivos subidos
            </button>
          </div>
        </div>
      </body>
      </html>
    `);
  });
});


const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');

app.get('/archivos-subidos',requireLogin, (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send('Error al leer los archivos');
    }

    res.render('archivos', { archivos: files });
  });
});

//Registro de usuario con codigo de acceso
app.post('/registro', (req, res) => {
  const { nombre_usuario, password, codigo_acceso } = req.body;

  const query = 'SELECT tipo_usuario FROM codigos_acceso WHERE codigo = ?';
  connection.query(query, [codigo_acceso], (err, results) => {
      if (err || results.length === 0) {
        let html = `
      <html>
      <head>
       <link rel="stylesheet" href="/styles.css">
        <title>Código de acceso inválido</title>
      </head>
      <body>
        <h1>Código de acceso inválido</h1>
        <div class="button-container">
        <a href="login.html" class="back-button">Volver</a>
        </div>
      </body>
      </html>
    `;
    
   return res.send(html);
      }

      const tipo_usuario = results[0].tipo_usuario;
      const hashedPassword = bcrypt.hashSync(password, 10);

      const insertUser = 'INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, ?)';
      connection.query(insertUser, [nombre_usuario, hashedPassword, tipo_usuario], (err) => {
          if (err) {
            console.log(err);
            let html = `
         <html>
         <head>
           <link rel="stylesheet" href="/styles.css">
           <title>Error al registrar usuario</title>
         </head>
         <body>
           <h1>Error al registrar usuario</h1>
           <div class="button-container">
             <a href="registro.html" class="back-button">Volver</a>
            </div>
         </body>
         </html>
       `;
    
            return res.send(html);

          }
          res.redirect('/login.html');
      });
  });
});




// Iniciar sesión
app.post('/login', (req, res) => {
  const { nombre_usuario, password } = req.body;

  connection.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', 
    [nombre_usuario], async (err, results) => {
    if (err || results.length === 0) {
      let html = `
      <html>
      <head>
       <link rel="stylesheet" href="/styles.css">
        <title> Usuario no encontrado</title>
      </head>
      <body>
        <h1>Usuario no encontrado.</h1>
        <div class="button-container">
        <a href="login.html" class="back-button">Volver</a>
        </div>
      </body>
      </html>
    `;

     return res.send(html);
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      req.session.userId = user.id;
      req.session.username = user.nombre_usuario,
      req.session.tipo_usuario = user.tipo_usuario
      res.redirect('/');
      
    } else {
      let html = `
      <html>
      <head>
       <link rel="stylesheet" href="/styles.css">
        <title> Contraseña incorrecta.</title>
      </head>
      <body>
        <h1>Contraseña incorrecta.</h1>
        
        <div class="button-container">
        <a href="login.html" class="back-button">Volver</a>
        </div>
      </body>
      </html>
    `;

     res.send(html);

    }
  });
});

// Cerrar sesión
app.get('/logout.html', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});


// Ruta para obtener el tipo de usuario actual-NUEVO
app.get('/tipo_usuario', requireLogin, (req, res) => {
  res.json({ tipo_usuario: req.session.tipo_usuario });
});
// Ruta protegida (Página principal después de iniciar sesión)
app.get('/', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Servir archivos estáticos (HTML)
app.use(express.static(path.join(__dirname, 'public')));


// Mostrar formulario de nuevo equipo
app.get('/agregar-equipo', requireLogin, requireRole('admin', 'ing'), (req, res) => {
  res.render('agregar_equipo');
});

// Procesar formulario para insertar equipo
app.post('/agregar-equipo', requireLogin, requireRole('admin', 'ing'), (req, res) => {
  const {
    nombre_equipo,
    fecha_adquisicion,
    estado,
    responsable_id,
    proximo_mantenimiento,
    observaciones
  } = req.body;

  const sql = `
    INSERT INTO equipos_medicos 
    (nombre_equipo, fecha_adquisicion, estado, responsable_id, proximo_mantenimiento, observaciones)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  connection.query(sql, [
    nombre_equipo,
    fecha_adquisicion || null,
    estado,
    responsable_id || null,
    proximo_mantenimiento || null,
    observaciones
  ], (err, result) => {
    if (err) {
      console.error(err);
      return res.send('Error al insertar el equipo.');
    }
    res.redirect('/equipos');
  });
});

// Ruta para mostrar equipos médicos
app.get('/equipos', requireLogin, requireRole('admin', 'ing', 'medico'),(req, res) => {
    const sql = `
        SELECT 
            e.id_equipo,
            e.nombre_equipo,
            e.fecha_adquisicion,
            e.estado,
            e.proximo_mantenimiento,
            e.observaciones,
            u.nombre_usuario AS responsable
        FROM equipos_medicos e
        LEFT JOIN usuarios u ON e.responsable_id = u.id
    `;

    connection.query(sql, (err, resultados) => {
        if (err) throw err;
        res.render('equipos', { equipos: resultados });
    });
});
app.get('/admin/equipos', requireLogin, requireRole('admin'), (req, res) => {
  const sql = `
    SELECT 
        e.id_equipo,
        e.nombre_equipo,
        e.fecha_adquisicion,
        e.estado,
        e.proximo_mantenimiento,
        e.observaciones,
        u.nombre_usuario AS responsable
    FROM equipos_medicos e
    LEFT JOIN usuarios u ON e.responsable_id = u.id
  `;
  
  connection.query(sql, (err, resultados) => {
    if (err) {
      return res.send('Error al obtener los equipos médicos.');
    }
    res.render('admin_equipos', { equipos: resultados }); // Asegúrate de tener esta vista
  });
});

app.get('/admin/equipos/:id/editar', requireLogin, requireRole('admin'), (req, res) => {
  const id = req.params.id;
  connection.query('SELECT * FROM equipos_medicos WHERE id_equipo = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Equipo no encontrado');
    }
    res.render('editar_equipo', { equipo: results[0] });
  });
});

app.post('/admin/equipos/:id/editar', requireLogin, requireRole('admin'), (req, res) => {
  const id = req.params.id;
  const { nombre_equipo, fecha_adquisicion, estado, proximo_mantenimiento, responsable_id  ,observaciones } = req.body;

  const sql = `
    UPDATE equipos_medicos
    SET nombre_equipo = ?, fecha_adquisicion = ?, estado = ?, proximo_mantenimiento = ?, responsable_id= ?,observaciones = ?
    WHERE id_equipo = ?
  `;
  connection.query(sql, [nombre_equipo, fecha_adquisicion, estado, proximo_mantenimiento, responsable_id,observaciones, id], (err) => {
    if (err) {
      return res.send('Error al actualizar el equipo.');
    }
    res.redirect('/admin/equipos');
  });
});
app.post('/admin/equipos/:id/eliminar', requireLogin, requireRole('admin'), (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM equipos_medicos WHERE id_equipo = ?', [id], (err) => {
    if (err) {
      return res.send('Error al eliminar el equipo.');
    }
    res.redirect('/admin/equipos');
  });
});



app.get('/admin/medicos', requireLogin, requireRole('admin'), (req, res) => {
  const sql = `SELECT * FROM usuarios WHERE tipo_usuario = 'medico'`;

  connection.query(sql, (err, resultados) => {
    if (err) {
      return res.send('Error al obtener los médicos.');
    }
    res.render('admin_medicos', { medicos: resultados });
  });
});



app.get('/ver-mis-datos', requireLogin, requireRole('medico'), (req, res) => {
  const usuarioId = req.session.userId;

  const query = 'SELECT * FROM medicos WHERE id_medico = ?';
  connection.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('Error al obtener datos del médico:', err);
      return res.send('Error al obtener datos del médico.');
    }

    if (results.length === 0) {
      return res.render('sin_datos_medico', { tipoUsuario: req.session.tipoUsuario });
    }

    const medico = results[0];
    res.render('mis_datos_medico', { medico, tipoUsuario: req.session.tipoUsuario });
  });
});

// Ruta: Formulario para crear datos (médico)
app.get('/crear-mis-datos', requireLogin, requireRole('medico'), (req, res) => {
  res.send(`
    <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Crear Datos</title>
      </head>
      <body>
        <h1>Crear mis datos</h1>
        <form action="/crear-mis-datos" method="POST">
          <label>Nombre: <input type="text" name="nombre" required></label><br>
          <label>Apellido: <input type="text" name="apellido" required></label><br>
          <label>Especialidad: <input type="text" name="especialidad" required></label><br>
          <button type="submit">Guardar</button>
        </form>
        <button onclick="window.location.href='/ver-mis-datos'">Cancelar</button>
      </body>
    </html>
  `);
});

// Ruta: Guardar datos del médico
app.post('/crear-mis-datos', requireLogin, requireRole('medico'), (req, res) => {
  const usuarioId = req.session.userId;
  const { nombre, apellido, especialidad } = req.body;

  const query = 'INSERT INTO medicos (nombre, apellido, especialidad,id_medico) VALUES (?, ?, ?, ?)';
  connection.query(query, [nombre, apellido, especialidad, usuarioId], (err, result) => {
    if (err) {
      console.error('Error al guardar datos del médico:', err);
      return res.send('Error al guardar datos del médico.');
    }

    res.redirect('/ver-mis-datos');
  });
});

app.get('/crear-mis-datosing', requireLogin, requireRole('ing'), (req, res) => {
  res.send(`
    <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Crear Datos</title>
      </head>
      <body>
        <h1>Crear mis datos</h1>
        <form action="/crear-mis-datosing" method="POST">
          <label>Nombre: <input type="text" name="nombre" required></label><br>
          <label>Apellido: <input type="text" name="apellido" required></label><br>
          <label>Cédula Profesional: <input type="text" name="cedula_profesional" required></label><br>
          <button type="submit">Guardar</button>
        </form>
        <button onclick="window.location.href='/ver-mis-datosing'">Cancelar</button>
      </body>
    </html>
  `);
});
app.post('/crear-mis-datosing', requireLogin, requireRole('ing'), (req, res) => {
  const usuarioId = req.session.userId;
  const { nombre, apellido, cedula_profesional } = req.body;

  const query = 'INSERT INTO ingenieros (nombre, apellido, cedula_profesional) VALUES (?, ?, ?)';
  connection.query(query, [nombre, apellido, cedula_profesional], (err, result) => {
    if (err) {
      console.error('Error al guardar datos del ingeniero:', err);
      return res.send('Error al guardar datos del ingeniero.');
    }

    res.redirect('/ver-mis-datosing');
  });
});


app.get('/ver-mis-datosing', requireLogin, requireRole('ing'), (req, res) => {
  const usuarioId = req.session.userId;

  const query = 'SELECT * FROM ingenieros WHERE id_ingenieros = ?';
  connection.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('Error al obtener datos del ingeniero:', err);
      return res.send('Error al obtener datos del ingeniero.');
    }

    if (results.length === 0) {
      return res.send(`
        <html>
          <head>
            <link rel="stylesheet" href="/styles.css">
            <title>Sin datos</title>
          </head>
          <body>
            <%- include('partials/navbar') %>
            <h1>No hay datos registrados aún.</h1>
            <button onclick="window.location.href='/crear-mis-datosing'">Crear mis datos</button>
          </body>
        </html>
      `);
    }

    const ingeniero = results[0];
    res.render('mis_datos_ingeniero', { ingeniero });
  });
});



app.get('/buscar', (req, res) => {
  const query = req.query.query;

  const sql = 'SELECT * FROM equipos_medicos WHERE nombre_equipo LIKE ?';
  connection.query(sql, [`%${query}%`], (err, results) => {
    if (err) {
      console.error('Error al buscar equipos:', err);
      return res.status(500).json({ error: 'Error al buscar equipos' });
    }
    res.json(results);
  });
});

app.get('/buscar_medico', (req, res) => {
  const query = req.query.query;

  const sql = `
    SELECT * FROM medicos
    WHERE nombre LIKE ? OR apellido LIKE ? OR especialidad LIKE ?
  `;
  const likeQuery = `%${query}%`;

  connection.query(sql, [likeQuery, likeQuery, likeQuery], (err, results) => {
    if (err) {
      console.error('Error al buscar médicos:', err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});
app.get('/lista-medicos', requireLogin, requireRole('admin'), (req, res) => {
  const query = 'SELECT * FROM medicos';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener médicos:', err);
      return res.status(500).send('Error al obtener médicos.');
    }

    res.render('lista_medicos', { medicos: results });
  });
});
app.get('/eliminar-medico/:id', requireLogin, requireRole('admin'), (req, res) => {
  const medicoId = req.params.id;

  connection.query('DELETE FROM medicos WHERE id_medico = ?', [medicoId], (err) => {
    if (err) {
      console.error('Error al eliminar médico:', err);
      return res.status(500).send('Error al eliminar médico.');
    }

    res.redirect('/lista-medicos');
  });
});




app.post('/upload-medicos', upload.single('excelFile'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  let errors = [];
  let successCount = 0;

  // Procesamos cada fila del archivo
  const processRow = (row, index) => {
    return new Promise((resolve) => {
      const { nombre, apellido, especialidad } = row;
      const sql = `INSERT INTO medicos (nombre, apellido, especialidad) VALUES (?, ?, ?)`;
      connection.query(sql, [nombre, apellido, especialidad], (err) => {
        if (err) {
          console.error('Error al insertar:', err);
          errors.push(`Fila ${index + 1}: ${err.message}`);
          resolve(false);
        } else {
          successCount++;
          resolve(true);
        }
      });
    });
  };

  // Procesamos todas las filas secuencialmente
  const processAllRows = async () => {
    for (let i = 0; i < data.length; i++) {
      await processRow(data[i], i);
    }

    // Eliminar el archivo después de procesarlo
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error al eliminar archivo:', err);
    });

    // Enviar respuesta con estilo profesional
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resultado de Carga - GEB</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f9fc;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        
        .container {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 600px;
          width: 90%;
          border-top: 4px solid #3498db;
          text-align: center;
        }
        
        .icono-exito {
          font-size: 3rem;
          color: #3498db;
          margin-bottom: 20px;
        }
        
        h1 {
          color: #2c3e50;
          margin-bottom: 20px;
          font-weight: 600;
        }
        
        .resumen {
          background-color: #f1f9ff;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          text-align: left;
        }
        
        .resumen-item {
          margin: 10px 0;
          display: flex;
          align-items: center;
        }
        
        .resumen-icon {
          margin-right: 10px;
          font-size: 1.2rem;
        }
        
        .success {
          color: #27ae60;
        }
        
        .error {
          color: #e74c3c;
        }
        
        .btn {
          display: inline-block;
          padding: 12px 25px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          text-decoration: none;
          margin: 10px 5px;
        }
        
        .btn:hover {
          background-color: #2980b9;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .btn-secondary {
          background-color: #2c3e50;
        }
        
        .btn-secondary:hover {
          background-color: #1a2635;
        }
        
        .errores-container {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 20px;
          text-align: left;
          border: 1px solid #e0e6ed;
          padding: 10px;
          border-radius: 6px;
          background-color: #f8fafc;
        }
        
        .error-item {
          padding: 8px;
          border-bottom: 1px solid #e0e6ed;
          font-size: 0.9rem;
          color: #7f8c8d;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <i class="fas fa-file-excel icono-exito"></i>
        <h1>Procesamiento de Archivo Completo</h1>
        
        <div class="resumen">
          <div class="resumen-item">
            <i class="fas fa-check-circle resumen-icon success"></i>
            <span>Médicos insertados correctamente: <strong>${successCount}</strong></span>
          </div>
          <div class="resumen-item">
            <i class="fas fa-exclamation-circle resumen-icon error"></i>
            <span>Errores encontrados: <strong>${errors.length}</strong></span>
          </div>
        </div>
        
        ${errors.length > 0 ? `
        <h3>Detalle de errores:</h3>
        <div class="errores-container">
          ${errors.map(error => `<div class="error-item">${error}</div>`).join('')}
        </div>
        ` : ''}
        
        <div>
          <a href="/cmedicos.html" class="btn">
            <i class="fas fa-upload"></i> Cargar otro archivo
          </a>
          <a href="/lista-medicos" class="btn btn-secondary">
            <i class="fas fa-user-md"></i> Ver lista de médicos
          </a>
        </div>
      </div>
    </body>
    </html>
    `);
  };

  processAllRows();
});
app.get('/download-medicos', (req, res) => {
  const sql = `SELECT * FROM medicos`; // asegúrate que el nombre de la tabla es correcto
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error al consultar médicos:', err);
      return res.status(500).send('Error al generar archivo.');
    }

    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'medicos');

    const filePath = path.join(__dirname, 'uploads', 'medicos.xlsx');
    xlsx.writeFile(workbook, filePath);

    res.download(filePath, 'medicos.xlsx');
  });
});




app.get('/ver-usuarios', requireLogin, requireRole('admin'), (req, res) => {
  const query = 'SELECT * FROM usuarios';
  connection.query(query, (err, results) => {
    if (err) return res.send('Error al obtener usuarios');
    res.render('ver-usuarios', { usuarios: results });
  });
});


app.get('/equipos-en-mantenimiento', requireLogin, requireRole('ing'), (req, res) => {
  const query = `
    SELECT * FROM equipos_medicos 
    WHERE estado = 'En mantenimiento' OR estado = 'Fuera de servicio'
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener equipos:', err);
      return res.send('Error al obtener los equipos.');
    }

    res.render('equipos_mantenimiento', { equipos: results });
  });
});

app.get('/editar-equipo/:id', requireLogin, requireRole('ing'), (req, res) => {
  const idEquipo = req.params.id;

  const query = 'SELECT * FROM equipos_medicos WHERE id_equipo = ?';
  connection.query(query, [idEquipo], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error al obtener el equipo:', err);
      return res.send('Error al obtener los datos del equipo.');
    }

    const equipo = results[0];
    res.send(`
      <html>
        <head>
          <link rel="stylesheet" href="/styles.css">
          <title>Editar Equipo</title>
        </head>
        <body>
          <h1>Editar Equipo</h1>
          <form action="/editar-equipo/${idEquipo}" method="POST">
            <label>Estado:</label>
            <select name="estado" required>
              <option value="Operativo" ${equipo.estado === 'Operativo' ? 'selected' : ''}>Operativo</option>
              <option value="En mantenimiento" ${equipo.estado === 'En mantenimiento' ? 'selected' : ''}>En mantenimiento</option>
              <option value="Fuera de servicio" ${equipo.estado === 'Fuera de servicio' ? 'selected' : ''}>Fuera de servicio</option>
            </select><br><br>

            <label>Próximo mantenimiento:</label>
            <input type="date" name="proximo_mantenimiento" value="${equipo.proximo_mantenimiento ? equipo.proximo_mantenimiento.toISOString().split('T')[0] : ''}"><br><br>

            <label>Observaciones:</label><br>
            <textarea name="observaciones" rows="4" cols="50">${equipo.observaciones || ''}</textarea><br><br>

            <button type="submit">Guardar Cambios</button>
            <button onclick="window.location.href='/equipos-en-mantenimiento'" type="button">Cancelar</button>
          </form>
        </body>
      </html>
    `);
  });
});

app.post('/editar-equipo/:id', requireLogin, requireRole('ing'), (req, res) => {
  const idEquipo = req.params.id;
  const { estado, proximo_mantenimiento, observaciones } = req.body;

  const query = `
    UPDATE equipos_medicos 
    SET estado = ?, proximo_mantenimiento = ?, observaciones = ? 
    WHERE id_equipo = ?
  `;

  connection.query(query, [estado, proximo_mantenimiento || null, observaciones || null, idEquipo], (err, result) => {
    if (err) {
      console.error('Error al actualizar el equipo:', err);
      return res.send('Error al actualizar los datos del equipo.');
    }

    res.redirect('/equipos-en-mantenimiento');
  });
});

app.get('/editar-equipo-medicom/:id', requireLogin, requireRole('medico'), (req, res) => {
  const idEquipo = req.params.id;

  const query = 'SELECT * FROM equipos_medicos WHERE id_equipo = ?';
  connection.query(query, [idEquipo], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error al obtener equipo:', err);
      return res.send('Error al obtener los datos del equipo.');
    }

    const equipo = results[0];
    res.send(`
      <html>
        <head>
          <link rel="stylesheet" href="/styles.css">
          <title>Editar Equipo (Médico)</title>
        </head>
        <body>
          <h1>Editar Estado del Equipo</h1>
          <form action="/editar-equipo-medicom/${idEquipo}" method="POST">
            <label>Estado:</label>
            <select name="estado" required>
              <option value="Operativo" ${equipo.estado === 'Operativo' ? 'selected' : ''}>Operativo</option>
              <option value="En mantenimiento" ${equipo.estado === 'En mantenimiento' ? 'selected' : ''}>En mantenimiento</option>
              <option value="Fuera de servicio" ${equipo.estado === 'Fuera de servicio' ? 'selected' : ''}>Fuera de servicio</option>
            </select><br><br>

            <label>Observaciones:</label><br>
            <textarea name="observaciones" rows="4" cols="50">${equipo.observaciones || ''}</textarea><br><br>

            <button type="submit">Guardar Cambios</button>
            <button onclick="window.location.href='/'" type="button">Cancelar</button>
          </form>
        </body>
      </html>
    `);
  });
});
app.post('/editar-equipo-medicom/:id', requireLogin, requireRole('medico'), (req, res) => {
  const idEquipo = req.params.id;
  const { estado, observaciones } = req.body;

  const query = `
    UPDATE equipos_medicos 
    SET estado = ?, observaciones = ? 
    WHERE id_equipo = ?
  `;

  connection.query(query, [estado, observaciones || null, idEquipo], (err, result) => {
    if (err) {
      console.error('Error al actualizar equipo (médico):', err);
      return res.send('Error al actualizar el equipo.');
    }

    res.redirect('/'); // Puedes cambiar esto a una lista de equipos si tienes una
  });
});
app.get('/equiposm', requireLogin, requireRole('medico'), (req, res) => {
  const query = 'SELECT * FROM equipos_medicos';
  connection.query(query, (err, equipos) => {
    if (err) {
      console.error('Error al obtener equipos:', err);
      return res.send('Error al obtener los equipos.');
    }

    res.render('equipos_medico', {
      equipos,
      tipoUsuario: req.session.tipoUsuario
    });
  });
});

app.get('/estadisticas', requireLogin, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS total_equipos,
      AVG(DATEDIFF(proximo_mantenimiento, fecha_adquisicion)) AS promedio_dias_entre_mantenimientos
    FROM equipos_medicos;
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      return res.status(500).send('Error en la base de datos');
    }

    const stats = results[0];
    const promedioFormateado = (stats.promedio_dias_entre_mantenimientos !== null && !isNaN(stats.promedio_dias_entre_mantenimientos))
      ? Number(stats.promedio_dias_entre_mantenimientos).toFixed(2)
      : 'No disponible';

    res.render('estadisticas', {
      totalEquipos: stats.total_equipos,
      promedioDias: promedioFormateado
    });
  });
});


app.post('/reportar-equipo', requireLogin, requireRole('ing'), (req, res) => {
  const { id_equipo, motivo } = req.body;

  connection.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - GEB</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f5f9fc;
              margin: 0;
              padding: 0;
            }
            
            .mensaje-error {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            
            .contenedor-mensaje {
              background-color: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              text-align: center;
              max-width: 500px;
              width: 100%;
              border-top: 4px solid #e74c3c;
            }
            
            .icono-error {
              font-size: 3.5rem;
              color: #e74c3c;
              margin-bottom: 20px;
            }
            
            h2 {
              color: #2c3e50;
              margin-bottom: 15px;
              font-weight: 600;
            }
            
            p {
              color: #7f8c8d;
              margin-bottom: 25px;
              font-size: 1.1rem;
            }
            
            .btn-volver {
              margin-top: 20px;
              padding: 12px 25px;
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.3s;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .btn-volver:hover {
              background-color: #2980b9;
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
          </style>
        </head>
        <body>
          <div class="mensaje-error">
            <div class="contenedor-mensaje">
              <i class="fas fa-exclamation-circle icono-error"></i>
              <h2>Error en la transacción</h2>
              <p>No se pudo iniciar el proceso de reporte del equipo.</p>
              <button class="btn-volver" onclick="window.location.href='/reportar-equipo'">
                Volver a intentar
              </button>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Se actualiza el estado y se agrega el motivo como observación
    const updateQuery = 'UPDATE equipos_medicos SET estado = ?, observaciones = ? WHERE id_equipo = ?';
    connection.query(updateQuery, ['Fuera de servicio', motivo, id_equipo], (err, result) => {
      if (err) {
        return connection.rollback(() => {
          res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Error - GEB</title>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
              <style>
                /* Mismos estilos que arriba */
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background-color: #f5f9fc;
                  margin: 0;
                  padding: 0;
                }
                
                .mensaje-error {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  padding: 20px;
                }
                
                .contenedor-mensaje {
                  background-color: white;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  max-width: 500px;
                  width: 100%;
                  border-top: 4px solid #e74c3c;
                }
                
                .icono-error {
                  font-size: 3.5rem;
                  color: #e74c3c;
                  margin-bottom: 20px;
                }
                
                h2 {
                  color: #2c3e50;
                  margin-bottom: 15px;
                  font-weight: 600;
                }
                
                p {
                  color: #7f8c8d;
                  margin-bottom: 25px;
                  font-size: 1.1rem;
                }
                
                .btn-volver {
                  margin-top: 20px;
                  padding: 12px 25px;
                  background-color: #3498db;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-weight: 600;
                  transition: all 0.3s;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                
                .btn-volver:hover {
                  background-color: #2980b9;
                  transform: translateY(-2px);
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
              </style>
            </head>
            <body>
              <div class="mensaje-error">
                <div class="contenedor-mensaje">
                  <i class="fas fa-exclamation-circle icono-error"></i>
                  <h2>Error al actualizar equipo</h2>
                  <p>No se pudo marcar el equipo como fuera de servicio.</p>
                  <button class="btn-volver" onclick="window.location.href='/reportar-equipo'">
                    Volver a intentar
                  </button>
                </div>
              </div>
            </body>
            </html>
          `);
        });
      }

      connection.commit(err => {
        if (err) {
          return connection.rollback(() => {
            res.send(`
              <!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - GEB</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                  /* Mismos estilos que arriba */
                  body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f5f9fc;
                    margin: 0;
                    padding: 0;
                  }
                  
                  .mensaje-error {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    padding: 20px;
                  }
                  
                  .contenedor-mensaje {
                    background-color: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    border-top: 4px solid #e74c3c;
                  }
                  
                  .icono-error {
                    font-size: 3.5rem;
                    color: #e74c3c;
                    margin-bottom: 20px;
                  }
                  
                  h2 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-weight: 600;
                  }
                  
                  p {
                    color: #7f8c8d;
                    margin-bottom: 25px;
                    font-size: 1.1rem;
                  }
                  
                  .btn-volver {
                    margin-top: 20px;
                    padding: 12px 25px;
                    background-color: #3498db;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                  }
                  
                  .btn-volver:hover {
                    background-color: #2980b9;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                  }
                </style>
              </head>
              <body>
                <div class="mensaje-error">
                  <div class="contenedor-mensaje">
                    <i class="fas fa-exclamation-circle icono-error"></i>
                    <h2>Error al confirmar transacción</h2>
                    <p>No se pudo completar el reporte del equipo.</p>
                    <button class="btn-volver" onclick="window.location.href='/reportar-equipo'">
                      Volver a intentar
                    </button>
                  </div>
                </div>
              </body>
              </html>
            `);
          });
        }

        res.send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Éxito - GEB</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f9fc;
                margin: 0;
                padding: 0;
              }
              
              .mensaje-exito {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              
              .contenedor-mensaje {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
                border-top: 4px solid #3498db;
              }
              
              .icono-exito {
                font-size: 3.5rem;
                color: #3498db;
                margin-bottom: 20px;
              }
              
              h2 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-weight: 600;
              }
              
              p {
                color: #7f8c8d;
                margin-bottom: 25px;
                font-size: 1.1rem;
              }
              
              .btn-volver {
                margin-top: 20px;
                padding: 12px 25px;
                background-color: #3498db;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              
              .btn-volver:hover {
                background-color: #2980b9;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
              }
              
              .btn-alternativo {
                margin-top: 20px;
                padding: 12px 25px;
                background-color: #2c3e50;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                margin-left: 10px;
              }
              
              .btn-alternativo:hover {
                background-color: #1a2635;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
              }
            </style>
          </head>
          <body>
            <div class="mensaje-exito">
              <div class="contenedor-mensaje">
                <i class="fas fa-check-circle icono-exito"></i>
                <h2>Equipo reportado correctamente</h2>
                <p>El equipo ID ${id_equipo} ha sido marcado como "Fuera de servicio".</p>
                <p><strong>Observación registrada:</strong> ${motivo}</p>
                <div>
                  <button class="btn-volver" onclick="window.location.href='/reportar-equipo'">
                    Reportar otro equipo
                  </button>
                  <button class="btn-alternativo" onclick="window.location.href='/equipos-en-mantenimiento'">
                    Ver equipos en mantenimiento
                  </button>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
      });
    });
  });
});

app.get('/reportar-equipo', requireLogin, requireRole('ing'), (req, res) => {
  const query = 'SELECT id_equipo, nombre_equipo FROM equipos_medicos';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener equipos médicos:', err);
      return res.send('Error al obtener equipos médicos.');
    }

    res.render('reportar_equipo', {
      equipos: results,
      tipoUsuario: req.session.tipoUsuario // para mostrar el navbar adecuado
    });
  });
});


app.get('/equipos-observaciones-extensas', requireLogin, requireRole('ing', 'admin'), (req, res) => {
  const query = `
    SELECT *
    FROM equipos_medicos
    WHERE LENGTH(observaciones) > (
      SELECT AVG(LENGTH(observaciones)) FROM equipos_medicos
    )
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error ejecutando subconsulta:', err);
      return res.send('Error al obtener los equipos.');
    }

    res.render('equipos_observaciones', { equipos: results });
  });
});


// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});  



 
