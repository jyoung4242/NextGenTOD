// UI/PauseMenu/Tabs/InventoryFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "../pausetabs/tabelement";
import { StateStore } from "../../GameState";
import { GameState, EquipmentSlot } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";
import { EquipmentSystem } from "../../Lib/Systems/EquipmentSystem";

export class InventoryFormTab extends TabElement {
  public tabid = "inventory";
  public title = "Inventory";

  private headerLabel: Label;
  private weightLabel: Label;
  private itemListLabel: Label;
  private equipmentLabel: Label;
  private keyringLabel: Label;

  private selectedIndex: number = 0;

  // Define slots in order so we can map an equipment cursor index if desired
  private readonly equipmentSlots: EquipmentSlot[] = ["head", "chest", "mainHand", "offHand", "accessory"];
  private selectedEquipmentIndex: number = 0;
  private focusArea: "inventory" | "equipment" = "inventory"; // Track where cursor is active

  private unsubscribeInventory?: () => void;
  private unsubscribeEquipment?: () => void;
  private unsubscribeKeyring?: () => void;

  constructor(
    private store: StateStore<GameState>,
    private contentRegistry: ContentRegistry,
    private equipmentSystem: EquipmentSystem,
  ) {
    super();
    this.name = "InventoryFormTab";
    this.headerLabel = new Label({
      text: "=== EQUIPMENT & INVENTORY ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    this.weightLabel = new Label({
      text: "Weight: 0.0 / 50.0 kg",
      pos: vec(0, 30),
      color: Color.fromRGB(148, 163, 184),
    });

    this.itemListLabel = new Label({
      text: "Loading items...",
      pos: vec(0, 70),
      color: Color.fromRGB(203, 213, 225),
    });

    this.keyringLabel = new Label({
      text: "[Keyring]\n• None",
      pos: vec(0, 320),
      color: Color.fromRGB(234, 179, 8),
    });

    this.equipmentLabel = new Label({
      text: "[Equipped Gear]\n• Head: None",
      pos: vec(450, 70),
      color: Color.fromRGB(56, 189, 248),
    });

    this.addChild(this.headerLabel);
    this.addChild(this.weightLabel);
    this.addChild(this.itemListLabel);
    this.addChild(this.keyringLabel);
    this.addChild(this.equipmentLabel);
  }

  public override onOpen(): void {
    this.selectedIndex = 0;
    this.focusArea = "inventory";
    this.refreshDisplay();

    this.unsubscribeInventory = this.store.subscribe("inventory.items", () => this.refreshDisplay());
    this.unsubscribeEquipment = this.store.subscribe("player.equipment", () => this.refreshDisplay());
    this.unsubscribeKeyring = this.store.subscribe("player.keyring", () => this.refreshDisplay());
  }

  public override onClose(): void {
    this.unsubscribeInventory?.();
    this.unsubscribeEquipment?.();
    this.unsubscribeKeyring?.();
    this.unsubscribeInventory = undefined;
    this.unsubscribeEquipment = undefined;
    this.unsubscribeKeyring = undefined;
  }

  public moveCursor(delta: number): void {
    if (this.focusArea === "inventory") {
      const items = this.store.get().inventory.items ?? [];
      if (items.length === 0) return;
      this.selectedIndex = (this.selectedIndex + delta + items.length) % items.length;
    } else {
      this.selectedEquipmentIndex = (this.selectedEquipmentIndex + delta + this.equipmentSlots.length) % this.equipmentSlots.length;
    }
    this.refreshDisplay();
  }

  public switchFocus(): void {
    this.focusArea = this.focusArea === "inventory" ? "equipment" : "inventory";
    console.log("[INVENTORY]: shifting focus");

    this.refreshDisplay();
  }

  public handleAction(): void {
    if (this.focusArea === "inventory") {
      // Equip selected inventory item
      const items = this.store.get().inventory.items ?? [];
      if (items.length === 0 || this.selectedIndex >= items.length) return;
      const selectedInstance = items[this.selectedIndex];
      if (selectedInstance) {
        this.equipmentSystem.equipItem(selectedInstance.instanceId);
        if (this.selectedIndex >= items.length - 1) {
          this.selectedIndex = Math.max(0, items.length - 2);
        }
      }
    } else {
      // Unequip currently highlighted equipment slot
      const targetSlot = this.equipmentSlots[this.selectedEquipmentIndex];
      this.equipmentSystem.unequipItem(targetSlot);
    }
  }

  private refreshDisplay(): void {
    const inventory = this.store.get().inventory;
    const items = inventory?.items ?? [];
    const equipment = this.store.get().player?.equipment ?? {};
    const keyring = this.store.get().player?.keyring ?? [];

    // --- 1. Items Render ---
    let totalWeight = 0;
    const itemLines: string[] = [];
    if (items.length === 0) {
      itemLines.push("  (Inventory is empty)");
    } else {
      items.forEach((item, idx) => {
        if (!item || typeof item.definitionId !== "string") return;
        const def = this.contentRegistry.getItem(item.definitionId);
        const isFocused = this.focusArea === "inventory" && idx === this.selectedIndex;
        const prefix = isFocused ? "> [I]" : "   ";
        if (def) {
          totalWeight += def.weight * item.quantity;
          itemLines.push(`${prefix} ${def.name} x${item.quantity} (${(def.weight * item.quantity).toFixed(1)}kg)`);
        }
      });
    }

    // --- 2. Equipment Slots Render ---
    const equipLines = this.equipmentSlots.map((slot, idx) => {
      const itemInstance = (equipment as Record<string, any>)[slot];
      const getに対してName = itemInstance
        ? (this.contentRegistry.getItem(itemInstance.definitionId)?.name ?? itemInstance.definitionId)
        : "None";
      const isFocused = this.focusArea === "equipment" && idx === this.selectedEquipmentIndex;
      const prefix = isFocused ? "> [E]" : "   ";
      const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
      return `${prefix} ${slotName}: ${getに対してName}`;
    });

    const keyringLines = keyring.length === 0 ? ["  No keys collected"] : keyring.map(k => `  ${k}`);

    // Update Text Labels with Focus Instructions
    this.weightLabel.text = `Weight: ${totalWeight.toFixed(1)} / ${inventory.maxWeight} kg [Focus: ${this.focusArea.toUpperCase()}]`;
    this.itemListLabel.text = `[Items] (Press Tab/Space to switch panels)\n` + itemLines.join("\n");
    this.equipmentLabel.text = `[Equipped Gear] - Press Enter to Unequip\n` + equipLines.join("\n");
    this.keyringLabel.text = `[Keyring (${keyring.length})]\n` + keyringLines.join("\n");
  }
}
