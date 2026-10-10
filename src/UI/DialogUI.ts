import { Color, ExcaliburGraphicsContext, Graphic, ScreenElement, Sprite, vec, Keys, Buttons } from "excalibur";
import { drawText, CanvasTextConfig } from "canvas-txt";
import { DialogueChoiceData } from "../Lib/Managers/DialogLoader";
import { TypeWriter, TypeWriterConfig, TypingComplete } from "./TypeWriter";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { INPUT_CONTEXT } from "../main";

export class DialogUI extends ScreenElement {
  tw: TypeWriterElement | null = null;
  portrait: DialogPortrait | null = null;
  choices: DialogChoices | null = null;
  advanceButton: DialogControlButton | null = null;
  fastForwardButton: DialogControlButton | null = null;

  private selectedChoiceIndex: number = 0;
  private previousContext: string = INPUT_CONTEXT.Dungeon;
  private onChoiceSelectedCallback?: (choice: DialogueChoiceData) => void;
  private onAdvanceCallback?: () => void;
  private onFastForwardCallback?: () => void;

  constructor(private readonly inputMapper: InputMapSystem) {
    super({
      width: 960,
      height: 150,
      pos: vec(0, 540 - 150),
      color: Color.LightGray,
      z: 100,
    });
    this.tw = new TypeWriterElement();
    this.addChild(this.tw);
    this.portrait = new DialogPortrait();
    this.addChild(this.portrait);

    this.setupInputContext();
  }

  private setupInputContext(): void {
    // 1. Register Dialog Context Mappings
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Dialog,
      inputMap: {
        KeyPresses: new Set([Keys.Space, Keys.Enter, Keys.W, Keys.S, Keys.ArrowUp, Keys.ArrowDown]),
        GamepadButtonsTriggers: new Set([
          Buttons.Face1, // Confirm / Advance / Select
          Buttons.Face2, // Fast Forward / Close
          Buttons.DpadUp, // Navigate Up Choices
          Buttons.DpadDown, // Navigate Down Choices
        ]),
      },
    });

    // 2. Handle Inputs
    this.inputMapper.inputMapEmitter.on("keyPress", data => {
      if (data.ctx !== INPUT_CONTEXT.Dialog) return;
      this.handleInput(data.key);
    });

    this.inputMapper.inputMapEmitter.on("gamepadButton", data => {
      if (data.ctx !== INPUT_CONTEXT.Dialog) return;
      this.handleInput(data.button);
    });
  }

  private handleInput(input: Keys | Buttons): void {
    // Up / Down Choice Navigation
    if (input === Keys.W || input === Keys.ArrowUp || input === Buttons.DpadUp) {
      this.navigateChoices(-1);
      return;
    }
    if (input === Keys.S || input === Keys.ArrowDown || input === Buttons.DpadDown) {
      this.navigateChoices(1);
      return;
    }

    // Confirm / Advance (Face1 or Space/Enter)
    if (input === Keys.Space || input === Keys.Enter || input === Buttons.Face1) {
      if (this.choices && this.choices.choiceCount > 0) {
        this.choices.selectCurrent(this.selectedChoiceIndex);
      } else if (this.fastForwardButton) {
        this.onFastForwardCallback?.();
      } else if (this.advanceButton) {
        this.onAdvanceCallback?.();
      }
      return;
    }

    // Secondary Action / Fast Forward (Face2)
    if (input === Buttons.Face2) {
      if (this.fastForwardButton) {
        this.onFastForwardCallback?.();
      } else if (this.advanceButton) {
        this.onAdvanceCallback?.();
      }
    }
  }

  private navigateChoices(direction: number): void {
    if (!this.choices || this.choices.choiceCount === 0) return;

    this.selectedChoiceIndex = (this.selectedChoiceIndex + direction + this.choices.choiceCount) % this.choices.choiceCount;
    this.choices.updateSelectionHighlight(this.selectedChoiceIndex);
  }

  show() {
    // 1. Capture whichever context was active (Dungeon, Encounter, etc.)
    const currentCtx = this.inputMapper.getCurrentContext();
    if (currentCtx !== INPUT_CONTEXT.Dialog) {
      this.previousContext = currentCtx;
    }

    // 2. Switch input mapper to Dialog controls
    this.inputMapper.switchContext(INPUT_CONTEXT.Dialog);

    this.graphics.isVisible = true;
    if (this.tw) this.tw.graphics.isVisible = true;
    if (this.choices) this.choices.graphics.isVisible = true;
    if (this.advanceButton) this.advanceButton.graphics.isVisible = true;
    if (this.fastForwardButton) this.fastForwardButton.graphics.isVisible = true;
  }

  hide() {
    this.graphics.isVisible = false;
    if (this.tw) this.tw.graphics.isVisible = false;
    if (this.choices) this.choices.graphics.isVisible = false;
    if (this.advanceButton) this.advanceButton.graphics.isVisible = false;
    if (this.fastForwardButton) this.fastForwardButton.graphics.isVisible = false;
    if (this.portrait) this.portrait.graphics.isVisible = false;

    // 3. Restore the previous context when closing dialogue
    if (this.previousContext && this.previousContext !== INPUT_CONTEXT.Dialog) {
      this.inputMapper.switchContext(this.previousContext);
    }
  }

  next(message: string) {
    if (this.tw) {
      this.tw.reset(message);
    }
  }

  reset(message: string = "Hello, this is a test of the TypeWriter class.") {
    if (!this.tw) return;
    this.removeChild(this.tw);
    this.tw = null;

    this.graphics.isVisible = true;
    this.tw = new TypeWriterElement(message);
    this.addChild(this.tw);
  }

  setPortrait(portrait: Sprite | null) {
    if (!this.portrait) return;
    this.removeChild(this.portrait);
    this.portrait = null;
    this.portrait = new DialogPortrait();
    if (portrait) {
      this.portrait.setPortrait(portrait);
    }
    this.addChild(this.portrait);
  }

  private clearInteractiveContent() {
    if (this.choices) {
      this.removeChild(this.choices);
      this.choices.kill();
      this.choices = null;
    }

    if (this.advanceButton) {
      this.removeChild(this.advanceButton);
      this.advanceButton = null;
    }

    if (this.fastForwardButton) {
      this.removeChild(this.fastForwardButton);
      this.fastForwardButton = null;
    }
  }

  setChoices(choices: DialogueChoiceData[] | null | undefined, onChoiceSelected?: (choice: DialogueChoiceData) => void) {
    if (!choices || choices.length === 0) {
      return;
    }

    this.selectedChoiceIndex = 0;
    this.onChoiceSelectedCallback = onChoiceSelected;
    this.choices = new DialogChoices(choices, onChoiceSelected);
    this.choices.updateSelectionHighlight(this.selectedChoiceIndex);
    this.scene!.add(this.choices);
  }

  hideChoices = () => {
    if (this.choices) {
      this.choices.graphics.isVisible = false;
      this.choices = null;
    }
  };

  setAdvanceButton(mode: "next" | "close" | null, onAdvance?: () => void) {
    if (this.advanceButton) {
      this.removeChild(this.advanceButton);
      this.advanceButton = null;
    }

    if (!mode) return;

    this.onAdvanceCallback = onAdvance;
    this.advanceButton = new DialogControlButton(mode === "close" ? "Close" : "Next", onAdvance);
    this.addChild(this.advanceButton);
  }

  removeFastForwardButton() {
    if (this.fastForwardButton) {
      this.removeChild(this.fastForwardButton);
      this.fastForwardButton = null;
    }
  }

  setFastForwardButton(onFastForward?: () => void) {
    if (this.fastForwardButton) {
      this.removeChild(this.fastForwardButton);
      this.fastForwardButton = null;
    }

    if (!onFastForward) return;

    this.onFastForwardCallback = onFastForward;
    this.fastForwardButton = new DialogControlButton("Fast Fwd", onFastForward);
    this.addChild(this.fastForwardButton);
  }

  showNode(
    message: string,
    portrait: Sprite | null,
    choices?: DialogueChoiceData[] | null,
    onChoiceSelected?: (choice: DialogueChoiceData) => void,
    onAdvance?: () => void,
    onFastForward?: () => void,
    advanceMode: "next" | "close" | null = null,
  ) {
    this.next(message);
    this.setPortrait(portrait);
    this.clearInteractiveContent();
    this.setFastForwardButton(onFastForward);
    this.tw?.setOnTypingComplete(() => {
      this.removeFastForwardButton();
      this.setChoices(choices, onChoiceSelected);
      this.setAdvanceButton(choices && choices.length > 0 ? null : advanceMode, onAdvance);
    });
  }
}

export class TypeWriterElement extends ScreenElement {
  private _config: TypeWriterConfig = {
    text: "Hello, this is a test of the TypeWriter class.",
    typeDelay: 20,
    textConfig: {
      x: 0,
      y: 0,
      width: 550,
      height: 100,
      lineHeight: 30,
      font: "Arial",
      fontSize: 20,
    },
    color: Color.Black,
  };
  private typeWriter: TypeWriter | null = null;

  constructor(message: string = "Hello, this is a test of the TypeWriter class.") {
    super({
      width: 600,
      height: 100,
      pos: vec(500 - 550 / 2, 25),
      color: Color.Transparent,
    });
    this._config.text = message;
    this.typeWriter = new TypeWriter(this._config);
    this.graphics.use(this.typeWriter);
  }

  reset(message: string = "Hello, this is a test of the TypeWriter class.") {
    this._config.text = message;
    this.graphics.remove("default");
    this.typeWriter = new TypeWriter(this._config);
    this.graphics.use(this.typeWriter);
    this.rebindTypingCompleteHandler();
  }

  setOnTypingComplete(callback: (() => void) | null) {
    this.typingCompleteCallback = callback;
    this.rebindTypingCompleteHandler();
  }

  finishTyping() {
    this.typeWriter?.finish();
  }

  private typingCompleteCallback: (() => void) | null = null;

  private rebindTypingCompleteHandler() {
    if (!this.typeWriter) return;

    if (this.typingCompleteHandler) {
      this.typeWriter.events.off("typingComplete", this.typingCompleteHandler);
    }

    this.typingCompleteHandler = (_event: TypingComplete) => {
      this.typingCompleteCallback?.();
    };
    this.typeWriter.events.on("typingComplete", this.typingCompleteHandler);
  }

  private typingCompleteHandler: ((event: TypingComplete) => void) | null = null;
}

export class DialogPortrait extends ScreenElement {
  constructor() {
    super({
      width: 125,
      height: 125,
      pos: vec(10, 10),
      color: Color.Transparent,
      z: 104,
    });
  }

  setPortrait(portrait: Sprite) {
    this.graphics.remove("default");
    this.graphics.use(portrait);
  }
}

export class DialogChoices extends ScreenElement {
  private choiceOptions: DialogChoiceOption[] = [];

  constructor(
    private readonly choicesData: DialogueChoiceData[],
    private readonly onChoiceSelected?: (choice: DialogueChoiceData) => void,
  ) {
    super({
      width: 960,
      height: 300,
      pos: vec(0, 100),
      color: Color.Transparent,
      z: 101,
    });

    choicesData.forEach((choice, index) => {
      const option = new DialogChoiceOption(choice, index, onChoiceSelected);
      this.choiceOptions.push(option);
      this.addChild(option);
    });
  }

  get choiceCount(): number {
    return this.choiceOptions.length;
  }

  updateSelectionHighlight(selectedIndex: number): void {
    this.choiceOptions.forEach((option, idx) => {
      option.setSelected(idx === selectedIndex);
    });
  }

  selectCurrent(selectedIndex: number): void {
    if (this.choicesData[selectedIndex]) {
      this.onChoiceSelected?.(this.choicesData[selectedIndex]);
    }
  }
}

export class DialogChoiceOption extends ScreenElement {
  private choiceGraphic: ChoiceTextGraphic;

  constructor(
    private readonly choice: DialogueChoiceData,
    index: number,
    onChoiceSelected?: (choice: DialogueChoiceData) => void,
  ) {
    super({
      width: 960 * 0.75,
      height: 30,
      pos: vec(800 / 2 - 520 / 2, index * 35),
      color: Color.Transparent,
    });

    this.choiceGraphic = new ChoiceTextGraphic(choice.label, 960 * 0.75, 30);
    this.graphics.use(this.choiceGraphic);
    this.on("pointerdown", () => {
      onChoiceSelected?.(choice);
    });
  }

  setSelected(isSelected: boolean): void {
    this.choiceGraphic.isSelected = isSelected;
  }
}

export class DialogControlButton extends ScreenElement {
  constructor(label: string, onActivate?: () => void) {
    super({
      width: 90,
      height: 34,
      pos: vec(960 - 120, 110),
      color: Color.Transparent,
      z: 1000,
    });

    this.graphics.use(new ControlTextGraphic(label, 90, 34));
    this.on("pointerdown", () => {
      onActivate?.();
    });
  }
}

class ChoiceTextGraphic extends Graphic {
  text: string;
  isSelected: boolean = false;

  constructor(text: string, width: number, height: number) {
    super({ width, height });
    this.text = text;
    this.width = width;
    this.height = height;
  }

  clone(): Graphic {
    const cloned = new ChoiceTextGraphic(this.text, this.width, this.height);
    cloned.isSelected = this.isSelected;
    return cloned;
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const textConfig: CanvasTextConfig = {
      x: 8,
      y: 4,
      width: this.width - 16,
      height: this.height - 8,
      lineHeight: 20,
      font: "Arial",
      fontSize: 18,
    };

    ctx.fillStyle = this.isSelected ? "#ffe8b3" : "#f8efe0";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = this.isSelected ? "#d97706" : "#4a3a2a";
    ctx.lineWidth = this.isSelected ? 3 : 1;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
    ctx.fillStyle = "#202020";

    const labelText = this.isSelected ? `> ${this.text}` : this.text;
    drawText(ctx, labelText, textConfig);
    canvas.setAttribute("forceUpload", "true");
    ex.drawImage(canvas, x, y);
  }
}

class ControlTextGraphic extends Graphic {
  text: string;
  canvas: HTMLCanvasElement = document.createElement("canvas");
  ctx: CanvasRenderingContext2D | null = null;

  constructor(text: string, width: number, height: number) {
    super({ width, height });
    this.text = text;
    this.width = width;
    this.height = height;
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clone(): Graphic {
    return new ControlTextGraphic(this.text, this.width, this.height);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    if (!this.ctx) return;

    const textConfig: CanvasTextConfig = {
      x: 6,
      y: 4,
      width: this.width - 12,
      height: this.height - 8,
      lineHeight: 20,
      font: "Arial",
      fontSize: 16,
    };

    this.ctx.fillStyle = "#2d2d2d";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.strokeStyle = "#efe0b8";
    this.ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
    this.ctx.fillStyle = "#f7f0d8";

    drawText(this.ctx, this.text, textConfig);
    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y);
  }
}
