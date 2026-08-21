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

## Base de datos: MongoDB

El proyecto guarda todo en MongoDB (colección `halloween_guests`, se
crea sola la primera vez que arranca el servidor — no hay que correr
ningún script de migración a mano).

### En local (para probar)

En tu `.env`:

```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/halloween-invite
```

Puedes usar el mismo clúster de MongoDB Atlas que ya tienes para tus
otros proyectos — solo cambia el nombre de la base de datos al final de
la URL (aquí `halloween-invite`) para no mezclar colecciones.

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

## Desplegar en Render usando tu clúster de MongoDB Atlas ya existente

Este proyecto está configurado para reutilizar tu clúster de MongoDB
Atlas que ya tienes corriendo (el mismo de tus otros proyectos) — no se
crea ninguna base nueva. La colección de esta app se llama
`halloween_guests` dentro de una base de datos separada
(`halloween-invite`), así que convive sin problema con las colecciones
de tu otro proyecto en ese mismo clúster.

1. Sube esta carpeta a un repo de GitHub.
2. En MongoDB Atlas, entra a tu clúster existente → **Connect** → **Drivers**
   → copia el connection string (`mongodb+srv://...`). Al final de la
   URL, después de la última `/`, agrega el nombre de base de datos
   `halloween-invite` (ej. `.../halloween-invite?retryWrites=true...`).
3. Verifica en **Network Access** de Atlas que la IP `0.0.0.0/0` esté
   permitida (o agrega la de Render), para que el Web Service pueda
   conectarse.
4. En Render: **New → Web Service** → conecta este repo.
5. Build command: `npm install` · Start command: `npm start`
6. En "Environment", agrega:
   - `MONGODB_URI`: el connection string que armaste en el paso 2.
   - `ADMIN_PASSWORD`: la contraseña que quieras para el panel.
   - `SESSION_SECRET`: cualquier texto largo aleatorio.
   - `BASE_URL`: la URL pública que Render te asigna a este servicio
     (para que los links generados en el panel sean correctos). Puedes
     dejarla vacía en el primer deploy y agregarla después.
7. Deploy. Al arrancar, el servidor crea la colección `halloween_guests`
   en tu base `halloween-invite` automáticamente — no toca ni borra
   nada de tus otros proyectos en ese clúster.

### Sobre los datos

Con `MONGODB_URI` apuntando a tu clúster existente, los invitados
sobreviven redeploys, reinicios y no dependen del disco del contenedor.
Recuerda lo que ya aprendiste con tu clúster: los clústeres M0 gratis se
pueden pausar por inactividad, así que si el panel lleva tiempo sin
recibir tráfico antes de la fiesta, entra a Atlas para reanudarlo si
hace falta.

## Estructura

```
panel-invitaciones-halloween/
├── server.js          Rutas y configuración del evento
├── db.js              Lógica de datos (MongoDB / Mongoose)
├── views/
│   ├── login.ejs       Login del admin
│   ├── panel.ejs        Dashboard de gestión
│   ├── invite.ejs        Invitación pública + RSVP
│   └── not-found.ejs      Link inválido
├── package.json
├── render.yaml
└── .env.example
```
