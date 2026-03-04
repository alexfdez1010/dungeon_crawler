use super::MapArchitect;
use crate::prelude::*;

/// Generates cave-like maps using a cellular automata simulation.
///
/// The architect starts with random noise and repeatedly smooths it,
/// yielding organic cave structures.
pub struct CellularAutomataArchitect {}

impl MapArchitect for CellularAutomataArchitect {
    /// Builds a complete playable map.
    ///
    /// # Parameters
    /// - `rng`: Random number generator used to create map noise and entity placement.
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

        self.random_noise_map(rng, &mut mb.map);
        for _ in 0..10 {
            self.iteration(&mut mb.map);
        }

        let start = self.find_start(&mb.map);
        mb.entity_spawns = mb.spawn_entities(&start, rng);
        mb.player_start = start;
        mb.amulet_start = mb.find_most_distant();
        mb.final_boss_start = mb.get_adjacent_position(&mb.amulet_start).unwrap();
        mb
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wall_map() -> Map {
        let mut map = Map::new();
        map.tiles.iter_mut().for_each(|t| *t = TileType::Wall);
        map
    }

    #[test]
    fn count_neighbors_wraps_across_edges() {
        let architect = CellularAutomataArchitect {};
        let mut map = Map::new();
        map.tiles.iter_mut().for_each(|t| *t = TileType::Floor);
        map.tiles[map_idx(0, 0)] = TileType::Wall;

        let neighbors = architect.count_neighbors(SCREEN_WIDTH - 1, SCREEN_HEIGHT - 1, &map);

        assert_eq!(neighbors, 1);
    }

    #[test]
    fn iteration_turns_open_areas_into_walls() {
        let mut architect = CellularAutomataArchitect {};
        let mut map = Map::new();
        map.tiles.iter_mut().for_each(|t| *t = TileType::Floor);

        architect.iteration(&mut map);

        assert!(map.tiles[map_idx(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)] == TileType::Wall);
    }

    #[test]
    fn iteration_keeps_tile_with_four_walls_as_floor() {
        let mut architect = CellularAutomataArchitect {};
        let mut map = Map::new();
        map.tiles.iter_mut().for_each(|t| *t = TileType::Floor);
        let center = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

        map.tiles[map_idx(center.x - 1, center.y)] = TileType::Wall;
        map.tiles[map_idx(center.x + 1, center.y)] = TileType::Wall;
        map.tiles[map_idx(center.x, center.y - 1)] = TileType::Wall;
        map.tiles[map_idx(center.x, center.y + 1)] = TileType::Wall;

        architect.iteration(&mut map);

        assert!(map.tiles[map_idx(center.x, center.y)] == TileType::Floor);
    }

    #[test]
    fn find_start_chooses_floor_closest_to_center() {
        let architect = CellularAutomataArchitect {};
        let mut map = wall_map();
        let center = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        let closest = Point::new(center.x + 1, center.y);
        let farther = Point::new(1, 1);

        map.tiles[map_idx(closest.x, closest.y)] = TileType::Floor;
        map.tiles[map_idx(farther.x, farther.y)] = TileType::Floor;

        let start = architect.find_start(&map);

        assert_eq!(start, closest);
    }
}

impl CellularAutomataArchitect {
    /// Initializes the map with random floor/wall noise.
    ///
    /// Tiles are set to floor when roll is greater than `45`, otherwise wall.
    fn random_noise_map(&mut self, rng: &mut RandomNumberGenerator, map: &mut Map) {
        map.tiles.iter_mut().for_each(|t| {
            let roll = rng.range(0, 100);
            if roll > 45 {
                *t = TileType::Floor;
            } else {
                *t = TileType::Wall;
            }
        });
    }

    /// Counts wall neighbors in the 8 surrounding cells.
    ///
    /// Coordinates wrap around map boundaries (toroidal topology).
    fn count_neighbors(&self, x: i32, y: i32, map: &Map) -> usize {
        let mut neighbors = 0;
        for iy in -1..=1 {
            for ix in -1..=1 {
                let new_x = module(x + ix, SCREEN_WIDTH);
                let new_y = module(y + iy, SCREEN_HEIGHT);
                if !(ix == 0 && iy == 0) && map.tiles[map_idx(new_x, new_y)] == TileType::Wall {
                    neighbors += 1;
                }
            }
        }
        neighbors
    }

    /// Applies one automata smoothing pass based on local wall density.
    ///
    /// A tile becomes wall when it has more than four wall neighbors,
    /// or when it has zero wall neighbors; otherwise it becomes floor.
    fn iteration(&mut self, map: &mut Map) {
        let mut new_tiles = map.tiles.clone();
        for y in 0..SCREEN_HEIGHT {
            for x in 0..SCREEN_WIDTH {
                let neighbors = self.count_neighbors(x, y, map);
                let idx = map_idx(x, y);
                if neighbors > 4 || neighbors == 0 {
                    new_tiles[idx] = TileType::Wall;
                } else {
                    new_tiles[idx] = TileType::Floor;
                }
            }
        }
        map.tiles = new_tiles;
    }

    /// Finds the floor tile closest to map center.
    ///
    /// # Panics
    /// Panics if the map has no floor tiles.
    fn find_start(&self, map: &Map) -> Point {
        let center = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        let closest_point = map
            .tiles
            .iter()
            .enumerate()
            .filter(|(_, t)| **t == TileType::Floor)
            .map(|(idx, _)| {
                (
                    idx,
                    DistanceAlg::Pythagoras.distance2d(center, map.index_to_point2d(idx)),
                )
            })
            .min_by(|(_, distance1), (_, distance2)| distance1.partial_cmp(distance2).unwrap())
            .map(|(idx, _)| idx)
            .unwrap();
        map.index_to_point2d(closest_point)
    }
}
