use crate::prelude::*;

#[system(for_each)]
#[read_component(Player)]
#[read_component(FieldOfView)]
pub fn movement(
    entity: &Entity,
    want_move: &WantsToMove,
    #[resource] map: &mut Map,
    #[resource] camera: &mut Camera,
    ecs: &mut SubWorld,
    commands: &mut CommandBuffer,
){
    let destination = Point::new(
        module(want_move.destination.x, SCREEN_WIDTH),
        module(want_move.destination.y, SCREEN_HEIGHT)
    );

    if map.can_enter_tile(destination) {
        commands.add_component(want_move.entity, destination);
        
        if let Ok(entry) = ecs.entry_ref(want_move.entity) {
            if let Ok(fov) = entry.get_component::<FieldOfView>() {
                commands.add_component(want_move.entity, fov.clone_dirty());
                if entry.get_component::<Player>().is_ok() {
                    camera.on_player_move(destination);
                    fov.visible_tiles.iter().for_each(|pos| {
                        let idx = map_idx(pos.x, pos.y);
                        map.revealed_tiles[idx] = true;
                    });
                }
            }
            
        }
    }
    commands.remove(*entity);
}