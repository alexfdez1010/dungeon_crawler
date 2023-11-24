use crate::prelude::*;

const NUM_TILES: usize = (SCREEN_WIDTH * SCREEN_HEIGHT) as usize;

#[derive(Copy, Clone, PartialEq)]
pub enum TileType {
    Wall,
    Floor,
    Exit
}

pub fn map_idx(x: i32, y: i32) -> usize {
    ((y * SCREEN_WIDTH) + x) as usize
}

pub fn module(x: i32, y: i32) -> i32 {
    ((x % y) + y) % y
}

pub fn module_point(point : Point) -> Point {
    Point::new(module(point.x, SCREEN_WIDTH), module(point.y, SCREEN_HEIGHT))
}

pub struct Map {
    pub tiles: Vec<TileType>,
    pub revealed_tiles : Vec<bool>,
    pub revealed: bool
}

impl Map {
    pub fn new() -> Self {
        Self {
            tiles: vec![TileType::Floor; NUM_TILES],
            revealed_tiles : vec![false; NUM_TILES],
            revealed: false
        }
    }

    pub fn can_enter_tile(&self, point : Point) -> bool {
        let point = module_point(point);
        return self.tiles[map_idx(point.x, point.y)]!=TileType::Wall;
    }

    fn valid_exit(&self, loc : Point, delta : Point) -> Option<usize> {
        let destination = module_point(loc + delta);
        if self.can_enter_tile(destination) {
            let idx = self.point2d_to_index(destination);
            return Some(idx);
        }
        None
    }
}

impl Algorithm2D for Map{

    fn dimensions(&self) -> Point {
        Point::new(SCREEN_WIDTH, SCREEN_HEIGHT)
    }

    fn in_bounds(&self, _point : Point) -> bool {
        true
    }
}

impl BaseMap for Map {
    fn get_available_exits(&self, _idx: usize) -> SmallVec<[(usize, f32); 10]> {
        let mut exits = SmallVec::new();
        let loc = module_point(self.index_to_point2d(_idx));
        if let Some(idx) = self.valid_exit(loc, Point::new(-1, 0)) {
            exits.push((idx, 1.0))
        }
        if let Some(idx) = self.valid_exit(loc, Point::new(1, 0)) {
            exits.push((idx, 1.0))
        }
        if let Some(idx) = self.valid_exit(loc, Point::new(0, -1)) {
            exits.push((idx, 1.0))
        }
        if let Some(idx) = self.valid_exit(loc, Point::new(0, 1)) {
            exits.push((idx, 1.0))
        }
        exits
    }

    fn get_pathing_distance(&self, idx1: usize, idx2: usize) -> f32 {
        let start = module_point(self.index_to_point2d(idx1));
        let end = module_point(self.index_to_point2d(idx2));
        
        let diff_x = (start.x - end.x).abs();
        let diff_x = std::cmp::min(diff_x, SCREEN_WIDTH - diff_x).pow(2);
        let diff_y = (start.y - end.y).abs();
        let diff_y = std::cmp::min(diff_y, SCREEN_HEIGHT - diff_y).pow(2);  

        ((diff_x + diff_y) as f32).sqrt()
    }

    fn is_opaque(&self, idx: usize) -> bool {
        self.tiles[idx] == TileType::Wall
    }
}