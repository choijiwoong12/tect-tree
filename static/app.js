const ADMIN_LAYOUT = {
  cardWidth: 260,
  columnGap: 72,
  rowGap: 240,
  paddingX: 90,
  paddingY: 60,
};

function nodeMetaLabel(node) {
  if (node.node_kind === "file") return "FILE";
  if (node.node_kind === "category") return "CATEGORY";
  return "CONTENT";
}

function nodeSummary(node) {
  if (node.node_kind === "file") {
    return node.file_name ? `첨부 파일: ${node.file_name}` : "파일이 업로드되면 여기 표시됩니다.";
  }
  if (node.body_content) {
    return stripHtml(node.body_content);
  }
  return "하위 문서를 담는 허브 노드입니다.";
}

function stripHtml(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container.textContent || container.innerText || "";
}

async function sendAdminNodeAction(url, options = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }

  return response.json();
}

function createNodeCard(node, depth, options) {
  const card = document.createElement("article");
  card.className = "tree-card";
  const isChildNode = depth > 0;
  const isSelected = options.mode === "admin" && options.selectedParentId === node.id;
  const individuallyUnlocked = Boolean(options.nodeLocks && options.nodeLocks[node.id]);
  const effectiveUserLocked = options.mode === "user" && isChildNode && (options.locked || !individuallyUnlocked);

  if (options.mode === "admin") {
    card.classList.add("admin-tree-card");
    if (isSelected) {
      card.classList.add("is-selected");
    }
  }

  if (effectiveUserLocked) {
    card.classList.add("is-blurred");
  }

  if (options.mode === "user" && isChildNode) {
    card.classList.add("is-user-gated");

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = `node-center-lock ${effectiveUserLocked ? "is-locked" : "is-unlocked"}`;
    lockButton.innerHTML = `
      <span class="node-center-lock-icon">${effectiveUserLocked ? "🔒" : "🔓"}</span>
      <span class="node-center-lock-text">${effectiveUserLocked ? "문서 잠금" : "문서 열람"}</span>
    `;
    lockButton.addEventListener("click", () => {
      if (typeof options.onToggleNodeLock === "function") {
        options.onToggleNodeLock(node.id);
      }
    });
    card.append(lockButton);
  }

  if (options.mode === "admin") {
    const topAnchor = document.createElement("span");
    topAnchor.className = "node-anchor node-anchor-top";
    card.append(topAnchor);
  }

  const header = document.createElement("div");
  header.className = "tree-card-header";

  const meta = document.createElement("span");
  meta.className = `meta-chip meta-${node.node_kind}`;
  meta.textContent = nodeMetaLabel(node);

  const title = document.createElement("h3");
  title.textContent = node.title;

  header.append(meta, title);
  card.append(header);

  const summary = document.createElement(node.body_content ? "div" : "p");
  summary.className = "tree-summary";
  if (node.body_content) {
    summary.innerHTML = node.body_content;
  } else {
    summary.textContent = nodeSummary(node);
  }
  card.append(summary);

  if (node.download_url) {
    const download = document.createElement("a");
    download.href = node.download_url;
    download.className = "download-link";
    download.textContent = "파일 다운로드";
    card.append(download);
  }

  if (options.mode === "admin") {
    if (isChildNode || node.node_kind !== "category") {
      const actionRow = document.createElement("div");
      actionRow.className = "tree-actions admin-node-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "node-action-button edit-action";
      editButton.textContent = "수정";
      editButton.addEventListener("click", () => {
        if (typeof options.onEditNode === "function") {
          options.onEditNode(node.id);
        }
      });
      actionRow.append(editButton);

      if (isChildNode) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "node-action-button delete-action";
      deleteButton.textContent = "삭제";
      deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(`'${node.title}' 노드와 하위 문서를 삭제할까요?`);
        if (!confirmed) return;

        try {
          await sendAdminNodeAction(`/admin/nodes/${node.id}/delete`);
          window.location.reload();
        } catch (error) {
          console.error(error);
          window.alert("노드를 삭제하지 못했습니다.");
        }
      });
      actionRow.append(deleteButton);
      }
      card.append(actionRow);
    }

    const portTrigger = document.createElement("div");
    portTrigger.className = "node-port-trigger";

    const bottomAnchor = document.createElement("span");
    bottomAnchor.className = "node-anchor node-anchor-bottom";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "node-port-add-button";
    addButton.setAttribute("aria-label", `'${node.title}' 아래에 새 노드 추가`);
    addButton.textContent = "+";
    addButton.addEventListener("click", () => {
      if (typeof options.onSelectParent === "function") {
        options.onSelectParent(node.id);
      }
    });

    portTrigger.append(bottomAnchor, addButton);
    card.append(portTrigger);
  }

  return card;
}

function createTreeBranch(node, depth, options) {
  const branch = document.createElement("div");
  branch.className = "tree-branch";

  const card = createNodeCard(node, depth, options);
  branch.append(card);

  if (node.children && node.children.length > 0) {
    const children = document.createElement("div");
    children.className = "tree-children";
    node.children.forEach((child) => {
      children.append(createTreeBranch(child, depth + 1, options));
    });
    branch.append(children);
  }

  return branch;
}

function renderTree(targetId, tree, options) {
  const root = document.getElementById(targetId);
  if (!root || !tree) return;
  root.innerHTML = "";
  root.append(createTreeBranch(tree, 0, options));
}

function countLeafSpan(node) {
  if (!node.children || node.children.length === 0) {
    return 1;
  }

  return node.children.reduce((sum, child) => sum + countLeafSpan(child), 0);
}

function getTreeDepth(node) {
  if (!node.children || node.children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...node.children.map(getTreeDepth));
}

function assignAdminLayout(node, depth, startLeaf, nodes, edges) {
  const span = countLeafSpan(node);
  const centerLeaf = startLeaf + span / 2;
  const stepX = ADMIN_LAYOUT.cardWidth + ADMIN_LAYOUT.columnGap;

  nodes.push({
    node,
    depth,
    left: ADMIN_LAYOUT.paddingX + (centerLeaf - 0.5) * stepX - ADMIN_LAYOUT.cardWidth / 2,
    top: ADMIN_LAYOUT.paddingY + depth * ADMIN_LAYOUT.rowGap,
  });

  let cursor = startLeaf;
  node.children.forEach((child) => {
    edges.push({ parentId: node.id, childId: child.id });
    assignAdminLayout(child, depth + 1, cursor, nodes, edges);
    cursor += countLeafSpan(child);
  });
}

function buildAdminTreeLayout(tree) {
  const totalLeaves = countLeafSpan(tree);
  const depth = getTreeDepth(tree);
  const stepX = ADMIN_LAYOUT.cardWidth + ADMIN_LAYOUT.columnGap;

  const nodes = [];
  const edges = [];
  assignAdminLayout(tree, 0, 0, nodes, edges);

  return {
    nodes,
    edges,
    width: Math.max(
      totalLeaves * stepX + ADMIN_LAYOUT.paddingX * 2 - ADMIN_LAYOUT.columnGap,
      960,
    ),
    estimatedHeight: depth * ADMIN_LAYOUT.rowGap + ADMIN_LAYOUT.paddingY * 2,
  };
}

function buildUserVisibleTree(node, depth, locked, nodeLocks) {
  const shouldRevealChildren = depth === 0 || (!locked && Boolean(nodeLocks[node.id]));

  return {
    ...node,
    children: shouldRevealChildren
      ? node.children.map((child) => buildUserVisibleTree(child, depth + 1, locked, nodeLocks))
      : [],
  };
}

function findNodeById(node, targetId) {
  if (node.id === targetId) return node;

  for (const child of node.children || []) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }

  return null;
}

function clearDescendantUnlocks(node, nodeLocks) {
  for (const child of node.children || []) {
    delete nodeLocks[child.id];
    clearDescendantUnlocks(child, nodeLocks);
  }
}

function getRelativeAnchorCenter(anchorElement, container) {
  let x = anchorElement.offsetLeft + anchorElement.offsetWidth / 2;
  let y = anchorElement.offsetTop + anchorElement.offsetHeight / 2;
  let current = anchorElement.offsetParent;

  while (current && current !== container) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent;
  }

  return { x, y };
}

function drawAdminConnections(svg, nodeElements, edges) {
  svg.innerHTML = "";

  edges.forEach((edge) => {
    const parentEl = nodeElements.get(edge.parentId);
    const childEl = nodeElements.get(edge.childId);
    if (!parentEl || !childEl) return;

    const parentAnchor = parentEl.querySelector(".node-anchor-bottom");
    const childAnchor = childEl.querySelector(".node-anchor-top");
    const parentPoint = parentAnchor
      ? getRelativeAnchorCenter(parentAnchor, parentEl)
      : { x: parentEl.offsetWidth / 2, y: parentEl.offsetHeight };
    const childPoint = childAnchor
      ? getRelativeAnchorCenter(childAnchor, childEl)
      : { x: childEl.offsetWidth / 2, y: 0 };
    const parentX = parentEl.offsetLeft + parentPoint.x;
    const parentY = parentEl.offsetTop + parentPoint.y;
    const childX = childEl.offsetLeft + childPoint.x;
    const childY = childEl.offsetTop + childPoint.y;
    const midY = parentY + (childY - parentY) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${parentX} ${parentY} L ${parentX} ${midY} L ${childX} ${midY} L ${childX} ${childY}`);
    path.setAttribute("class", "admin-tree-path");
    svg.append(path);
  });
}

function setupDiagramViewport(frame, stage, contentWidth, contentHeight, controls = {}) {
  if (!frame || !stage) return;

  let state = frame.__viewportState;
  if (!state) {
    state = {
      offsetX: 0,
      offsetY: 24,
      startX: 0,
      startY: 0,
      dragStartOffsetX: 0,
      dragStartOffsetY: 0,
      dragging: false,
      scale: 1,
      minScale: 0.45,
      maxScale: 1.8,
      contentWidth,
      contentHeight,
      stage,
      label: controls.labelId ? document.getElementById(controls.labelId) : null,
    };
    frame.__viewportState = state;
  } else {
    state.contentWidth = contentWidth;
    state.contentHeight = contentHeight;
    state.stage = stage;
    state.label = controls.labelId ? document.getElementById(controls.labelId) : state.label;
  }

  function clampOffsets() {
    const bounds = frame.getBoundingClientRect();
    const scaledWidth = state.contentWidth * state.scale;
    const scaledHeight = state.contentHeight * state.scale;
    const minX = Math.min(32, bounds.width - scaledWidth - 32);
    const minY = Math.min(24, bounds.height - scaledHeight - 32);

    state.offsetX = Math.min(32, Math.max(minX, state.offsetX));
    state.offsetY = Math.min(24, Math.max(minY, state.offsetY));
  }

  function updateLabel() {
    if (state.label) {
      state.label.textContent = `${Math.round(state.scale * 100)}%`;
    }
  }

  function applyTransform() {
    clampOffsets();
    state.stage.style.transformOrigin = "top left";
    state.stage.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
    updateLabel();
  }

  function fitToFrame() {
    const bounds = frame.getBoundingClientRect();
    const fitScale = Math.min(
      1.05,
      (bounds.width - 64) / state.contentWidth,
      (bounds.height - 64) / state.contentHeight,
    );
    state.scale = Math.max(state.minScale, Math.min(state.maxScale, fitScale));
    state.offsetX = (bounds.width - state.contentWidth * state.scale) / 2;
    state.offsetY = 24;
    applyTransform();
  }

  function zoomTo(nextScale) {
    const bounds = frame.getBoundingClientRect();
    const clampedScale = Math.max(state.minScale, Math.min(state.maxScale, nextScale));
    const focusX = bounds.width / 2;
    const focusY = bounds.height / 2;
    const worldX = (focusX - state.offsetX) / state.scale;
    const worldY = (focusY - state.offsetY) / state.scale;

    state.scale = clampedScale;
    state.offsetX = focusX - worldX * state.scale;
    state.offsetY = focusY - worldY * state.scale;
    applyTransform();
  }

  if (frame.dataset.panReady !== "true") {
    frame.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, input, textarea, select, a, label")) {
        return;
      }

      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.dragStartOffsetX = state.offsetX;
      state.dragStartOffsetY = state.offsetY;
      frame.classList.add("is-dragging");
      frame.setPointerCapture(event.pointerId);
    });

    frame.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;
      state.offsetX = state.dragStartOffsetX + (event.clientX - state.startX);
      state.offsetY = state.dragStartOffsetY + (event.clientY - state.startY);
      applyTransform();
    });

    function stopDragging(event) {
      if (!state.dragging) return;
      state.dragging = false;
      frame.classList.remove("is-dragging");
      if (event) {
        frame.releasePointerCapture(event.pointerId);
      }
    }

    frame.addEventListener("pointerup", stopDragging);
    frame.addEventListener("pointercancel", stopDragging);
    window.addEventListener("resize", fitToFrame);
    frame.dataset.panReady = "true";
  }

  if (controls.zoomOutId && !frame.dataset.zoomReady) {
    const zoomOutButton = document.getElementById(controls.zoomOutId);
    const zoomInButton = document.getElementById(controls.zoomInId);
    const resetButton = document.getElementById(controls.resetId);

    zoomOutButton?.addEventListener("click", () => zoomTo(state.scale - 0.15));
    zoomInButton?.addEventListener("click", () => zoomTo(state.scale + 0.15));
    resetButton?.addEventListener("click", fitToFrame);
    frame.dataset.zoomReady = "true";
  }

  if (!frame.dataset.viewportInitialized) {
    fitToFrame();
    frame.dataset.viewportInitialized = "true";
    return;
  }

  applyTransform();
}

function renderDiagramTree(tree, options) {
  const canvas = document.getElementById(options.canvasId);
  const svg = document.getElementById(options.svgId);
  const frame = document.getElementById(options.frameId);
  const stage = document.getElementById(options.stageId);

  if (!canvas || !svg || !frame || !stage) return;

  const layout = buildAdminTreeLayout(tree);
  const nodeElements = new Map();

  canvas.innerHTML = "";
  svg.innerHTML = "";

  layout.nodes.forEach((entry) => {
    const shell = document.createElement("div");
    shell.className = "admin-node-shell";
    shell.style.left = `${entry.left}px`;
    shell.style.top = `${entry.top}px`;

    const card = createNodeCard(entry.node, entry.depth, {
      mode: options.mode,
      locked: options.locked ?? false,
      nodeLocks: options.nodeLocks,
      onToggleNodeLock: options.onToggleNodeLock,
      onSelectParent: options.onSelectParent,
      onEditNode: options.onEditNode,
      selectedParentId: options.selectedParentId,
    });
    shell.append(card);
    canvas.append(shell);
    nodeElements.set(entry.node.id, shell);
  });

  const maxBottom = Math.max(
    ...Array.from(nodeElements.values()).map((element) => element.offsetTop + element.offsetHeight),
    layout.estimatedHeight,
  );
  const stageHeight = maxBottom + ADMIN_LAYOUT.paddingY;

  stage.style.width = `${layout.width}px`;
  stage.style.height = `${stageHeight}px`;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${stageHeight}px`;
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(stageHeight));
  svg.setAttribute("viewBox", `0 0 ${layout.width} ${stageHeight}`);

  drawAdminConnections(svg, nodeElements, layout.edges);
  setupDiagramViewport(frame, stage, layout.width, stageHeight, options.controls);
}

function renderAdminTree(tree, options = {}) {
  renderDiagramTree(tree, {
    mode: "admin",
    frameId: "admin-tree-frame",
    stageId: "admin-tree-stage",
    svgId: "admin-tree-svg",
    canvasId: "admin-tree-canvas",
    onSelectParent: options.onSelectParent,
    onEditNode: options.onEditNode,
    selectedParentId: options.selectedParentId,
    controls: {
      zoomOutId: "admin-zoom-out",
      zoomInId: "admin-zoom-in",
      resetId: "admin-zoom-reset",
      labelId: "admin-zoom-label",
    },
  });
}

function renderUserTree(tree, locked, nodeLocks, onToggleNodeLock) {
  const visibleTree = buildUserVisibleTree(tree, 0, locked, nodeLocks);

  renderDiagramTree(visibleTree, {
    mode: "user",
    locked,
    nodeLocks,
    onToggleNodeLock,
    frameId: "user-tree-frame",
    stageId: "user-tree-stage",
    svgId: "user-tree-svg",
    canvasId: "user-tree-canvas",
    controls: {
      zoomOutId: "user-zoom-out",
      zoomInId: "user-zoom-in",
      resetId: "user-zoom-reset",
      labelId: "user-zoom-label",
    },
  });
}

function setupUserPage(tree) {
  let locked = true;
  const nodeLocks = {};
  const toggle = document.getElementById("lock-toggle");

  function toggleNodeLock(nodeId) {
    const nextUnlocked = !nodeLocks[nodeId];
    const targetNode = findNodeById(tree, nodeId);

    if (nextUnlocked) {
      nodeLocks[nodeId] = true;
    } else {
      delete nodeLocks[nodeId];
      if (targetNode) {
        clearDescendantUnlocks(targetNode, nodeLocks);
      }
    }

    repaint();
  }

  function repaint() {
    renderUserTree(tree, locked, nodeLocks, toggleNodeLock);
    if (!toggle) return;
    toggle.classList.toggle("is-locked", locked);
    toggle.classList.toggle("is-unlocked", !locked);
    toggle.setAttribute("aria-pressed", String(locked));
    toggle.querySelector(".lock-icon").textContent = locked ? "🔒" : "🔓";
    toggle.querySelector(".lock-label").textContent = locked ? "잠금 상태" : "열람 가능 상태";
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      locked = !locked;
      if (locked) {
        Object.keys(nodeLocks).forEach((key) => delete nodeLocks[key]);
      }
      repaint();
    });
  }

  repaint();
}

function setupAdminPage(tree) {
  const layout = document.getElementById("admin-layout");
  const editorPanel = document.getElementById("admin-editor-panel");
  const closeButton = document.getElementById("admin-editor-close");
  const editorTitle = document.getElementById("admin-editor-title");
  const form = document.querySelector(".node-form");
  const parentInput = document.getElementById("parent-id-input");
  const parentLabel = document.getElementById("selected-parent-label");
  const titleInput = document.querySelector('.node-form input[name="title"]');
  const kindSelect = document.getElementById("node-kind-select");
  const contentInput = document.getElementById("content-input");
  const fileInput = document.getElementById("file-input");
  const editorFrame = document.getElementById("content-editor-frame");
  let selectedParentId = null;
  let editingNodeId = null;
  let pendingEditorHtml = "";

  function repaint() {
    renderAdminTree(tree, {
      onSelectParent: selectParent,
      onEditNode: editNode,
      selectedParentId,
    });
  }

  function resetViewportFit() {
    const frame = document.getElementById("admin-tree-frame");
    if (frame) {
      delete frame.dataset.viewportInitialized;
    }
  }

  function loadEditor(html) {
    pendingEditorHtml = html || "";
    if (contentInput) {
      contentInput.value = pendingEditorHtml;
    }
    editorFrame?.contentWindow?.postMessage(
      {
        type: "DATAHUB_EDITOR_LOAD",
        html: pendingEditorHtml || "<p></p>",
      },
      "*",
    );
  }

  function openPanel() {
    if (layout) {
      layout.classList.add("is-editor-open");
    }

    if (editorPanel) {
      editorPanel.hidden = false;
      editorPanel.setAttribute("aria-hidden", "false");
    }
  }

  function selectParent(nodeId) {
    const node = findNodeById(tree, nodeId);
    if (!node) return;
    const wasOpen = selectedParentId !== null;

    selectedParentId = nodeId;
    editingNodeId = null;

    openPanel();

    if (editorTitle) {
      editorTitle.textContent = `${node.title} 아래 새 문서`;
    }

    if (form) form.action = "/admin/nodes";
    if (parentInput) parentInput.value = String(node.id);
    if (parentLabel) parentLabel.value = `${node.title} (#${node.id})`;
    if (titleInput) titleInput.value = "";
    if (kindSelect) kindSelect.value = "content";
    if (fileInput) fileInput.value = "";
    loadEditor("");

    if (!wasOpen) {
      resetViewportFit();
    }

    repaint();

    window.requestAnimationFrame(() => {
      titleInput?.focus();
      if (window.innerWidth <= 960) {
        editorPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function editNode(nodeId) {
    const node = findNodeById(tree, nodeId);
    if (!node) return;
    const wasOpen = selectedParentId !== null || editingNodeId !== null;

    editingNodeId = nodeId;
    selectedParentId = node.parent_id || tree.id;
    openPanel();

    if (editorTitle) {
      editorTitle.textContent = `${node.title} 내용 수정`;
    }

    if (form) form.action = `/admin/nodes/${node.id}/edit`;
    if (parentInput) parentInput.value = String(node.parent_id || tree.id);
    if (parentLabel) parentLabel.value = `${node.title} (#${node.id})`;
    if (titleInput) titleInput.value = node.title || "";
    if (kindSelect) kindSelect.value = node.node_kind || "content";
    if (fileInput) fileInput.value = "";
    loadEditor(node.body_content || "");

    if (!wasOpen) {
      resetViewportFit();
    }

    repaint();

    window.requestAnimationFrame(() => {
      titleInput?.focus();
      if (window.innerWidth <= 960) {
        editorPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function closeEditor() {
    const wasOpen = selectedParentId !== null || editingNodeId !== null;
    selectedParentId = null;
    editingNodeId = null;

    if (layout) {
      layout.classList.remove("is-editor-open");
    }

    if (editorPanel) {
      editorPanel.hidden = true;
      editorPanel.setAttribute("aria-hidden", "true");
    }

    if (form) form.action = "/admin/nodes";
    if (editorTitle) {
      editorTitle.textContent = "새 문서 추가";
    }

    if (parentInput) parentInput.value = String(tree.id);
    if (parentLabel) parentLabel.value = `${tree.title} (#${tree.id})`;
    if (titleInput) titleInput.value = "";
    if (kindSelect) kindSelect.value = "content";
    if (fileInput) fileInput.value = "";
    loadEditor("");

    if (wasOpen) {
      resetViewportFit();
    }

    repaint();
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "DATAHUB_EDITOR_READY") {
      loadEditor(pendingEditorHtml);
    }
    if (data.type === "DATAHUB_EDITOR_CHANGE" || data.type === "DATAHUB_EDITOR_SAVE") {
      pendingEditorHtml = data.html || "";
      if (contentInput) {
        contentInput.value = pendingEditorHtml;
      }
    }
  });

  form?.addEventListener("submit", () => {
    if (contentInput) {
      contentInput.value = pendingEditorHtml;
    }
  });

  closeButton?.addEventListener("click", closeEditor);
  repaint();
}

document.addEventListener("DOMContentLoaded", () => {
  const config = window.DATA_HUB_PAGE;
  if (!config || !config.tree) return;

  if (config.mode === "admin") {
    setupAdminPage(config.tree);
    return;
  }

  setupUserPage(config.tree);
});
