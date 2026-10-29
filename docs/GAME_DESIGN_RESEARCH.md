# Decisiones de diseño para Yala

Consulta: 29 de octubre de 2026. Base examinada: `ff7dcbd`, con la campaña de
18 plantas, seis dominios, cuatro clases y 24 reliquias. Este documento separa
principios publicados, observaciones del código e hipótesis de diseño. No es un
estudio con jugadores ni demuestra que una cifra concreta produzca más diversión.

## Fuentes consultadas

Se descargaron las dos fuentes primarias siguientes desde los repositorios
oficiales de sus proyectos. Los enlaces fijan la revisión consultada.

1. [Dungeon Crawl Stone Soup: manual, sección N, Philosophy](https://github.com/crawl/crawl/blob/183b49ce94f2e4c915dc57ed8ce408a0d79a65eb/crawl-ref/docs/crawl_manual.rst#n-philosophy-pas-de-faq).
   Los apartados *Crusade against no-brainers*, *Anti-grinding*, *Interface*,
   *Clarity* y *Replayability* desarrollan decisiones significativas, evitar
   tareas aburridas que resulten óptimas, automatizar tareas rutinarias, explicar
   las reglas y ofrecer estilos de juego diferentes. El apartado *Balance*
   describe cámaras temáticas con botín que obligan a elegir entre seguridad y
   codicia. Son objetivos de sus autores; no resultados experimentales.
2. [Brogue Community Edition: README, About](https://github.com/tmewett/BrogueCE/blob/363440c454ee65bb7c1d8eb6c51b65de2a86426c/README.md#about).
   El proyecto busca conservar el interés del juego, mejorar la comodidad y
   facilitar mantenimiento y desarrollo. Explica que los cambios deben mantener
   el espíritu del juego y probarse jugando. Esto respalda el proceso de
   validación; no prescribe el equilibrio de Yala.

También se intentó consultar el artículo de Riot *Clarity in League*, el ensayo
de Mark Rosewater *Twenty Years, Twenty Lessons* y el artículo MDA en su sitio
académico. El proxy devolvió HTTP 403. No se atribuyen conclusiones a esos textos
porque no se pudieron leer durante esta investigación.

## Lo observado en Yala

El núcleo ya tiene decisiones espaciales valiosas: ataques que conservan sus
casillas anunciadas, esquiva de dos casillas, pasillos, visibilidad, cuatro
habilidades distintas y resistencia temporal a las interrupciones. La versión
examinada también limita las pociones, reduce la recuperación pasiva de energía
en combate y permite penetrar parte de la armadura. Conviene conservar esos
sistemas antes de añadir dificultad mediante más vida o daño enemigo.

Hay oportunidades concretas en el código examinado:

- `act()` hace que **Guardia** y **Esperar** consuman un turno y recuperen una
  energía. Guardia añade cuatro de armadura sin otro coste. Por tanto, Esperar
  no ofrece una ventaja mecánica frente a Guardia en ese estado del código.
- `reward()` elige tres reliquias distintas sin consultar su rareza ni su papel
  mecánico. Algunas ofertas pueden comparar opciones dominadas: Colmillo del
  eclipse ofrece el mismo ataque que Hoja del juramento y añade crítico; Corona
  de sal ofrece la armadura de Placa del peregrino y añade energía. Esto no
  significa que todas las reliquias compuestas dominen a las simples: Semilla
  de la reina y Corazón de brasa sí intercambian curación por vida máxima.
- La interfaz avisa cuando el personaje ocupa una casilla amenazada, pero una
  marca genérica explica poco sobre el daño anunciado, el temple del enemigo
  o el efecto de defenderse.
- El motor ya guarda semilla y generador aleatorio. La creación desde el
  refugio usa la semilla automática y no permite repetir deliberadamente una
  expedición desde la interfaz.

## Cambios con mayor valor esperado

| Cambio propuesto | Principio relacionado | Contrato verificable |
| --- | --- | --- |
| Separar Esperar y Guardia | Evitar opciones sin decisión real | Esperar recupera más energía; Guardia conserva su mitigación. Ambas pueden ser preferibles según vida, amenazas y reserva de energía. |
| Juramentos opcionales con costes y beneficios visibles | Diversidad y elecciones entre seguridad y codicia | Opción neutral por defecto; cada alternativa cambia una decisión táctica y declara su desventaja antes de empezar. No sustituye los desbloqueos existentes. |
| Mostrar amenazas comprometidas | Claridad de reglas | Explicar ataques ya preparados sobre la casilla actual, daño y mitigación aplicables. No revelar enemigos ocultos ni presentar como seguro un resultado que depende de esquiva aleatoria. |
| Ofertas y comparación de reliquias más útiles | Decisiones significativas y estilos diferentes | Evitar que una oferta muestre únicamente mejoras equivalentes; comparar efectos con las estadísticas de la expedición y mostrar lo que aportaría cada elección. |
| Semilla visible y reutilizable | Rejugabilidad y aprendizaje | Misma semilla, clase, mejoras y juramento producen la misma expedición. Reiniciar con otra configuración no se anuncia como una comparación de igualdad de condiciones. |

### Energía: hipótesis inicial

Probar Esperar con **+2 energía** y Guardia con **+1 energía y +4 armadura** es una
intervención pequeña que diferencia sus usos. El principio de diferenciar las
acciones está fundamentado; esos números son una hipótesis de ajuste. Una
recuperación mayor puede facilitar bucles de habilidad y necesita verificarse
con temple, costes de clase, desplazamiento y enemigos de las últimas plantas.
La recuperación debe respetar el máximo y requerir un turno real.

### Juramentos: decisiones, no obligaciones

El juramento debe poder explicar su intercambio en una frase. Por ejemplo,
favorecer potencia a cambio de fragilidad o reserva de energía a cambio de menor
daño. Estos son ejemplos de dirección, no cifras aprobadas. Evitar recompensas
permanentes tan superiores que conviertan el juramento en una obligación, y
evitar sistemas que premien repetir zonas seguras o esperar cientos de turnos.
No añadir presión de reloj real a un juego que invita a pensar por turnos.

### Previsión: información acotada y honesta

Una previsión de ataques preparados puede mostrar daño bruto y daño mitigado
por defensa normal o Guardia. No es una predicción de todo el turno: enemigos
adyacentes sin intención preparada pueden atacar, y el jugador puede matar,
interrumpir o abandonar las casillas antes de la resolución. La interfaz debe
explicar ese alcance. El manual de Crawl admite que el feedback cualitativo a
veces funciona mejor que cifras exactas; usar números aquí es nuestra decisión
para apoyar una comparación táctica concreta.

### Reliquias: variedad sin reescribir partidas

Priorizar una selección variada de ofertas y su comparación antes de modificar
reliquias ya obtenidas en guardados. Diferenciar recuperación, defensa y daño
permite identificar necesidades de la expedición. Una etiqueta de sinergia debe
explicar el vínculo real con clase o reliquias actuales, sin prometer que una
opción sea la mejor en toda situación. La rareza visual no demuestra por sí
sola un coste, una menor frecuencia o una potencia adecuada.

## Compatibilidad y comprobación

Conservar alojamiento estático, ausencia de cuentas y exportación local. Los
campos nuevos necesitan valores por defecto para expediciones anteriores y
validación explícita al importar. Una semilla comparte un punto de partida,
no progreso personal ni un resultado certificado. No hace falta un servidor
para ofrecer esa función.

La comprobación debe incluir decisiones legales del motor de producción,
guardados antiguos, determinismo y una partida de navegador. Separar victorias,
muertes y políticas de simulación atascadas. Comparar Esperar y Guardia con
amenazas distintas; probar límites de energía; comprobar los cuatro arquetipos,
los seis guardianes y las últimas plantas. Revisar que los juramentos no rompan
vida, energía ni curación, y que la previsión no modifique el estado o consuma
azar al consultarla.

Las simulaciones detectan regresiones y estrategias dominantes conocidas. Para
evaluar diversión, observar también a jugadores: si entienden por qué recibieron
un golpe, si cambian su plan según la oferta, qué acciones usan y si desean
repetir una expedición. No presentar estos resultados como medidos antes de
realizar esas sesiones.
