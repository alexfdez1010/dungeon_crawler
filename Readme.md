# YALA · Ecos del abismo

Una expansión del Dungeon Crawler original: un roguelite táctico de fantasía oscura, gratuito y jugable en el navegador. Recupera el Amuleto de Yala atravesando doce plantas procedurales y cuatro dominios.

[Jugar a Yala](https://alexfdez1010.github.io/dungeon_crawler/) · [Edición clásica](https://alexfdez1010.github.io/dungeon_crawler/classic.html)

## La expedición

- **12 plantas, 4 dominios:** Atrio de ceniza, Jardín sepultado, Archivo sumergido y Cámara del eclipse. Mapas conectados, niebla de guerra y minimapa.
- **4 guardianes:** cada tercera planta termina en un jefe con patrones propios, una segunda fase más peligrosa y ataques anunciados en el suelo. El descenso permanece sellado hasta derrotarlo.
- **3 clases:** el Custodio empieza disponible; la Acechadora se desbloquea al derrotar al jefe de la planta 3 y el Arcanista al de la planta 6. Sus habilidades interrumpen grupos, perforan enemigos o explotan en área.
- **16 reliquias:** elige una de tres antes de cada nueva planta. Combina curación por baja, robo de vida, críticos, espinas, energía y daño de habilidad.
- **Combate por turnos:** mueve, ataca, esquiva dos casillas, prepara una guardia o recupera energía. Los enemigos actúan después de tus acciones. Los movimientos inválidos no consumen turnos.
- **Exploración con recursos:** cofres, trampas, fuentes de un solo uso, oro, pociones y santuarios. Una ofrenda cuesta `20 + 3 × planta` de oro y otorga una bendición de ataque y vida.
- **Progreso permanente:** conserva fragmentos incluso al morir y compra cuatro líneas de mejoras para tus siguientes expediciones. La crónica registra tus guardianes derrotados y victorias.
- **Ilustraciones originales:** portada y atlas de ocho personajes generados con ImageGen. Los prompts exactos están en [resources/art/prompts.md](resources/art/prompts.md) y dentro de los PNG.

## Controles

| Acción | Teclado |
| --- | --- |
| Mover / atacar al enemigo contiguo | Flechas o WASD |
| Habilidad de clase | Q |
| Esquivar hacia donde miras, 2 energía | Espacio |
| Guardia: +4 armadura durante el turno | F |
| Beber poción | R |
| Cofres, fuentes, santuarios y descenso | E |
| Esperar / recuperar energía | X o punto |
| Ayuda | H |
| Volver al refugio y conservar expedición | Esc |

En móvil están disponibles la cruceta y todos los botones de acción. También puedes tocar una casilla contigua para moverte o atacar. Pasa el puntero sobre un enemigo para consultar sus estadísticas e intención.

## Guardado

El juego guarda la expedición completa y el legado en `localStorage` después de cada acción. Incluye la semilla y el estado del generador aleatorio para continuar la misma partida. Mantiene una copia anterior validada para recuperar datos si el guardado principal se daña. Una segunda pestaña que detecta cambios detiene sus escrituras para evitar sobrescribir progreso nuevo.

Desde **Crónica** puedes exportar un archivo JSON e importarlo en otro navegador. Importar requiere confirmar el reemplazo del progreso actual. Los datos se conservan solo en ese navegador y origen: borrar sus datos elimina la copia local. Si el navegador impide guardar o se queda sin espacio, el juego lo avisa; exporta una copia antes de cerrar. No hay cuentas ni sincronización en la nube.

## Desarrollo de la edición ampliada

La nueva edición web usa módulos JavaScript nativos, Canvas 2D, HTML y CSS sin dependencias, compilación ni servidor de aplicación. Mantiene el formato de alojamiento estático de GitHub Pages.

```sh
npm start
```

Abre `http://127.0.0.1:8765/`. También puedes servir la raíz con cualquier servidor estático. Node.js 22 o posterior ejecuta las pruebas; Python 3 sirve el juego con el comando anterior.

```sh
npm test
```

Las pruebas verifican determinismo, conectividad en cientos de mapas, validación y recuperación de guardados, recompensas sin duplicación, reglas de combate, habilidades, economía, progresión completa de doce plantas y duelos de las tres clases contra los cuatro guardianes. GitHub Actions ejecuta estas comprobaciones en cada subida a `main`.

- `web/engine.js`: motor determinista, generación, combate y validación.
- `web/content.js`: clases, enemigos, regiones, reliquias, historia y mejoras.
- `web/storage.js`: guardado, respaldo y crédito del progreso.
- `web/renderer.js`: mapa, personajes, minimapa y efectos.
- `web/app.js`: refugio, controles, diario, recompensas y copias de seguridad.

## Edición original de Rust

El juego original, basado en *Hands-on Rust: Effective Learning through 2D Game Development and Play* de Herbert Wolverson, se conserva en `classic.html`, junto con todo el código Rust, las fuentes gráficas y los archivos WebAssembly existentes. Esa edición mantiene sus tres plantas y sus controles originales (flechas, G y números 1–9).

```sh
cargo test
cargo run --release
./generate_wasm.sh
```

La compilación Rust sigue siendo independiente de la edición web ampliada. `generate_wasm.sh` regenera solo los archivos de la edición clásica.

## Publicación

La raíz de `main` contiene la distribución completa: `index.html`, `style.css`, `web/` y `resources/`. No es necesario generar los archivos antes de publicarlos. La edición clásica necesita también `dungeon_crawler.js` y `dungeon_crawler_bg.wasm`. GitHub Pages sirve ambas desde la raíz de `main`.

## Licencia

MIT. Consulta [LICENSE](LICENSE).
