const path = require('path');

// Carga variables desde .env si existe el paquete dotenv; si no, usa process.env tal cual
// IMPORTANTE: esto debe ir ANTES de requerir './db', porque db.js lee
// process.env.DATABASE_URL al momento de crear la conexión.
try {
  require('dotenv').config();
} catch (e) {
  // dotenv es opcional; si no esta instalado, seguimos con las variables del entorno
}

const express = require('express');
const session = require('express-session');
const db = require('./db');

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'halloween30';
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambia-este-secreto';

// ======== EDITA AQUI LOS DATOS DEL EVENTO ========
const EVENT = {
  anfitriona: 'Guadalupe Rodríguez Zacarías',
  tituloEvento: 'Fiesta de Halloween',
  fechaTexto: 'Sábado 17 de octubre, 2026',
  horaTexto: '6:00 PM',
  fechaISO: '2026-10-17T18:00:00',
  lugarTexto: 'Ver ubicación en el mapa',
  mapsUrl: 'https://maps.app.goo.gl/gKUVVM5aMGWdemaF7',
  whatsappHost: '5212345678900', // EDITA: numero de whatsapp de Guadalupe, sin + ni espacios
};
// ==================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 horas
  })
);

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
}

// Envuelve rutas async para mandar cualquier error a un 500 legible
function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// ---------- Home: redirige al panel ----------
app.get('/', (req, res) => res.redirect('/admin'));

// ---------- Login ----------
app.get('/admin/login', (req, res) => {
  res.render('login', { error: null, event: EVENT });
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Contraseña incorrecta', event: EVENT });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- Panel de administración ----------
app.get(
  '/admin',
  requireAuth,
  wrap(async (req, res) => {
    const guests = await db.getAllGuests();
    const stats = await db.getStats();
    res.render('panel', {
      guests,
      stats,
      baseUrl: getBaseUrl(req),
      event: EVENT,
    });
  })
);

app.post(
  '/admin/guests',
  requireAuth,
  wrap(async (req, res) => {
    const { nombre, pases_asignados } = req.body;
    if (nombre && nombre.trim()) {
      await db.addGuest({ nombre, pases_asignados });
    }
    res.redirect('/admin');
  })
);

app.post(
  '/admin/guests/:id/delete',
  requireAuth,
  wrap(async (req, res) => {
    await db.deleteGuest(req.params.id);
    res.redirect('/admin');
  })
);

// ---------- Exportar CSV ----------
app.get(
  '/admin/export.csv',
  requireAuth,
  wrap(async (req, res) => {
    const guests = await db.getAllGuests();
    const header = [
      'Nombre',
      'Pases asignados',
      'Estado',
      'Pases confirmados',
      'Mensaje',
      'Respondio el',
    ];
    const rows = guests.map((g) => [
      g.nombre,
      g.pases_asignados,
      g.estado,
      g.pases_confirmados,
      (g.mensaje || '').replace(/[\r\n,]+/g, ' '),
      g.responded_at || '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="invitados-halloween.csv"'
    );
    res.send('\uFEFF' + csv);
  })
);

// ---------- Invitación pública personalizada ----------
app.get(
  '/invite/:code',
  wrap(async (req, res) => {
    const guest = await db.getGuestByCode(req.params.code);
    if (!guest) {
      return res.status(404).render('not-found', { event: EVENT });
    }
    res.render('invite', { guest, event: EVENT, submitted: false });
  })
);

app.post(
  '/invite/:code/rsvp',
  wrap(async (req, res) => {
    const { estado, pases_confirmados, mensaje } = req.body;
    const guest = await db.updateRsvp(req.params.code, {
      estado,
      pases_confirmados,
      mensaje,
    });
    if (!guest) return res.status(404).render('not-found', { event: EVENT });
    res.render('invite', { guest, event: EVENT, submitted: true });
  })
);

// ---------- Manejo de errores ----------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Ocurrió un error. Revisa los logs del servidor.');
});

// ---------- Arranque: crea la tabla si no existe, luego escucha ----------
db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Panel de invitaciones corriendo en http://localhost:${PORT}`);
      console.log(`Admin: http://localhost:${PORT}/admin/login`);
    });
  })
  .catch((err) => {
    console.error('No se pudo conectar/inicializar la base de datos:', err);
    process.exit(1);
  });
