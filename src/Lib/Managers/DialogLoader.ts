import dialogSchema from "../../../public/Dialog/dialog_schema.json";

type DialogSchema = {
  required?: string[];
  $defs?: {
    DialogueNode?: {
      required?: string[];
    };
    DialogueChoice?: {
      required?: string[];
    };
  };
};

export interface DialogueNodeData {
  speaker: string;
  portrait: string;
  text: string;
  choices?: DialogueChoiceData[];
  autoNextNodeId?: string | null;
  setsFlag?: string;
}

export interface DialogueChoiceData {
  label: string;
  nextNodeId: string | null;
  requiresFlag?: string;
  setsFlag?: string;
  startsQuest?: string;
  completesQuest?: string;
}

export interface DialogueTreeData {
  id: string;
  startNodeId: string;
  nodes: Record<string, DialogueNodeData>;
}

export interface DialogueTreeNode {
  id: string;
  data: DialogueNodeData;
  children: DialogueTreeNode[];
}

export interface DialogueTree {
  id: string;
  startNodeId: string;
  root: DialogueTreeNode | null;
  nodes: Map<string, DialogueTreeNode>;
  raw: DialogueTreeData;
}

export class DialogLoader {
  constructor(private readonly sourcePath: string) {}

  public async load(): Promise<DialogueTree> {
    const response = await fetch(this.resolveSourcePath(), { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load dialog data from ${this.sourcePath}: ${response.status}`);
    }

    const payload = (await response.json()) as unknown;

    return this.buildTree(payload);
  }

  public buildTree(payload: unknown): DialogueTree {
    const data = this.validateDialogTree(payload);
    const nodes = new Map<string, DialogueTreeNode>();

    for (const [nodeId, nodeData] of Object.entries(data.nodes)) {
      nodes.set(nodeId, {
        id: nodeId,
        data: nodeData,
        children: [],
      });
    }

    for (const [nodeId, treeNode] of nodes.entries()) {
      const targetIds = this.collectNextNodeIds(treeNode.data);

      for (const targetId of targetIds) {
        const targetNode = nodes.get(targetId);

        if (targetNode) {
          treeNode.children.push(targetNode);
        }
      }

      if (targetIds.length === 0 && treeNode.children.length === 0 && treeNode.id !== data.startNodeId) {
        continue;
      }
    }

    return {
      id: data.id,
      startNodeId: data.startNodeId,
      root: nodes.get(data.startNodeId) ?? null,
      nodes,
      raw: data,
    };
  }

  private resolveSourcePath(): string {
    const normalizedPath = DialogLoader.normalizeSourcePath(this.sourcePath);

    if (normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    return `/${normalizedPath}`;
  }

  private static normalizeSourcePath(sourcePath: string): string {
    const trimmed = sourcePath.replace(/\\/g, "/").trim();
    if (trimmed.startsWith("/public/data/")) {
      return trimmed.replace("/public/data/", "/data/");
    }

    if (trimmed.startsWith("/data/")) {
      return trimmed;
    }

    return `/${trimmed.replace(/^\/+/, "")}`;
  }

  private collectNextNodeIds(node: DialogueNodeData): string[] {
    if (Array.isArray(node.choices) && node.choices.length > 0) {
      return node.choices
        .map(choice => choice.nextNodeId)
        .filter((nextNodeId): nextNodeId is string => typeof nextNodeId === "string");
    }

    if (typeof node.autoNextNodeId === "string") {
      return [node.autoNextNodeId];
    }

    return [];
  }

  private validateDialogTree(payload: unknown): DialogueTreeData {
    if (!this.isRecord(payload)) {
      throw new Error("Dialog data must be a JSON object.");
    }

    const schema = dialogSchema as DialogSchema;
    const rootRequiredFields = schema.required ?? ["id", "startNodeId", "nodes"];

    for (const field of rootRequiredFields) {
      if (!(field in payload)) {
        throw new Error(`Dialog data is missing required field: ${field}`);
      }
    }

    const id = this.requireString(payload.id, "id");
    const startNodeId = this.requireString(payload.startNodeId, "startNodeId");
    const rawNodes = payload.nodes;

    if (!this.isRecord(rawNodes)) {
      throw new Error("Dialog data must include a 'nodes' object.");
    }

    const nodeRequiredFields = schema.$defs?.DialogueNode?.required ?? ["speaker", "portrait", "text"];
    const choiceRequiredFields = schema.$defs?.DialogueChoice?.required ?? ["label", "nextNodeId"];
    const nodes: Record<string, DialogueNodeData> = {};

    for (const [nodeId, nodeValue] of Object.entries(rawNodes)) {
      if (!this.isRecord(nodeValue)) {
        throw new Error(`Node '${nodeId}' must be an object.`);
      }

      for (const field of nodeRequiredFields) {
        if (!(field in nodeValue)) {
          throw new Error(`Node '${nodeId}' is missing required field: ${field}`);
        }
      }

      const speaker = this.requireString(nodeValue.speaker, `nodes.${nodeId}.speaker`);
      const portrait = this.requireString(nodeValue.portrait, `nodes.${nodeId}.portrait`);
      const text = this.requireString(nodeValue.text, `nodes.${nodeId}.text`);

      const hasChoices = Array.isArray(nodeValue.choices) && nodeValue.choices.length > 0;
      const hasAutoNext = typeof nodeValue.autoNextNodeId === "string" || nodeValue.autoNextNodeId === null;

      if (hasChoices && hasAutoNext) {
        throw new Error(`Node '${nodeId}' cannot define both choices and autoNextNodeId.`);
      }

      const nodeData: DialogueNodeData = {
        speaker,
        portrait,
        text,
      };

      if (typeof nodeValue.setsFlag === "string") {
        nodeData.setsFlag = nodeValue.setsFlag;
      }

      if (hasChoices) {
        const choices = nodeValue.choices as unknown[];
        const normalizedChoices: DialogueChoiceData[] = [];

        for (const [choiceIndex, choiceValue] of choices.entries()) {
          if (!this.isRecord(choiceValue)) {
            throw new Error(`Node '${nodeId}' choice ${choiceIndex} must be an object.`);
          }

          for (const field of choiceRequiredFields) {
            if (!(field in choiceValue)) {
              throw new Error(`Node '${nodeId}' choice ${choiceIndex} is missing required field: ${field}`);
            }
          }

          const label = this.requireString(choiceValue.label, `nodes.${nodeId}.choices.${choiceIndex}.label`);
          const nextNodeId = choiceValue.nextNodeId;

          if (nextNodeId !== null && typeof nextNodeId !== "string") {
            throw new Error(`Node '${nodeId}' choice ${choiceIndex} must use a string or null nextNodeId.`);
          }

          const normalizedChoice: DialogueChoiceData = {
            label,
            nextNodeId,
          };

          if (typeof choiceValue.requiresFlag === "string") {
            normalizedChoice.requiresFlag = choiceValue.requiresFlag;
          }

          if (typeof choiceValue.setsFlag === "string") {
            normalizedChoice.setsFlag = choiceValue.setsFlag;
          }

          if (typeof choiceValue.startsQuest === "string") {
            normalizedChoice.startsQuest = choiceValue.startsQuest;
          }

          if (typeof choiceValue.completesQuest === "string") {
            normalizedChoice.completesQuest = choiceValue.completesQuest;
          }

          normalizedChoices.push(normalizedChoice);
        }

        nodeData.choices = normalizedChoices;
      } else if (hasAutoNext) {
        nodeData.autoNextNodeId = nodeValue.autoNextNodeId as string | null;
      }

      nodes[nodeId] = nodeData;
    }

    if (!Object.prototype.hasOwnProperty.call(nodes, startNodeId)) {
      throw new Error(`startNodeId '${startNodeId}' does not exist in the dialog tree.`);
    }

    return {
      id,
      startNodeId,
      nodes,
    };
  }

  private requireString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Expected a non-empty string for ${fieldName}.`);
    }

    return value;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
