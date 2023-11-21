use crate::prelude::*;

mod template;
pub use template::*;

pub fn spawn_player(ecs : &mut World, pos : Point) {
    ecs.push(
        (
            Player{map_level: 0},
            pos,
            Render{
                color : ColorPair::new(WHITE, BLACK),
                glyph : to_cp437('@')
            },
            Health{
                current : 10,
                max : 10
            },
            FieldOfView::new(8),
            Damage(1)
        )
    );
}

pub fn spawn_amulet_of_yala(ecs: &mut World, pos: Point){
    ecs.push(
        (
            Item,
            AmuletOfYala,
            pos,
            Render{
                color : ColorPair::new(WHITE, BLACK),
                glyph : to_cp437('|')
            },
            Name("Amulet of Yala".to_string())
        )
    );
}

pub fn spawn_level(
    ecs: &mut World,
    rng: &mut RandomNumberGenerator,
    level: usize,
    spawn_points: &[Point]
){
    let templates = Templates::load();
    templates.spawn_entities(ecs, rng, level, spawn_points);
}