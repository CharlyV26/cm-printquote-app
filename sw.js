/**
 * Lo que hace que la herramienta abra sin señal.
 *
 * La aplicación se compila en UN SOLO archivo —código, estilos y los datos de
 * los 162 equipos van dentro— así que guardar una copia es guardar la página
 * entera y sus iconos. No hace falta llevar la cuenta de decenas de archivos.
 *
 * Estrategia: se responde con la copia guardada de inmediato y, en paralelo,
 * se pide la versión nueva para la próxima vez. Así abre al instante aunque no
 * haya señal, y cuando yo publique un cambio lo tienen al siguiente arranque
 * sin reinstalar nada.
 */

/**
 * La sella el publicador en cada subida. Tiene que cambiar SIEMPRE: el
 * navegador compara este archivo byte a byte y, si sale idéntico, da por hecho
 * que no hay nada nuevo y jamás reemplaza la copia guardada.
 */
const VERSION = "cm-printquote-20260825161012"
const ARCHIVOS = [
  "./",
  "./manifest.webmanifest",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png",
  "./iconos/icono-recortable-512.png",
  "./iconos/icono-apple-180.png",
]

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      // Con addAll un solo archivo que falle tira toda la instalación; se piden
      // por separado para que un icono ausente no deje la app sin copia.
      .then((cache) => Promise.allSettled(ARCHIVOS.map((a) => cache.add(a))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((llaves) => Promise.all(llaves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request
  if (peticion.method !== "GET") return

  const url = new URL(peticion.url)
  // Sólo lo propio: la consulta del tipo de cambio a Banxico tiene que salir a
  // la red siempre, no responder con un valor guardado de la semana pasada.
  if (url.origin !== self.location.origin) return

  // Al navegar se sirve la página guardada; si no hay, se va a la red.
  if (peticion.mode === "navigate") {
    evento.respondWith(
      caches.match("./").then((guardada) => guardada || fetch(peticion)),
    )
    return
  }

  evento.respondWith(
    caches.match(peticion).then((guardada) => {
      const desdeLaRed = fetch(peticion)
        .then((respuesta) => {
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone()
            caches.open(VERSION).then((cache) => cache.put(peticion, copia))
          }
          return respuesta
        })
        .catch(() => guardada)

      return guardada || desdeLaRed
    }),
  )
})
