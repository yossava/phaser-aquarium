import Phaser from "phaser";

type DebuggableObject = Phaser.GameObjects.GameObject & {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  depth?: number;
  alpha?: number;
  visible?: boolean;
  getBounds?: () => Phaser.Geom.Rectangle;
  setInteractive?: (...args: any[]) => unknown;
};

export type DebugPositionSnapshot = {
  name: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  depth: number;
  alpha: number;
  visible: boolean;
};

export type DebugPositionToolOptions = {
  gridSize?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  showLabels?: boolean;
  showBounds?: boolean;
  showPointer?: boolean;
  scrollFactor?: number;
  depth?: number;
};

export type DebugPositionAddOptions = {
  draggable?: boolean;
  selectable?: boolean;
  labelOffsetX?: number;
  labelOffsetY?: number;
};

type DebugEntry = {
  object: DebuggableObject;
  name: string;
  label: Phaser.GameObjects.Text;
  proxy: Phaser.GameObjects.Zone;
  options: Required<DebugPositionAddOptions>;
  dragStartObjectX: number;
  dragStartObjectY: number;
  dragStartProxyX: number;
  dragStartProxyY: number;
};

const defaultToolOptions: Required<DebugPositionToolOptions> = {
  gridSize: 50,
  showGrid: true,
  snapToGrid: false,
  showLabels: true,
  showBounds: true,
  showPointer: true,
  scrollFactor: 0,
  depth: 9_000
};

const defaultAddOptions: Required<DebugPositionAddOptions> = {
  draggable: true,
  selectable: true,
  labelOffsetX: 8,
  labelOffsetY: -42
};

export class DebugPositionTool {
  private readonly scene: Phaser.Scene;
  private readonly options: Required<DebugPositionToolOptions>;
  private readonly entries = new Map<DebuggableObject, DebugEntry>();
  private readonly proxyEntries = new Map<Phaser.GameObjects.GameObject, DebugEntry>();
  private readonly boundsGraphics: Phaser.GameObjects.Graphics;
  private readonly gridGraphics: Phaser.GameObjects.Graphics;
  private readonly pointerLabel?: Phaser.GameObjects.Text;
  private selected?: DebugEntry;
  private labelsVisible: boolean;
  private boundsVisible: boolean;
  private gridVisible: boolean;
  private isDestroyed = false;

  public constructor(scene: Phaser.Scene, options: DebugPositionToolOptions = {}) {
    this.scene = scene;
    this.options = { ...defaultToolOptions, ...options };
    this.labelsVisible = this.options.showLabels;
    this.boundsVisible = this.options.showBounds;
    this.gridVisible = this.options.showGrid;

    this.gridGraphics = this.scene.add.graphics().setDepth(this.options.depth);
    this.boundsGraphics = this.scene.add.graphics().setDepth(this.options.depth + 1);
    this.setDebugScrollFactor(this.gridGraphics);
    this.setDebugScrollFactor(this.boundsGraphics);

    if (this.options.showPointer) {
      this.pointerLabel = this.scene.add
        .text(8, 8, "Pointer: x: 0 y: 0", {
          fontFamily: "Arial",
          fontSize: "11px",
          color: "#dff8ff",
          backgroundColor: "rgba(3, 16, 26, 0.72)",
          padding: { x: 5, y: 3 }
        })
        .setDepth(this.options.depth + 3)
        .setVisible(true);
      this.setDebugScrollFactor(this.pointerLabel);
    }

    this.scene.input.on("dragstart", this.handleDragStart, this);
    this.scene.input.on("drag", this.handleDrag, this);
    this.scene.input.on("dragend", this.handleDragEnd, this);
    this.scene.input.on("gameobjectdown", this.handleGameObjectDown, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
    this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.render, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.renderGrid();
  }

  public add(gameObject: DebuggableObject, name: string, options: DebugPositionAddOptions = {}): void {
    if (this.isDestroyed) {
      return;
    }

    const existing = this.entries.get(gameObject);
    if (existing) {
      existing.name = name;
      existing.options = { ...existing.options, ...options };
      return;
    }

    const label = this.scene.add
      .text(0, 0, "", {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#dff8ff",
        backgroundColor: "rgba(3, 16, 26, 0.72)",
        padding: { x: 4, y: 3 }
      })
      .setDepth(this.options.depth + 2)
      .setVisible(this.labelsVisible);
    this.setDebugScrollFactor(label);

    const proxy = this.scene.add.zone(0, 0, 1, 1).setDepth(this.options.depth + 2);
    this.setDebugScrollFactor(proxy);
    proxy.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(proxy, options.draggable ?? defaultAddOptions.draggable);

    const entry: DebugEntry = {
      object: gameObject,
      name,
      label,
      proxy,
      options: { ...defaultAddOptions, ...options },
      dragStartObjectX: 0,
      dragStartObjectY: 0,
      dragStartProxyX: 0,
      dragStartProxyY: 0
    };
    this.entries.set(gameObject, entry);
    this.proxyEntries.set(proxy, entry);
  }

  public remove(gameObject: DebuggableObject): void {
    const entry = this.entries.get(gameObject);
    if (!entry) {
      return;
    }

    if (this.selected === entry) {
      this.selected = undefined;
    }
    entry.label.destroy();
    entry.proxy.destroy();
    this.proxyEntries.delete(entry.proxy);
    this.entries.delete(gameObject);
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    this.scene.input.off("dragstart", this.handleDragStart, this);
    this.scene.input.off("drag", this.handleDrag, this);
    this.scene.input.off("dragend", this.handleDragEnd, this);
    this.scene.input.off("gameobjectdown", this.handleGameObjectDown, this);
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.keyboard?.off("keydown", this.handleKeyDown, this);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.render, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.entries.forEach((entry) => {
      entry.label.destroy();
      entry.proxy.destroy();
    });
    this.entries.clear();
    this.proxyEntries.clear();
    this.gridGraphics.destroy();
    this.boundsGraphics.destroy();
    this.pointerLabel?.destroy();
  }

  private handleDragStart(_pointer: Phaser.Input.Pointer, gameObject: DebuggableObject): void {
    const entry = this.entryForGameObject(gameObject);
    if (!entry) {
      return;
    }

    this.selectEntry(entry);
    entry.dragStartObjectX = entry.object.x ?? 0;
    entry.dragStartObjectY = entry.object.y ?? 0;
    entry.dragStartProxyX = entry.proxy.x;
    entry.dragStartProxyY = entry.proxy.y;
  }

  private handleDrag(_pointer: Phaser.Input.Pointer, gameObject: DebuggableObject, dragX: number, dragY: number): void {
    const entry = this.entryForGameObject(gameObject);
    if (!entry || !entry.options.draggable || typeof entry.object.x !== "number" || typeof entry.object.y !== "number") {
      return;
    }

    const point = this.options.snapToGrid ? this.snapPoint(dragX, dragY) : { x: dragX, y: dragY };
    if (gameObject === entry.proxy) {
      entry.object.x = entry.dragStartObjectX + (point.x - entry.dragStartProxyX);
      entry.object.y = entry.dragStartObjectY + (point.y - entry.dragStartProxyY);
      entry.proxy.setPosition(point.x, point.y);
      return;
    }

    entry.object.x = point.x;
    entry.object.y = point.y;
  }

  private handleDragEnd(_pointer: Phaser.Input.Pointer, gameObject: DebuggableObject): void {
    const entry = this.entryForGameObject(gameObject);
    if (entry) {
      this.logEntry(entry);
    }
  }

  private handleGameObjectDown(_pointer: Phaser.Input.Pointer, gameObject: DebuggableObject): void {
    const entry = this.entryForGameObject(gameObject);
    if (entry) {
      this.selectEntry(entry);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerLabel) {
      return;
    }
    this.pointerLabel.setText(`Pointer: x: ${Math.round(pointer.worldX)} y: ${Math.round(pointer.worldY)}`);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isDebugHotkey(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key.toLowerCase() === "h") {
      this.labelsVisible = !this.labelsVisible;
      this.boundsVisible = this.labelsVisible;
      return;
    }
    if (event.key.toLowerCase() === "g") {
      this.gridVisible = !this.gridVisible;
      this.renderGrid();
      return;
    }
    if (event.key.toLowerCase() === "p") {
      this.logAllObjects();
      return;
    }
    if (event.key.toLowerCase() === "c") {
      this.pointerLabel?.setVisible(!this.pointerLabel.visible);
      return;
    }
    if (event.key === "Escape") {
      this.selected = undefined;
      return;
    }

    if (!this.selected) {
      return;
    }

    const object = this.selected.object;
    const moveAmount = event.altKey ? 0.5 : event.shiftKey ? 10 : 1;
    switch (event.key) {
      case "ArrowLeft":
        this.moveObject(object, -moveAmount, 0);
        break;
      case "ArrowRight":
        this.moveObject(object, moveAmount, 0);
        break;
      case "ArrowUp":
        this.moveObject(object, 0, -moveAmount);
        break;
      case "ArrowDown":
        this.moveObject(object, 0, moveAmount);
        break;
      case "q":
      case "Q":
        this.rotateObject(object, this.rotationAmount(event, -1));
        break;
      case "e":
      case "E":
        this.rotateObject(object, this.rotationAmount(event, 1));
        break;
      case "z":
      case "Z":
        this.applyScaleHotkey(object, event, -1);
        break;
      case "x":
      case "X":
        this.applyScaleHotkey(object, event, 1);
        break;
      case "y":
      case "Y":
        if (event.altKey) {
          this.adjustObjectScale(object, "y", this.scaleAmount(event));
        }
        break;
      case "t":
      case "T":
        if (event.altKey) {
          this.adjustObjectScale(object, "y", -this.scaleAmount(event));
        }
        break;
      case "a":
      case "A":
        this.setObjectAlpha(object, -0.05);
        break;
      case "s":
      case "S":
        this.setObjectAlpha(object, 0.05);
        break;
      case "[":
        this.adjustObjectDepth(object, event.shiftKey ? -10 : -1);
        break;
      case "]":
        this.adjustObjectDepth(object, event.shiftKey ? 10 : 1);
        break;
      case "v":
      case "V":
        this.toggleObjectVisibility(object);
        break;
      case "d":
      case "D":
        this.logObject(object);
        break;
    }
  }

  private isDebugHotkey(event: KeyboardEvent): boolean {
    if (event.key === " ") {
      return true;
    }

    const key = event.key.toLowerCase();
    return (
      event.key.startsWith("Arrow") ||
      event.key === "[" ||
      event.key === "]" ||
      event.key === "Escape" ||
      ["a", "c", "d", "e", "g", "h", "p", "q", "s", "t", "v", "x", "y", "z"].includes(key)
    );
  }

  private selectObject(gameObject: DebuggableObject): void {
    const entry = this.entries.get(gameObject);
    if (!entry || !entry.options.selectable) {
      return;
    }
    this.selectEntry(entry);
  }

  private selectEntry(entry: DebugEntry): void {
    if (!entry.options.selectable) {
      return;
    }
    this.selected = entry;
  }

  private entryForGameObject(gameObject: Phaser.GameObjects.GameObject): DebugEntry | undefined {
    return this.entries.get(gameObject as DebuggableObject) ?? this.proxyEntries.get(gameObject);
  }

  private render(): void {
    if (this.isDestroyed) {
      return;
    }

    this.boundsGraphics.clear();
    this.boundsGraphics.setVisible(this.boundsVisible);
    this.entries.forEach((entry) => this.renderEntry(entry));
  }

  private renderEntry(entry: DebugEntry): void {
    const snapshot = this.snapshotFor(entry);
    const bounds = this.boundsFor(entry.object);
    const selected = this.selected === entry;
    entry.proxy.setPosition(bounds.centerX, bounds.centerY);
    entry.proxy.setSize(Math.max(12, bounds.width), Math.max(12, bounds.height));
    const hitArea = entry.proxy.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    if (hitArea) {
      hitArea.setTo(-entry.proxy.width * 0.5, -entry.proxy.height * 0.5, entry.proxy.width, entry.proxy.height);
    }

    entry.label
      .setText(this.labelText(snapshot))
      .setPosition(bounds.right + entry.options.labelOffsetX, bounds.top + entry.options.labelOffsetY)
      .setColor(selected ? "#fff2a8" : "#dff8ff")
      .setVisible(this.labelsVisible);

    if (!this.boundsVisible) {
      return;
    }

    this.boundsGraphics.lineStyle(selected ? 3 : 1, selected ? 0xffe15c : 0x7fe7ff, selected ? 0.95 : 0.58);
    this.boundsGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    if (selected) {
      this.boundsGraphics.fillStyle(0xffe15c, 0.12);
      this.boundsGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  private renderGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.setVisible(this.gridVisible);
    if (!this.gridVisible) {
      return;
    }

    const width = Number(this.scene.scale.gameSize.width || this.scene.scale.width);
    const height = Number(this.scene.scale.gameSize.height || this.scene.scale.height);
    const gridSize = Math.max(4, this.options.gridSize);

    this.gridGraphics.lineStyle(1, 0x9bdfff, 0.18);
    for (let x = 0; x <= width; x += gridSize) {
      this.gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.gridGraphics.lineBetween(0, y, width, y);
    }

    this.gridGraphics.lineStyle(2, 0xffe15c, 0.36);
    this.gridGraphics.lineBetween(width / 2, 0, width / 2, height);
    this.gridGraphics.lineBetween(0, height / 2, width, height / 2);
  }

  private snapshotFor(entry: DebugEntry): DebugPositionSnapshot {
    const object = entry.object;
    return {
      name: entry.name,
      x: this.roundNumber(object.x ?? 0, 1),
      y: this.roundNumber(object.y ?? 0, 1),
      scaleX: this.roundNumber(object.scaleX ?? 1, 3),
      scaleY: this.roundNumber(object.scaleY ?? 1, 3),
      angle: this.roundNumber(object.angle ?? 0, 2),
      depth: Math.round(object.depth ?? 0),
      alpha: this.roundNumber(object.alpha ?? 1, 2),
      visible: object.visible ?? true
    };
  }

  private exportFor(entry: DebugEntry): Omit<DebugPositionSnapshot, "name"> {
    const { name: _name, ...data } = this.snapshotFor(entry);
    return data;
  }

  private boundsFor(gameObject: DebuggableObject): Phaser.Geom.Rectangle {
    if (typeof gameObject.getBounds === "function") {
      return gameObject.getBounds();
    }

    return new Phaser.Geom.Rectangle(gameObject.x ?? 0, gameObject.y ?? 0, 1, 1);
  }

  private labelText(snapshot: DebugPositionSnapshot): string {
    return [
      snapshot.name,
      `x: ${snapshot.x} y: ${snapshot.y}`,
      `scale: ${snapshot.scaleX}, ${snapshot.scaleY}`,
      `angle: ${snapshot.angle} depth: ${snapshot.depth}`,
      `alpha: ${snapshot.alpha} visible: ${snapshot.visible}`
    ].join("\n");
  }

  private moveObject(object: DebuggableObject, deltaX: number, deltaY: number): void {
    if (typeof object.x === "number") {
      object.x += deltaX;
    }
    if (typeof object.y === "number") {
      object.y += deltaY;
    }
  }

  private rotateObject(object: DebuggableObject, deltaAngle: number): void {
    object.angle = (object.angle ?? 0) + deltaAngle;
  }

  private applyScaleHotkey(object: DebuggableObject, event: KeyboardEvent, direction: 1 | -1): void {
    const amount = this.scaleAmount(event) * direction;
    if (event.altKey) {
      this.adjustObjectScale(object, "x", amount);
      return;
    }

    this.adjustObjectScale(object, "uniform", amount);
  }

  private scaleAmount(event: KeyboardEvent): number {
    if (event.metaKey || event.ctrlKey) {
      return 0.01;
    }
    if (event.altKey) {
      return 0.05;
    }
    return event.shiftKey ? 0.1 : 0.05;
  }

  private rotationAmount(event: KeyboardEvent, direction: 1 | -1): number {
    const amount = event.metaKey || event.ctrlKey ? 0.1 : event.shiftKey ? 5 : 1;
    return amount * direction;
  }

  private adjustObjectScale(object: DebuggableObject, axis: "uniform" | "x" | "y", amount: number): void {
    const nextScaleX = Phaser.Math.Clamp((object.scaleX ?? 1) + amount, 0.05, Number.MAX_SAFE_INTEGER);
    const nextScaleY = Phaser.Math.Clamp((object.scaleY ?? 1) + amount, 0.05, Number.MAX_SAFE_INTEGER);

    if (axis === "uniform" || axis === "x") {
      object.scaleX = nextScaleX;
    }
    if (axis === "uniform" || axis === "y") {
      object.scaleY = nextScaleY;
    }
  }

  private setObjectAlpha(object: DebuggableObject, deltaAlpha: number): void {
    object.alpha = Phaser.Math.Clamp((object.alpha ?? 1) + deltaAlpha, 0, 1);
  }

  private adjustObjectDepth(object: DebuggableObject, deltaDepth: number): void {
    object.depth = Math.round((object.depth ?? 0) + deltaDepth);
  }

  private toggleObjectVisibility(object: DebuggableObject): void {
    object.visible = !(object.visible ?? true);
  }

  private snapPoint(x: number, y: number): { x: number; y: number } {
    const gridSize = Math.max(1, this.options.gridSize);
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }

  private logObject(gameObject: DebuggableObject): void {
    const entry = this.entries.get(gameObject);
    if (!entry) {
      return;
    }
    this.logEntry(entry);
  }

  private logEntry(entry: DebugEntry): void {
    console.info(JSON.stringify(this.snapshotFor(entry), null, 2));
  }

  private logAllObjects(): void {
    const output: Record<string, Omit<DebugPositionSnapshot, "name">> = {};
    this.entries.forEach((entry) => {
      output[entry.name] = this.exportFor(entry);
    });
    console.info(JSON.stringify(output, null, 2));
  }

  private roundNumber(value: number, decimals: number): number {
    return Number(value.toFixed(decimals));
  }

  private setDebugScrollFactor(gameObject: Phaser.GameObjects.GameObject): void {
    const scrollable = gameObject as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor;
    if (typeof scrollable.setScrollFactor === "function") {
      scrollable.setScrollFactor(this.options.scrollFactor);
    }
  }
}
