// Systems/CombatStateMachine.ts
import { StateStore } from "../../GameState";
import { GameState, CombatAction, EnemyState, PlayerState } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export class CombatStateMachine {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
  ) {}

  public processPlayerAction(action: CombatAction): void {
    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter || encounter.currentTurn !== "player" || encounter.isResolved) {
      return;
    }

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
    const targetId = action.targetId ?? encounter.activeEnemyInstanceId ?? enemyIds[0];
    const enemy = targetId ? state.dungeon?.enemies?.[targetId] : undefined;

    this.store.batch(ctx => {
      let logMessage = "";
      let updatedPlayerPos = encounter.playerPosition ?? state.player?.position;

      switch (action.type) {
        case "move": {
          if (!action.targetTile) return;
          updatedPlayerPos = { x: action.targetTile.x, y: action.targetTile.y };
          logMessage = `Player moved to (${action.targetTile.x}, ${action.targetTile.y})`;
          break;
        }

        case "attack": {
          if (!targetId || !enemy || !enemy.alive) return;

          const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);
          const playerAttack = 10;
          const enemyDefense = enemyDef?.defense ?? 0;
          const damage = Math.max(1, playerAttack - enemyDefense);
          const newHp = Math.max(0, enemy.hp - damage);

          const updatedEnemies: Record<string, EnemyState> = {
            ...state.dungeon.enemies,
            [targetId]: {
              ...enemy,
              hp: newHp,
              alive: newHp > 0,
              state: newHp === 0 ? "dead" : enemy.state,
            },
          };

          ctx.set("dungeon.enemies", updatedEnemies);
          logMessage = `Player attacked ${enemyDef?.name ?? targetId} for ${damage} damage!`;
          this.awardSkillXP("oneHanded", 15);

          const updatedState: GameState = {
            ...state,
            dungeon: { ...state.dungeon, enemies: updatedEnemies },
          };

          if (this.checkEncounterCompletion(ctx, updatedState)) {
            return;
          }
          break;
        }

        case "flee": {
          console.log("[CombatStateMachine] Player fled! Returning to dungeon.");
          ctx.set("game.mode", "playing");
          ctx.set("game.encounter", {
            ...encounter,
            isResolved: true,
            combatLog: [...encounter.combatLog, "Player fled from combat!"],
          });
          return;
        }
      }

      // Set encounter state ONCE with updated playerPosition
      ctx.set("game.encounter", {
        ...encounter,
        playerPosition: updatedPlayerPos,
        currentTurn: "enemy",
        combatLog: [...encounter.combatLog, logMessage],
      });
    });

    if (!this.store.get().game.encounter?.isResolved) {
      this.processEnemyTurn();
    }
  }

  private processEnemyTurn(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter || encounter.currentTurn !== "enemy" || encounter.isResolved) {
      return;
    }

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);

    // Filter surviving enemies that can take a turn
    const activeEnemies = enemyIds
      .map(id => state.dungeon?.enemies?.[id])
      .filter((e): e is EnemyState => Boolean(e && e.alive && e.hp > 0));

    let totalDamage = 0;
    const logEntries: string[] = [];

    // Calculate total incoming damage across all living enemies in the encounter
    for (const enemy of activeEnemies) {
      const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);
      const enemyDamage = Math.max(1, (enemyDef?.attack ?? 3) - 2); // state.player.stats?.defense ?? 0));
      totalDamage += enemyDamage;
      logEntries.push(`${enemyDef?.name ?? "Enemy"} counter-attacked for ${enemyDamage} damage!`);
    }

    const newPlayerHp = Math.max(0, state.player.hp - totalDamage);

    this.store.batch(ctx => {
      const updatedPlayer: PlayerState = {
        ...state.player,
        hp: newPlayerHp,
      };
      ctx.set("player", updatedPlayer);

      if (newPlayerHp <= 0) {
        console.log("[CombatStateMachine] Player defeated! Game Over.");
        ctx.set("game.mode", "game_over");
      } else {
        ctx.set("game.encounter", {
          ...encounter,
          currentTurn: "player",
          turnCount: encounter.turnCount + 1,
          combatLog: [...encounter.combatLog, ...logEntries],
        });
      }
    });
  }

  /**
   * Evaluates whether all enemies in the encounter context have been defeated.
   */
  private checkEncounterCompletion(ctx: any, state: GameState): boolean {
    const encounter = state.game.encounter;
    if (!encounter) return true;

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);

    const encounterEnemies = enemyIds.map(id => state.dungeon?.enemies?.[id]).filter(Boolean);

    const allEnemiesDefeated =
      encounterEnemies.length > 0 && encounterEnemies.every(enemy => !enemy.alive || enemy.hp <= 0 || enemy.state === "dead");

    if (allEnemiesDefeated) {
      console.log("[CombatStateMachine] All encounter enemies defeated! Returning to dungeon.");
      ctx.set("game.mode", "playing");
      ctx.set("game.encounter", {
        ...encounter,
        isResolved: true,
        combatLog: [...encounter.combatLog, "All enemies defeated!"],
      });
      return true;
    }

    return false;
  }

  private awardSkillXP(skillId: string, amount: number): void {
    const state = this.store.get();
    const currentSkill = state.player.skills[skillId] ?? { level: 1, xp: 0, unlocked: true };
    const newXp = currentSkill.xp + amount;

    const newLevel = newXp >= 100 ? currentSkill.level + 1 : currentSkill.level;
    const finalXp = newXp % 100;

    const updatedPlayer: PlayerState = {
      ...state.player,
      skills: {
        ...state.player.skills,
        [skillId]: {
          ...currentSkill,
          level: newLevel,
          xp: finalXp,
        },
      },
    };

    this.store.set("player", updatedPlayer);
  }
}
