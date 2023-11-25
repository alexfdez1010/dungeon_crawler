use crate::prelude::*;

#[system]
#[read_component(ActivateItem)]
#[read_component(ProvidesHealing)]
#[read_component(ProvidesDungeonMap)]
#[read_component(ProvidesVision)]
#[write_component(Health)]
#[write_component(FieldOfView)]
pub fn use_items(ecs: &mut SubWorld, commands: &mut CommandBuffer, #[resource] map: &mut Map) {
    let mut healing_to_apply = Vec::<(Entity, i32)>::new();
    let mut vision_to_apply = Vec::<(Entity, i32)>::new();

    <(Entity, &ActivateItem)>::query()
        .iter(ecs)
        .for_each(|(entity, activate)| {
            let item = ecs.entry_ref(activate.item);

            if let Ok(item) = item {
                if let Ok(healing) = item.get_component::<ProvidesHealing>() {
                    healing_to_apply.push((activate.used_by, healing.amount));
                } else if let Ok(affect_vision) = item.get_component::<ProvidesVision>() {
                    vision_to_apply.push((activate.used_by, affect_vision.range_difference));
                } else if item.get_component::<ProvidesDungeonMap>().is_ok() {
                    map.revealed_tiles.iter_mut().for_each(|t| *t = true);
                    map.revealed = true;
                }

                commands.remove(activate.item);
                commands.remove(*entity);
            }
        });

    for heal in healing_to_apply.iter() {
        if let Ok(mut target) = ecs.entry_mut(heal.0) {
            if let Ok(health) = target.get_component_mut::<Health>() {
                health.current = i32::min(health.max, health.current + heal.1);
            }
        }
    }

    for vision in vision_to_apply.iter() {
        if let Ok(mut target) = ecs.entry_mut(vision.0) {
            if let Ok(fow) = target.get_component_mut::<FieldOfView>() {
                fow.radius = i32::max(fow.radius, fow.radius + vision.1);
                fow.is_dirty = true;
            }
        }
    }
}
