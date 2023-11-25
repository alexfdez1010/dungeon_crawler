use crate::prelude::*;
use std::collections::HashSet;
use std::collections::VecDeque;

fn manhattan_distance(start: Point, end: Point) -> i32 {
    let diff_x = (start.x - end.x).abs();
    let diff_x = std::cmp::min(diff_x, SCREEN_WIDTH - diff_x);
    let diff_y = (start.y - end.y).abs();
    let diff_y = std::cmp::min(diff_y, SCREEN_HEIGHT - diff_y);

    diff_x + diff_y
}

fn infinite_of_view_set(center: Point, range: i32, fov_check: &dyn Algorithm2D) -> HashSet<Point> {
    let mut visible_points: HashSet<Point> =
        HashSet::with_capacity(((range * 2) * (range * 2)) as usize);

    visible_points.insert(center);

    const MOVES: [Point; 4] = [
        Point { x: -1, y: 0 },
        Point { x: 1, y: 0 },
        Point { x: 0, y: -1 },
        Point { x: 0, y: 1 },
    ];

    let mut queue = VecDeque::from(vec![(0, center)]);

    while !queue.is_empty() {
        let (distance, current) = queue.pop_front().unwrap();
        let idx = fov_check.point2d_to_index(current);

        if fov_check.is_opaque(idx) {
            continue;
        }

        MOVES.iter().for_each(|m| {
            let next = module_point(current + *m);

            if visible_points.contains(&next) {
                return;
            }

            let distance_next = manhattan_distance(center, next);

            if distance_next > range || distance_next != distance + 1 {
                return;
            }

            visible_points.insert(next);
            queue.push_back((distance + 1, next));
        });
    }

    visible_points
}

#[system]
#[read_component(Point)]
#[write_component(FieldOfView)]
pub fn fov(ecs: &mut SubWorld, #[resource] map: &Map) {
    let mut views = <(&Point, &mut FieldOfView)>::query();
    views
        .iter_mut(ecs)
        .filter(|(_, fov)| fov.is_dirty)
        .for_each(|(pos, fov)| {
            fov.visible_tiles = infinite_of_view_set(*pos, fov.radius, map);
            fov.is_dirty = false;
        });
}
