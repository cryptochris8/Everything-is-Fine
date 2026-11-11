---
name: genesys-procedural-assets
description: Generate low-poly, faceted game models from about 470 seeded generators — rocks, cliffs, trees, flowers, crates, barrels, fences, walls, buildings, castles, furniture, food, weapons, potions and power-ups, vehicles, sci-fi and wasteland props, dungeon and graveyard pieces, landmarks, characters (villagers, knights, modern professions, zombies, skeletons, monsters, robots, aliens), animals (pets, farm, wild, birds, sea life, dinosaurs, bugs), fantasy beasts and pickups. Free, offline, deterministic, mobile-ready GLBs. Use when the user wants a prop, character, creature or pickup model and no library asset fits. Not for level blockouts (genesys-polybuilder) or bespoke hero art (Scenario).
metadata:
  tokens: 4379
---

# Procedural Assets

A generator turns a closed recipe (`generator`, `preset`, `seed`, `params`, `style`) into a small Meshopt-compressed GLB: 1 unit = 1 m, pivot at the base, centred, facing +Z, vertex colours, no textures, validator-clean and inside the mobile budgets. The same recipe always gives the same model, so a recipe is a complete record of the asset.

## Rules

- **Prefer a generator.** Never hand-write triangles or vertex arrays for a prop, creature or pickup in game code. If no generator fits, say so and offer the closest generator, a library asset, or Scenario.
- **Start from a preset**, then change a few params. Presets are tuned to look good; raw params are not.
- **Always set a seed.** Offer variations by changing only the seed (a flock of ducks, a pile of different rocks).
- **Report** the file path, generator, preset, seed, changed params, style and triangle count, so the user can ask for "the same, but…".
- Pick the **style** that matches the game (`toy`, `storybook`, `neon`, `grim`, `sci-fi`, `shrine` for a Japanese shrine garden; `neutral` by default).
- Creatures take a **role** (`hero` cute with big eyes, `enemy` mean with brows, `boss` big with a crown or horns).
- Keep the asset where it was written (`assets/models/procedural/`) next to its `.recipe.json`. To change it, generate again from the recipe; do not edit the GLB.

## Generate

Through the Genesys MCP (compact-hidden tools; call them from `run_script` or `batch_execute`). Baking runs in the Genesys desktop app, so the project needs no extra package:

```js
const list = await genesys.queryAsset({ operation: 'listGenerators' });
const bird = await genesys.queryAsset({ operation: 'listGenerators', generator: 'fauna.waterbird' }); // params schema
const duck = await genesys.actionAsset({
  action: 'generateProcedural',
  generator: 'fauna.waterbird',
  preset: 'duck',
  seed: 7,
  params: { size: 0.5, role: 'hero' },
  style: 'storybook',
  name: 'duck-hero',
});
// duck: path (@project/assets/models/procedural/duck-hero.glb), triangles, bytes, warnings, recipe
```

For a variation, call `generateProcedural` again with the recipe's `generator`, `preset`, `params` and `style` and a new `seed` and `name`.

Then use the GLB like any model: place it in the scene with the usual model workflow (`genesys-mcp-orchestrator`) or load it from game code by its `@project/...` path.

## Choosing

| The user wants | Generator |
| :-- | :-- |
| Rocks, boulders, pebbles | `rock` |
| Cliff faces and rock walls to ring an arena | `rock.cliff` |
| Trees (oak, pine, birch, dead, blossom) | `tree` |
| Bushes and shrubs | `bush` |
| Stone toro, paper and iron lanterns | `prop.lantern` |
| Crates, barrels, fences, pillars, totems | `prop.crate`, `prop.barrel`, `prop.fence`, `prop.pillar` |
| Stone, ruined, hedge and sci-fi walls and gates | `prop.wall` |
| Wells | `prop.well` |
| Planters, flower beds, window boxes | `prop.planter` |
| Street lamps, torch posts, paper lamp posts | `prop.streetlamp` |
| Rows of cabbages, wheat, pumpkins or hydroponic crops | `prop.crop-row` |
| One crop plant at a growth stage (seed, sprout, young, budding, ripe, withered) | `prop.crop` |
| Scarecrows, sprinklers, shipping bins, hay bales | `prop.farm` |
| Fantasy heroes and classes: archers, wizards, witches, clerics, rogues, ninjas, monks, barbarians, paladins, cowboys, pirates, superheroes | `person.adventurer` |
| Fighters: knights, guards, soldiers, vikings, gladiators, samurai, space marines | `person.soldier` |
| Townsfolk and modern people: villagers, farmers, bakers, merchants, office workers, shopkeepers, tourists, students, punks | `person.townsfolk` |
| Workers in uniform: police, firefighters, paramedics, doctors, scientists, builders, chefs, pilots, astronauts, miners | `person.worker` |
| Kings, queens, princes, princesses, nobles, jesters | `person.royalty` |
| Children (kid, schoolkid, toddler, balloon kid) | `person.kid` |
| Athletes: footballers, goalkeepers, referees, basketball players, boxers, sprinters | `person.athlete` |
| Orcs, goblins, trolls, ogres, minotaurs, cyclopes, lizardfolk, ratfolk, werewolves | `person.monster` |
| Zombies, skeletons, mummies, vampires, liches, wraiths, ghouls, headless horsemen | `person.undead` |
| Demons, imps, gargoyles, yetis, harpies, djinn, oni | `person.fiend` |
| Golems, fire and ice elementals, slime people, mushroom folk, treants, scarecrows | `person.elemental` |
| Robots, androids, cyborgs, droids, mech suits, automatons, tin toy robots | `person.robot` |
| Aliens: greys, little green men, insectoids, alien queens, tentacle and crystal aliens | `person.alien` |
| Dogs, wolves, foxes, hellhounds, cerberus, kitsune | `fauna.dog` |
| Cats, lions, tigers, leopards, sabretooths, manticores | `fauna.cat` |
| Horses, deer, goats, sheep, cows, pigs, boars, camels, llamas, unicorns | `fauna.hoofed` |
| Bears, polar bears, pandas, owlbears | `fauna.bear` |
| Elephants, mammoths, rhinos, hippos, giraffes | `fauna.giant` |
| Mice, rats, squirrels, rabbits, hedgehogs, raccoons, otters, badgers, bats | `fauna.critter` |
| Monkeys, gorillas, sloths, koalas, kangaroos | `fauna.primate` |
| Land birds: chickens, crows, eagles, owls, parrots, pigeons, peacocks, phoenixes | `fauna.bird` |
| Ducks, geese, swans, flamingos, penguins, puffins, seagulls | `fauna.waterbird` |
| Fish, clownfish, koi, piranhas, pufferfish, anglerfish, seahorses, rays | `fauna.fish` |
| Sharks, whales, dolphins, orcas, narwhals, seals, walruses | `fauna.whale` |
| Octopus, squid, krakens, jellyfish | `fauna.cephalopod` |
| Crabs, lobsters, shrimp, starfish, sea urchins | `fauna.crab` |
| Turtles, tortoises, sea turtles, snails | `fauna.turtle` |
| Frogs and toads | `fauna.frog` |
| Lizards, geckos, chameleons, crocodiles, komodo dragons, axolotls | `fauna.lizard` |
| Snakes, eels, sea serpents, sandworms, caterpillars | `fauna.snake` |
| Spiders, tarantulas, scorpions | `fauna.spider` |
| Bees, beetles, ladybugs, butterflies, dragonflies, fireflies, mantises | `fauna.insect` |
| Dinosaurs: t rex, raptors, triceratops, stegosaurus, pterodactyls | `fauna.dinosaur` |
| Dragons, baby dragons, wyverns, hydras, griffins, gargoyle beasts | `fauna.dragon` |
| Slimes and mushroom blobs | `fauna.slime` |
| Wisps and ghosts | `fauna.wisp` |
| Gazers and mimics | `fauna.oddity` |
| Gems, hearts, coins, chests, keys, magnets, bombs | `pickup.gem`, `pickup.heart`, `pickup.coin`, `pickup.chest`, `pickup.key`, `pickup.magnet`, `pickup.bomb` |
| Loot items: potions, scrolls, wands, rings, swords, shields, armour, food, pouches, books, orbs, darts | `pickup.loot` |
| Cars, vans, trucks and buses; boats and planes; tanks and trains | `car` pack, `craft` pack, `transport` pack |
| Cottages, houses, towers, stalls, ruins, bunkers | `building.simple` |
| Any plant: oak, pine, willow, sakura, palm, bamboo, cactus, giant mushroom, reeds, lotus, coral, candy and crystal trees (grammar) | `plant.species` |
| Rock formations: boulders, stacks, arches, spires, scree, crystal clusters, standing stones, geodes, floating rocks | `rock.formation` |
| Buildings from a kit: cottages, pagodas, temples, shops, neon shopfronts, crypts, lighthouses, windmills, castle walls | `structure.kit` |
| Turned props (urns, braziers, bottles, totems, candles) and cut-out profiles (tombstones, torii, signs, gates, plinths) | `prop.lathe`, `prop.extrude` |
| Frames (stalls, arches, shelves, scaffolds, ema racks), stacks (crates, books, sandbags, candy) and cables (pipes, vines, chains, neon tubes, garlands) | `prop.frame`, `prop.stack`, `prop.cable` |
| Signs with glyph strokes: neon kanji-style signs, shop and warning signs | `prop.sign` |
| Arena terrain pieces: plateaus, terraces, islands, river banks, paths, ruins, ground patches, skylines, bridges, stairs, water plants | `terrain.plateau`, `terrain.terrace`, `terrain.island`, `terrain.water_edge`, `terrain.path`, `terrain.ruin`, `terrain.patch`, `terrain.skyline`, `terrain.bridge`, `terrain.stairs`, `terrain.water_plants` |
| Modern school campus: school buildings with a clock tower, gym and pool halls, school gates, desks, lockers, goals, hoops, bike racks | `modern.school`, `modern.sports-hall`, `modern.gate`, `modern.campus-prop` |
| Modern city street and downtown: apartment and office towers, small shops, convenience stores, billboards and neon signs | `modern.tower`, `modern.shop`, `modern.convenience-store`, `modern.billboard` |
| Modern street pieces: road and sidewalk tiles, traffic lights and signs, utility poles with wires, bus stops (parked cars: the `car` pack) | `modern.road`, `modern.signal`, `modern.utility-pole`, `modern.bus-stop` |
| Modern arcade, subway, park and riverside: vending and arcade machines, subway entrances, platforms and trains, street furniture, sakura and ginkgo trees, playgrounds (fences: `prop.fence`) | `modern.vending`, `modern.subway`, `modern.street-furniture`, `modern.street-tree`, `modern.playground` |
| Bright low-poly diorama pieces (the sunny look): round, cluster, pastel and pine trees, chunky rocks, clouds, tufts, flowers, mushrooms and bushes, campfires and tents, ponds, rivers and waterfalls, sand paths and bridges, fences, mountains, diorama and island bases with strata sides | `lowpoly.tree`, `lowpoly.rock`, `lowpoly.cloud`, `lowpoly.flora`, `lowpoly.camp`, `lowpoly.water`, `lowpoly.path`, `lowpoly.fence`, `lowpoly.mountain`, `lowpoly.diorama` |
| Beach resort: striped umbrellas, loungers, surfboard racks, sandcastles, lifebuoys and nets, cabanas, lifeguard towers, tiki bars, surf shops, ice-cream kiosks, boardwalks, piers, a resort hotel | `scene.beach-prop`, `scene.beach-build` |
| Festival night market: paper lantern strings and bunting, noren, komainu, taiko, goldfish pools, food carts, yatai stalls, torii gates, shrine steps and halls, a drum tower, mikoshi, a pagoda | `scene.festival-prop`, `scene.festival-build` |
| Snow village: snowmen, sleds, ice ponds, snow fences, woodpiles, ice sculptures, campfires, snowy pines, birches and shrubs, log cabins, igloos, a chapel, a lodge, a bakery, a sauna, an inn | `scene.snow-prop`, `scene.snow-build`, `scene.snow-tree` |

### Catalogue packs

Most props live in packs. Pick the pack, then the generator by id from [references/packs.md](references/packs.md) (one row per generator: role, what it draws, presets), and read its params with `queryAsset({ operation: 'listGenerators', generator: '<id>' })`. People (`person.*`) and animals (`fauna.*`) are core generators (the table above): pick the outfit or species by preset; they take `role`, `size` and `variant` (0-7 on-model variety: skin, hair, colourways, accessories).

| The user wants | Pack (generator prefixes) |
| :-- | :-- |
| Dungeon and cave dressing: torches, braziers, chains, cages, doors, portcullises, altars, traps, thrones, mine carts | `dungeon` pack (`dungeon.`) |
| Graveyard and Halloween: tombstones, coffins, crypts, jack-o'-lanterns, dead trees, iron fences, haunted houses | `spooky` pack (`spooky.`) |
| Medieval village and castle: cottages, taverns, smithies, windmills, market stalls, carts, castle walls, towers, gatehouses | `village` pack (`village.`, `castle.`) |
| Furniture and indoor decor: chairs, tables, sofas, beds, shelves, kitchens, bathrooms, lamps, clocks, rugs | `interior` pack (`furniture.`, `decor.`) |
| Food and drink: fruit, vegetables, bread, cakes, burgers, pizza, sweets, bottles | `food` pack (`food.`) |
| Weapons, armour, potions, scrolls, rings, crowns, tools and power-ups | `gear` pack (`weapon.`, `armor.`, `item.`, `powerup.`) |
| Sci-fi and space: consoles, cryo pods, turrets, domes, rockets, rovers, starfighters, asteroids, alien plants | `scifi` pack (`scifi.`, `space.`) |
| Flowers, mushrooms, cacti, jungle plants, trees by species, coral, kelp, ice crystals, geodes | `nature` pack (`flora.`, `nature.`) |
| Harbour, pirate, farm and camping: docks, boats, pirate ships, cannons, barns, silos, tractors, tents, campfires | `harbor` pack (`harbor.`, `pirate.`, `farm.`, `camp.`) |
| Vehicles, toys and sports: planes, helicopters, trains, ships, tanks, race cars, teddy bears, balls, goals | `transport` pack (`transport.`, `toy.`, `sport.`) |
| Post-apocalypse and military: barricades, wrecked cars, sandbags, oil drums, watchtowers, bunkers, tents | `wasteland` pack (`wasteland.`, `military.`) |
| Flying craft in flight pose: paper planes, biplanes, jets, gliders, airships, balloons, enemy fighters, helicopters, drones, boss aircraft, a dragon saddle | `aircraft` pack (`air.`) |
| Glowing VFX meshes (emissive, bloom-ready): torches, braziers, lanterns, campfires, neon signs and words, shop signs, crystals, energy orbs, portals, pickup glows, flight rings, sparks and shards, lava and slime pools | `vfx` pack (`vfx.`) |
| Colosseum and arena dressing: tiered stand sections, crowd-scale spectators and crowd blocks, banners, awnings, statues, gates, weapon racks | `colosseum` pack (`colosseum.`) |
| City street dressing: shopfront facades with lit windows, awnings, fire escapes, phone booths, lamp posts, bins, hydrants, traffic cones, mailboxes | `street` pack (`street.`) |
| Dockside dressing: crate stacks, pier sections, container cranes, small boats, cargo piles, net racks | `docks` pack (`docks.`) |
| Canyon and desert scenery: hoodoos, mesas, dead trees, rope bridges, canyon rocks, skulls and tumbleweeds | `canyon` pack (`canyon.`) |
| Player and enemy craft for racing, flying and space games: jet skis, powerboats, sailboats, workboats, planes, jets, helicopters, airliners, starfighters, enemy swarms, capital ships, shoot 'em up bosses, space stations | `craft` pack (`craft.`) |
| Famous world landmarks as hero backdrops: the Eiffel Tower, Big Ben, the Statue of Liberty, the Taj Mahal, the Colosseum, the pyramids, Mount Fuji, the Golden Gate Bridge, Stonehenge, the moai | `landmarks` pack (`landmark.`) |
| Regional city buildings and streets: Tokyo, New York, cyberpunk, Kyoto, Paris, London, Hong Kong, US town, Mediterranean, medieval, Nordic, Amsterdam, Venice, Mexican, medina; street segments, street props and a road grid | `city` pack (`city.`) |
| Cars that look like real ones (no badges): everyday hatchbacks and saloons, sports and GT racers, go-karts, vans and trucks | `car` pack (`car.`) |
| Block-built voxel art (Crossy Road / Cube World look): trees, bushes, flowers, rocks, crops, people, animals, loop props and pickups | `voxel` pack (`voxel.`) |

Every core generator, preset and param with its range: [references/generators.md](references/generators.md).

## Related skills

- `genesys-polybuilder` — block out level geometry (walls, stairs, ramps) in the open scene. Procedural assets are finished props and characters, not blockouts.
- Scenario (`action_asset_generation`, the Scenario MCP) — paid, bespoke hero art and textures. Use it when the user wants a specific look a generator cannot make; procedural assets are the free, instant default.
- `genesys-performance` — the triangle and draw-call budgets these models are built for.
