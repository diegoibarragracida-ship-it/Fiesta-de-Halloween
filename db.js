const { Pool } = require('pg');
const crypto = require('crypto');

// DATABASE_URL la da Render automáticamente al conectar una base de
// datos Postgres a este servicio. En local, ponla en tu .env.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guests (
      id UUID PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      pases_asignados INTEGER NOT NULL DEFAULT 1,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      pases_confirmados INTEGER NOT NULL DEFAULT 0,
      mensaje TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      responded_at TIMESTAMPTZ
    );
  `);
}

function genCode() {
  return crypto.randomBytes(4).toString('hex');
}

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    nombre: r.nombre,
    pases_asignados: r.pases_asignados,
    estado: r.estado,
    pases_confirmados: r.pases_confirmados,
    mensaje: r.mensaje || '',
    created_at: r.created_at,
    responded_at: r.responded_at,
  };
}

module.exports = {
  initDb,

  async getAllGuests() {
    const { rows } = await pool.query(
      'SELECT * FROM guests ORDER BY created_at DESC'
    );
    return rows.map(mapRow);
  },

  async getGuestByCode(code) {
    const { rows } = await pool.query(
      'SELECT * FROM guests WHERE code = $1',
      [code]
    );
    return mapRow(rows[0]);
  },

  async addGuest({ nombre, pases_asignados }) {
    const id = crypto.randomUUID();
    const code = genCode();
    const pases = Math.max(1, Number(pases_asignados) || 1);
    const { rows } = await pool.query(
      `INSERT INTO guests (id, code, nombre, pases_asignados)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, code, String(nombre).trim(), pases]
    );
    return mapRow(rows[0]);
  },

  async updateRsvp(code, { estado, pases_confirmados, mensaje }) {
    const existing = await this.getGuestByCode(code);
    if (!existing) return null;

    let pases;
    if (estado === 'no-asiste') {
      pases = 0;
    } else {
      const requested = Number(pases_confirmados) || 1;
      pases = Math.min(Math.max(1, requested), existing.pases_asignados);
    }

    const { rows } = await pool.query(
      `UPDATE guests
       SET estado = $1, pases_confirmados = $2, mensaje = $3, responded_at = now()
       WHERE code = $4 RETURNING *`,
      [estado, pases, (mensaje || '').slice(0, 300), code]
    );
    return mapRow(rows[0]);
  },

  async deleteGuest(id) {
    await pool.query('DELETE FROM guests WHERE id = $1', [id]);
  },

  async getStats() {
    const guests = await this.getAllGuests();
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
