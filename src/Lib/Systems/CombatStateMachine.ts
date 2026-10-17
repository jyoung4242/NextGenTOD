// Systems/CombatStateMachine.ts
import { StateStore } from "../../GameState";
import { GameState, CombatAction, EnemyState, PlayerState, EncounterState, getDungeonCell } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export class CombatStateMachine {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
  ) {}

  public getStore(): StateStore<GameState> {
    return this.store;
  }

  public getContentRegistry(): ContentRegistry {
    return this.contentRegistry;
  }

  /**
   * Helper to check if a tile is blocked by walls, out of bounds, or occupied by another entity.
   */
  private isTileBlocked(targetX: number, targetY: number, state: GameState, excludeEntityId?: string): boolean {
    if (state.dungeon?.definitionId) {
      const dungeonDef = this.contentRegistry.getDungeon(state.dungeon.definitionId);
      if (dungeonDef?.grid) {
        const cell = getDungeonCell(dungeonDef.grid, targetX, targetY);
        if (!cell || cell.floor !== "floor") {
          return true;
        }
      }
    }

    const encounter = state.game.encounter;
    if (!encounter) return false;

    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (playerPos && Math.floor(playerPos.x) === targetX && Math.floor(playerPos.y) === targetY) {
      return true;
    }

    const enemyPositions = encounter.enemyPositions ?? {};
    for (const [id, pos] of Object.entries(enemyPositions)) {
      if (id === excludeEntityId) continue;
      const enemy = state.dungeon?.enemies?.[id];
      if (enemy && enemy.alive && Math.floor(pos.x) === targetX && Math.floor(pos.y) === targetY) {
        return true;
      }
    }

    return false;
  }

  public processPlayerAction(action: CombatAction): void {
    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter || encounter.currentTurn !== "player" || encounter.isResolved) {
      return;
    }

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);

    // 🎯 Priority Resolution: Action explicit target -> Encounter currentTargetId -> Active Enemy ID -> First available enemy
    const targetId = action.targetId ?? encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? enemyIds[0];

    const enemy = targetId ? state.dungeon?.enemies?.[targetId] : undefined;

    this.store.batch(ctx => {
      let logMessage = "";
      let updatedPlayerPos = encounter.playerPosition ?? state.player?.position;

      switch (action.type) {
        case "move": {
          if (!action.targetTile) return;

          if (this.isTileBlocked(action.targetTile.x, action.targetTile.y, state)) {
            logMessage = `Movement blocked at (${action.targetTile.x}, ${action.targetTile.y})!`;
            break;
          }

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
          ctx.set("game.mode", "playing");
          ctx.set("game.encounter", {
            ...encounter,
            isResolved: true,
            combatLog: [...encounter.combatLog, "Player fled from combat!"],
          });
          return;
        }
      }

      ctx.set("game.encounter", {
        ...encounter,
        playerPosition: updatedPlayerPos,
        currentTurn: "enemy",
        combatLog: [...encounter.combatLog, logMessage],
      });
    });
  }

  public processEnemyAction(enemyInstanceId: string, action: CombatAction): void {
    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter || encounter.isResolved) return;

    const enemy = state.dungeon?.enemies?.[enemyInstanceId];
    if (!enemy || !enemy.alive || enemy.hp <= 0) return;

    const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);

    this.store.batch(ctx => {
      let logMessage = "";
      const updatedEnemies: Record<string, EnemyState> = { ...state.dungeon.enemies };
      const updatedEnemyPositions = { ...(encounter.enemyPositions ?? {}) };
      let updatedPlayerHp = state.player.hp;

      switch (action.type) {
        case "move": {
          if (action.targetTile) {
            if (this.isTileBlocked(action.targetTile.x, action.targetTile.y, state, enemyInstanceId)) {
              logMessage = `${enemyDef?.name ?? "Enemy"} movement blocked at (${action.targetTile.x}, ${action.targetTile.y})!`;
              break;
            }

            updatedEnemyPositions[enemyInstanceId] = action.targetTile;
            logMessage = `${enemyDef?.name ?? "Enemy"} moved to (${action.targetTile.x}, ${action.targetTile.y})`;
          }
          break;
        }

        case "skill": {
          if (action.skillId === "enemy_heal") {
            const healAmount = 15;
            const maxHp = enemyDef?.health ?? enemy.maxHp ?? 30;
            const newHp = Math.min(maxHp, enemy.hp + healAmount);

            updatedEnemies[enemyInstanceId] = {
              ...enemy,
              hp: newHp,
            };
            ctx.set("dungeon.enemies", updatedEnemies);
            logMessage = `${enemyDef?.name ?? "Enemy"} used Mend Wounds and healed ${healAmount} HP!`;
          }
          break;
        }

        case "flee": {
          updatedEnemies[enemyInstanceId] = {
            ...enemy,
            alive: false,
            state: "dead",
          };
          ctx.set("dungeon.enemies", updatedEnemies);
          logMessage = `${enemyDef?.name ?? "Enemy"} fled from combat!`;

          const updatedState: GameState = {
            ...state,
            dungeon: { ...state.dungeon, enemies: updatedEnemies },
          };

          if (this.checkEncounterCompletion(ctx, updatedState)) {
            return;
          }
          break;
        }

        case "spell": {
          const damage = 12;
          updatedPlayerHp = Math.max(0, state.player.hp - damage);
          ctx.set("player", { ...state.player, hp: updatedPlayerHp });
          logMessage = `${enemyDef?.name ?? "Enemy"} cast ${action.skillId ?? "Spell"} for ${damage} damage!`;
          break;
        }

        case "attack":
        default: {
          const enemyDamage = Math.max(1, (enemyDef?.attack ?? 3) - 2);
          updatedPlayerHp = Math.max(0, state.player.hp - enemyDamage);
          ctx.set("player", { ...state.player, hp: updatedPlayerHp });
          logMessage = `${enemyDef?.name ?? "Enemy"} attacked for ${enemyDamage} damage!`;
          break;
        }
      }

      if (updatedPlayerHp <= 0) {
        console.log("[CombatStateMachine] Player defeated! Game Over.");
        ctx.set("game.mode", "game_over");
      } else {
        const updatedEncounter: EncounterState = {
          ...encounter,
          enemyPositions: updatedEnemyPositions,
          currentTurn: "player",
          turnCount: (encounter.turnCount ?? 1) + 1,
          combatLog: [...encounter.combatLog, logMessage],
        };
        ctx.set("game.encounter", updatedEncounter);
      }
    });
  }

  private checkEncounterCompletion(ctx: any, state: GameState): boolean {
    const encounter = state.game.encounter;
    if (!encounter) return true;

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
    const encounterEnemies = enemyIds.map(id => state.dungeon?.enemies?.[id]).filter(Boolean);

    const allEnemiesDefeated =
      encounterEnemies.length > 0 && encounterEnemies.every(enemy => !enemy.alive || enemy.hp <= 0 || enemy.state === "dead");

    if (allEnemiesDefeated) {
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
