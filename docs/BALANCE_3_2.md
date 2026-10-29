# Equilibrio 3.2 · leer el peligro y responder

La revisión añade una recompensa por interpretar el tablero y elimina golpes de contacto sin aviso. Conserva las 18 plantas, cuatro clases, tres juramentos, seis guardianes, límites de pociones, penetración de armadura, recuperación de energía y temple contra interrupciones de la versión 3.1.

## Reglas comprobadas

- Los ataques de contacto preparan una señal sobre las cuatro casillas ortogonales del atacante y se resuelven después de la siguiente acción. Al fallar, el enemigo persigue una casilla sin añadir un golpe gratuito. El avance ordinario de dos casillas sigue vigente.
- La represalia de recuperación de un guardián también anuncia su golpe. Su daño sigue siendo el 65 % de su ataque, redondeado hacia arriba. La previsión incluye esos ataques anunciados.
- **Apertura:** abandonar una casilla amenazada mediante movimiento o esquiva y terminar fuera de todas las señales ya anunciadas prepara un 35 % de daño adicional. Se aplica al siguiente ataque normal o a todos los objetivos de una habilidad, antes del crítico y la armadura. No se acumula; esperar o caminar no la gasta; cambia de planta y se pierde. Una acción fallida, un paseo sin peligro o entrar en otra señal no la concede.
- El estado de Apertura se guarda y restaura. Los guardados anteriores que no tienen el campo siguen siendo válidos y no reciben una bonificación implícita.
- Los brazos de una cruz y las ondas cercanas de los guardianes respetan la cobertura de piedra.
- Concentración conserva dos puntos de recuperación, frente a un punto y cuatro de armadura de Guardia. Atacar y retirarse durante el combate siguen sin regenerar energía. El temple conserva la ventana de cuatro turnos que impide encadenar interrupciones indefinidamente.

Los resúmenes y los 320 desenlaces están guardados en [resources/balance3.2.0.json](../resources/balance3.2.0.json).

## Comparación reproducible

Se compararon **320 expediciones completas**: 160 sobre `03205ddd82f07c36716cb557a17149efdd153d94` y 160 sobre el motor revisado. Cada matriz cruza semillas 1–10 × cuatro clases × mejoras `zero`/`max` × políticas `naive`/`tactical`, con el juramento neutral Farol. Los máximos son los niveles comprables definidos en `UPGRADES`, sin estadísticas artificiales. Se usó la misma política en ambas versiones.

```sh
node scripts/simulate.mjs --ref=03205dd --count=10 --presets=zero,max --json > before.json
node scripts/simulate.mjs --count=10 --presets=zero,max --json > after.json
node --test --test-isolation=none tests/*.test.mjs
```

El límite fue de 20.000 turnos por expedición y 2.000 por planta. La política solo conoce entidades visibles y casillas exploradas; cada movimiento, habilidad, poción y elección de reliquia utiliza el motor público real. No se eliminaron enemigos, alteraron posiciones o forzaron descensos para obtener los resultados. La referencia histórica se cargó desde sus módulos Git en un directorio temporal, sin modificar el checkout.

| Clase | Mejoras | Política | Victorias antes → después | Planta media antes → después |
| --- | --- | --- | ---: | ---: |
| Custodio | Sin mejoras | Directa | 0/10 → 0/10 | 1,9 → 5,4 |
| Custodio | Sin mejoras | Táctica | 0/10 → 3/10 | 4,7 → 16,5 |
| Custodio | Máximas | Directa | 0/10 → 1/10 | 16,4 → 16,1 |
| Custodio | Máximas | Táctica | 8/10 → 10/10 | 18,0 → 18,0 |
| Acechadora | Sin mejoras | Directa | 0/10 → 1/10 | 14,5 → 17,2 |
| Acechadora | Sin mejoras | Táctica | 0/10 → 7/10 | 15,7 → 17,2 |
| Acechadora | Máximas | Directa | 10/10 → 9/10 | 18,0 → 18,0 |
| Acechadora | Máximas | Táctica | 10/10 → 7/10 | 18,0 → 17,8 |
| Arcanista | Sin mejoras | Directa | 0/10 → 0/10 | 2,2 → 7,7 |
| Arcanista | Sin mejoras | Táctica | 0/10 → 0/10 | 2,6 → 14,3 |
| Arcanista | Máximas | Directa | 0/10 → 0/10 | 16,5 → 17,0 |
| Arcanista | Máximas | Táctica | 1/10 → 5/10 | 16,6 → 17,0 |
| Portadora del alba | Sin mejoras | Directa | 5/10 → 4/10 | 17,1 → 17,4 |
| Portadora del alba | Sin mejoras | Táctica | 1/10 → 3/10 | 16,0 → 15,8 |
| Portadora del alba | Máximas | Directa | 10/10 → 10/10 | 18,0 → 18,0 |
| Portadora del alba | Máximas | Táctica | 9/10 → 10/10 | 17,6 → 18,0 |

El agregado pasa de **54 victorias y 106 muertes** a **70 victorias y 90 muertes**. Ambas matrices tienen **cero bloqueos, acciones rechazadas o límites agotados**. En la nueva matriz se derrotaron 776 guardianes, frente a 638; las 160 expediciones superaron al primer guardián, frente a 126. Cada una de las 70 victorias nuevas derrota a los seis guardianes mediante acciones reales.

## Interpretación y límites

La primera partida del Custodio permite aprender más del mundo: con juego directo llega de media a la planta 5,4; con lectura táctica llega a la 16,5 y puede conseguir una victoria sin mejoras. Las mejoras máximas elevan sus victorias tácticas de 3/10 a 10/10. La Arcanista conserva su exigencia y muestra una ruta preparada viable: cinco victorias tácticas con mejoras máximas, frente a ninguna sin ellas.

La Acechadora es más autosuficiente y muestra una limitación de esta muestra: obtiene siete victorias tácticas tanto sin mejoras como con ellas, y la versión anterior preparada lograba diez. La Portadora sin mejoras también pierde una victoria con juego directo. Se registran esos retrocesos; no se presentan las mejoras como monótonas en cada semilla. Los cambios de duración del combate alteran el consumo de RNG, los recorridos, las reliquias y las siguientes plantas, incluso usando la misma semilla inicial.

Diez semillas por combinación no permiten estimar tasas humanas ni demostrar equivalencia entre clases. El bot tampoco optimiza Apertura: recibe la bonificación al evitar señales mediante su política existente. La matriz comprueba progreso, dificultad y ausencia de estancamientos; la diversión y la comprensión necesitan observación de jugadores. No se añadieron derrotas obligatorias para exigir mejoras: la prueba de progresión compara resultados agregados de las mismas semillas y permite victorias excepcionales sin preparación.

Las regresiones cubren anuncios de contacto, persecución tras fallar, previsión de daño, protección real por cobertura, consumo único de Apertura en las cuatro clases, persistencia y guardados anteriores. Se mantienen las pruebas de temple, límites comprables, pociones, penetración, determinismo y reproducción legal de una victoria completa.

La ejecución conjunta con `node --test --test-isolation=none tests/*.test.mjs` terminó con **71 pruebas correctas, cero fallos y cero omisiones**.
