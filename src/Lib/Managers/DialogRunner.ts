import { Sprite } from "excalibur";
import { Resources } from "../../resources";
import { DialogUI } from "../../UI/DialogUI";
import { DialogLoader, DialogueChoiceData, DialogueTree } from "./DialogLoader";

export class DialogRunner {
  private tree: DialogueTree | null = null;
  private currentNodeId: string | null = null;
  private isFinished = false;

  constructor(
    private readonly ui: DialogUI,
    private readonly loader: DialogLoader,
  ) {}

  public async start(nodeId?: string): Promise<void> {
    this.tree = await this.loader.load();
    this.isFinished = false;
    this.currentNodeId = nodeId ?? this.tree.startNodeId;
    this.renderCurrentNode();
  }

  public async restart(nodeId?: string): Promise<void> {
    await this.start(nodeId);
  }

  public async advance(): Promise<void> {
    if (!this.tree || !this.currentNodeId || this.isFinished) {
      return;
    }

    const currentNode = this.tree.nodes.get(this.currentNodeId);
    if (!currentNode) {
      this.finishConversation();
      return;
    }

    if (currentNode.data.choices && currentNode.data.choices.length > 0) {
      return;
    }

    const nextNodeId = currentNode.data.autoNextNodeId ?? null;

    if (nextNodeId === null) {
      this.finishConversation();
      return;
    }

    await this.goToNode(nextNodeId);
  }

  public async selectChoice(choice: DialogueChoiceData): Promise<void> {
    if (!this.tree || !this.currentNodeId || this.isFinished) {
      return;
    }

    if (choice.nextNodeId === null) {
      this.finishConversation();
      return;
    }

    await this.goToNode(choice.nextNodeId);
  }

  public isConversationFinished(): boolean {
    return this.isFinished;
  }

  private async goToNode(nodeId: string): Promise<void> {
    if (!this.tree) {
      return;
    }

    if (!this.tree.nodes.has(nodeId)) {
      throw new Error(`Dialog node '${nodeId}' does not exist in the loaded tree.`);
    }

    this.currentNodeId = nodeId;
    this.renderCurrentNode();
  }

  private renderCurrentNode(): void {
    if (!this.tree || !this.currentNodeId) {
      return;
    }

    const currentNode = this.tree.nodes.get(this.currentNodeId);
    if (!currentNode) {
      this.finishConversation();
      return;
    }

    console.warn("Rendering current dialog node:", currentNode.data.portrait);
    const portrait = this.resolvePortrait(currentNode.data.portrait);
    const hasChoices = Boolean(currentNode.data.choices && currentNode.data.choices.length > 0);
    const advanceMode = typeof currentNode.data.autoNextNodeId === "string" ? "next" : "close";

    this.ui.show();
    this.ui.showNode(
      currentNode.data.text,
      portrait,
      currentNode.data.choices,
      choice => {
        void this.selectChoice(choice);
        console.log("Choice selected:", choice);
        this.ui.hideChoices();
      },
      () => {
        void this.advance();
      },
      () => {
        this.ui.tw?.finishTyping();
        this.ui.removeFastForwardButton();
        this.ui.setChoices(currentNode.data.choices, choice => {
          void this.selectChoice(choice);
          console.log("Choice selected:", choice);
          this.ui.hideChoices();
        });
        this.ui.setAdvanceButton(currentNode.data.choices && currentNode.data.choices.length > 0 ? null : advanceMode, () => {
          void this.advance();
        });
      },
      hasChoices ? null : advanceMode,
    );
  }

  private finishConversation(): void {
    this.isFinished = true;
    this.ui.setChoices(null);
    this.ui.setAdvanceButton(null);
    this.ui.setFastForwardButton(undefined);
    this.ui.hide();
  }

  private resolvePortrait(portraitKey: string): Sprite | null {
    const normalizedKey = portraitKey.toLowerCase();

    switch (normalizedKey) {
      // case "fairy":
      //   return Resources.fairy.toSprite();
      // case "link":
      //   return Resources.link.toSprite();
      // case "chasm":
      //   return Resources.chasm.toSprite();
      case "goblin":
        console.warn("Resolving portrait for goblin");
        return Resources.goblin.toSprite();
      case "none":
      default:
        return null;
    }
  }
}
