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

    const enemy = state.dungeon.enemies[encounter.activeEnemyInstanceId];
    if (!enemy) return;

    this.store.batch(ctx => {
      let logMessage = "";

      switch (action.type) {
        case "attack": {
          const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);

          const playerAttack = 10;
          const enemyDefense = enemyDef?.defense ?? 0;
          const damage = Math.max(1, playerAttack - enemyDefense);
          const newHp = Math.max(0, enemy.hp - damage);

          const updatedEnemies: Record<string, EnemyState> = {
            ...state.dungeon.enemies,
            [encounter.activeEnemyInstanceId]: {
              ...enemy,
              hp: newHp,
              alive: newHp > 0,
              state: newHp === 0 ? "dead" : enemy.state,
            },
          };

          ctx.set("dungeon.enemies", updatedEnemies);
          logMessage = `Player attacked for ${damage} damage!`;

          // Award One-Handed XP
          this.awardSkillXP("oneHanded", 15);

          if (newHp === 0) {
            ctx.set("game.mode", "playing");
            ctx.set("game.encounter", {
              ...encounter,
              isResolved: true,
              combatLog: [...encounter.combatLog, logMessage, "Enemy defeated!"],
            });
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
        currentTurn: "enemy",
        combatLog: [...encounter.combatLog, logMessage],
      });
    });

    this.processEnemyTurn();
  }

  private processEnemyTurn(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter || encounter.currentTurn !== "enemy" || encounter.isResolved) {
      return;
    }

    const enemy = state.dungeon.enemies[encounter.activeEnemyInstanceId];
    const enemyDef = enemy ? this.contentRegistry.getEnemy(enemy.definitionId) : undefined;

    const enemyDamage = Math.max(1, enemyDef?.attack ?? 3);
    const newPlayerHp = Math.max(0, state.player.hp - enemyDamage);

    this.store.batch(ctx => {
      const updatedPlayer: PlayerState = {
        ...state.player,
        hp: newPlayerHp,
      };
      ctx.set("player", updatedPlayer);

      const logMessage = `${enemyDef?.name ?? "Enemy"} counter-attacked for ${enemyDamage} damage!`;

      if (newPlayerHp <= 0) {
        ctx.set("game.mode", "game_over");
      } else {
        ctx.set("game.encounter", {
          ...encounter,
          currentTurn: "player",
          turnCount: encounter.turnCount + 1,
          combatLog: [...encounter.combatLog, logMessage],
        });
      }
    });
  }

  private awardSkillXP(skillId: string, amount: number): void {
    const state = this.store.get();
    const currentSkill = state.player.skills[skillId] ?? { level: 1, xp: 0, unlocked: true };
    const newXp = currentSkill.xp + amount;

    // Simple level up calculation (e.g. 100 XP per level)
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
