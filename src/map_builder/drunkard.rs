use super::MapArchitect;
use crate::prelude::*;

/// Generates maps by repeatedly carving random walks through solid walls.
pub struct DrunkardsWalkArchitect {}

const STAGGER_DISTANCE: usize = 300;
const NUM_TILES: usize = (SCREEN_WIDTH * SCREEN_HEIGHT) as usize;
const DESIRED_FLOOR: usize = NUM_TILES / 2;

impl MapArchitect for DrunkardsWalkArchitect {
    /// Builds a complete playable map with the drunkard's walk algorithm.
    ///
    /// # Parameters
    /// - `rng`: Random number generator used to drive carving and spawn selection.
    ///
    /// # Returns
    /// A fully initialized `MapBuilder` with player, entities, amulet, and boss spawn points.
    fn new(&mut self, rng: &mut RandomNumberGenerator) -> MapBuilder {
        let mut mb = MapBuilder {
            map: Map::new(),
            entity_spawns: Vec::new(),
            player_start: Point::zero(),
            amulet_start: Point::zero(),
            final_boss_start: Point::zero(),
            theme: super::themes::DungeonTheme::new(),
        };

        mb.fill(TileType::Wall);
        let center = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        self.drunkard(&center, rng, &mut mb.map);
        while mb
            .map
            .tiles
            .iter()
            .filter(|t| **t == TileType::Floor)
            .count()
            < DESIRED_FLOOR
        {
            self.drunkard(
                &Point::new(rng.range(0, SCREEN_WIDTH), rng.range(0, SCREEN_HEIGHT)),
                rng,
                &mut mb.map,
            );
            let dijkstra_map = DijkstraMap::new(
                SCREEN_WIDTH,
                SCREEN_HEIGHT,
                &[mb.map.point2d_to_index(center)],
                &mb.map,
                1024.0,
            );
            dijkstra_map
                .map
                .iter()
                .enumerate()
                .filter(|(_, dist)| *dist > &2000.0)
                .for_each(|(idx, _)| mb.map.tiles[idx] = TileType::Wall);
        }

        mb.entity_spawns = mb.spawn_entities(&center, rng);
        mb.player_start = center;
        mb.amulet_start = mb.find_most_distant();
        mb.final_boss_start = mb.get_adjacent_position(&mb.amulet_start).unwrap();
        mb
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn count_floors(map: &Map) -> usize {
        map.tiles.iter().filter(|t| **t == TileType::Floor).count()
    }

    #[test]
    fn drunkard_carves_some_floor_tiles_from_all_walls() {
        let mut architect = DrunkardsWalkArchitect {};
        let mut rng = RandomNumberGenerator::new();
        let mut map = Map::new();
        map.tiles.iter_mut().for_each(|t| *t = TileType::Wall);
        let start = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

        architect.drunkard(&start, &mut rng, &mut map);

        assert!(count_floors(&map) > 0);
    }

    #[test]
    fn drunkard_always_carves_the_start_tile() {
        let mut architect = DrunkardsWalkArchitect {};
        let mut rng = RandomNumberGenerator::new();
        let mut map = Map::new();
        map.tiles.iter_mut().for_each(|t| *t = TileType::Wall);
        let start = Point::new(SCREEN_WIDTH / 3, SCREEN_HEIGHT / 3);

        architect.drunkard(&start, &mut rng, &mut map);

        assert!(map.tiles[map_idx(start.x, start.y)] == TileType::Floor);
    }
}

impl DrunkardsWalkArchitect {
    /// Performs one random walk from `start`, carving floor tiles along the path.
    ///
    /// The walk wraps at map edges and stops after `STAGGER_DISTANCE` steps.
    fn drunkard(&mut self, start: &Point, rng: &mut RandomNumberGenerator, map: &mut Map) {
        let mut drunkard_pos = *start;
        let mut distance_staggered = 0;

        loop {
            let drunk_idx = map_idx(drunkard_pos.x, drunkard_pos.y);
            map.tiles[drunk_idx] = TileType::Floor;

            match rng.range(0, 4) {
                0 => drunkard_pos.x = module(drunkard_pos.x - 1, SCREEN_WIDTH),
                1 => drunkard_pos.x = module(drunkard_pos.x + 1, SCREEN_WIDTH),
                2 => drunkard_pos.y = module(drunkard_pos.y - 1, SCREEN_HEIGHT),
                _ => drunkard_pos.y = module(drunkard_pos.y + 1, SCREEN_HEIGHT),
            }

            distance_staggered += 1;
            if distance_staggered > STAGGER_DISTANCE {
                break;
            }
        }
    }
}
