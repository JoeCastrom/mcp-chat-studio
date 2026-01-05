/**
 * Frontend Unit Tests - Workspace Utilities
 * Tests for floatingWorkspace patterns and helper functions
 */

describe('Workspace Panel Management', () => {
  // Replicate panel ID generation pattern
  let panelIdCounter = 0;
  
  function generatePanelId() {
    panelIdCounter += 1;
    return `panel_${Date.now()}_${panelIdCounter}`;
  }

  beforeEach(() => {
    panelIdCounter = 0;
  });

  test('generatePanelId creates unique IDs', () => {
    const id1 = generatePanelId();
    const id2 = generatePanelId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^panel_\d+_1$/);
    expect(id2).toMatch(/^panel_\d+_2$/);
  });

  test('panel definitions structure', () => {
    const panelDefs = {
      chat: { icon: '💬', title: 'Chat', width: 500, height: 600, connects: ['inspector', 'history'] },
      inspector: { icon: '🔧', title: 'Inspector', width: 450, height: 500, connects: ['workflows'] },
    };

    expect(panelDefs.chat.connects).toContain('inspector');
    expect(panelDefs.inspector.width).toBe(450);
  });
});

describe('Zoom and Pan Calculations', () => {
  test('setZoom clamps to min/max bounds', () => {
    const minZoom = 0.25;
    const maxZoom = 2;

    function clampZoom(level) {
      return Math.max(minZoom, Math.min(maxZoom, level));
    }

    expect(clampZoom(0.1)).toBe(0.25);
    expect(clampZoom(3)).toBe(2);
    expect(clampZoom(1)).toBe(1);
  });

  test('mouse-centered zoom calculation', () => {
    // Replicate zoom centering logic
    const oldZoom = 1;
    const newZoom = 1.2;
    let panX = 100;
    
    const mouseX = 50;
    
    // Pan adjustment formula
    panX = mouseX + (panX - mouseX) * (newZoom / oldZoom);
    
    // Should adjust pan to keep mouse position stable
    expect(panX).toBe(110); // 50 + (100-50) * 1.2 = 50 + 60 = 110
  });

  test('fitAll bounding box calculation', () => {
    const panels = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 200, y: 150, width: 100, height: 100 },
    ];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    panels.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    });

    expect(minX).toBe(0);
    expect(minY).toBe(0);
    expect(maxX).toBe(300);
    expect(maxY).toBe(250);
  });
});

describe('Grid Snapping', () => {
  test('snap to grid calculation', () => {
    const gridSize = 20;
    
    function snapToGrid(value) {
      return Math.round(value / gridSize) * gridSize;
    }

    expect(snapToGrid(15)).toBe(20);
    expect(snapToGrid(25)).toBe(20);
    expect(snapToGrid(30)).toBe(40);
    expect(snapToGrid(0)).toBe(0);
  });

  test('snap when within distance', () => {
    const snapDistance = 10;
    
    function shouldSnap(current, target) {
      return Math.abs(current - target) <= snapDistance;
    }

    expect(shouldSnap(95, 100)).toBe(true);
    expect(shouldSnap(85, 100)).toBe(false);
    expect(shouldSnap(105, 100)).toBe(true);
  });
});

describe('Connection Drawing', () => {
  test('curved path generation', () => {
    const from = { x: 0, y: 50, width: 100, height: 100 };
    const to = { x: 200, y: 150, width: 100, height: 100 };

    const x1 = from.x + from.width;
    const y1 = from.y + from.height / 2;
    const x2 = to.x;
    const y2 = to.y + to.height / 2;

    const dx = x2 - x1;
    const curveStrength = Math.min(Math.abs(dx) * 0.5, 200);
    const controlX1 = x1 + curveStrength;
    const controlX2 = x2 - curveStrength;

    const d = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;

    expect(d).toBe('M 100 100 C 150 100, 150 200, 200 200');
  });
});

describe('MiniMap Calculations', () => {
  test('viewport position calculation', () => {
    const range = 10000;
    const minimapWidth = 200;
    const scale = minimapWidth / range;

    const zoom = 1;
    const panX = 100;
    const panY = 50;
    const viewWidth = 800;
    const viewHeight = 600;

    const viewX = (range/2 - panX/zoom - viewWidth/2) * scale;
    const viewY = (range/2 - panY/zoom - viewHeight/2) * scale;

    // Should calculate correct viewport position
    expect(viewX).toBeCloseTo((5000 - 100 - 400) * 0.02);
    expect(viewY).toBeCloseTo((5000 - 50 - 300) * 0.02);
  });

  test('panel dot positioning', () => {
    const range = 10000;
    const scale = 200 / range;
    
    const panel = { x: 0, y: 0, width: 100, height: 100 };
    
    const dotLeft = (panel.x + range/2) * scale;
    const dotTop = (panel.y + range/2) * scale;

    // Panel at origin should appear at center of minimap
    expect(dotLeft).toBe(100); // 5000 * 0.02 = 100
    expect(dotTop).toBe(100);
  });
});

describe('Layout Persistence', () => {
  const LAYOUT_KEY = 'mcp_chat_studio_workspace_layout';

  beforeEach(() => {
    localStorage.clear();
  });

  test('save and load layout', () => {
    const panels = [
      { id: 'panel_1', type: 'chat', x: 100, y: 100, width: 500, height: 600 },
      { id: 'panel_2', type: 'inspector', x: 650, y: 100, width: 450, height: 500 },
    ];

    localStorage.setItem(LAYOUT_KEY, JSON.stringify(panels));

    const loaded = JSON.parse(localStorage.getItem(LAYOUT_KEY));

    expect(loaded).toHaveLength(2);
    expect(loaded[0].type).toBe('chat');
    expect(loaded[1].type).toBe('inspector');
  });

  test('handles empty layout gracefully', () => {
    const stored = localStorage.getItem(LAYOUT_KEY);

    expect(stored).toBeNull();
    
    const panels = stored ? JSON.parse(stored) : [];
    expect(panels).toEqual([]);
  });
});
