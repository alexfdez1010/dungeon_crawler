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

    pub fn in_bounds(&self, point : Point) -> bool {
        point.x >= 0 && point.x < SCREEN_WIDTH && point.y >= 0 && point.y < SCREEN_HEIGHT
    }

    pub fn try_idx(&self, point : Point) -> Option<usize> {
        if !self.in_bounds(point) {
            None
        } 
        else {
            Some(map_idx(point.x, point.y))
        }
    }

    pub fn can_enter_tile(&self, point : Point) -> bool {
        if !self.in_bounds(point) {
            return false;
        }
        return self.tiles[map_idx(point.x, point.y)]!=TileType::Wall;
    }

    fn valid_exit(&self, loc : Point, delta : Point) -> Option<usize> {
        let destination = loc + delta;
        if self.in_bounds(destination) {
            if self.can_enter_tile(destination) {
                let idx = self.point2d_to_index(destination);
                return Some(idx);
            }
        }
        None
    }
}

impl Algorithm2D for Map{
    fn dimensions(&self) -> Point {
        Point::new(SCREEN_WIDTH, SCREEN_HEIGHT)
    }

    fn in_bounds(&self, point : Point) -> bool {
        self.in_bounds(point)
    }
}

impl BaseMap for Map {
    fn get_available_exits(&self, _idx: usize) -> SmallVec<[(usize, f32); 10]> {
        let mut exits = SmallVec::new();
        let loc = self.index_to_point2d(_idx);
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

    fn get_pathing_distance(&self, _idx1: usize, _idx2: usize) -> f32 {
        DistanceAlg::Pythagoras.distance2d(self.index_to_point2d(_idx1), self.index_to_point2d(_idx2))
    }

    fn is_opaque(&self, idx: usize) -> bool {
        self.tiles[idx] == TileType::Wall
    }
}