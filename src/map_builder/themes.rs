use crate::prelude::*;

/// Dungeon-themed tile renderer.
pub struct DungeonTheme {}

impl DungeonTheme {
    /// Creates a boxed dungeon theme.
    pub fn new() -> Box<dyn MapTheme> {
        Box::new(Self {})
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dungeon_theme_maps_tiles_to_expected_glyphs() {
        let theme = DungeonTheme {};

        assert_eq!(theme.tile_to_render(TileType::Floor), to_cp437('.'));
        assert_eq!(theme.tile_to_render(TileType::Wall), to_cp437('#'));
        assert_eq!(theme.tile_to_render(TileType::Exit), to_cp437('>'));
    }

    #[test]
    fn forest_theme_maps_tiles_to_expected_glyphs() {
        let theme = ForestTheme {};

        assert_eq!(theme.tile_to_render(TileType::Floor), to_cp437(';'));
        assert_eq!(theme.tile_to_render(TileType::Wall), to_cp437('"'));
        assert_eq!(theme.tile_to_render(TileType::Exit), to_cp437('>'));
    }
}

impl MapTheme for DungeonTheme {
    /// Maps logical tile types to dungeon glyphs.
    fn tile_to_render(&self, tile_type: TileType) -> FontCharType {
        match tile_type {
            TileType::Floor => to_cp437('.'),
            TileType::Wall => to_cp437('#'),
            TileType::Exit => to_cp437('>'),
        }
    }
}

/// Forest-themed tile renderer.
pub struct ForestTheme {}

impl ForestTheme {
    /// Creates a boxed forest theme.
    pub fn new() -> Box<dyn MapTheme> {
        Box::new(Self {})
    }
}

impl MapTheme for ForestTheme {
    /// Maps logical tile types to forest glyphs.
    fn tile_to_render(&self, tile_type: TileType) -> FontCharType {
        match tile_type {
            TileType::Floor => to_cp437(';'),
            TileType::Wall => to_cp437('"'),
            TileType::Exit => to_cp437('>'),
        }
    }
}
