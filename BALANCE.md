# Equilibrado reproducible

El simulador ejecuta expediciones completas mediante las mismas funciones `createRun`, `act` y `chooseRelic` que usa la interfaz. No ajusta estadísticas, no elimina enemigos, no cambia posiciones y no fuerza descensos. Cada acción aceptada produce un turno real; elegir una reliquia usa la transición real entre plantas.

## Ejecutar

```sh
# Matriz: todas las clases, tres niveles de mejoras y dos políticas.
npm run simulate -- --count=20

# Informe legible por herramientas, con métricas por planta y partida.
node scripts/simulate.mjs --count=20 --json > balance.json

# Caso concreto con todas las acciones necesarias para reproducirlo.
node scripts/simulate.mjs --classes=luminary --presets=max --policies=tactical --seeds=1 --trace --json > run.json

# Comparación con el motor y contenido originales, usando la misma política actual.
node scripts/simulate.mjs --ref=1de9b590c7d4 --count=3 --json > baseline.json
```

`--seeds=1,2,3` fija semillas explícitas; `--count=20 --start=1` usa un intervalo. `--classes`, `--presets` y `--policies` limitan la matriz. `zero` compra cero mejoras, `mid` usa la mitad entera del máximo de cada mejora y `max` usa exactamente los límites comprables de `UPGRADES`; nunca niveles artificiales de 10. Las clases desbloqueables se incluyen como escenarios de balance independientes: el simulador no pretende que estén disponibles en un perfil nuevo.

`--ref` lee los módulos históricos desde Git a un directorio temporal y los carga aisladamente, sin cambiar el checkout. El informe indica el commit completo. La política es siempre la del simulador actual, para que una comparación use las mismas decisiones.

## Qué decide el bot

Ambas políticas sólo conocen casillas exploradas, entidades visibles y recuerdos de posiciones que vieron anteriormente. La salida sólo se convierte en objetivo después de descubrir su casilla. No reciben el estado del generador aleatorio ni enemigos ocultos. Exploran pasillos, persiguen enemigos observados, recogen recursos y abren cofres, usan ofrendas que pueden pagar, derrotan guardianes y eligen reliquias para descender.

- `naive`: combate directo, usa la habilidad cuando tiene energía, bebe pociones por debajo del 40 % de vida y toma la primera reliquia ofrecida.
- `tactical`: interpreta señales visibles, busca esquivas y remates, reserva turnos de guardia para recuperar energía, bebe antes y valora sinergias de combate y recuperación al escoger reliquias. Si sus esquivas se repiten, acepta un golpe con guardia para que el combate avance.

Ambas exploran y recogen recursos de forma exhaustiva, así que «naive» sigue siendo más sistemática que una persona que abandona cofres. No es un modelo estadístico de habilidad humana ni prueba que ninguna estrategia excepcional pueda ganar sin mejoras.

## Métricas e integridad

El JSON contiene resultado (`won`, `dead` o `stalled`), planta final, turnos, bajas, guardianes, reliquias, pociones, oro, nivel, estadísticas finales y recuentos de acciones. Cada planta registra vida y pociones de entrada/salida, estadísticas de entrada, turnos y bajas. Los resúmenes agrupan clase/mejoras/política, tasas de victoria, plantas alcanzadas y completadas, y medias de turnos y vida de entrada.

Los límites por defecto son 20.000 turnos totales y 2.000 por planta. Un límite, una ruta desconocida o una acción rechazada producen `stalled` con su motivo; **no cuentan como muertes**. Un estancamiento del bot debe corregirse o declararse antes de atribuirlo a la dificultad.

Las pruebas comprueban determinismo de todas las decisiones, ocultación de información, límites comprables y reproducción completa de una traza mediante las funciones públicas del motor. También verifican la validez de estados reales durante la partida y el total de turnos por planta. El caso pareado de la Portadora del alba, semilla 1, debe morir sin mejoras y ganar con mejoras máximas; su victoria se reproduce acción por acción y exige derrotar los seis guardianes.

## Punto de partida

Motor original `1de9b590c7d4`, semillas 1–3, tres clases originales × tres niveles de mejoras × dos políticas: **54 victorias en 54 expediciones**, todas hasta la planta 12, sin muertes ni estancamientos. El Custodio sin mejoras ganó 3/3 con cada política. Esto reproduce el problema de progresión descrito: un perfil inicial ya podía superar toda la campaña.

## Calibración 3.0.0

Ejecutada con `node scripts/simulate.mjs --count=20 --json`: semillas 1–20, cuatro clases, tres niveles de mejoras y dos políticas, todas sobre el mismo motor cargado una sola vez. **480 expediciones: 121 victorias, 359 muertes reales y 0 estancamientos.** La campaña tiene 18 plantas. El resumen estructurado, parámetros, métricas por planta y comparación original están en [resources/balance3.0.0.json](resources/balance3.0.0.json).

Cada celda muestra victorias entre 20 partidas. `N` corresponde a `naive` y `T` a `tactical`.

| Clase | Sin mejoras N | Sin mejoras T | Medias N | Medias T | Máximas N | Máximas T |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Custodio | 0/20 | 0/20 | 0/20 | 7/20 | 0/20 | 18/20 |
| Acechadora | 0/20 | 2/20 | 3/20 | 7/20 | 7/20 | 12/20 |
| Arcanista | 0/20 | 0/20 | 0/20 | 1/20 | 0/20 | 3/20 |
| Portadora del alba | 2/20 | 1/20 | 14/20 | 8/20 | 18/20 | 18/20 |

El perfil inicial pasa de superar toda la campaña original a **0 victorias en 40 partidas**. La Acechadora sin mejoras gana 2/40 (5 %), la Portadora sin mejoras 3/40 (7,5 %) y el Arcanista 0/40. Son casos excepcionales de estas semillas, no una imposibilidad artificial impuesta por clase o inventario.

La preparación cambia el resultado: con la política táctica, el Custodio pasa de 0 % a 90 %, la Acechadora de 10 % a 60 % y la Portadora del alba de 5 % a 90 %. El Arcanista sigue siendo la opción más frágil y exigente: 15 % de victorias con todas las mejoras en esta muestra. Una política puede superar a la otra en una combinación concreta porque escogen reliquias y asumen riesgos distintos; ninguna representa juego óptimo.

En la **misma semilla 1**, la Portadora sin mejoras muere en la planta 18 tras 3.766 turnos, sin pociones. Con mejoras máximas derrota los seis guardianes y gana tras 3.873 turnos, con 152 de vida y cinco pociones. Ese contraste queda protegido por las pruebas de progresión y reproducción legal.

Las cifras son una muestra determinista de balance, no tasas de victoria de jugadores humanos. Las mejoras máximas deben ofrecer una posibilidad sólida de completar la campaña; la diferencia entre 0–7,5 % sin mejoras y hasta 90 % con preparación es intencionada.
