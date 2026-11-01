import { ScreenElement } from "excalibur";
import { IPauseMenuTab } from "../UIPauseMenu";

export class TabElement extends ScreenElement implements IPauseMenuTab {
  tabid: string = "";
  title: string = "";
  element: ScreenElement = this;

  constructor() {
    super();
  }

  onOpen(): void {}
  onClose(): void {}
}
