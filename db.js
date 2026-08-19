const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ guests: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function genCode() {
  return crypto.randomBytes(4).toString('hex');
}

module.exports = {
  getAllGuests() {
    return readDb().guests.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  getGuestByCode(code) {
    return readDb().guests.find((g) => g.code === code) || null;
  },

  addGuest({ nombre, pases_asignados }) {
    const data = readDb();
    const guest = {
      id: crypto.randomUUID(),
      code: genCode(),
      nombre: String(nombre).trim(),
      pases_asignados: Math.max(1, Number(pases_asignados) || 1),
      estado: 'pendiente', // pendiente | confirmado | tal-vez | no-asiste
      pases_confirmados: 0,
      mensaje: '',
      created_at: new Date().toISOString(),
      responded_at: null,
    };
    data.guests.push(guest);
    writeDb(data);
    return guest;
  },

  updateRsvp(code, { estado, pases_confirmados, mensaje }) {
    const data = readDb();
    const guest = data.guests.find((g) => g.code === code);
    if (!guest) return null;

    guest.estado = estado;
    if (estado === 'no-asiste') {
      guest.pases_confirmados = 0;
    } else {
      const requested = Number(pases_confirmados) || 1;
      guest.pases_confirmados = Math.min(
        Math.max(1, requested),
        guest.pases_asignados
      );
    }
    guest.mensaje = (mensaje || '').slice(0, 300);
    guest.responded_at = new Date().toISOString();

    writeDb(data);
    return guest;
  },

  deleteGuest(id) {
    const data = readDb();
    data.guests = data.guests.filter((g) => g.id !== id);
    writeDb(data);
  },

  getStats() {
    const guests = readDb().guests;
    const confirmados = guests.filter((g) => g.estado === 'confirmado');
    const talVez = guests.filter((g) => g.estado === 'tal-vez');
    const noAsisten = guests.filter((g) => g.estado === 'no-asiste');
    const pendientes = guests.filter((g) => g.estado === 'pendiente');

    return {
      totalInvitados: guests.length,
      totalPasesAsignados: guests.reduce((s, g) => s + g.pases_asignados, 0),
      confirmadosPersonas: confirmados.length,
      confirmadosPases: confirmados.reduce(
        (s, g) => s + g.pases_confirmados,
        0
      ),
      talVezPersonas: talVez.length,
      noAsistenPersonas: noAsisten.length,
      pendientesPersonas: pendientes.length,
    };
  },
};
