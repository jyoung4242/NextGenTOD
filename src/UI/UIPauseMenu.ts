// UI/PauseMenu/UIPauseMenu.ts
import {
  ScreenElement,
  Keys,
  Buttons,
  Vector,
  vec,
  Color,
  Rectangle,
  Label,
  Font,
  FontUnit,
  GraphicsGroup,
  Entity,
  Engine,
} from "excalibur";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { INPUT_CONTEXT } from "../main";
import { InventoryFormTab } from "./pausetabs/InventoryForm";
import { TabElement } from "./pausetabs/tabelement";

export interface IPauseMenuTab {
  tabid: string;
  title: string;
  element: ScreenElement;
  onOpen?(): void;
  onClose?(): void;
}

export class PauseMenuSPA extends ScreenElement {
  private tabs: TabElement[] = [];
  private activeTabIndex: number = 0;
  private isOpen: boolean = false;
  private previousContext: string = INPUT_CONTEXT.Dungeon;

  private headerLinksContainer: ScreenElement;
  private contentPanelContainer: ScreenElement;
  private tabLinkLabels: Label[] = [];

  constructor(
    private readonly inputMapper: InputMapSystem,
    width: number = 850,
    height: number = 550,
  ) {
    super({
      pos: vec(960 / 2 - width / 2, 540 / 2 - height / 2),
      width,
      height,
      z: 1000,
    });

    this.headerLinksContainer = new ScreenElement({ name: "headerLinksContainer", pos: vec(20, 20) });
    this.contentPanelContainer = new ScreenElement({ name: "contentPanelContainer", pos: vec(20, 70) });

    this.addChild(this.headerLinksContainer);
    this.addChild(this.contentPanelContainer);

    this.setElementTreeVisibility(this, false);
  }

  /**
   * Helper function to recursively traverse all child entities and toggle graphics.isVisible
   */
  private setElementTreeVisibility(entity: Entity, visible: boolean): void {
    if ("graphics" in entity && (entity as any).graphics) {
      (entity as any).graphics.isVisible = visible;
    }

    for (const child of entity.children) {
      this.setElementTreeVisibility(child, visible);
    }
  }

  public registerControls(): void {
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Pause,
      inputMap: {
        KeyPresses: new Set([
          Keys.Escape,
          Keys.Backquote,
          Keys.Q,
          Keys.E,
          Keys.ArrowLeft,
          Keys.ArrowRight,
          Keys.A,
          Keys.D,
          Keys.W,
          Keys.S,
          Keys.ArrowUp,
          Keys.ArrowDown,
          Keys.Enter,
          Keys.Space,
          Keys.BracketLeft,
        ]),
        GamepadButtonsTriggers: new Set([
          Buttons.LeftBumper,
          Buttons.RightBumper,
          Buttons.Face1,
          Buttons.Face2,
          Buttons.DpadLeft,
          Buttons.DpadRight,
          Buttons.DpadUp,
          Buttons.DpadDown,
        ]),
      },
    });
  }

  public override onInitialize(engine: any): void {
    this.registerControls();

    const background = new Rectangle({
      width: this.width,
      height: this.height,
      color: Color.fromRGB(15, 23, 42, 0.98),
    });

    const separator = new Rectangle({
      width: this.width - 40,
      height: 2,
      color: Color.fromRGB(51, 65, 85),
    });

    const bgGroup: GraphicsGroup = new GraphicsGroup({
      members: [background, { graphic: separator, offset: vec(20, 45) }],
      useAnchor: false,
    });
    this.graphics.use(bgGroup);

    this.graphics.isVisible = false;
    this.setElementTreeVisibility(this, false);
  }

  public onAdd(engine: Engine): void {
    this.inputMapper.inputMapEmitter.on("gamepadButton", this.gpHandler);
    this.inputMapper.inputMapEmitter.on("keyPress", this.keyHandler);
  }

  public onRemove(engine: Engine): void {
    this.inputMapper.inputMapEmitter.off("gamepadButton", this.gpHandler);
    this.inputMapper.inputMapEmitter.off("keyPress", this.keyHandler);
  }

  keyHandler = (event: { ctx: string; key: Keys }) => {
    if (event.ctx !== INPUT_CONTEXT.Pause || !this.isOpen) return;

    const currentTab = this.tabs[this.activeTabIndex];

    // 1. Pause Menu Global Navigation & Toggling
    if (event.key === Keys.Backquote || event.key === Keys.Escape) {
      this.hide();
    } else if (event.key === Keys.Q || event.key === Keys.ArrowLeft || event.key === Keys.A) {
      this.previousTab();
    } else if (event.key === Keys.E || event.key === Keys.ArrowRight || event.key === Keys.D) {
      this.nextTab();
    }
    // 2. Tab-Specific Actions (Inventory Form Cursor & Equip Handling)
    // Inside keyHandler in UIPauseMenu.ts:
    else if (currentTab instanceof InventoryFormTab) {
      if (event.key === Keys.W || event.key === Keys.ArrowUp) {
        currentTab.moveCursor(-1);
      } else if (event.key === Keys.S || event.key === Keys.ArrowDown) {
        currentTab.moveCursor(1);
      } else if (event.key === Keys.BracketLeft) {
        console.log(event.key);

        currentTab.switchFocus(); // Toggle focus between Inventory list and Equipment slots
      } else if (event.key === Keys.Enter || event.key === Keys.Space) {
        currentTab.handleAction(); // Equips if in inventory panel, Unequips if in equipment panel
      }
    }
  };

  gpHandler = (event: { ctx: string; button: Buttons }) => {
    if (event.ctx !== INPUT_CONTEXT.Pause || !this.isOpen) return;

    const currentTab = this.tabs[this.activeTabIndex];

    // 1. Pause Menu Global Navigation & Toggling
    if (event.button === Buttons.Face2) {
      this.hide();
    } else if (event.button === Buttons.LeftBumper || event.button === Buttons.DpadLeft) {
      this.previousTab();
    } else if (event.button === Buttons.RightBumper || event.button === Buttons.DpadRight) {
      this.nextTab();
    }
    // 2. Tab-Specific Actions (Inventory Form Cursor, Focus & Action Handling)
    else if (currentTab instanceof InventoryFormTab) {
      if (event.button === Buttons.DpadUp) {
        currentTab.moveCursor(-1);
      } else if (event.button === Buttons.DpadDown) {
        currentTab.moveCursor(1);
      } else if (event.button === Buttons.Face3 || event.button === Buttons.LeftTrigger) {
        currentTab.switchFocus(); // Toggle focus between Inventory list and Equipment slots
      } else if (event.button === Buttons.Face1) {
        currentTab.handleAction(); // Equips if in inventory panel, Unequips if in equipment panel
      }
    }
  };

  public addTab(tab: TabElement): void {
    const index = this.tabs.length;
    this.tabs.push(tab);

    const xOffset = index * 130;
    const linkLabel = new Label({
      text: `[ ${tab.title} ]`,
      pos: vec(xOffset, 0),
      font: new Font({
        size: 14,
        unit: FontUnit.Px,
        color: Color.fromRGB(148, 163, 184),
      }),
    });

    this.tabLinkLabels.push(linkLabel);
    this.headerLinksContainer.addChild(linkLabel);
    this.contentPanelContainer.addChild(tab);

    this.setElementTreeVisibility(tab, false);
    this.setElementTreeVisibility(linkLabel, false);

    if (index === 0) {
      this.selectTab(0);
    }
  }

  // public reAddTabs(): void {
  //   debugger;
  //   console.log("[Pause Tabs]: contentPanelContainer children: ", this.contentPanelContainer.children);
  //   this.tabs.forEach((tab, index) => {
  //     //test if tab already added
  //     console.log("[Pause Tabs]: checking tab: ", tab);
  //     if (!this.contentPanelContainer.children.includes(tab)) {
  //       console.log("[Pause Tabs]: readding tab: ", tab);
  //       this.addTab(tab);
  //     }
  //   });
  // }

  public toggle(currentContext: string): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show(currentContext);
    }
  }

  public show(currentContext: string): void {
    if (this.isOpen) return;

    this.previousContext = currentContext;
    this.isOpen = true;

    this.graphics.isVisible = true;
    this.setElementTreeVisibility(this.headerLinksContainer, true);

    console.log("switching context to pause");
    this.inputMapper.switchContext(INPUT_CONTEXT.Pause);

    this.selectTab(this.activeTabIndex);
  }

  public hide(): void {
    if (!this.isOpen) return;

    this.isOpen = false;

    this.graphics.isVisible = false;
    this.setElementTreeVisibility(this, false);

    if (this.tabs[this.activeTabIndex]) {
      this.tabs[this.activeTabIndex].onClose?.();
    }

    console.log("switching context back to:", this.previousContext);
    this.inputMapper.switchContext(this.previousContext);
  }

  public nextTab(): void {
    if (this.tabs.length === 0) return;
    const nextIndex = (this.activeTabIndex + 1) % this.tabs.length;
    this.selectTab(nextIndex);
  }

  public previousTab(): void {
    if (this.tabs.length === 0) return;
    const prevIndex = (this.activeTabIndex - 1 + this.tabs.length) % this.tabs.length;
    this.selectTab(prevIndex);
  }

  public selectTab(index: number): void {
    if (index < 0 || index >= this.tabs.length) return;

    if (this.tabs[this.activeTabIndex]) {
      const prevTab = this.tabs[this.activeTabIndex];
      this.setElementTreeVisibility(prevTab, false);
      prevTab.onClose?.();
      this.tabLinkLabels[this.activeTabIndex].font.color = Color.fromRGB(148, 163, 184);
    }

    this.activeTabIndex = index;

    const selectedTab = this.tabs[this.activeTabIndex];
    if (this.isOpen) {
      this.setElementTreeVisibility(selectedTab, true);
      this.setElementTreeVisibility(this.headerLinksContainer, true);
    }

    selectedTab.onOpen?.();
    this.tabLinkLabels[this.activeTabIndex].font.color = Color.fromRGB(56, 189, 248);
  }

  public get isMenuOpen(): boolean {
    return this.isOpen;
  }
}
