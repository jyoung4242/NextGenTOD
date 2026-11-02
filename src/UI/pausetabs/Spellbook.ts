// UI/PauseMenu/Tabs/SpellbookFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "../pausetabs/tabelement";
import { StateStore } from "../../GameState";
import { GameState, SpellDefinition } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export class SpellbookFormTab extends TabElement {
  public tabid = "spellbook";
  public title = "Spellbook";

  private headerLabel: Label;
  private manaLabel: Label;
  private spellListLabel: Label;
  private spellDetailLabel: Label;

  private selectedIndex: number = 0;

  private unsubscribeStoreMana?: () => void;
  private unsubscribeStoreSpellBook?: () => void;

  constructor(
    private store: StateStore<GameState>,
    private contentRegistry: ContentRegistry,
  ) {
    super();
    this.name = "SpellbookFormTab";

    this.headerLabel = new Label({
      text: "=== SPELLBOOK & MAGIC ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    this.manaLabel = new Label({
      text: "Mana: 0 / 0",
      pos: vec(0, 30),
      color: Color.fromRGB(148, 163, 184),
    });

    this.spellListLabel = new Label({
      text: "Loading spellbook...",
      pos: vec(0, 70),
      color: Color.fromRGB(203, 213, 225),
    });

    this.spellDetailLabel = new Label({
      text: "[Selected Spell Details]\n• Select a spell to view details",
      pos: vec(450, 70),
      color: Color.fromRGB(56, 189, 248),
    });

    this.addChild(this.headerLabel);
    this.addChild(this.manaLabel);
    this.addChild(this.spellListLabel);
    this.addChild(this.spellDetailLabel);
  }

  public override onOpen(): void {
    this.selectedIndex = 0;
    this.refreshDisplay();

    // Subscribe to state updates for player mana and the spellbook structure
    this.unsubscribeStoreMana = this.store.subscribe("player.mana", () => this.refreshDisplay());
    this.unsubscribeStoreSpellBook = this.store.subscribe("player.spellBook", () => this.refreshDisplay());
  }

  public override onClose(): void {
    this.unsubscribeStoreMana?.();
    this.unsubscribeStoreSpellBook?.();
    this.unsubscribeStoreMana = undefined;
    this.unsubscribeStoreSpellBook = undefined;
  }

  public moveCursor(delta: number): void {
    const knownSpells = this.getKnownSpellEntries();
    if (knownSpells.length === 0) return;

    this.selectedIndex = (this.selectedIndex + delta + knownSpells.length) % knownSpells.length;
    this.refreshDisplay();
  }

  /**
   * Action handler called when pressing Enter / Space / Gamepad Face1.
   * Equips the highlighted known spell as the active combat spell.
   */
  public handleAction(): void {
    const knownSpells = this.getKnownSpellEntries();
    if (knownSpells.length === 0 || this.selectedIndex >= knownSpells.length) return;

    const [spellId] = knownSpells[this.selectedIndex];

    // Set active combat spell in state store
    this.store.set("player.spellBook.activeSpellId", spellId);
    console.log(`[SPELLBOOK]: Equipped active spell -> ${spellId}`);
    this.refreshDisplay();
  }

  /**
   * Returns an array of [spellId, spellState] tuples for spells present in player.spellBook.spells
   */
  private getKnownSpellEntries(): [string, { level: number; xp: number; unlocked: boolean }][] {
    const playerState = this.store.get().player;
    const spellsRecord = playerState?.spellBook?.spells ?? {};

    // Filter down to only unlocked/known entries if needed, or take all keys present under spells
    return Object.entries(spellsRecord).filter(([_, data]) => data && data.unlocked);
  }

  private refreshDisplay(): void {
    const playerState = this.store.get().player;
    const currentMana = playerState?.mana ?? 0;
    const maxMana = playerState?.maxMana ?? 100;
    const activeSpellId = playerState?.spellBook?.activeSpellId;

    const knownSpells = this.getKnownSpellEntries();

    // --- 1. Spell List Display ---
    const spellLines: string[] = [];
    if (knownSpells.length === 0) {
      spellLines.push("  (No spells known in spellbook)");
    } else {
      knownSpells.forEach(([spellId, spellState], idx) => {
        // Look up static definition details from the ContentRegistry
        let spellDef: SpellDefinition | undefined;
        try {
          spellDef = this.contentRegistry.getSpell(spellId);
        } catch {
          // Fallback if definition lookup fails
        }

        const spellName = spellDef ? spellDef.name : spellId;
        const manaCost = spellDef ? spellDef.manaCost : 0;

        const isCursor = idx === this.selectedIndex;
        const isActive = spellId === activeSpellId;

        const cursorPrefix = isCursor ? "> " : "   ";
        const activeMarker = isActive ? " [ACTIVE]" : "";
        const levelMarker = ` (Lvl ${spellState.level})`;

        spellLines.push(`${cursorPrefix}${spellName}${levelMarker} (MP: ${manaCost})${activeMarker}`);
      });
    }

    // --- 2. Active Selection Detail Display ---
    let detailText = "[Selected Spell Details]\n• None selected";
    if (knownSpells.length > 0 && this.selectedIndex < knownSpells.length) {
      const [spellId, spellState] = knownSpells[this.selectedIndex];
      let spellDef: SpellDefinition | undefined;
      try {
        spellDef = this.contentRegistry.getSpell(spellId);
      } catch {}

      if (spellDef) {
        const isActive = spellId === activeSpellId;
        detailText =
          `[${spellDef.name.toUpperCase()}]\n` +
          `• Category: ${spellDef.category}\n` +
          `• Spell Level: ${spellState.level} (XP: ${spellState.xp})\n` +
          `• Target Mode: ${spellDef.targetMode}\n` +
          `• Mana Cost: ${spellDef.manaCost} MP\n` +
          `• Base Power: ${spellDef.basePower}\n` +
          `• Range: ${spellDef.range} tiles\n` +
          `• Status: ${isActive ? "EQUIPPED" : "KNOWN"}\n\n` +
          `Description:\n ${spellDef.description ?? "No description available."}`;
      } else {
        detailText = `[${spellId}]\n• Level: ${spellState.level}\n• No definition found in ContentRegistry.`;
      }
    }

    // Update Text Labels
    this.manaLabel.text = `Mana: ${currentMana} / ${maxMana} MP | Press Enter/Space to Equip`;
    this.spellListLabel.text = `[Known Spells (${knownSpells.length})]\n` + spellLines.join("\n");
    this.spellDetailLabel.text = detailText;
  }
}
