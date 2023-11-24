use crate::prelude::*;
use super::MapArchitect;

pub struct DrunkardsWalkArchitect {}

const STAGGER_DISTANCE : usize = 300;
const NUM_TILES : usize = (SCREEN_WIDTH * SCREEN_HEIGHT) as usize;
const DESIRED_FLOOR : usize = NUM_TILES / 3;

impl MapArchitect for DrunkardsWalkArchitect {
    fn new(&mut self, rng: &mut RandomNumberGenerator) -> MapBuilder{
        let mut mb = MapBuilder{
            map : Map::new(),
            entity_spawns : Vec::new(),
            player_start : Point::zero(),
            amulet_start : Point::zero(),
            final_boss_start : Point::zero(),
            theme: super::themes::DungeonTheme::new()
        };

        mb.fill(TileType::Wall);
        let center = Point::new(SCREEN_WIDTH/2, SCREEN_HEIGHT/2);
        self.drunkard(&center, rng, &mut mb.map);
        while mb.map.tiles.iter().filter(|t| **t == TileType::Floor).count() < DESIRED_FLOOR {
            self.drunkard(
                &Point::new(rng.range(0, SCREEN_WIDTH), rng.range(0, SCREEN_HEIGHT)),
                rng,
                &mut mb.map
            );
            let dijkstra_map = DijkstraMap::new(
                SCREEN_WIDTH,
                SCREEN_HEIGHT,
                &vec![mb.map.point2d_to_index(center)],
                &mb.map,
                1024.0
            );
            dijkstra_map.map
                .iter()
                .enumerate()
                .filter(|(_,dist)| *dist > &2000.0)
                .for_each(|(idx, _)| mb.map.tiles[idx] = TileType::Wall);
        }
        
        mb.entity_spawns = mb.spawn_entities(&center, rng);
        mb.player_start = center;
        mb.amulet_start = mb.find_most_distant();
        mb.final_boss_start = mb.get_adjacent_position(&mb.amulet_start).unwrap();
        mb
    }
}

impl DrunkardsWalkArchitect{
    fn drunkard(&mut self, start: &Point, rng: &mut RandomNumberGenerator, map: &mut Map){
        let mut drunkard_pos = start.clone();
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