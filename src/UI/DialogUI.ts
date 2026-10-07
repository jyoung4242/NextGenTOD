import { Color, ExcaliburGraphicsContext, Graphic, ScreenElement, Sprite, vec } from "excalibur";
import { drawText, CanvasTextConfig } from "canvas-txt";
import { DialogueChoiceData } from "../Lib/Managers/DialogLoader";
import { TypeWriter, TypeWriterConfig, TypingComplete } from "./TypeWriter";

export class DialogUI extends ScreenElement {
  tw: TypeWriterElement | null = null;
  portrait: DialogPortrait | null = null;
  choices: DialogChoices | null = null;
  advanceButton: DialogControlButton | null = null;
  fastForwardButton: DialogControlButton | null = null;

  constructor() {
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
  }

  show() {
    this.graphics.isVisible = true;
    if (this.tw) {
      this.tw.graphics.isVisible = true;
    }
    if (this.choices) {
      this.choices.graphics.isVisible = true;
    }
    if (this.advanceButton) {
      this.advanceButton.graphics.isVisible = true;
    }
    if (this.fastForwardButton) {
      this.fastForwardButton.graphics.isVisible = true;
    }
  }

  hide() {
    this.graphics.isVisible = false;
    if (this.tw) {
      this.tw.graphics.isVisible = false;
    }
    if (this.choices) {
      this.choices.graphics.isVisible = false;
    }
    if (this.advanceButton) {
      this.advanceButton.graphics.isVisible = false;
    }
    if (this.fastForwardButton) {
      this.fastForwardButton.graphics.isVisible = false;
    }
    // add portrait
    if (this.portrait) {
      this.portrait.graphics.isVisible = false;
    }
  }

  next(message: string) {
    if (this.tw) {
      this.tw.reset(message);
    }
  }

  reset(message: string = "Hello, this is a test of the TypeWriter class. It should display text one letter at a time.") {
    if (!this.tw) return;
    this.removeChild(this.tw);
    this.tw = null;

    this.graphics.isVisible = true;
    this.tw = new TypeWriterElement(message);
    this.addChild(this.tw);
  }

  setPortrait(portrait: Sprite | null) {
    console.log("Setting portrait", portrait);
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
    console.log("Clearing interactive content");
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

    this.choices = new DialogChoices(choices, onChoiceSelected);
    console.log("Adding choices", this.choices);
    this.scene!.add(this.choices);
  }

  hideChoices = () => {
    if (this.choices) {
      this.choices.graphics.isVisible = false;
      this.choices = null;
    }
  };

  setAdvanceButton(mode: "next" | "close" | null, onAdvance?: () => void) {
    console.log("set advanceMode:", mode);

    if (this.advanceButton) {
      console.log("removing advance button");
      this.removeChild(this.advanceButton);
      this.advanceButton = null;
    }

    if (!mode) {
      return;
    }

    this.advanceButton = new DialogControlButton(mode === "close" ? "Close" : "Next", onAdvance);
    console.log("adding advance button");
    this.addChild(this.advanceButton);
  }

  removeFastForwardButton() {
    if (this.fastForwardButton) {
      console.log("Removing fast forward button");
      this.removeChild(this.fastForwardButton);
      this.fastForwardButton = null;
    }
  }

  setFastForwardButton(onFastForward?: () => void) {
    if (this.fastForwardButton) {
      console.log("Removing fast forward button");
      this.removeChild(this.fastForwardButton);
      this.fastForwardButton = null;
    }

    if (!onFastForward) {
      return;
    }

    this.fastForwardButton = new DialogControlButton("Fast Fwd", onFastForward);
    console.log("Adding fast forward button", this.fastForwardButton);
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
    text: "Hello, this is a test of the TypeWriter class. It should display text one letter at a time.",
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

  constructor(message: string = "Hello, this is a test of the TypeWriter class. It should display text one letter at a time.") {
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

  reset(message: string = "Hello, this is a test of the TypeWriter class. It should display text one letter at a time.") {
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
    if (!this.typeWriter) {
      return;
    }

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
  constructor(choices: DialogueChoiceData[], onChoiceSelected?: (choice: DialogueChoiceData) => void) {
    super({
      width: 960,
      height: 300,
      pos: vec(0, 100),
      color: Color.Transparent,
      z: 101,
    });

    choices.forEach((choice, index) => {
      const option = new DialogChoiceOption(choice, index, onChoiceSelected);
      this.addChild(option);
    });
  }
}

export class DialogChoiceOption extends ScreenElement {
  constructor(choice: DialogueChoiceData, index: number, onChoiceSelected?: (choice: DialogueChoiceData) => void) {
    super({
      width: 960 * 0.75,
      height: 30,
      pos: vec(800 / 2 - 520 / 2, index * 35),
      color: Color.Transparent,
    });

    this.graphics.use(new ChoiceTextGraphic(choice.label, 960 * 0.75, 30));
    this.on("pointerdown", () => {
      onChoiceSelected?.(choice);
    });
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

  constructor(text: string, width: number, height: number) {
    super({ width, height });
    this.text = text;
    this.width = width;
    this.height = height;
  }

  clone(): Graphic {
    return new ChoiceTextGraphic(this.text, this.width, this.height);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const textConfig: CanvasTextConfig = {
      x: 8,
      y: 4,
      width: this.width - 16,
      height: this.height - 8,
      lineHeight: 20,
      font: "Arial",
      fontSize: 18,
    };

    ctx.fillStyle = "#f8efe0";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = "#4a3a2a";
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
    ctx.fillStyle = "#202020";

    drawText(ctx, this.text, textConfig);
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
    if (!this.ctx) {
      return;
    }

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
