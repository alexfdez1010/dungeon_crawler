# Dungeon Crawler 🐉

This work is based in the book [Hands-on Rust: Effective Learning through 2D Game Development and Play](https://pragprog.com/titles/hwrust/hands-on-rust/) by Herbert Wolverson. 📚 The book offers an excellent introduction to Rust and game development. I highly recommend it! 🌟 You'll be able to learn Rust while understanding common design patterns in video games. 🕹️

## Play the Game 🎮

First, the most important part: you can play the game [right here](https://alexfdez1010.github.io/dungeon_crawler/)! The game operates with WebAssembly and is playable directly in your browser. No installation needed – just dive right in! 🌐

### Controls 🕹️

- Use the `Arrow keys` to move and attack (if an enemy is in the position you're moving to).
- Press `G` to pick up items and store them in your inventory.
- Keys `1-9` are for using items in your inventory.
- With the `Mouse`, hover over any enemy or item to see its stats.

### Goal 🏆

The ultimate goal of the game is to recover the `Amulet of Yala`. 🏅 The game concludes when you reach the tile where the Amulet is located. You can find it on the last level of the dungeon (level 3). Advance to the next level by finding the stairs scattered around each level.

### Enemies 👹

You'll encounter 4 types of enemies:

- `Goblin`: the weakest, with 1 health point and 1 attack point.
- `Orc`: a bit tougher, having 2 health points and 1 attack point.
- `Ogre`: a stronger foe, with 5 health points and 2 attack points.
- `Ettin`: the mightiest adversary, boasting 20 health points and 5 attack points. There's only one Ettin in the game, guarding the Amulet of Yala. It's the final boss – consider avoiding it to snag the Amulet! 🛡️

### Items 📦

Discover 7 types of items:

- `Healing Potion`: Restores 6 health points.
- `Weak Healing Potion`: Restores 2 health points.
- `Vision Potion`: Permanently extends your vision range by one tile in all directions.
- `Rusty Sword`: Boosts attack points by 1. Only one sword can be carried at a time.
- `Shiny Sword`: Increases attack points by 2.
- `Huge Sword`: Amplifies attack points by 4.
- `Dungeon Map`: Reveals the entire level map. A new map is needed for each level.

### Level Design 🗺️

The levels are procedurally generated using the Drunkard's Walk algorithm and Cellular Automata. They ensure a path from the starting point to the stairs for the next level. Enemy and item placements are randomized, offering infinite replayability! The map is endless – reach the edge, and you'll teleport to the opposite side.

## Development 🛠️

The game is crafted in Rust, utilizing the `bracket-lib` library for the game engine. The architecture follows the ECS (Entity Component System) pattern, using the `Legion` library.

### Compiling and Running the Game 🖥️

To compile the game for your platform, you'll need Rust and Cargo. Instructions can be found [here](https://www.rust-lang.org/tools/install). Compile the game with:

```bash
cargo build --release
```

Run the game using:

```bash
cargo run --release
```

### Compiling and Running the Game for the Web 🌍

To compile for the web, execute:

```bash
./generate_wasm.sh
```

This command handles all necessary dependencies and compiles the game for web play. Use any web server to serve the game from `index.html`. Note: A web server is required for local development due to WebAssembly's needs.

## Contributing and Bugs 🐛

Encountered a bug or want to contribute? Feel free to open an issue or a pull request. I'm eager to collaborate! 🤝

## License 📜

This project is under the MIT License - see the `LICENSE.md` file for details.
