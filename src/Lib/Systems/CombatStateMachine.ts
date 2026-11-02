// Systems/CombatStateMachine.ts
import { BatchContext, StateStore } from "../../GameState";
import { GameState, CombatAction, EnemyState, PlayerState, EncounterState, getDungeonCell, DungeonState } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";
import { CombatRulesEngine } from "./CombatRulesEngine";
import { CutSceneSystem } from "../Managers/CutScenes";
import { LootDrop, LootManager } from "../Managers/LootManager";
import { ToastManager } from "../../UI/ToastManager";
import { SkillProgressionUtility } from "./SkillProgressionUtility";

export class CombatStateMachine {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
    private readonly cutSceneSystem?: CutSceneSystem,
    private readonly toastmgr?: ToastManager,
  ) {}

  public getStore(): StateStore<GameState> {
    return this.store;
  }

  public getContentRegistry(): ContentRegistry {
    return this.contentRegistry;
  }

  private isTileBlocked(targetX: number, targetY: number, state: GameState, excludeEntityId?: string): boolean {
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    if (!activeDungeonState) return false;

    if (activeDungeonState) {
      const dungeonDef = this.contentRegistry.getDungeon(activeDungeonId);
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
      const enemy = activeDungeonState?.enemies?.[id];
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
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    if (!activeDungeonState) return;

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
    const targetId = action.targetId ?? encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? enemyIds[0];
    const enemy = targetId ? activeDungeonState.enemies?.[targetId] : undefined;

    // Track if we need to trigger an end cutscene after the batch commits
    let pendingCutsceneId: string | null = null;

    this.store.batch(ctx => {
      let logMessage = "";
      let rslt: any;
      let updatedPlayerPos = encounter.playerPosition ?? state.player?.position;
      console.log("[Combat action] ", action.type);

      switch (action.type) {
        case "move": {
          if (!action.targetTile) return;

          if (this.isTileBlocked(action.targetTile.x, action.targetTile.y, state)) {
            logMessage = `Movement blocked at (${action.targetTile.x}, ${action.targetTile.y})!`;
            console.log(`[Combat Log] ${logMessage}`);
            break;
          }

          updatedPlayerPos = { x: action.targetTile.x, y: action.targetTile.y };
          logMessage = `Player moved to (${action.targetTile.x}, ${action.targetTile.y})`;
          rslt = { logMessage };
          console.log(`[Combat Log] ${logMessage}`);
          break;
        }

        case "attack": {
          if (!targetId || !enemy || !enemy.alive) return;

          const playerPos = encounter.playerPosition ?? state.player?.position;
          const enemyPos = encounter.enemyPositions?.[targetId] ?? enemy.position;

          if (playerPos && enemyPos) {
            const distance =
              Math.abs(Math.floor(playerPos.x) - Math.floor(enemyPos.x)) + Math.abs(Math.floor(playerPos.y) - Math.floor(enemyPos.y));
            const maxMeleeRange = 1;

            if (distance > maxMeleeRange) {
              logMessage = `Target out of range! Move closer to attack. (Distance: ${distance})`;
              console.log(`[Combat Log] ${logMessage}`);
              break;
            }
          }

          const weaponSkill = this.getEquippedWeaponSkill();
          const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);
          const attackResult = CombatRulesEngine.resolveMeleeAttack(state.player, enemy, enemyDef, weaponSkill);
          logMessage = attackResult.log.logmessage;
          rslt = attackResult;
          console.log(`[Combat Log] ${logMessage}`);

          let newHp = enemy.hp;

          if (attackResult.isHit && attackResult.damage > 0) {
            newHp = Math.max(0, enemy.hp - attackResult.damage);
            this.awardSkillXP(ctx, weaponSkill, 1);
          }

          const updatedEnemies: Record<string, EnemyState> = {
            ...activeDungeonState.enemies,
            [targetId]: {
              ...enemy,
              hp: newHp,
              alive: newHp > 0,
              state: newHp === 0 ? "dead" : enemy.state,
            },
          };

          let newCurrentTargetId = encounter.currentTargetId;
          if (newHp <= 0 && targetId === encounter.currentTargetId) {
            const livingEnemyIds = (encounter.enemyInstanceIds ?? []).filter(id => {
              const e = activeDungeonState.enemies?.[id];
              return e && e.alive && e.hp > 0 && id !== targetId;
            });
            newCurrentTargetId = livingEnemyIds.length > 0 ? livingEnemyIds[0] : undefined;
          }

          ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, updatedEnemies);

          const updatedState: GameState = {
            ...state,
            dungeon: {
              ...state.dungeon,
              registry: {
                ...state.dungeon.registry,
                [activeDungeonId]: {
                  ...activeDungeonState,
                  enemies: updatedEnemies,
                },
              },
            },
          };

          if (this.checkEncounterCompletion(ctx, updatedState)) {
            pendingCutsceneId = "encounter-summary";
            break; // Use break instead of return
          }
          break;
        }

        case "spell": {
          if (!action.skillId) break;

          const spellDef = this.contentRegistry.getSpell(action.skillId);
          if (!spellDef) break;

          const playerSkill = state.player.skills[spellDef.category] ?? { level: 1, xp: 0 };
          if (playerSkill.level < spellDef.minLevelRequirement) {
            logMessage = `Skill level too low! Requires ${spellDef.category} Lv.${spellDef.minLevelRequirement}.`;
            break;
          }

          if ((state.player.mana ?? 100) < spellDef.manaCost) {
            logMessage = "Not enough mana!";
            break;
          }

          const updatedEnemies: Record<string, EnemyState> = { ...activeDungeonState.enemies };

          if (spellDef.targetMode === "self") {
            const newHp = Math.min(state.player.maxHp, state.player.hp + spellDef.basePower);
            ctx.set("player.hp", newHp);
            logMessage = `Player cast ${spellDef.name} on self for ${spellDef.basePower} healing!`;
            rslt = { logMessage };
          } else if (spellDef.targetMode === "direct_enemy" || spellDef.targetMode === "single_enemy") {
            if (!targetId || !enemy) {
              logMessage = `No target selected for ${spellDef.name}!`;
              break;
            }

            const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);
            const spellResult = CombatRulesEngine.resolveDirectSpell(state.player, spellDef, targetId, enemy, enemyDef);
            logMessage = spellResult.log.logmessage;
            rslt = spellResult;

            const targetOutcome = spellResult.affectedTargets[0];
            if (targetOutcome) {
              updatedEnemies[targetId] = {
                ...enemy,
                hp: targetOutcome.newHp,
                alive: targetOutcome.newHp > 0,
                state: targetOutcome.newHp === 0 ? "dead" : enemy.state,
              };
            }

            ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, updatedEnemies);
          } else if (spellDef.targetMode === "aoe" || spellDef.targetMode === "party") {
            const spellResult = CombatRulesEngine.resolveAoeSpell(
              state.player,
              spellDef,
              activeDungeonState.enemies,
              enemyIds,
              this.contentRegistry,
            );
            logMessage = spellResult.log.logmessage;
            rslt = spellResult;

            for (const targetOutcome of spellResult.affectedTargets) {
              const targetEnemy = updatedEnemies[targetOutcome.targetId];
              if (targetEnemy) {
                updatedEnemies[targetOutcome.targetId] = {
                  ...targetEnemy,
                  hp: targetOutcome.newHp,
                  alive: targetOutcome.newHp > 0,
                  state: targetOutcome.newHp === 0 ? "dead" : targetEnemy.state,
                };
              }
            }

            ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, updatedEnemies);
          }

          ctx.set("player.mana", (state.player.mana ?? 100) - spellDef.manaCost);
          this.awardSkillXP(ctx, spellDef.category, 1);

          const updatedState: GameState = {
            ...state,
            dungeon: {
              ...state.dungeon,
              registry: {
                ...state.dungeon.registry,
                [activeDungeonId]: {
                  ...activeDungeonState,
                  enemies: updatedEnemies,
                },
              },
            },
          };

          if (this.checkEncounterCompletion(ctx, updatedState)) {
            pendingCutsceneId = "encounter-summary";
            break;
          }
          break;
        }

        case "skill": {
          if (!targetId || !enemy || !enemy.alive) return;

          const skillId = action.skillId ?? "fireball";
          const spellDamage = 20;
          const newHp = Math.max(0, enemy.hp - spellDamage);

          logMessage = `Player cast ${skillId} on enemy for ${spellDamage} damage!`;
          console.log(`[Combat Log] ${logMessage}`);

          this.awardSkillXP(ctx, "destruction", 1);

          const updatedEnemies: Record<string, EnemyState> = {
            ...activeDungeonState.enemies,
            [targetId]: {
              ...enemy,
              hp: newHp,
              alive: newHp > 0,
              state: newHp === 0 ? "dead" : enemy.state,
            },
          };

          ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, updatedEnemies);

          const updatedState: GameState = {
            ...state,
            dungeon: {
              ...state.dungeon,
              registry: {
                ...state.dungeon.registry,
                [activeDungeonId]: {
                  ...activeDungeonState,
                  enemies: updatedEnemies,
                },
              },
            },
          };

          if (this.checkEncounterCompletion(ctx, updatedState)) {
            pendingCutsceneId = "encounter-summary";
            break;
          }
          break;
        }

        case "item": {
          const itemId = action.itemId ?? "health_potion";
          const healAmount = 25;
          const newPlayerHp = Math.min(state.player.maxHp, state.player.hp + healAmount);

          ctx.set("player.hp", newPlayerHp);
          logMessage = `Player used ${itemId} and restored ${healAmount} HP!`;
          console.log(`[Combat Log] ${logMessage}`);
          break;
        }

        // Replace case "throw" inside CombatStateMachine.ts
        case "throw": {
          if (!targetId || !enemy || !enemy.alive) {
            logMessage = "No valid target for throw!";
            break;
          }

          const itemId = action.itemId ?? "throwing_dagger";

          // Optional: Check if player has the item in inventory and decrement it
          // const inventory = state.player.inventory ?? [];
          // const hasItem = inventory.some(i => i.id === itemId && i.quantity > 0);
          // if (!hasItem) {
          //   logMessage = `You don't have any ${itemId} left to throw!`;
          //   break;
          // }

          const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);
          const throwResult = CombatRulesEngine.resolveThrow(state.player, itemId, targetId, enemy, enemyDef);

          logMessage = throwResult.log.logmessage;
          rslt = throwResult;
          console.log(`[Combat Log] ${logMessage}`);

          const updatedEnemies: Record<string, EnemyState> = { ...activeDungeonState.enemies };

          if (throwResult.isHit && throwResult.damage > 0) {
            const targetOutcome = throwResult.affectedTargets[0];
            if (targetOutcome) {
              updatedEnemies[targetId] = {
                ...enemy,
                hp: targetOutcome.newHp,
                alive: targetOutcome.newHp > 0,
                state: targetOutcome.newHp === 0 ? "dead" : enemy.state,
              };
            }
          }

          ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, updatedEnemies);

          // Optional: Deduct item from inventory state here if desired

          const updatedState: GameState = {
            ...state,
            dungeon: {
              ...state.dungeon,
              registry: {
                ...state.dungeon.registry,
                [activeDungeonId]: {
                  ...activeDungeonState,
                  enemies: updatedEnemies,
                },
              },
            },
          };

          if (this.checkEncounterCompletion(ctx, updatedState)) {
            pendingCutsceneId = "encounter-summary";
            break;
          }
          break;
        }

        case "defend": {
          logMessage = "Player takes a defensive stance, raising block readiness.";
          console.log(`[Combat Log] ${logMessage}`);
          this.awardSkillXP(ctx, "block", 1);
          break;
        }

        case "flee": {
          logMessage = "Player fled from combat!";
          console.log(`[Combat Log] ${logMessage}`);
          ctx.set("game.encounter", {
            ...encounter,
            isResolved: true,
            combatLog: [...encounter.combatLog, logMessage],
          });

          pendingCutsceneId = "encounter-flee";
          break;
        }
      }

      // Only set turn to enemy if the encounter hasn't been completed/resolved
      if (!pendingCutsceneId) {
        ctx.set("game.encounter", {
          ...encounter,
          playerPosition: updatedPlayerPos,
          currentTurn: "enemy",
          combatLog: [...encounter.combatLog, rslt].filter(Boolean),
        });
      }
    });

    // 🚀 Trigger the end cutscene AFTER the batch has successfully committed to the store
    if (pendingCutsceneId) {
      console.log(`[Combat Log] Triggering end cutscene: ${pendingCutsceneId}`);
      this.triggerEndCutscene(pendingCutsceneId);
    }
  }

  public processEnemyAction(enemyInstanceId: string, action: CombatAction): void {
    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter || encounter.isResolved) return;

    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    if (!activeDungeonState) return;

    const enemy = activeDungeonState.enemies?.[enemyInstanceId];
    if (!enemy || !enemy.alive || enemy.hp <= 0) return;

    const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);

    // Track if player was defeated during this enemy action
    let pendingCutsceneId: string | null = null;

    this.store.batch(ctx => {
      let logMessage = "";
      const updatedEnemies: Record<string, EnemyState> = { ...activeDungeonState.enemies };
      const updatedEnemyPositions = { ...(encounter.enemyPositions ?? {}) };
      let updatedPlayerHp = state.player.hp;

      switch (action.type) {
        case "move": {
          if (action.targetTile) {
            if (this.isTileBlocked(action.targetTile.x, action.targetTile.y, state, enemyInstanceId)) {
              logMessage = `${enemyDef?.name ?? "Enemy"} movement blocked at (${action.targetTile.x}, ${action.targetTile.y})!`;
              console.log(`[Combat Log] ${logMessage}`);
              break;
            }

            updatedEnemyPositions[enemyInstanceId] = action.targetTile;
            logMessage = `${enemyDef?.name ?? "Enemy"} moved to (${action.targetTile.x}, ${action.targetTile.y})`;
            console.log(`[Combat Log] ${logMessage}`);
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
            ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, updatedEnemies);
            logMessage = `${enemyDef?.name ?? "Enemy"} used Mend Wounds and healed ${healAmount} HP!`;
            console.log(`[Combat Log] ${logMessage}`);
          }
          break;
        }

        case "attack":
        default: {
          const defenseResult = CombatRulesEngine.resolveEnemyAttack(enemyDef, state.player);
          updatedPlayerHp = Math.max(0, state.player.hp - defenseResult.mitigatedDamage);
          ctx.set("player.hp", updatedPlayerHp);
          logMessage = defenseResult.log.logmessage;
          console.log(`[Combat Log] ${logMessage}`);
          break;
        }
      }

      if (updatedPlayerHp <= 0) {
        console.log("[CombatStateMachine] Player defeated!");
        ctx.set("game.encounter", {
          ...encounter,
          isResolved: true,
          combatLog: [...encounter.combatLog, logMessage, "Player defeated!"],
        });
        pendingCutsceneId = "encounter-defeat";
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

    // 🚀 Trigger the defeat cutscene BEFORE heading to game over
    if (pendingCutsceneId) {
      this.handleDefeatSequence(pendingCutsceneId);
    }
  }
  private async handleDefeatSequence(cutsceneId: string): Promise<void> {
    this.store.set("game.mode", "paused");

    if (this.cutSceneSystem) {
      try {
        await this.cutSceneSystem.startCutScene(cutsceneId);
      } catch (e) {
        console.warn(`[CombatStateMachine] Cutscene '${cutsceneId}' not found or failed to execute:`, e);
      }
    }

    // Now transition to the game over scene after the cutscene completes
    this.store.set("game.mode", "game_over");
  }
  private checkEncounterCompletion(ctx: any, state: GameState): boolean {
    const encounter = state.game.encounter;
    if (!encounter) return true;

    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    if (!activeDungeonState) return true;

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
    const encounterEnemies = enemyIds
      .map((id: string) => activeDungeonState.enemies?.[id])
      .filter((e): e is EnemyState => e !== undefined);

    const allEnemiesDefeated =
      encounterEnemies.length > 0 && encounterEnemies.every(enemy => !enemy.alive || enemy.hp <= 0 || enemy.state === "dead");

    if (allEnemiesDefeated) {
      console.log("[CombatStateMachine] All encounter enemies defeated!");

      const lootManager = new LootManager();
      let totalXp = 0;
      const allLootDrops: LootDrop[] = [];

      for (const enemyId of enemyIds) {
        const enemy = activeDungeonState.enemies?.[enemyId];
        if (!enemy) continue;

        const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);
        const enemyXp = enemyDef?.xpReward ?? 25;
        totalXp += enemyXp;

        const tableId = enemyDef?.lootTableId ?? "table_basic_enemy";
        const drops = lootManager.generateLoot(tableId);
        allLootDrops.push(...drops);
      }

      // 1. Get current progression or fallback defaults
      const currentProgression = state.progression ?? { experience: 0, level: 1, skillPoints: 0 };
      const oldLevel = currentProgression.level;
      const newXp = currentProgression.experience + totalXp;

      let newLevel = oldLevel;
      let skillPoints = currentProgression.skillPoints;
      const xpNeeded = newLevel * 100;

      // 2. Check if the new XP crosses the threshold
      if (newXp >= xpNeeded) {
        newLevel += 1;
        skillPoints += 1;
        console.log(`[Progression] Level Up! Reached level ${newLevel}`);
      }

      const leveledUp = newLevel > oldLevel;

      // 3. Commit new progression to the state store
      ctx.set("progression", {
        experience: newXp,
        level: newLevel,
        skillPoints: skillPoints,
      });

      const lootSummaryText =
        allLootDrops.length > 0
          ? `Loot acquired: ${allLootDrops.map((d: LootDrop) => `${d.quantity}x ${d.itemId}`).join(", ")}`
          : "No loot found.";

      // 4. Save rewards including leveledUp flag into encounter state
      ctx.set("game.encounter", {
        ...encounter,
        isResolved: true,
        rewards: {
          xpGained: totalXp,
          itemsDropped: allLootDrops,
          leveledUp: leveledUp,
          newLevel: newLevel,
        },
        combatLog: [...encounter.combatLog, "All enemies defeated!", `Gained a total of ${totalXp} XP!`, lootSummaryText],
      });
      return true;
    }

    return false;
  }

  private async triggerEndCutscene(cutsceneId: string): Promise<void> {
    this.store.set("game.mode", "paused");
    console.log("cutscene system", this.cutSceneSystem);

    if (this.cutSceneSystem) {
      try {
        await this.cutSceneSystem.startCutScene(cutsceneId);
      } catch (e) {
        console.warn(`[CombatStateMachine] Cutscene '${cutsceneId}' not found or failed to execute:`, e);
      }
    }

    // Return to dungeon exploration after cutscene completes
    this.store.set("game.mode", "playing");
  }

  // Inside CombatStateMachine.ts

  private awardSkillXP(ctx: BatchContext<GameState>, skillId: string, amount: number = 1): void {
    const state = this.store.get();
    const currentSkill = state.player.skills[skillId] ?? { level: 1, xp: 0, unlocked: true };

    // Loop through action increments if multiple actions are awarded at once
    let currentLevel = currentSkill.level;
    let currentXp = currentSkill.xp;
    let didLevelUp = false;

    for (let i = 0; i < amount; i++) {
      const result = SkillProgressionUtility.awardSkillAction(currentLevel, currentXp);
      if (result.level > currentLevel) {
        didLevelUp = true;
      }
      currentLevel = result.level;
      currentXp = result.xp;
    }

    console.log(`[AWARD SKILL]: ${skillId} progressed by ${amount} action(s). New level: ${currentLevel}, XP progress: ${currentXp}`);

    if (this.toastmgr && didLevelUp) {
      this.toastmgr.show("progression", "Skill Level Up!", `${skillId} reached Level ${currentLevel}!`);
    }

    // Update store reactively using the active batch context
    ctx.set(`player.skills.${skillId}` as any, {
      ...currentSkill,
      level: currentLevel,
      xp: currentXp,
      unlocked: true,
    });
  }

  /**
   * Determines which skill should gain XP based on the equipped weapon.
   */
  private getEquippedWeaponSkill(): string {
    const state = this.store.get();
    const mainHandItemInstance = state.player.equipment?.mainHand;

    if (mainHandItemInstance) {
      const itemDef = this.contentRegistry.getItem(mainHandItemInstance.definitionId);
      if (itemDef?.requiredSkill) {
        return itemDef.requiredSkill;
      }
    } else {
      //unarmed skill if no weapon is equipped
      console.log(`[equipped]: 'unarmed'`);
      return "unarmed";
    }
    console.log(`[equipped]: ${mainHandItemInstance}`);
    // Fallback if no weapon is equipped or item does not explicitly specify a required skill
    return "oneHanded";
  }
}
