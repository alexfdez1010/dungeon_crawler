use crate::prelude::*;

mod automata;
mod drunkard;
mod prefab;
mod themes;

use automata::CellularAutomataArchitect;
use drunkard::DrunkardsWalkArchitect;
use prefab::apply_prefab;
use themes::*;

/// Holds generated map data and all spawn points needed to initialize a level.
pub struct MapBuilder {
    pub map: Map,
    pub entity_spawns: Vec<Point>,
    pub player_start: Point,
    pub amulet_start: Point,
    pub final_boss_start: Point,
    pub theme: Box<dyn MapTheme>,
}

impl MapBuilder {
    /// Creates a new map using one of the available architects and applies a prefab.
    ///
    /// # Parameters
    /// - `rng`: Random number generator used for architecture/theme selection and generation.
    ///
    /// # Returns
    /// A fully initialized `MapBuilder` with map, spawns, and theme.
    pub fn new(rng: &mut RandomNumberGenerator) -> Self {
        let mut architect: Box<dyn MapArchitect> = match rng.range(0, 2) {
            0 => Box::new(DrunkardsWalkArchitect {}),
            _ => Box::new(CellularAutomataArchitect {}),
        };
        let mut mb = architect.new(rng);
        apply_prefab(&mut mb, rng);
        mb.theme = match rng.range(0, 2) {
            0 => DungeonTheme::new(),
            _ => ForestTheme::new(),
        };

        mb
    }

    /// Fills the entire map with a single tile type.
    fn fill(&mut self, tile: TileType) {
        self.map.tiles.iter_mut().for_each(|t| *t = tile);
    }

    /// Finds the farthest reachable tile from `player_start` using Dijkstra distance.
    ///
    /// # Panics
    /// Panics if no reachable tile exists.
    fn find_most_distant(&self) -> Point {
        let dijkstra_map = DijkstraMap::new(
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            &[self.map.point2d_to_index(self.player_start)],
            &self.map,
            1024.0,
        );

        const UNREACHABLE: &f32 = &2000.0;
        self.map.index_to_point2d(
            dijkstra_map
                .map
                .iter()
                .enumerate()
                .filter(|(_, dist)| *dist < UNREACHABLE)
                .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
                .unwrap()
                .0,
        )
    }

    /// Selects entity spawn positions on floor tiles far enough from the start.
    ///
    /// # Panics
    /// Panics if there are fewer than 50 valid spawnable tiles.
    fn spawn_entities(&self, start: &Point, rng: &mut RandomNumberGenerator) -> Vec<Point> {
        const NUM_ENTITIES: usize = 50;
        let mut spawnable_tiles: Vec<Point> = self
            .map
            .tiles
            .iter()
            .enumerate()
            .filter(|(idx, t)| {
                **t == TileType::Floor
                    && DistanceAlg::Pythagoras.distance2d(*start, self.map.index_to_point2d(*idx))
                        > 10.0
            })
            .map(|(idx, _)| self.map.index_to_point2d(idx))
            .collect();

        let mut spawns = Vec::new();
        for _ in 0..NUM_ENTITIES {
            let target_index = rng.random_slice_index(&spawnable_tiles).unwrap();
            spawns.push(spawnable_tiles[target_index]);
            spawnable_tiles.remove(target_index);
        }
        spawns
    }

    /// Returns the first walkable adjacent tile in cardinal directions.
    fn get_adjacent_position(&self, pos: &Point) -> Option<Point> {
        let possible_pos = [
            Point::new(pos.x - 1, pos.y),
            Point::new(pos.x + 1, pos.y),
            Point::new(pos.x, pos.y - 1),
            Point::new(pos.x, pos.y + 1),
        ];

        for p in possible_pos.iter() {
            if self.map.can_enter_tile(*p) {
                return Some(*p);
            }
        }

        None
    }
}

/// Strategy trait for map generation algorithms.
trait MapArchitect {
    fn new(&mut self, rng: &mut RandomNumberGenerator) -> MapBuilder;
}

/// Rendering theme abstraction for map tiles.
pub trait MapTheme: Sync + Send {
    fn tile_to_render(&self, tile_type: TileType) -> FontCharType;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_builder() -> MapBuilder {
        MapBuilder {
            map: Map::new(),
            entity_spawns: Vec::new(),
            player_start: Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2),
            amulet_start: Point::zero(),
            final_boss_start: Point::zero(),
            theme: DungeonTheme::new(),
        }
    }

    #[test]
    fn fill_sets_every_tile_to_requested_type() {
        let mut mb = make_builder();

        mb.fill(TileType::Wall);

        assert!(mb.map.tiles.iter().all(|t| *t == TileType::Wall));
    }

    #[test]
    fn get_adjacent_position_returns_none_when_all_neighbors_are_walls() {
        let mut mb = make_builder();
        mb.fill(TileType::Wall);
        let pos = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

        let adjacent = mb.get_adjacent_position(&pos);

        assert!(adjacent.is_none());
    }

    #[test]
    fn spawn_entities_returns_expected_number_of_unique_points() {
        let mut mb = make_builder();
        mb.fill(TileType::Floor);
        let start = Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        let mut rng = RandomNumberGenerator::new();

        let spawns = mb.spawn_entities(&start, &mut rng);
        let unique: std::collections::HashSet<Point> = spawns.iter().copied().collect();

        assert_eq!(spawns.len(), 50);
        assert_eq!(unique.len(), 50);
    }
}
