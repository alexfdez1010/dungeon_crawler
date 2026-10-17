/** Shared, dependency-free world data. Mechanics are implemented in engine.js. */
export const GAME_TITLE = "YALA";
export const GAME_SUBTITLE = "Ecos del abismo";
export const TOTAL_FLOORS = 12;

export const CLASSES = [
  {
    id: "warden",
    name: "Custodio",
    title: "El último juramento",
    description:
      "Resiste en primera línea. Su onda de choque golpea e interrumpe a todos los enemigos a dos pasos.",
    hp: 42,
    energy: 4,
    attack: 5,
    armor: 1,
    skillCost: 2,
    unlockFloor: 0,
    color: "#dcb879",
    glyph: "◆",
    skill: {
      name: "Ruptura",
      cost: 2,
      description:
        "Golpea a todos los enemigos visibles a dos pasos e interrumpe sus ataques.",
    },
  },
  {
    id: "ranger",
    name: "Acechadora",
    title: "La flecha sin nombre",
    description:
      "Más frágil, más letal. Dispara a distancia para acabar con los enemigos antes de que se acerquen.",
    hp: 32,
    energy: 5,
    attack: 6,
    armor: 0,
    skillCost: 2,
    unlockFloor: 4,
    color: "#9dcbb3",
    glyph: "➶",
    skill: {
      name: "Disparo certero",
      cost: 2,
      description:
        "Apunta al enemigo visible más cercano a seis pasos y atraviesa a los enemigos de su trayectoria.",
    },
  },
  {
    id: "arcanist",
    name: "Arcanista",
    title: "La voz del vacío",
    description:
      "Convierte la energía del abismo en daño de área. Cada grupo de enemigos es una oportunidad.",
    hp: 28,
    energy: 7,
    attack: 4,
    armor: 0,
    skillCost: 3,
    unlockFloor: 7,
    color: "#c3a4e5",
    glyph: "✧",
    skill: {
      name: "Nova umbría",
      cost: 3,
      description:
        "Detona sobre el enemigo visible más cercano a cuatro pasos y alcanza a sus vecinos a dos pasos.",
    },
  },
];

export const CLASS_BY_ID = Object.fromEntries(
  CLASSES.map((character) => [character.id, character]),
);

export const ENEMIES = {
  ashling: {
    id: "ashling",
    name: "Despojo de ceniza",
    hp: 9,
    attack: 3,
    armor: 0,
    range: 1,
    behavior: "melee",
    glyph: "d",
    color: "#c69c7b",
    description: "Un antiguo peregrino que todavía busca la salida.",
    intention: "Se acerca y golpea a una casilla de distancia.",
  },
  bone_archer: {
    id: "bone_archer",
    name: "Arquero de hueso",
    hp: 8,
    attack: 3,
    armor: 0,
    range: 5,
    behavior: "ranged",
    glyph: "a",
    color: "#d4c9a6",
    description: "Su arco cruje un instante antes del disparo.",
    intention:
      "Apunta en línea recta. Sal de la trayectoria antes del disparo.",
  },
  ash_guard: {
    id: "ash_guard",
    name: "Guardia hueco",
    hp: 16,
    attack: 4,
    armor: 1,
    range: 1,
    behavior: "melee",
    glyph: "g",
    color: "#b79273",
    description: "La armadura conserva un juramento que su dueño olvidó.",
    intention: "Avanza hacia ti y ataca cuerpo a cuerpo.",
  },
  thornling: {
    id: "thornling",
    name: "Zarza errante",
    hp: 13,
    attack: 4,
    armor: 0,
    range: 1,
    behavior: "melee",
    glyph: "z",
    color: "#95ba91",
    description: "Raíces que aprendieron a caminar sobre los muertos.",
    intention: "Persigue al intruso y golpea de cerca.",
  },
  sporecaller: {
    id: "sporecaller",
    name: "Cantor de esporas",
    hp: 12,
    attack: 4,
    armor: 0,
    range: 5,
    behavior: "ranged",
    glyph: "s",
    color: "#b9c895",
    description: "Su canto marca una trayectoria de esporas luminosas.",
    intention: "Prepara un ataque a distancia en línea recta.",
  },
  root_brute: {
    id: "root_brute",
    name: "Coloso de raíz",
    hp: 24,
    attack: 6,
    armor: 1,
    range: 1,
    behavior: "charger",
    glyph: "R",
    color: "#879e72",
    description: "Las raíces se tensan antes de que embista.",
    intention: "Anuncia una embestida. Abandona su línea de ataque.",
  },
  drowned: {
    id: "drowned",
    name: "Escriba ahogado",
    hp: 18,
    attack: 5,
    armor: 1,
    range: 1,
    behavior: "melee",
    glyph: "e",
    color: "#83bac8",
    description: "Recita nombres borrados bajo su máscara de agua.",
    intention: "Se acerca para atacar a corta distancia.",
  },
  tide_mage: {
    id: "tide_mage",
    name: "Oráculo de la marea",
    hp: 15,
    attack: 6,
    armor: 0,
    range: 6,
    behavior: "ranged",
    glyph: "m",
    color: "#a1cfde",
    description: "Lee el futuro en las grietas de su espejo.",
    intention:
      "Traza un hechizo a distancia. Busca cobertura o sal de su línea.",
  },
  sentinel: {
    id: "sentinel",
    name: "Centinela de sal",
    hp: 27,
    attack: 7,
    armor: 2,
    range: 1,
    behavior: "charger",
    glyph: "S",
    color: "#bacbd1",
    description: "Un autómata de sal y hierro, erosionado pero implacable.",
    intention: "Carga en línea recta después de preparar su ataque.",
  },
  eclipsed: {
    id: "eclipsed",
    name: "Devoto del eclipse",
    hp: 23,
    attack: 7,
    armor: 1,
    range: 1,
    behavior: "melee",
    glyph: "v",
    color: "#c0a3d0",
    description: "Entrega su sombra a cambio de un último amanecer.",
    intention: "Te persigue hasta poder golpearte cuerpo a cuerpo.",
  },
  void_caster: {
    id: "void_caster",
    name: "Tejedor del vacío",
    hp: 20,
    attack: 7,
    armor: 1,
    range: 6,
    behavior: "ranged",
    glyph: "w",
    color: "#d9b8ea",
    description: "Sus manos vacías dibujan heridas en el aire.",
    intention: "Canaliza un proyectil en línea recta antes de lanzarlo.",
  },
  obsidian_brute: {
    id: "obsidian_brute",
    name: "Verdugo de obsidiana",
    hp: 34,
    attack: 9,
    armor: 2,
    range: 1,
    behavior: "charger",
    glyph: "V",
    color: "#b596ba",
    description: "Cada paso resuena como una campana bajo tierra.",
    intention: "Prepara una embestida poderosa en su línea de visión.",
  },
  cinder_warden: {
    id: "cinder_warden",
    name: "Vigía de la pira",
    hp: 48,
    attack: 6,
    armor: 1,
    range: 1,
    behavior: "boss",
    glyph: "Ω",
    color: "#e5ac78",
    description:
      "El primer guardián custodia una puerta que nadie recuerda haber cerrado.",
    intention:
      "Alterna persecución y ataques anunciados. Observa las casillas marcadas.",
  },
  briar_queen: {
    id: "briar_queen",
    name: "La Reina sin primavera",
    hp: 64,
    attack: 7,
    armor: 1,
    range: 1,
    behavior: "boss",
    glyph: "Ω",
    color: "#b7d39f",
    description:
      "Su corona florece con los recuerdos de quienes no regresaron.",
    intention:
      "Prepara ataques de área. Muévete fuera de las casillas marcadas.",
  },
  drowned_oracle: {
    id: "drowned_oracle",
    name: "El Oráculo sumergido",
    hp: 82,
    attack: 8,
    armor: 2,
    range: 1,
    behavior: "boss",
    glyph: "Ω",
    color: "#a1d5e4",
    description:
      "Conoce el nombre del ladrón que rompió el amuleto. Era el suyo.",
    intention:
      "Anuncia sus ataques antes de ejecutarlos. Reserva energía para el contraataque.",
  },
  ettin: {
    id: "ettin",
    name: "Ettin, corazón del eclipse",
    hp: 110,
    attack: 10,
    armor: 2,
    range: 1,
    behavior: "boss",
    glyph: "Ω",
    color: "#e3bbea",
    description:
      "Dos voces, una sombra. El último custodio del Amuleto de Yala.",
    intention:
      "Desata ataques anunciados de gran alcance. La posición decide el combate.",
  },
};

export const BIOMES = [
  {
    id: "ash",
    name: "Atrio de ceniza",
    subtitle: "Donde termina la luz",
    floors: [1, 2, 3],
    color: "#d7a374",
    floorColor: "#24232a",
    wallColor: "#484049",
    description: "El fuego se apagó hace siglos. Los juramentos todavía arden.",
    enemyTypes: ["ashling", "bone_archer", "ash_guard"],
    bossId: "cinder_warden",
    boss: {
      id: "cinder_warden",
      name: "Vigía de la pira",
      description: "Rompe el primer sello del amuleto.",
    },
  },
  {
    id: "briar",
    name: "Jardín sepultado",
    subtitle: "Una primavera imposible",
    floors: [4, 5, 6],
    color: "#a8c48e",
    floorColor: "#202c29",
    wallColor: "#3a5142",
    description: "Bajo la piedra crece un bosque que se alimenta de recuerdos.",
    enemyTypes: ["thornling", "sporecaller", "root_brute"],
    bossId: "briar_queen",
    boss: {
      id: "briar_queen",
      name: "La Reina sin primavera",
      description: "Arranca el segundo sello de sus raíces.",
    },
  },
  {
    id: "tide",
    name: "Archivo sumergido",
    subtitle: "Todo nombre acaba en agua",
    floors: [7, 8, 9],
    color: "#96c9d7",
    floorColor: "#1e2b35",
    wallColor: "#3b5363",
    description: "Un mar inmóvil guarda las páginas de una historia prohibida.",
    enemyTypes: ["drowned", "tide_mage", "sentinel"],
    bossId: "drowned_oracle",
    boss: {
      id: "drowned_oracle",
      name: "El Oráculo sumergido",
      description: "Recupera el tercer sello del silencio.",
    },
  },
  {
    id: "eclipse",
    name: "Cámara del eclipse",
    subtitle: "El abismo también recuerda",
    floors: [10, 11, 12],
    color: "#c8a3dd",
    floorColor: "#2a2336",
    wallColor: "#51415e",
    description: "Aquí yace el Amuleto de Yala. Aquí empezó la oscuridad.",
    enemyTypes: ["eclipsed", "void_caster", "obsidian_brute"],
    bossId: "ettin",
    boss: {
      id: "ettin",
      name: "Ettin, corazón del eclipse",
      description: "Derrota a Ettin y devuelve el amuleto a la luz.",
    },
  },
];

export const REGIONS = BIOMES;

export const RELICS = [
  {
    id: "ember_heart",
    name: "Corazón de brasa",
    description: "+10 de vida máxima.",
    rarity: "common",
    effect: { maxHp: 10 },
  },
  {
    id: "oath_blade",
    name: "Hoja del juramento",
    description: "+2 de ataque.",
    rarity: "common",
    effect: { attack: 2 },
  },
  {
    id: "pilgrim_plate",
    name: "Placa del peregrino",
    description: "+1 de armadura.",
    rarity: "common",
    effect: { armor: 1 },
  },
  {
    id: "star_vessel",
    name: "Vasija estelar",
    description: "+2 de energía máxima.",
    rarity: "common",
    effect: { maxEnergy: 2 },
  },
  {
    id: "blood_moss",
    name: "Musgo de sangre",
    description: "Recupera 3 de vida al derrotar a un enemigo.",
    rarity: "uncommon",
    effect: { healOnKill: 3 },
  },
  {
    id: "briar_mantle",
    name: "Manto de espinas",
    description: "Devuelve 2 de daño al recibir un golpe cuerpo a cuerpo.",
    rarity: "uncommon",
    effect: { thorns: 2 },
  },
  {
    id: "glass_eye",
    name: "Ojo de cristal",
    description: "+15 % de probabilidad de golpe crítico.",
    rarity: "uncommon",
    effect: { critChance: 0.15 },
  },
  {
    id: "hunger_ring",
    name: "Anillo del hambre",
    description: "Recupera vida equivalente al 15 % del daño infligido.",
    rarity: "rare",
    effect: { lifesteal: 0.15 },
  },
  {
    id: "mist_cloak",
    name: "Capa de niebla",
    description: "+12 % de probabilidad de esquivar ataques.",
    rarity: "uncommon",
    effect: { dodge: 0.12 },
  },
  {
    id: "echo_lantern",
    name: "Farol de ecos",
    description: "Recupera 1 de energía al derrotar a un enemigo.",
    rarity: "rare",
    effect: { energyOnKill: 1 },
  },
  {
    id: "amber_flask",
    name: "Frasco de ámbar",
    description: "Las pociones curan 8 de vida adicional.",
    rarity: "common",
    effect: { potionPower: 8 },
  },
  {
    id: "void_prism",
    name: "Prisma del vacío",
    description: "Tu habilidad inflige 4 de daño adicional.",
    rarity: "uncommon",
    effect: { skillDamage: 4 },
  },
  {
    id: "royal_seed",
    name: "Semilla de la reina",
    description: "+6 de vida máxima y recupera 2 de vida por baja.",
    rarity: "rare",
    effect: { maxHp: 6, healOnKill: 2 },
  },
  {
    id: "salt_crown",
    name: "Corona de sal",
    description: "+1 de armadura y +1 de energía máxima.",
    rarity: "rare",
    effect: { armor: 1, maxEnergy: 1 },
  },
  {
    id: "eclipse_fang",
    name: "Colmillo del eclipse",
    description: "+2 de ataque y +10 % de probabilidad de crítico.",
    rarity: "rare",
    effect: { attack: 2, critChance: 0.1 },
  },
  {
    id: "first_spark",
    name: "La primera chispa",
    description: "+3 al daño de habilidad y +1 de energía máxima.",
    rarity: "rare",
    effect: { skillDamage: 3, maxEnergy: 1 },
  },
];

export const UPGRADES = [
  {
    id: "vitality",
    name: "Pulso persistente",
    description: "+4 de vida máxima al comenzar cada expedición.",
    maxLevel: 5,
    baseCost: 12,
    costGrowth: 1.6,
    stat: "maxHp",
    amount: 4,
    glyph: "♡",
  },
  {
    id: "might",
    name: "Memoria del acero",
    description: "+1 de ataque al comenzar cada expedición.",
    maxLevel: 4,
    baseCost: 18,
    costGrowth: 1.7,
    stat: "attack",
    amount: 1,
    glyph: "⚔",
  },
  {
    id: "resilience",
    name: "Juramento de piedra",
    description: "+1 de armadura al comenzar cada expedición.",
    maxLevel: 3,
    baseCost: 24,
    costGrowth: 1.8,
    stat: "armor",
    amount: 1,
    glyph: "◇",
  },
  {
    id: "focus",
    name: "Afinidad con el eco",
    description: "+1 de energía máxima al comenzar cada expedición.",
    maxLevel: 4,
    baseCost: 16,
    costGrowth: 1.65,
    stat: "maxEnergy",
    amount: 1,
    glyph: "✧",
  },
];

const FLOOR_NAMES = [
  "La puerta olvidada",
  "Galería de las brasas",
  "La última vigilia",
  "Raíces bajo la piedra",
  "El invernadero ciego",
  "El trono de espinas",
  "Escaleras bajo el agua",
  "La biblioteca sin voz",
  "El espejo del oráculo",
  "El umbral de obsidiana",
  "La noche inmóvil",
  "El corazón de Yala",
];

export const LORE = [
  "Nadie recuerda quién perdió el Amuleto de Yala. Todos recuerdan lo que ocurrió después.",
  "En la ceniza hay huellas recientes. No eres la primera persona que intenta regresar.",
  "El Vigía dejó de proteger la puerta hace siglos. Ahora protege el miedo a cruzarla.",
  "Una raíz rompe tu sombra. Al otro lado parece estar amaneciendo.",
  "Las flores del jardín repiten palabras que aún no has pronunciado.",
  "La reina guardaba una semilla para el día en que volviera el sol.",
  "El agua no moja las páginas. Borra los nombres.",
  "Un libro abierto muestra tu llegada. La siguiente página está en blanco.",
  "El oráculo admite su culpa: rompió el amuleto para que nadie pudiera abandonarlo.",
  "Los fragmentos cantan juntos por primera vez. Algo responde desde abajo.",
  "Ettin tiene dos voces: una pide que huyas; la otra, que lo liberes.",
  "El amuleto no encerraba la luz. La estaba esperando.",
];

export const TIPS = [
  "Cada movimiento, ataque o espera avanza un turno. Tómate tiempo para decidir.",
  "Las casillas marcadas anuncian ataques enemigos. Muévete antes de que se resuelvan.",
  "Camina hacia un enemigo adyacente para atacarlo.",
  "Conserva energía para tu habilidad cuando varios enemigos te cierren el paso.",
  "Los pasillos estrechos te ayudan a enfrentarte a los enemigos de uno en uno.",
  "Los fragmentos financian mejoras permanentes entre expediciones.",
  "Vence al jefe del piso 3 para desbloquear a la Acechadora.",
  "Vence al jefe del piso 6 para desbloquear al Arcanista.",
  "Combina reliquias: más bajas pueden significar más vida y más energía.",
  "La partida y tus mejoras se guardan en este navegador.",
];

/** Metadata is clamped so a restored save cannot request a nonexistent biome. */
export function floorInfo(value) {
  const parsed = Number(value);
  const floor = Math.min(
    TOTAL_FLOORS,
    Math.max(1, Number.isFinite(parsed) ? Math.floor(parsed) : 1),
  );
  const biome = BIOMES[Math.floor((floor - 1) / 3)];
  const isBoss = floor % 3 === 0;
  return {
    number: floor,
    floor,
    name: FLOOR_NAMES[floor - 1],
    subtitle: biome.subtitle,
    description: biome.description,
    biome,
    biomeId: biome.id,
    color: biome.color,
    floorColor: biome.floorColor,
    wallColor: biome.wallColor,
    isBoss,
    boss: isBoss ? biome.boss : null,
    bossId: isBoss ? biome.bossId : null,
    enemyTypes: biome.enemyTypes,
    story: LORE[floor - 1],
  };
}

export function classUnlocked(classId, meta = {}) {
  const character = CLASS_BY_ID[classId];
  if (!character) return false;
  if (character.unlockFloor === 0) return true;
  if (Number(meta.bestFloor || 0) >= character.unlockFloor) return true;
  const bosses =
    meta.bossesDefeated || meta.defeatedBosses || meta.bosses || [];
  const bossId = character.id === "ranger" ? "cinder_warden" : "briar_queen";
  if (Array.isArray(bosses) && bosses.includes(bossId)) return true;
  if (bosses && typeof bosses === "object" && bosses[bossId]) return true;
  return (
    Array.isArray(meta.unlockedClasses) &&
    meta.unlockedClasses.includes(classId)
  );
}

export function upgradeCost(id, value = 0) {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!upgrade) return Infinity;
  const level = Math.max(0, Math.floor(Number(value) || 0));
  if (level >= upgrade.maxLevel) return Infinity;
  return Math.ceil(upgrade.baseCost * upgrade.costGrowth ** level);
}
