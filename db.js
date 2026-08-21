const mongoose = require('mongoose');
const crypto = require('crypto');

// MONGODB_URI la pones tú: el connection string de tu clúster de MongoDB
// Atlas. Puedes reutilizar el mismo clúster de tus otros proyectos —
// solo usa un nombre de base de datos distinto en la URL (ej. termina en
// "/halloween-invite") para que no se mezcle con tus otras colecciones.
const MONGODB_URI = process.env.MONGODB_URI;

async function initDb() {
  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }
  await mongoose.connect(MONGODB_URI);
}

// Colección "halloween_guests" — nombre explícito para que, aunque
// compartas clúster o base de datos con otro proyecto, no choque con
// nada existente.
const guestSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  nombre: { type: String, required: true, trim: true },
  pases_asignados: { type: Number, required: true, default: 1 },
  estado: { type: String, required: true, default: 'pendiente' },
  pases_confirmados: { type: Number, required: true, default: 0 },
  mensaje: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  responded_at: { type: Date, default: null },
});

const Guest = mongoose.model('Guest', guestSchema, 'halloween_guests');

function genCode() {
  return crypto.randomBytes(4).toString('hex');
}

function mapDoc(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    code: doc.code,
    nombre: doc.nombre,
    pases_asignados: doc.pases_asignados,
    estado: doc.estado,
    pases_confirmados: doc.pases_confirmados,
    mensaje: doc.mensaje || '',
    created_at: doc.created_at,
    responded_at: doc.responded_at,
  };
}

module.exports = {
  initDb,

  async getAllGuests() {
    const docs = await Guest.find().sort({ created_at: -1 });
    return docs.map(mapDoc);
  },

  async getGuestByCode(code) {
    const doc = await Guest.findOne({ code });
    return mapDoc(doc);
  },

  async addGuest({ nombre, pases_asignados }) {
    const pases = Math.max(1, Number(pases_asignados) || 1);
    const doc = await Guest.create({
      code: genCode(),
      nombre: String(nombre).trim(),
      pases_asignados: pases,
    });
    return mapDoc(doc);
  },

  async updateRsvp(code, { estado, pases_confirmados, mensaje }) {
    const existing = await Guest.findOne({ code });
    if (!existing) return null;

    let pases;
    if (estado === 'no-asiste') {
      pases = 0;
    } else {
      const requested = Number(pases_confirmados) || 1;
      pases = Math.min(Math.max(1, requested), existing.pases_asignados);
    }

    existing.estado = estado;
    existing.pases_confirmados = pases;
    existing.mensaje = (mensaje || '').slice(0, 300);
    existing.responded_at = new Date();
    await existing.save();
    return mapDoc(existing);
  },

  async deleteGuest(id) {
    await Guest.deleteOne({ _id: id });
  },

  async getStats() {
    const guests = await this.getAllGuests();
    const confirmados = guests.filter((g) => g.estado === 'confirmado');
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
      noAsistenPersonas: noAsisten.length,
      pendientesPersonas: pendientes.length,
    };
  },
};
