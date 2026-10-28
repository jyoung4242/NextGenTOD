## Progression flow

```text
Encounter action
  ├─ hit / spell / defend → award XP to a specific player skill
  └─ all encounter enemies defeated
       ├─ read each enemy definition from ContentRegistry
       ├─ total enemy XP and generate loot
       ├─ update global progression
       ├─ save encounter rewards
       └─ show encounter summary / level-up toast
```

### Global character progression

- The initial state is **Level 1, 0 XP, 0 skill points** in `GameState.ts`; the state shape is in `GameTypes.ts`.
- When every enemy in an encounter is defeated, `CombatStateMachine.ts` totals XP from the defeated enemies’ definitions. Each enemy’s
  `xpReward` is used, with a nominal fallback of **25 XP**; the test goblin is configured for **10 XP**, while the test skeleton and
  orc omit a reward and therefore use the fallback. See `test-enemies.ts`.
- The level check is `total XP >= current level * 100`. On a level-up, it adds **one level and one skill point**. XP remains a
  cumulative total; it is not reduced by the threshold.
- The check is performed once per encounter, not in a loop. A large XP award can therefore leave the player below the level implied by
  their total XP until a later encounter triggers another check.
- Global level and XP currently have **no effect on combat stats**. The level is surfaced through the level-up toast in
  `ToastManager.ts`, and encounter rewards are displayed by `CutScenes.ts`. Skill points are incremented, but I found no code that
  spends or applies them.

### Individual skill progression

Skill XP is separate from global XP and stored per entry in `player.skills`.

| Action               | Skill credited |  XP |
| -------------------- | -------------- | --: |
| Successful melee hit | `oneHanded`    |  15 |
| Spell/skill action   | `destruction`  |  20 |
| Defend               | `block`        |  10 |

These awards are in `CombatStateMachine.ts`. A skill levels when its XP reaches 100; the code adds one level and keeps the remainder
(`XP % 100`) in `awardSkillXP`. As with global progression, it only adds one level per award, even if an award crosses multiple
thresholds.

Skill levels do affect combat: `oneHanded` contributes to attack power and melee damage, while `block` contributes to defense, in
`CombatRulesEngine.ts`. The `destruction` skill gets XP but has no corresponding level-based combat scaling there. `restoration` is
defined in `SkillsRegistry.ts`, but I found no award path for it. The combat code uses skill IDs directly; it does not consult the
skill registry to decide XP awards.

### Dependencies and gaps

- **Active reward implementation:** Encounter rewards and global leveling are implemented directly in `CombatStateMachine`; that code
  uses `ContentRegistry` for enemy definitions and `LootManager` for drops.
- **Unwired duplicate:** `ProgressionSystem.ts` has a separate encounter XP/loot calculation, but I found no construction or call site
  for it. It does not perform level-ups, so it is not the active leveling path.
- **Enemy content matters:** Reward calculation depends on enemy definitions being registered in `ContentRegistry`. Despite the
  optional-looking `enemyDef?.xpReward` expression, `getEnemy` throws for an unknown definition rather than returning `undefined`; see
  `ContentRegistry.ts`.
- **Loot is reported, not granted:** Drops are stored in encounter rewards and shown in the summary, but I found no path adding them to
  `inventory`. Loot generation is defined in `LootManager.ts`; its `weight` field is not used by the current generator, which
  independently rolls each entry’s `dropChance`.
- **The two XP tracks are independent:** Enemy XP feeds global progression; action XP feeds individual skills. Global levels do not
  currently unlock skills or improve the combat calculations.
