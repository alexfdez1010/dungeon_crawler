# Decisiones de diseño de Yala

Esta revisión busca combates comprensibles, decisiones distintas y respuestas satisfactorias a cada acción. Conserva la campaña actual de **18 plantas en seis dominios**, el descenso por turnos, las clases, los juramentos y el progreso local. La investigación orienta las decisiones; no demuestra que esta versión sea más divertida para todas las personas.

## Claridad antes de dificultad

El peligro debe poder leerse antes de actuar: casillas amenazadas, intención del enemigo y consecuencias de permanecer a su lado. Un golpe cuerpo a cuerpo también constituye una amenaza, aunque no tenga la preparación de un proyectil. La interfaz distingue el daño previsto de una garantía: defenderse, esquivar, interrumpir o eliminar al atacante puede cambiar el resultado.

[Subset Games describe los ataques anunciados como base de Into the Breach](https://subsetgames.com/itb.html). En [su entrevista, Justin Ma relaciona reglas claras, menos azar y prioridades diferentes con decisiones tácticas comprensibles](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-). La aplicación a Yala es una inferencia de diseño: informar el peligro ayuda a atribuir una derrota a decisiones concretas.

## Esperar, defenderse o atacar

Esperar recupera **2 de energía**; defenderse recupera **1** y añade **4 de armadura durante ese turno**. Así, defenderse deja de ofrecer toda la utilidad de esperar más una protección gratuita. El jugador elige entre recuperar recursos con rapidez y reducir daño inmediato.

Evitar una intención anunciada abre una oportunidad: el siguiente ataque obtiene **35 % de daño adicional**. La apertura se conserva hasta atacar o cambiar de planta y no es acumulable; el objetivo es conectar lectura del peligro, movimiento y respuesta ofensiva, sin añadir otro recurso que gestionar. Estos valores son parámetros de balance, no porcentajes derivados de un estudio.

[Sid Meier dedica Interesting Decisions a la información, la respuesta y el ritmo que hacen interesantes las elecciones](https://www.gdcvault.com/play/1015756). Separar las funciones de esperar y defenderse y enlazar evasión con contraataque son decisiones propias de Yala inspiradas por ese criterio.

## Elegir una configuración

Las ofertas de reliquias deben presentar alternativas útiles para daño, supervivencia y energía, evitando que tres opciones equivalentes sustituyan una decisión por azar. Sus efectos se explican con cifras y con relación a lo que el personaje ya lleva. La variedad debe surgir de combinaciones y tácticas; no necesita alargar la expedición con más plantas o enemigos.

[Anthony Giovannetti explica cómo Mega Crit combinó métricas y opiniones de jugadores para equilibrar Slay the Spire](https://www.gdcvault.com/play/1025731). Para Yala, esta referencia justifica comprobar resultados y supuestos. No prescribe una distribución concreta de reliquias ni implica que una simulación sustituya a las partidas humanas.

## Aprender jugando

El primer minuto prioriza moverse, atacar, leer el peligro y reconocer la salida. Los recordatorios son breves y contextuales, con información disponible en la ayuda sin exigir una interrupción extensa antes de explorar.

[Przybylski, Rigby y Ryan revisan la relación entre autonomía, competencia, dominio de controles y disfrute en videojuegos](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf). Aplicamos esos principios a controles comprensibles y elecciones voluntarias. La presentación concreta de Yala es una inferencia, pendiente de observar con jugadores.

## Respuestas audiovisuales con significado

Moverse, golpear, recibir daño, eliminar a un enemigo, defenderse, esquivar, abrir una oportunidad, subir de nivel, elegir una reliquia y curarse tienen sonidos distintos y breves. El audio se genera al actuar, con volumen bajo, un máximo de doce voces y fuentes desconectadas al terminar. El silencio no crea un contexto de audio. Ninguna información necesaria depende del sonido; los efectos visuales respetan la reducción de movimiento.

[Juice It or Lose It, de Martin Jonasson y Petri Purho](https://www.gdcvault.com/play/1016789/Juice-It-or-Lose), demuestra cómo las respuestas sensoriales cambian la sensación de una mecánica. [Don't Juice It or Lose It, de Folmer Kelly](https://www.gdcvault.com/play/1021398/Don-t-Juice-It-or), recuerda que esos efectos necesitan concordar con su contexto. En Yala se aplican a eventos concretos, sin animación ambiental continua ni ruido que oculte el tablero.

## Qué se puede verificar

Las pruebas automatizadas comprueban reglas, determinismo, amenazas, recompensas y compatibilidad del guardado. Las comprobaciones de navegador evalúan interacción, visibilidad y adaptación a pantallas. Queda por medir con personas la comprensión inicial, las tácticas preferidas, la duración de las partidas y la dificultad percibida. No se afirma que el equilibrio o la diversión estén demostrados por las pruebas técnicas.
