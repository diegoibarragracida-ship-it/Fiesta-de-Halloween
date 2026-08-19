# Panel de Invitaciones — R.I.P. 20's 🎃🪦

Sistema completo para gestionar invitaciones y pases del cumpleaños de
Guadalupe Rodríguez Zacarías (Halloween, 17 de octubre 2026).

## ¿Qué incluye?

- **Panel de admin** (`/admin`) protegido con contraseña: agregas invitados
  con su nombre y número de pases, y el sistema genera un link único por
  invitado.
- **Invitación pública personalizada** (`/invite/:code`): cada invitado ve
  su nombre, cuántos pases tiene, la fecha/hora/ubicación (con botón directo
  a Google Maps), countdown en vivo, aviso de disfraz obligatorio, y un
  formulario de RSVP donde elige si asiste, cuántos de sus pases usará, y
  deja un mensaje.
- **Estadísticas en vivo** en el panel: total de invitados, pases
  asignados, confirmados (personas y pases), pendientes y los que no van.
- **Exportar CSV** de toda la lista.
- **Botón de WhatsApp** por invitado para mandarle su link directo.

## Instalación local

```bash
npm install
cp .env.example .env
```

Edita `.env` y cambia `ADMIN_PASSWORD` y `SESSION_SECRET` por algo tuyo.

```bash
npm start
```

Abre `http://localhost:3000/admin/login` con la contraseña que pusiste en
`.env`.

## Base de datos: PostgreSQL

El proyecto guarda todo en PostgreSQL (tabla `guests`, se crea sola la
primera vez que arranca el servidor — no hay que correr ningún script de
migración a mano).

### En Render (recomendado)

1. En el Dashboard de Render: **New → PostgreSQL**. Dale un nombre (ej.
   `fiesta-halloween-db`) y crea la base. Render te da un mes gratis y
   luego cobra un plan chico si la quieres conservar.
2. Cuando esté lista, copia el **"Internal Database URL"** (si tu Web
   Service y la base están en la misma región de Render, es más rápido
   que la External URL).
3. En tu Web Service (el de este proyecto) → pestaña **Environment** →
   agrega la variable `DATABASE_URL` con ese valor.
4. Haz un **Manual Deploy** o simplemente vuelve a hacer push — al
   arrancar, el servidor crea la tabla `guests` automáticamente.

Con esto, tus invitados y sus confirmaciones sobreviven cualquier
redeploy, reinicio o cambio de código futuro — ya no dependen del disco
del contenedor.

### En local (para probar)

Instala Postgres o usa un contenedor Docker, luego en tu `.env`:

```
DATABASE_URL=postgres://usuario:password@localhost:5432/nombre_bd
```

## Editar los datos del evento

Todo está centralizado en `server.js`, en el objeto `EVENT` (arriba del
archivo):

```js
const EVENT = {
  anfitriona: 'Guadalupe Rodríguez Zacarías',
  tituloEvento: "R.I.P. 20's",
  fechaTexto: 'Sábado 17 de octubre, 2026',
  horaTexto: '6:00 PM',
  fechaISO: '2026-10-17T18:00:00',
  lugarTexto: 'Ver ubicación en el mapa',
  mapsUrl: 'https://maps.app.goo.gl/gKUVVM5aMGWdemaF7',
  whatsappHost: '5212345678900', // tu número, sin + ni espacios
};
```

## Cómo agregar invitados

1. Entra a `/admin` con tu contraseña.
2. En "Agregar invitado" escribe el nombre (puede ser una familia, ej.
   "Familia Pérez") y cuántos pases le tocan.
3. Se genera un link único tipo `tudominio.com/invite/ab12cd34`.
4. Dale clic a "🔗 Copiar" o "📱 WhatsApp" para mandárselo directo al
   invitado.
5. Cuando el invitado confirme desde su link, verás su estado actualizado
   en tiempo real en el panel (Confirmado / Tal vez / No asiste) junto con
   cuántos de sus pases va a usar.

## Desplegar en Render (igual que tus otros proyectos)

1. Sube esta carpeta a un repo de GitHub.
2. En Render: New → Web Service → conecta el repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. En "Environment", agrega las variables `ADMIN_PASSWORD`,
   `SESSION_SECRET`, `DATABASE_URL` (ver sección "Base de datos" arriba)
   y opcionalmente `BASE_URL` (la URL pública que te da Render, para que
   los links generados en el panel sean correctos).

### Sobre los datos

Con `DATABASE_URL` configurado, los invitados se guardan en PostgreSQL y
sobreviven redeploys sin problema — no necesitas hacer nada especial.

Si en algún momento decides NO usar Postgres y correr solo con el disco
local (no recomendado para producción), ten en cuenta que en el plan Free
de Render el disco no es persistente entre deploys — cada push puede
borrar los datos.

## Estructura

```
panel-invitaciones-halloween/
├── server.js          Rutas y configuración del evento
├── db.js              Lógica de datos (JSON local)
├── views/
│   ├── login.ejs       Login del admin
│   ├── panel.ejs        Dashboard de gestión
│   ├── invite.ejs        Invitación pública + RSVP
│   └── not-found.ejs      Link inválido
├── data/
│   └── db.json          Se crea automáticamente
├── package.json
└── .env.example
```
