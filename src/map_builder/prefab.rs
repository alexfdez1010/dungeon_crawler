use crate::prelude::*;

/// Fortress prefab pattern, width, and height.
const FORTRESS: (&str, i32, i32) = (
    "
------------
---######---
---#----#---
---#-M--#---
-###----###-
--M------M--
-###----###-
---#----#---
---#----#---
---######---
------------
",
    12,
    11,
);

/// Attempts to place a fortress prefab into the generated map.
///
/// Placement is constrained to reachable tiles that are far enough from the player,
/// and existing entity spawns inside the prefab rectangle are removed.
pub fn apply_prefab(mb: &mut MapBuilder, rng: &mut RandomNumberGenerator) {
    let mut placement = None;

    let dijkstra_map = DijkstraMap::new(
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        &[mb.map.point2d_to_index(mb.player_start)],
        &mb.map,
        1024.0,
    );

    let mut attempts = 0;
    while placement.is_none() && attempts < 10 {
        let dimensions = Rect::with_size(
            rng.range(0, SCREEN_WIDTH - FORTRESS.1),
            rng.range(0, SCREEN_HEIGHT - FORTRESS.2),
            FORTRESS.1,
            FORTRESS.2,
        );

        let mut can_place = false;
        dimensions.for_each(|pt| {
            let idx = mb.map.point2d_to_index(pt);
            let distance = dijkstra_map.map[idx];
            if distance < 2000.0 && distance > 20.0 && mb.amulet_start != pt {
                can_place = true;
            }
        });

        if can_place {
            placement = Some(Point::new(dimensions.x1, dimensions.y1));
            let points = dimensions.point_set();
            mb.entity_spawns.retain(|pt| !points.contains(pt));
        }
        attempts += 1;
    }

    if let Some(placement) = placement {
        let string_vec: Vec<char> = FORTRESS
            .0
            .chars()
            .filter(|a| *a != '\r' && *a != '\n')
            .collect();
        let mut i = 0;
        for ty in placement.y..placement.y + FORTRESS.2 {
            for tx in placement.x..placement.x + FORTRESS.1 {
                let idx = mb.map.point2d_to_index(Point::new(tx, ty));
                let c = string_vec[i];
                match c {
                    '#' => mb.map.tiles[idx] = TileType::Wall,
                    '-' => mb.map.tiles[idx] = TileType::Floor,
                    'M' => {
                        mb.map.tiles[idx] = TileType::Floor;
                        mb.entity_spawns.push(Point::new(tx, ty));
                    }
                    _ => {}
                }
                i += 1;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_builder() -> MapBuilder {
        MapBuilder {
            map: Map::new(),
            entity_spawns: Vec::new(),
            player_start: Point::new(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2),
            amulet_start: Point::new(0, 0),
            final_boss_start: Point::zero(),
            theme: super::super::themes::DungeonTheme::new(),
        }
    }

    #[test]
    fn apply_prefab_keeps_entity_spawns_on_floor_tiles() {
        let mut mb = make_builder();
        let mut rng = RandomNumberGenerator::new();

        apply_prefab(&mut mb, &mut rng);

        assert!(
            mb.entity_spawns
                .iter()
                .all(|pt| mb.map.tiles[map_idx(pt.x, pt.y)] == TileType::Floor)
        );
    }

    #[test]
    fn apply_prefab_does_not_change_map_size() {
        let mut mb = make_builder();
        let mut rng = RandomNumberGenerator::new();
        let before = mb.map.tiles.len();

        apply_prefab(&mut mb, &mut rng);

        assert_eq!(mb.map.tiles.len(), before);
    }
}
