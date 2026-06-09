<template>
  <div class="flow-container" @keydown="onGlobalKeyDown" tabindex="0" ref="flowContainerRef">
    <div class="sidebar" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
      <div class="sidebar-content" v-show="!isSidebarCollapsed">
        <h3>工具栏 (拖拽入画布)</h3>
        <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'rect')">矩形节点</div>
        <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'circle')">圆形节点</div>
        <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'diamond')">菱形节点</div>
        <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'image')">图片节点</div>
        <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'video')">视频节点</div>

        <hr />

        <h3>连线风格切换</h3>
        <div class="line-type-selector">
          <button
            :class="{ 'active-line-type': state.currentLineType === 'bezier' }"
            @click="changeGlobalLineType('bezier')"
          >
            ∽ 全局曲线
          </button>
          <button
            :class="{ 'active-line-type': state.currentLineType === 'polyline' }"
            @click="changeGlobalLineType('polyline')"
          >
            ┌ 全局折线
          </button>
        </div>

        <hr />

        <h3>操作</h3>
        <div class="btn-group">
          <button @click="undo" :disabled="state.undoStack.length === 0">撤销 (Undo)</button>
          <button @click="redo" :disabled="state.redoStack.length === 0">重做 (Redo)</button>
          <button @click="makeGroup" :disabled="!canGroup">组合选中</button>
          <button @click="unGroup" :disabled="!canUnGroup">解绑组合</button>

          <button
            class="sidebar-delete-line-btn"
            :disabled="!state.selectedLineId"
            @click="deleteSelectedLine"
          >
            🗑️ 删除选中连线
          </button>
        </div>

        <div class="tips">
          <p>💡 <b>组合交互说明:</b></p>
          <p>1. <b>多选方式：</b> 按住 <b>Shift 键</b> 依次点击节点，或在画布空白区域 <b>拖拽框选</b> 多个节点。</p>
          <p>2. <b>组合移动：</b> 组合后的节点，拖拽其中任意一个，整组节点都会同步联动移动。</p>
          <p>3. <b>智能解绑：</b> 解绑只会作用于当前选中节点所归属的对应组合，避免一次性误拆其他不相关的组合。</p>
          <p>4. <b>智能连线：</b> 从节点圆点拖拽连线时，系统会根据两节点相对位置自动选择最佳连接方向，移动节点时连线方向也会自动更新。</p>
        </div>
      </div>

      <div class="sidebar-toggle-btn" @click="toggleSidebar">
        {{ isSidebarCollapsed ? '▶' : '◀' }}
      </div>
    </div>

    <div class="canvas-area" ref="canvasAreaRef" @dragover.prevent @drop="onDrop">
      <canvas
        ref="canvasRef"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @dblclick="onDoubleClick"
      ></canvas>

      <div v-if="editPanel.visible" class="edit-panel-right">
        <div class="panel-header">
          <h4>属性配置 ({{ editPanel.targetCategory === 'node' ? '节点' : '连线' }})</h4>
          <span class="close-btn" @click="editPanel.visible = false">×</span>
        </div>

        <div class="panel-row">
          <label>名称:</label>
          <input
            v-model="editPanel.name"
            placeholder="请输入名称"
            @input="onInputChange"
            @keydown.enter="editPanel.visible = false"
          />
        </div>

        <div class="panel-row" v-if="editPanel.targetCategory === 'line'">
          <label>连线类型:</label>
          <select v-model="editPanel.lineType" @change="onInputChange">
            <option value="bezier">贝塞尔曲线</option>
            <option value="polyline">直角折线</option>
          </select>

          <button class="delete-line-btn" @click="deleteCurrentLine">
            🗑️ 删除当前连线
          </button>
        </div>

        <div
          class="panel-row"
          v-if="editPanel.targetCategory === 'node' && (editPanel.nodeType === 'image' || editPanel.nodeType === 'video')"
        >
          <label>{{ editPanel.nodeType === 'image' ? '图片 URL' : '视频 URL' }}:</label>
          <input
            v-model="editPanel.resUrl"
            placeholder="请输入资源网络地址 URL"
            @input="onInputChange"
            @keydown.enter="editPanel.visible = false"
          />

          <div class="switch-row">
            <input
              type="checkbox"
              id="show-original-size"
              v-model="editPanel.showOriginalSize"
              @change="onSwitchChange"
            />
            <label for="show-original-size" class="checkbox-label">展示原尺寸并解锁等比缩放</label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, nextTick, computed } from 'vue';

// ==========================================
// 1. 类型定义与状态
// ==========================================
type NodeType = 'circle' | 'rect' | 'diamond' | 'image' | 'video';
type AnchorDirection = 'top' | 'right' | 'bottom' | 'left';
type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';
type LineType = 'bezier' | 'polyline';

interface FlowNode {
  id: string; type: NodeType; x: number; y: number; width: number; height: number; name: string; resUrl?: string; groupId?: string;
  showOriginalSize?: boolean;
}
interface FlowLine {
  id: string; name: string; fromNodeId: string; fromDirection: AnchorDirection; toNodeId: string; toDirection: AnchorDirection;
  lineType: LineType;
}
interface FlowState {
  nodes: FlowNode[]; lines: FlowLine[]; selectedNodeIds: string[]; selectedLineId: string | null;
  undoStack: string[]; redoStack: string[]; currentLineType: LineType;
}

const state = reactive<FlowState>({
  nodes: [], lines: [], selectedNodeIds: [], selectedLineId: null, undoStack: [], redoStack: [],
  currentLineType: 'bezier'
});

// ==========================================
// 2. 响应式与画布控制
// ==========================================
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasAreaRef = ref<HTMLDivElement | null>(null);
const flowContainerRef = ref<HTMLDivElement | null>(null);
const isSidebarCollapsed = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;

const imageCache: Record<string, HTMLImageElement> = {};
const videoCache: Record<string, HTMLVideoElement> = {};
const originalRatioCache: Record<string, number> = {};

let interactMode: 'none' | 'dragging_nodes' | 'connecting' | 'selecting' | 'resizing_node' = 'none';
let dragStartPos = { x: 0, y: 0 };
let mouseCurrentPos = { x: 0, y: 0 };
let activeLineSource: { nodeId: string } | null = null;
const selectRect = { startX: 0, startY: 0 };

let resizeTargetNode: FlowNode | null = null;
let resizeActiveCorner: ResizeCorner | null = null;
let resizeStartNodeGeo = { x: 0, y: 0, width: 0, height: 0, ratio: 1 };

const hoveredNodeId = ref<string | null>(null);
const hoveredResizeCorner = ref<{ nodeId: string; corner: ResizeCorner } | null>(null);

const editPanel = reactive({
  visible: false, targetCategory: 'node' as 'node' | 'line', targetId: '', nodeType: '' as NodeType, name: '', resUrl: '', showOriginalSize: false,
  lineType: 'bezier' as LineType
});

// ==========================================
// 🎯 优化：组合计算属性判定
// ==========================================

// 能否组合：至少选中两个以上的节点，且它们不属于同一个已存在的组合
const canGroup = computed(() => {
  if (state.selectedNodeIds.length < 2) return false;
  // 获取当前所有选中节点所属的组合列表
  const groups = state.nodes
    .filter(n => state.selectedNodeIds.includes(n.id) && n.groupId)
    .map(n => n.groupId);

  // 如果所有选中的节点都拥有相同的 groupId，说明已经是同一个组，不需要重复组合
  if (groups.length === state.selectedNodeIds.length) {
    const uniqueGroups = new Set(groups);
    if (uniqueGroups.size === 1) return false;
  }
  return true;
});

// 能否解绑：当前选中的节点里，必须至少有一个节点已经拥有 groupId
const canUnGroup = computed(() => {
  if (state.selectedNodeIds.length === 0) return false;
  return state.nodes.some(n => state.selectedNodeIds.includes(n.id) && n.groupId);
});

// ==========================================
// 3. 核心功能及交互函数
// ==========================================
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  nextTick(() => { resizeCanvas(); });
};

const resizeCanvas = () => {
  if (canvasRef.value && canvasAreaRef.value) {
    const canvas = canvasRef.value;
    const container = canvasAreaRef.value;
    if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }
};

const changeGlobalLineType = (type: LineType) => {
  saveHistory();
  state.currentLineType = type;
  state.lines.forEach(line => { line.lineType = type; });
};

const deleteSelectedLine = () => {
  if (!state.selectedLineId) return;
  saveHistory();
  state.lines = state.lines.filter(line => line.id !== state.selectedLineId);
  if (editPanel.visible && editPanel.targetCategory === 'line' && editPanel.targetId === state.selectedLineId) {
    editPanel.visible = false;
  }
  state.selectedLineId = null;
};

const deleteCurrentLine = () => {
  if (editPanel.targetCategory !== 'line' || !editPanel.targetId) return;
  saveHistory();
  state.lines = state.lines.filter(line => line.id !== editPanel.targetId);
  if (state.selectedLineId === editPanel.targetId) state.selectedLineId = null;
  editPanel.visible = false;
};

const onGlobalKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      return;
    }
    if (state.selectedLineId) {
      e.preventDefault();
      deleteSelectedLine();
    }
  }
};

// ==========================================
// 4. 几何核心计算与控制点捕捉
// ==========================================
const getNodeCenter = (node: FlowNode): { x: number; y: number } => {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
};

/**
 * 根据源节点和目标节点的中心位置，自动计算最佳连接方向
 * 返回源节点应使用的方向和目标节点应使用的方向
 */
const getOptimalDirection = (
  sourceNode: FlowNode,
  targetNode: FlowNode
): { fromDir: AnchorDirection; toDir: AnchorDirection } => {
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  let fromDir: AnchorDirection;
  let toDir: AnchorDirection;

  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平方向偏移更大
    if (dx > 0) {
      fromDir = 'right';
      toDir = 'left';
    } else {
      fromDir = 'left';
      toDir = 'right';
    }
  } else {
    // 垂直方向偏移更大
    if (dy > 0) {
      fromDir = 'bottom';
      toDir = 'top';
    } else {
      fromDir = 'top';
      toDir = 'bottom';
    }
  }

  return { fromDir, toDir };
};

/**
 * 更新单条连线的方向，根据当前两个节点的相对位置自动选择最佳方向
 */
const updateSingleLineDirection = (line: FlowLine) => {
  const sourceNode = state.nodes.find(n => n.id === line.fromNodeId);
  const targetNode = state.nodes.find(n => n.id === line.toNodeId);
  if (!sourceNode || !targetNode) return;

  const { fromDir, toDir } = getOptimalDirection(sourceNode, targetNode);
  line.fromDirection = fromDir;
  line.toDirection = toDir;
};

/**
 * 更新所有涉及指定节点列表的连线方向
 */
const updateLinesForNodes = (nodeIds: Set<string>) => {
  if (nodeIds.size === 0) return;

  state.lines.forEach(line => {
    if (nodeIds.has(line.fromNodeId) || nodeIds.has(line.toNodeId)) {
      updateSingleLineDirection(line);
    }
  });
};

const getAnchorPositions = (node: FlowNode): Record<AnchorDirection, { x: number; y: number }> => {
  return {
    top: { x: node.x + node.width / 2, y: node.y },
    right: { x: node.x + node.width, y: node.y + node.height / 2 },
    bottom: { x: node.x + node.width / 2, y: node.y + node.height },
    left: { x: node.x, y: node.y + node.height / 2 }
  };
};

const getResizeCorners = (node: FlowNode): Record<ResizeCorner, { x: number; y: number }> => {
  return {
    tl: { x: node.x, y: node.y },
    tr: { x: node.x + node.width, y: node.y },
    bl: { x: node.x, y: node.y + node.height },
    br: { x: node.x + node.width, y: node.y + node.height }
  };
};

const isPointInNode = (x: number, y: number, node: FlowNode): boolean => {
  if (node.type === 'circle') {
    const cx = node.x + node.width / 2; const cy = node.y + node.height / 2;
    return Math.hypot(x - cx, y - cy) <= (node.width / 2);
  }
  if (node.type === 'diamond') {
    const cx = node.x + node.width / 2; const cy = node.y + node.height / 2;
    const dx = Math.abs(x - cx) / (node.width / 2); const dy = Math.abs(y - cy) / (node.height / 2);
    return (dx + dy) <= 1;
  }
  return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height;
};

const findHoveredAnchor = (x: number, y: number): { nodeId: string; direction: AnchorDirection } | null => {
  const threshold = 14;
  for (const node of state.nodes) {
    const anchors = getAnchorPositions(node);
    for (const [dir, pos] of Object.entries(anchors)) {
      if (Math.hypot(x - pos.x, y - pos.y) < threshold) return { nodeId: node.id, direction: dir as AnchorDirection };
    }
  }
  return null;
};

const findHoveredResizeCorner = (x: number, y: number): { nodeId: string; corner: ResizeCorner } | null => {
  const threshold = 12;
  for (const node of state.nodes) {
    if (node.type !== 'image' && node.type !== 'video') continue;
    if (!node.showOriginalSize) continue;
    if (!node.resUrl || (!imageCache[node.resUrl] && !videoCache[node.resUrl])) continue;

    const corners = getResizeCorners(node);
    for (const [corner, pos] of Object.entries(corners)) {
      if (Math.hypot(x - pos.x, y - pos.y) < threshold) return { nodeId: node.id, corner: corner as ResizeCorner };
    }
  }
  return null;
};

const calculateBezierControlPoints = (startX: number, startY: number, dir: AnchorDirection, endX: number, endY: number, targetDir?: AnchorDirection) => {
  const effTargetDir = targetDir || (dir === 'right' ? 'left' : dir === 'left' ? 'right' : dir === 'top' ? 'bottom' : 'top');
  const cp1x = dir === 'right' ? startX + 40 : dir === 'left' ? startX - 40 : startX;
  const cp1y = dir === 'bottom' ? startY + 40 : dir === 'top' ? startY - 40 : startY;
  const cp2x = effTargetDir === 'right' ? endX + 40 : effTargetDir === 'left' ? endX - 40 : endX;
  const cp2y = effTargetDir === 'bottom' ? endY + 40 : effTargetDir === 'top' ? endY - 40 : endY;
  return { cp1x, cp1y, cp2x, cp2y };
};

const calculatePolylinePoints = (startX: number, startY: number, fromDir: AnchorDirection, endX: number, endY: number, toDir: AnchorDirection) => {
  const points = [{ x: startX, y: startY }];
  const offset = 25;
  const pStart = {
    x: startX + (fromDir === 'right' ? offset : fromDir === 'left' ? -offset : 0),
    y: startY + (fromDir === 'bottom' ? offset : fromDir === 'top' ? -offset : 0)
  };
  const pEnd = {
    x: endX + (toDir === 'right' ? offset : toDir === 'left' ? -offset : 0),
    y: endY + (toDir === 'bottom' ? offset : toDir === 'top' ? -offset : 0)
  };
  points.push(pStart);
  if (fromDir === 'left' || fromDir === 'right') {
    if (toDir === 'left' || toDir === 'right') {
      const midX = (pStart.x + pEnd.x) / 2; points.push({ x: midX, y: pStart.y }, { x: midX, y: pEnd.y });
    } else { points.push({ x: pEnd.x, y: pStart.y }); }
  } else {
    if (toDir === 'top' || toDir === 'bottom') {
      const midY = (pStart.y + pEnd.y) / 2; points.push({ x: pStart.x, y: midY }, { x: pEnd.x, y: midY });
    } else { points.push({ x: pStart.x, y: pEnd.y }); }
  }
  points.push(pEnd, { x: endX, y: endY });
  return points;
};

const isPointNearLine = (x: number, y: number, line: FlowLine): boolean => {
  const fromNode = state.nodes.find(n => n.id === line.fromNodeId);
  const toNode = state.nodes.find(n => n.id === line.toNodeId);
  if (!fromNode || !toNode) return false;

  const start = getAnchorPositions(fromNode)[line.fromDirection];
  const end = getAnchorPositions(toNode)[line.toDirection];
  const threshold = 10;

  if (line.lineType === 'polyline') {
    const pts = calculatePolylinePoints(start.x, start.y, line.fromDirection, end.x, end.y, line.toDirection);
    for (let i = 0; i < pts.length - 1; i++) {
      if (getDistanceToLine(x, y, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y) < threshold) return true;
    }
  } else {
    const { cp1x, cp1y, cp2x, cp2y } = calculateBezierControlPoints(start.x, start.y, line.fromDirection, end.x, end.y, line.toDirection);
    const pts = [start, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, end];
    for (let i = 0; i < pts.length - 1; i++) {
      if (getDistanceToLine(x, y, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y) < threshold) return true;
    }
  }
  return false;
};

const getDistanceToLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
  const A = x - x1; const B = y - y1; const C = x2 - x1; const D = y2 - y1;
  const dot = A * C + B * D; const lenSq = C * C + D * D;
  let param = -1; if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; }
  return Math.hypot(x - xx, y - yy);
};

// ==========================================
// 5. 渲染引擎
// ==========================================
const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color = '#8c939d') => {
  const arrowLength = 10; const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.translate(toX, toY); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-arrowLength, -arrowLength / 1.5); ctx.lineTo(-arrowLength, arrowLength / 1.5); ctx.closePath(); ctx.fill();
  ctx.restore();
};

const draw = () => {
  if (!ctx || !canvasRef.value) return;
  resizeCanvas();

  const canvas = canvasRef.value;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. 网格背景
  ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
  for (let j = 0; j < canvas.height; j += 20) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke(); }

  // 2. 连线层
  state.lines.forEach(line => {
    const fromNode = state.nodes.find(n => n.id === line.fromNodeId);
    const toNode = state.nodes.find(n => n.id === line.toNodeId);
    if (!fromNode || !toNode) return;

    const start = getAnchorPositions(fromNode)[line.fromDirection];
    const end = getAnchorPositions(toNode)[line.toDirection];

    const isLineSelected = state.selectedLineId === line.id;

    ctx!.save(); ctx!.beginPath();
    ctx!.strokeStyle = isLineSelected ? '#409eff' : '#8c939d';
    ctx!.lineWidth = isLineSelected ? 3.5 : 2;

    if (line.lineType === 'polyline') {
      const pts = calculatePolylinePoints(start.x, start.y, line.fromDirection, end.x, end.y, line.toDirection);
      ctx!.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i].x, pts[i].y);
      ctx!.stroke(); ctx!.restore();
      const lastPt = pts[pts.length - 2];
      drawArrow(ctx!, lastPt.x, lastPt.y, end.x, end.y, isLineSelected ? '#409eff' : '#8c939d');
    } else {
      const { cp1x, cp1y, cp2x, cp2y } = calculateBezierControlPoints(start.x, start.y, line.fromDirection, end.x, end.y, line.toDirection);
      ctx!.moveTo(start.x, start.y); ctx!.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y); ctx!.stroke(); ctx!.restore();
      drawArrow(ctx!, cp2x, cp2y, end.x, end.y, isLineSelected ? '#409eff' : '#8c939d');
    }

    ctx!.fillStyle = isLineSelected ? '#409eff' : '#444'; ctx!.font = isLineSelected ? 'bold 11px sans-serif' : '11px sans-serif'; ctx!.textAlign = 'center';
    ctx!.fillText(line.name, (start.x + end.x) / 2, (start.y + end.y) / 2 - 6);
  });

  // 3. 动态拉线预览
  if (interactMode === 'connecting' && activeLineSource) {
    const sourceNode = state.nodes.find(n => n.id === activeLineSource!.nodeId);
    if (sourceNode) {
      // 预览时，临时使用源节点中心和鼠标位置计算方向用于绘制，使预览更友好
      const sourceCenter = getNodeCenter(sourceNode);
      const potentialTargetNode = [...state.nodes].reverse().find(n => n.id !== sourceNode.id && isPointInNode(mouseCurrentPos.x, mouseCurrentPos.y, n));
      let previewFromDir: AnchorDirection = 'right';
      let previewToDir: AnchorDirection = 'left';

      if (potentialTargetNode) {
        const { fromDir, toDir } = getOptimalDirection(sourceNode, potentialTargetNode);
        previewFromDir = fromDir;
        previewToDir = toDir;
      } else {
        // 没有命中目标节点时，根据鼠标相对源节点中心的方向估算
        const dx = mouseCurrentPos.x - sourceCenter.x;
        const dy = mouseCurrentPos.y - sourceCenter.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          previewFromDir = dx > 0 ? 'right' : 'left';
          previewToDir = dx > 0 ? 'left' : 'right';
        } else {
          previewFromDir = dy > 0 ? 'bottom' : 'top';
          previewToDir = dy > 0 ? 'top' : 'bottom';
        }
      }

      const start = getAnchorPositions(sourceNode)[previewFromDir];

      ctx!.save(); ctx!.beginPath(); ctx!.strokeStyle = '#409eff'; ctx!.lineWidth = 2; ctx!.setLineDash([6, 4]);

      if (state.currentLineType === 'polyline') {
        const pts = calculatePolylinePoints(start.x, start.y, previewFromDir, mouseCurrentPos.x, mouseCurrentPos.y, previewToDir);
        ctx!.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i].x, pts[i].y);
        ctx!.stroke(); ctx!.restore();
        const lastPt = pts[pts.length - 2];
        drawArrow(ctx!, lastPt.x, lastPt.y, mouseCurrentPos.x, mouseCurrentPos.y, '#409eff');
      } else {
        const { cp1x, cp1y, cp2x, cp2y } = calculateBezierControlPoints(start.x, start.y, previewFromDir, mouseCurrentPos.x, mouseCurrentPos.y, previewToDir);
        ctx!.moveTo(start.x, start.y); ctx!.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, mouseCurrentPos.x, mouseCurrentPos.y); ctx!.stroke(); ctx!.restore();
        drawArrow(ctx!, cp2x, cp2y, mouseCurrentPos.x, mouseCurrentPos.y, '#409eff');
      }
    }
  }

  // 4. 节点层
  state.nodes.forEach(node => {
    const isSelected = state.selectedNodeIds.includes(node.id);
    const isHovered = hoveredNodeId.value === node.id;

    ctx!.save();
    ctx!.strokeStyle = isSelected ? '#409eff' : (isHovered ? '#66b1ff' : '#333');
    ctx!.lineWidth = isSelected ? 3 : 2;
    ctx!.fillStyle = '#ffffff';

    if (node.type === 'rect') {
      ctx!.beginPath(); ctx!.rect(node.x, node.y, node.width, node.height); ctx!.fill(); ctx!.stroke();
    } else if (node.type === 'circle') {
      ctx!.beginPath(); ctx!.arc(node.x + node.width / 2, node.y + node.height / 2, node.width / 2, 0, Math.PI * 2); ctx!.fill(); ctx!.stroke();
    } else if (node.type === 'diamond') {
      ctx!.beginPath(); ctx!.moveTo(node.x + node.width / 2, node.y); ctx!.lineTo(node.x + node.width, node.y + node.height / 2); ctx!.lineTo(node.x + node.width / 2, node.y + node.height); ctx!.lineTo(node.x, node.y + node.height / 2); ctx!.closePath(); ctx!.fill(); ctx!.stroke();
    } else if (node.type === 'image') {
      if (node.resUrl && imageCache[node.resUrl]) {
        try { ctx!.drawImage(imageCache[node.resUrl], node.x, node.y, node.width, node.height); } catch (e) { ctx!.fillStyle = '#fee0e0'; ctx!.fillRect(node.x, node.y, node.width, node.height); }
      } else {
        ctx!.fillStyle = '#f4f4f5'; ctx!.fillRect(node.x, node.y, node.width, node.height);
        ctx!.fillStyle = '#909399'; ctx!.font = '12px sans-serif'; ctx!.textAlign = 'center'; ctx!.fillText('🖼️ 待配置图片', node.x + node.width / 2, node.y + node.height / 2 - 10);
      }
      ctx!.strokeRect(node.x, node.y, node.width, node.height);
    } else if (node.type === 'video') {
      if (node.resUrl && videoCache[node.resUrl]) {
        try { ctx!.drawImage(videoCache[node.resUrl], node.x, node.y, node.width, node.height); } catch (e) { ctx!.fillStyle = '#fdf6ec'; ctx!.fillRect(node.x, node.y, node.width, node.height); }
      } else {
        ctx!.fillStyle = '#f4f4f5'; ctx!.fillRect(node.x, node.y, node.width, node.height);
        ctx!.fillStyle = '#e6a23c'; ctx!.font = '12px sans-serif'; ctx!.textAlign = 'center'; ctx!.fillText('📹 待配置视频', node.x + node.width / 2, node.y + node.height / 2 - 10);
      }
      ctx!.strokeRect(node.x, node.y, node.width, node.height);
    }

    ctx!.fillStyle = (node.type === 'image' || node.type === 'video') && node.resUrl ? '#fff' : '#333';
    if ((node.type === 'image' || node.type === 'video') && node.resUrl) {
      ctx!.fillStyle = 'rgba(0,0,0,0.5)'; ctx!.fillRect(node.x, node.y + node.height - 22, node.width, 22); ctx!.fillStyle = '#fff';
    }
    ctx!.font = '13px sans-serif'; ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle';
    ctx!.fillText(node.name, node.x + node.width / 2, node.type === 'image' || node.type === 'video' ? node.y + node.height - 11 : node.y + node.height / 2);

    if (isHovered || isSelected || interactMode === 'connecting') {
      const anchors = getAnchorPositions(node); ctx!.fillStyle = '#67c23a';
      for (const pos of Object.values(anchors)) { ctx!.beginPath(); ctx!.arc(pos.x, pos.y, 6, 0, Math.PI * 2); ctx!.fill(); }
    }

    if ((node.type === 'image' || node.type === 'video') && node.showOriginalSize && node.resUrl && (imageCache[node.resUrl] || videoCache[node.resUrl])) {
      if (isHovered || isSelected) {
        const corners = getResizeCorners(node); ctx!.fillStyle = '#409eff'; ctx!.strokeStyle = '#ffffff'; ctx!.lineWidth = 1.5;
        for (const pos of Object.values(corners)) { ctx!.beginPath(); ctx!.rect(pos.x - 4, pos.y - 4, 8, 8); ctx!.fill(); ctx!.stroke(); }
      }
    }

    if (node.groupId) {
      ctx!.fillStyle = '#e6a23c'; ctx!.font = '10px sans-serif';
      ctx!.fillText(`组`, node.x + 10, node.y - 8);
    }
    ctx!.restore();
  });

  // 5. 框选框层
  if (interactMode === 'selecting') {
    ctx.save(); ctx.strokeStyle = 'rgba(64, 158, 255, 0.8)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(64, 158, 255, 0.1)';
    const w = mouseCurrentPos.x - selectRect.startX; const h = mouseCurrentPos.y - selectRect.startY;
    ctx.fillRect(selectRect.startX, selectRect.startY, w, h); ctx.setLineDash([4, 3]); ctx.strokeRect(selectRect.startX, selectRect.startY, w, h);
    ctx.restore();
  }

  // 6. 组合外包围盒
  if (state.selectedNodeIds.length > 0 && interactMode !== 'selecting') {
    const selectedNodes = state.nodes.filter(n => state.selectedNodeIds.includes(n.id));
    if (selectedNodes.length > 0) {
      let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
      selectedNodes.forEach(n => {
        if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
        if (n.x + n.width > maxX) maxX = n.x + n.width; if (n.y + n.height > maxY) maxY = n.y + n.height;
      });
      const padding = 8;
      ctx.save(); ctx.strokeStyle = '#e6a23c'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.strokeRect(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);
      ctx.restore();
    }
  }

  animationFrameId = requestAnimationFrame(draw);
};

// ==========================================
// 6. 交互驱动与事件层
// ==========================================
const onDragStart = (e: DragEvent, type: NodeType) => { e.dataTransfer?.setData('nodeType', type); };

const onDrop = (e: DragEvent) => {
  if (!canvasRef.value) return;
  saveHistory();
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left; const y = e.clientY - rect.top;
  const type = (e.dataTransfer?.getData('nodeType') as NodeType) || 'rect';
  const size = type === 'circle' ? 80 : 100;
  state.nodes.push({
    id: 'node_' + Date.now(), type, x: x - size / 2, y: y - (type === 'circle' ? size / 2 : 30), width: size, height: type === 'circle' ? size : 60, name: `新${type}节点`, resUrl: '', showOriginalSize: false
  });
};

const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0 || !canvasRef.value) return;

  flowContainerRef.value?.focus();

  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
  dragStartPos = { x: mouseX, y: mouseY }; mouseCurrentPos = { x: mouseX, y: mouseY };

  const cornerHit = findHoveredResizeCorner(mouseX, mouseY);
  if (cornerHit) {
    const targetNode = state.nodes.find(n => n.id === cornerHit.nodeId);
    if (targetNode) {
      saveHistory(); interactMode = 'resizing_node'; resizeTargetNode = targetNode; resizeActiveCorner = cornerHit.corner;
      resizeStartNodeGeo = { x: targetNode.x, y: targetNode.y, width: targetNode.width, height: targetNode.height, ratio: targetNode.width / targetNode.height };
      return;
    }
  }

  // 优先检查是否点击锚点 - 用于开始连接
  const anchorHit = findHoveredAnchor(mouseX, mouseY);
  if (anchorHit) {
    interactMode = 'connecting';
    activeLineSource = { nodeId: anchorHit.nodeId };
    return;
  }

  const clickedNode = [...state.nodes].reverse().find(n => isPointInNode(mouseX, mouseY, n));
  if (clickedNode) {
    interactMode = 'dragging_nodes';
    state.selectedLineId = null;

    if (e.shiftKey) {
      // Shift 键多选
      if (state.selectedNodeIds.includes(clickedNode.id)) {
        // 如果点击的已经是选中的节点
        if (clickedNode.groupId) {
          // 解除选中整个组
          const groupIds = state.nodes.filter(n => n.groupId === clickedNode.groupId).map(n => n.id);
          state.selectedNodeIds = state.selectedNodeIds.filter(id => !groupIds.includes(id));
        } else {
          state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== clickedNode.id);
        }
      } else {
        // 选中组内所有节点
        if (clickedNode.groupId) {
          const groupIds = state.nodes.filter(n => n.groupId === clickedNode.groupId).map(n => n.id);
          groupIds.forEach(id => { if (!state.selectedNodeIds.includes(id)) state.selectedNodeIds.push(id); });
        } else {
          state.selectedNodeIds.push(clickedNode.id);
        }
      }
    } else {
      // 普通左键单击：如果点击的节点已经在已选中列表中，则不要强行清空其他，以便支持多选后的整体拖拽。
      if (!state.selectedNodeIds.includes(clickedNode.id)) {
        state.selectedNodeIds = clickedNode.groupId
          ? state.nodes.filter(n => n.groupId === clickedNode.groupId).map(n => n.id)
          : [clickedNode.id];
      }
    }
    return;
  }

  // 单击连线的命中判定
  let hitLine = false;
  for (const line of state.lines) {
    if (isPointNearLine(mouseX, mouseY, line)) {
      state.selectedLineId = line.id;
      state.selectedNodeIds = [];
      editPanel.visible = false;
      hitLine = true;
      break;
    }
  }

  if (!hitLine) {
    interactMode = 'selecting'; selectRect.startX = mouseX; selectRect.startY = mouseY;
    state.selectedNodeIds = [];
    state.selectedLineId = null;
    editPanel.visible = false;
  }
};

const onMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
  const deltaX = mouseX - mouseCurrentPos.x; const deltaY = mouseY - mouseCurrentPos.y;
  mouseCurrentPos = { x: mouseX, y: mouseY };

  const foundHover = [...state.nodes].reverse().find(n => isPointInNode(mouseX, mouseY, n));
  hoveredNodeId.value = foundHover ? foundHover.id : null;

  const foundCorner = findHoveredResizeCorner(mouseX, mouseY);
  hoveredResizeCorner.value = foundCorner;

  if (foundCorner) {
    canvasRef.value.style.cursor = (foundCorner.corner === 'tl' || foundCorner.corner === 'br') ? 'nwse-resize' : 'nesw-resize';
  } else {
    canvasRef.value.style.cursor = foundHover ? 'move' : 'default';
  }

  // 1. 等比缩放节点
  if (interactMode === 'resizing_node' && resizeTargetNode && resizeActiveCorner) {
    const startGeo = resizeStartNodeGeo; let newWidth = startGeo.width; let newHeight = startGeo.height;
    if (resizeActiveCorner === 'br') {
      newWidth = Math.max(30, startGeo.width + (mouseX - dragStartPos.x)); newHeight = newWidth / startGeo.ratio;
    } else if (resizeActiveCorner === 'bl') {
      newWidth = Math.max(30, startGeo.width - (mouseX - dragStartPos.x)); newHeight = newWidth / startGeo.ratio; resizeTargetNode.x = startGeo.x + (startGeo.width - newWidth);
    } else if (resizeActiveCorner === 'tr') {
      newWidth = Math.max(30, startGeo.width + (mouseX - dragStartPos.x)); newHeight = newWidth / startGeo.ratio; resizeTargetNode.y = startGeo.y + (startGeo.height - newHeight);
    } else if (resizeActiveCorner === 'tl') {
      newWidth = Math.max(30, startGeo.width - (mouseX - dragStartPos.x)); newHeight = newWidth / startGeo.ratio; resizeTargetNode.x = startGeo.x + (startGeo.width - newWidth); resizeTargetNode.y = startGeo.y + (startGeo.height - newHeight);
    }
    resizeTargetNode.width = newWidth; resizeTargetNode.height = newHeight;
    // 缩放时也需要更新相关连线方向
    if (resizeTargetNode) {
      updateLinesForNodes(new Set([resizeTargetNode.id]));
    }
    return;
  }

  // 🎯 核心联动：拖动节点，并实时更新连线方向
  if (interactMode === 'dragging_nodes' && state.selectedNodeIds.length > 0) {
    // 记录所有实际被移动的节点ID（包括联动组成员）
    const movedNodeIds = new Set<string>();

    // 寻找已经处于选中状态节点中的所有 groupId
    const activeGroupIds = new Set<string>();
    state.nodes.forEach(n => {
      if (state.selectedNodeIds.includes(n.id) && n.groupId) {
        activeGroupIds.add(n.groupId);
      }
    });

    // 联动逻辑：确保整个组内的所有其他没有直接被选中的节点，也强制同步联动移动
    state.nodes.forEach(node => {
      const isDirectlySelected = state.selectedNodeIds.includes(node.id);
      const isInAssociatedGroup = node.groupId && activeGroupIds.has(node.groupId);

      if (isDirectlySelected || isInAssociatedGroup) {
        node.x += deltaX;
        node.y += deltaY;
        movedNodeIds.add(node.id);
      }
    });

    // 实时更新所有涉及已移动节点的连线方向
    if (movedNodeIds.size > 0) {
      updateLinesForNodes(movedNodeIds);
    }
  }
};

const onMouseUp = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;

  if (interactMode === 'connecting' && activeLineSource) {
    // 获取起点节点和终点节点（鼠标悬停的节点）
    const sourceNode = state.nodes.find(n => n.id === activeLineSource!.nodeId);
    const targetNode = [...state.nodes].reverse().find(n => n.id !== sourceNode?.id && isPointInNode(mouseX, mouseY, n));

    if (sourceNode && targetNode) {
      // 检查是否已存在相同节点间的连线（避免重复）
      const isDuplicate = state.lines.some(line =>
        (line.fromNodeId === sourceNode.id && line.toNodeId === targetNode.id) ||
        (line.fromNodeId === targetNode.id && line.toNodeId === sourceNode.id)
      );

      if (!isDuplicate) {
        saveHistory();
        // 智能计算最佳连接方向
        const { fromDir, toDir } = getOptimalDirection(sourceNode, targetNode);

        state.lines.push({
          id: 'line_' + Date.now(),
          name: '新连线',
          fromNodeId: sourceNode.id,
          fromDirection: fromDir,
          toNodeId: targetNode.id,
          toDirection: toDir,
          lineType: state.currentLineType
        });
      }
    }
  }

  if (interactMode === 'selecting') {
    const xMin = Math.min(selectRect.startX, mouseX); const xMax = Math.max(selectRect.startX, mouseX);
    const yMin = Math.min(selectRect.startY, mouseY); const yMax = Math.max(selectRect.startY, mouseY);
    if (xMax - xMin > 3 || yMax - yMin > 3) {
      const boxedIds = state.nodes.filter(n => n.x >= xMin && n.x + n.width <= xMax && n.y >= yMin && n.y + n.height <= yMax).map(n => n.id);
      const finalSelectedIds: string[] = [];
      boxedIds.forEach(id => {
        const node = state.nodes.find(n => n.id === id);
        if (node?.groupId) {
          // 框选到组内任意一个，则将全组节点均视为选中
          state.nodes.filter(n => n.groupId === node.groupId).forEach(n => { if (!finalSelectedIds.includes(n.id)) finalSelectedIds.push(n.id); });
        } else if (node) { if (!finalSelectedIds.includes(node.id)) finalSelectedIds.push(node.id); }
      });
      state.selectedNodeIds = finalSelectedIds;
    }
  }

  // 拖拽结束后保存历史（如果发生了移动）
  if (interactMode === 'dragging_nodes' && (dragStartPos.x !== mouseX || dragStartPos.y !== mouseY)) {
    saveHistory();
  }

  interactMode = 'none'; activeLineSource = null; resizeTargetNode = null; resizeActiveCorner = null;
};

const onDoubleClick = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
  const clickedNode = [...state.nodes].reverse().find(n => isPointInNode(mouseX, mouseY, n));

  if (clickedNode) {
    editPanel.targetCategory = 'node'; editPanel.nodeType = clickedNode.type; editPanel.targetId = clickedNode.id;
    editPanel.name = clickedNode.name; editPanel.resUrl = clickedNode.resUrl || ''; editPanel.showOriginalSize = !!clickedNode.showOriginalSize;
    editPanel.visible = true; return;
  }

  for (const line of state.lines) {
    if (isPointNearLine(mouseX, mouseY, line)) {
      state.selectedLineId = line.id;
      editPanel.targetCategory = 'line'; editPanel.targetId = line.id; editPanel.name = line.name; editPanel.lineType = line.lineType || 'bezier';
      editPanel.visible = true; return;
    }
  }
};

const onInputChange = () => {
  if (editPanel.targetCategory === 'node') {
    const node = state.nodes.find(n => n.id === editPanel.targetId);
    if (node) {
      node.name = editPanel.name; node.resUrl = editPanel.resUrl;
      if (node.resUrl) preloadResource(node.resUrl, node.type);
    }
  } else {
    const line = state.lines.find(l => l.id === editPanel.targetId);
    if (line) { line.name = editPanel.name; line.lineType = editPanel.lineType; }
  }
};

const onSwitchChange = () => {
  if (editPanel.targetCategory !== 'node') return;
  saveHistory();
  const node = state.nodes.find(n => n.id === editPanel.targetId);
  if (!node) return;
  node.showOriginalSize = editPanel.showOriginalSize;
  if (node.showOriginalSize && node.resUrl) {
    const ratio = originalRatioCache[node.resUrl];
    if (ratio) node.height = node.width / ratio;
  }
  // 尺寸变化后更新相关连线方向
  if (node) {
    updateLinesForNodes(new Set([node.id]));
  }
};

// ==========================================
// 🎯 优化：智能组合算法设计 (解决问题 2)
// ==========================================
const makeGroup = () => {
  if (state.selectedNodeIds.length < 2) return;
  saveHistory();

  const newGroupId = 'group_' + Date.now();

  // 核心逻辑：找出选中节点中，原先已经属于哪些旧组合
  const oldGroupIds = new Set<string>();
  state.nodes.forEach(node => {
    if (state.selectedNodeIds.includes(node.id) && node.groupId) {
      oldGroupIds.add(node.groupId);
    }
  });

  // 合并吸收：遍历整张画布，将原旧组中所有的成员全部归并为同一个全新的大组合
  // 这样既避免了旧组合关系被暴力割裂，又可以把两个之前已经组好的一套节点融合起来
  state.nodes.forEach(node => {
    const isDirectlySelected = state.selectedNodeIds.includes(node.id);
    const wasInAnOldGroup = node.groupId && oldGroupIds.has(node.groupId);

    if (isDirectlySelected || wasInAnOldGroup) {
      node.groupId = newGroupId;
      // 同时将其加入选中态，提供平滑视觉反馈
      if (!state.selectedNodeIds.includes(node.id)) {
        state.selectedNodeIds.push(node.id);
      }
    }
  });
};

// ==========================================
// 🎯 优化：智能定向解绑 (解决问题 1, 3, 5)
// ==========================================
const unGroup = () => {
  if (state.selectedNodeIds.length === 0) return;
  saveHistory();

  // 找出选中节点中，所有正在绑定的 groupId
  const targetGroupIds = new Set<string>();
  state.nodes.forEach(node => {
    if (state.selectedNodeIds.includes(node.id) && node.groupId) {
      targetGroupIds.add(node.groupId);
    }
  });

  if (targetGroupIds.size === 0) return;

  // 精准拆散：只解绑当前选中的这些节点直接关联的具体组合，不会把未选中的无关组合强行拆散
  state.nodes.forEach(node => {
    if (node.groupId && targetGroupIds.has(node.groupId)) {
      node.groupId = undefined;
    }
  });
};

const preloadResource = (url: string, type: NodeType) => {
  if (!url || url.trim() === '') return;
  if (type === 'image') {
    if (imageCache[url]) return;
    const img = new Image(); img.src = url; img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache[url] = img; originalRatioCache[url] = img.naturalWidth / img.naturalHeight;
      state.nodes.forEach(n => { if (n.resUrl === url && n.showOriginalSize) { n.height = n.width / originalRatioCache[url]; } });
      // 图片加载后，如果节点显示原始尺寸发生了变化，更新连线方向
      state.nodes.forEach(n => { if (n.resUrl === url) updateLinesForNodes(new Set([n.id])); });
    };
  } else if (type === 'video') {
    if (videoCache[url]) return;
    const video = document.createElement('video'); video.src = url; video.muted = true; video.loop = true; video.crossOrigin = 'anonymous'; video.playsInline = true;
    video.oncanplaythrough = () => {
      videoCache[url] = video; originalRatioCache[url] = video.videoWidth / video.videoHeight;
      state.nodes.forEach(n => { if (n.resUrl === url && n.showOriginalSize) { n.height = n.width / originalRatioCache[url]; } });
      state.nodes.forEach(n => { if (n.resUrl === url) updateLinesForNodes(new Set([n.id])); });
      video.play().catch(err => console.warn(err));
    };
  }
};

const saveHistory = () => {
  state.undoStack.push(JSON.stringify({
    nodes: state.nodes,
    lines: state.lines,
    selectedNodeIds: state.selectedNodeIds,
    selectedLineId: state.selectedLineId
  }));
  state.redoStack = [];
};

const undo = () => {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(JSON.stringify({
    nodes: state.nodes,
    lines: state.lines,
    selectedNodeIds: state.selectedNodeIds,
    selectedLineId: state.selectedLineId
  }));
  const data = JSON.parse(state.undoStack.pop()!);
  state.nodes = data.nodes;
  state.lines = data.lines;
  state.selectedNodeIds = data.selectedNodeIds;
  state.selectedLineId = data.selectedLineId;
  state.nodes.forEach(n => { if (n.resUrl) preloadResource(n.resUrl, n.type); });
};

const redo = () => {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(JSON.stringify({
    nodes: state.nodes,
    lines: state.lines,
    selectedNodeIds: state.selectedNodeIds,
    selectedLineId: state.selectedLineId
  }));
  const data = JSON.parse(state.redoStack.pop()!);
  state.nodes = data.nodes;
  state.lines = data.lines;
  state.selectedNodeIds = data.selectedNodeIds;
  state.selectedLineId = data.selectedLineId;
  state.nodes.forEach(n => { if (n.resUrl) preloadResource(n.resUrl, n.type); });
};

onMounted(() => {
  if (canvasRef.value && canvasAreaRef.value) {
    ctx = canvasRef.value.getContext('2d'); resizeCanvas();
    window.addEventListener('resize', resizeCanvas); draw();
    flowContainerRef.value?.focus();
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', resizeCanvas);
  Object.values(videoCache).forEach(video => { video.pause(); video.src = ''; video.load(); });
});
</script>

<style scoped>
.flow-container { display: flex; width: 100vw; height: 100vh; font-family: sans-serif; overflow: hidden; position: relative; outline: none; }
.sidebar {
  position: relative; width: 260px; background-color: #fcfcfc; border-right: 1px solid #e0e0e0; padding: 15px;
  display: flex; flex-direction: column; box-sizing: border-box;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), padding 0.3s ease; z-index: 10;
}
.sidebar-collapsed { width: 0px; padding: 0px; border-right: none; }
.sidebar-content { width: 230px; display: flex; flex-direction: column; height: 100%; }
.sidebar-toggle-btn {
  position: absolute; top: 50%; right: -14px; transform: translateY(-50%); width: 14px; height: 50px;
  background-color: #fff; border: 1px solid #e0e0e0; border-left: none; border-radius: 0 4px 4px 0;
  cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #909399; box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}
.sidebar-toggle-btn:hover { background-color: #409eff; color: #fff; }

.node-item { background-color: #fff; border: 1px dashed #409eff; border-radius: 4px; padding: 10px; margin-bottom: 12px; cursor: grab; text-align: center; user-select: none; }
.node-item:hover { background-color: #ecf5ff; }

.line-type-selector { display: flex; gap: 8px; margin-bottom: 12px; }
.line-type-selector button {
  flex: 1; padding: 8px 4px; font-size: 12px; cursor: pointer; background-color: #fff; border: 1px solid #dcdfe6; border-radius: 4px; transition: all 0.2s;
}
.line-type-selector button:hover { color: #409eff; border-color: #c6e2ff; background-color: #ecf5ff; }
.line-type-selector .active-line-type { background-color: #409eff !important; color: #fff !important; border-color: #409eff !important; font-weight: bold; }

.btn-group button { display: block; width: 100%; margin-bottom: 8px; padding: 8px; cursor: pointer; background-color: #fff; border: 1px solid #dcdfe6; border-radius: 4px; }
.btn-group button:hover { color: #409eff; border-color: #c6e2ff; background-color: #ecf5ff; }
.btn-group button:disabled { color: #c0c4cc; cursor: not-allowed; border-color: #ebeef5; }

.sidebar-delete-line-btn { border: 1px solid #f56c6c !important; color: #f56c6c; font-weight: bold; }
.sidebar-delete-line-btn:hover { background-color: #fef0f0 !important; color: #f56c6c !important; }
.sidebar-delete-line-btn:disabled { color: #c0c4cc !important; border-color: #ebeef5 !important; background-color: #fff !important; cursor: not-allowed; }

.tips { margin-top: auto; font-size: 12px; color: #666; line-height: 1.6; }

.canvas-area { flex: 1; position: relative; background-color: #fafafa; height: 100%; overflow: hidden; }
canvas { display: block; width: 100%; height: 100%; }

.edit-panel-right {
  position: absolute; top: 20px; right: 20px; width: 290px; background-color: rgba(255, 255, 255, 0.96);
  border: 1px solid #e4e7ed; border-radius: 8px; padding: 16px; box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100; box-sizing: border-box; backdrop-filter: blur(5px); animation: slideIn 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}
@keyframes slideIn { from { transform: translateX(15px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f0f2f5; padding-bottom: 6px; }
.panel-header h4 { margin: 0; color: #303133; font-size: 14px; }
.close-btn { cursor: pointer; color: #909399; font-size: 18px; line-height: 1; }
.close-btn:hover { color: #f56c6c; }

.panel-row { display: flex; flex-direction: column; margin-bottom: 12px; }
.panel-row label { font-size: 12px; color: #606266; margin-bottom: 5px; font-weight: bold; }
.panel-row input, .panel-row select { height: 32px; border: 1px solid #dcdfe6; border-radius: 4px; padding: 0 10px; font-size: 13px; outline: none; color: #333; transition: border-color 0.2s; }
.panel-row input:focus, .panel-row select:focus { border-color: #409eff; box-shadow: 0 0 4px rgba(64,158,255,0.2); }

.delete-line-btn {
  margin-top: 15px; padding: 8px; background-color: #fff; border: 1px solid #f56c6c;
  color: #f56c6c; border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.2s;
}
.delete-line-btn:hover { background-color: #fef0f0; box-shadow: 0 0 5px rgba(245,108,108,0.2); }

.switch-row { display: flex; align-items: center; margin-top: 10px; gap: 6px; }
.switch-row input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; margin: 0; }
.checkbox-label { cursor: pointer; font-size: 12px !important; color: #409eff !important; font-weight: normal !important; user-select: none; }
</style>