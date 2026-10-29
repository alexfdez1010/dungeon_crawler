# Informe de equilibrio · 3.1

## Qué se verificó

La suite automatizada ejecuta 67 pruebas: 67 pasan, 0 fallan y 0 se omiten. Las diez pruebas nuevas cubren juramentos, guardados anteriores, rechazo de identificadores malformados, continuación determinista, el coste real de concentrarse frente a bloquear, el pronóstico de daño y la variedad de reliquias. La expectativa anterior de recuperación tras una esquiva se actualizó al nuevo valor de dos puntos de energía.

Los juramentos modifican atributos derivados una sola vez. Farol conserva la experiencia estándar; Brasa cambia seis de vida máxima por un punto de ataque; Marea cambia un punto de ataque por dos de energía máxima. Los guardados que no contienen juramento conservan los atributos estándar. El pronóstico no consume RNG, no cambia la partida y solo suma ataques ya anunciados sobre la casilla actual: excluye ataques cuerpo a cuerpo sin anuncio y marca la esquiva aleatoria como incertidumbre.

El ajuste final evita que una reliquia generalista sustituya a la especializada en habilidades: Hoja aporta +2 de ataque y +1 de espinas, Cometa +1 de ataque y +4 de habilidad, Ascua +8 de habilidad. Una prueba recorre las cuatro clases y el ataque base de 1 a 100, incluidas las fronteras de redondeo: Hoja supera a Cometa y Ascua en ataque básico; Ascua supera a ambas en daño de habilidad. Prisma conserva +4 de habilidad y añade +2 de vida máxima. Las matrices siguientes se ejecutaron después de congelar estos ajustes finales.

## Comparación reproducible

Se simularon las semillas 1, 2 y 3 con las cuatro clases, los niveles de mejoras `zero`, `mid` y `max`, y la misma política `tactical` en ambas versiones. Son 36 expediciones históricas y 36 expediciones actuales. Todas llegaron a una victoria o una muerte real: no hubo bloqueos, acciones rechazadas ni límites agotados.

La referencia histórica es `ff7dcbd` (la versión que ya contenía las 18 plantas). La política es la del árbol actual en ambas ejecuciones: se corrigió la estimación obsoleta de curación del 45 % al 30 % real; cuando no hay enemigo adyacente ni impacto anunciado, elige concentrarse. El límite por expedición es de 20.000 turnos y por planta de 2.000. Los resultados comparan el juramento neutral.

```sh
node scripts/simulate.mjs --ref=ff7dcbd --count=3 --policies=tactical --json > /tmp/yala-before.json
node scripts/simulate.mjs --count=3 --policies=tactical --json > /tmp/yala-after.json
```

| Clase | Mejoras | Planta media anterior → actual | Victorias anteriores → actuales |
| --- | --- | --- | --- |
| Custodio | Sin mejoras | 2.00 → 2.33 | 0/3 → 0/3 |
| Custodio | Intermedias | 16.00 → 18.00 | 1/3 → 2/3 |
| Custodio | Máximas | 18.00 → 18.00 | 3/3 → 3/3 |
| Acechadora | Sin mejoras | 14.33 → 16.33 | 0/3 → 0/3 |
| Acechadora | Intermedias | 18.00 → 17.00 | 3/3 → 2/3 |
| Acechadora | Máximas | 18.00 → 18.00 | 2/3 → 3/3 |
| Arcanista | Sin mejoras | 1.00 → 1.00 | 0/3 → 0/3 |
| Arcanista | Intermedias | 14.00 → 14.00 | 0/3 → 0/3 |
| Arcanista | Máximas | 17.33 → 16.33 | 0/3 → 1/3 |
| Portadora del alba | Sin mejoras | 15.00 → 15.67 | 0/3 → 0/3 |
| Portadora del alba | Intermedias | 17.67 → 18.00 | 0/3 → 1/3 |
| Portadora del alba | Máximas | 18.00 → 18.00 | 2/3 → 3/3 |

## Matriz de juramentos

Además se ejecutaron 72 expediciones actuales: semillas 1 y 2 × cuatro clases × tres niveles de mejoras × tres juramentos, con política táctica y los mismos límites. Ninguna quedó bloqueada ni agotó un límite. Esta matriz verifica que cada combinación puede jugarse con acciones reales hasta un desenlace; no pretende igualar su porcentaje de victorias. Las dos matrices reúnen 144 expediciones, de las cuales 108 usan el equilibrio final actual.

```sh
node scripts/simulate.mjs --count=2 --policies=tactical --oaths=lantern,ember,tide --json > /tmp/yala-oaths.json
```

| Juramento | Expediciones | Victorias | Muertes | Bloqueos |
| --- | --- | --- | --- | --- |
| Farol | 24 | 9 | 15 | 0 |
| Brasa | 24 | 10 | 14 | 0 |
| Marea | 24 | 8 | 16 | 0 |

## Interpretación y límites

La recuperación de dos puntos da a Concentrarse una utilidad distinta de Guardia, que recupera uno y mitiga daño. Las ofertas de reliquias presentan Ofensiva, Supervivencia y Canalización mientras quede una opción de cada grupo; conservan tres opciones únicas al agotarse alguno. Estos cambios producen decisiones verificables, pero las simulaciones no miden diversión.

La muestra de tres semillas por combinación es pequeña. No permite afirmar una tasa de victoria humana, equivalencia entre clases ni mejora estadísticamente significativa. El descenso de victorias de Acechadora con mejoras intermedias (3/3 a 2/3) queda registrado. La Arcanista con mejoras máximas gana una de las tres semillas, aunque su planta media baja de 17,33 a 16,33: son resultados que deben revisarse con partidas humanas, sin ocultar los desenlaces desfavorables. Los nuevos sorteos y las decisiones de combate cambian el recorrido completo.

La política solo recibe información visible o explorada; no conoce el RNG ni los enemigos ocultos. Aun así, persigue todos los enemigos avistados, prioriza recursos y utiliza habilidades de área sobre enemigos aislados. En las trazas del Custodio inicial, varios Guardias huecos consumen 15–20 de vida por encuentro cuando la política agota energía y encadena ataques básicos. El jugador puede evitar enemigos ordinarios o alternar defensa y recuperación: las escaleras solo exigen matar al guardián de cada tercera planta. Por ello, morir en la planta 2 no demuestra que esa sea la duración de una primera partida humana. Las clases desbloqueables también se simulan sin mejoras para aislar atributos, aunque normalmente el jugador ya tendría progreso al desbloquearlas.

El siguiente paso de ajuste debe usar partidas humanas: comprobar comprensión de energía y avisos, tiempo hasta la primera decisión interesante, uso de guardia/concentración, claridad de las muertes y diferencias entre clases. No se añaden tasas de retención, métricas de usuarios ni promesas de equilibrio que no se hayan medido.
