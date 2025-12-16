/**
 * Interactive Path Planning Visualizer
 * Demonstrates A*, Dijkstra, and RRT algorithms
 * For robotics portfolio - showcasing motion planning skills
 */

class PathPlanner {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('PathPlanner: Container not found:', containerId);
            return;
        }
        
        // Grid configuration
        this.gridSize = 25;
        this.cellSize = 0;
        
        // Grid state
        this.grid = [];
        this.start = { x: 2, y: 12 };
        this.goal = { x: 22, y: 12 };
        
        // Drawing state
        this.isDrawing = false;
        this.drawMode = 'obstacle';
        
        // Algorithm state
        this.currentAlgorithm = 'astar';
        this.isRunning = false;
        this.isPaused = false;
        this.animationSpeed = 30;
        
        // Path result
        this.path = [];
        this.visited = new Set();
        this.frontier = new Set();
        this.rrtTree = null;
        
        // Colors
        this.colors = {
            empty: 'rgba(15, 15, 25, 0.6)',
            obstacle: '#1a1a2e',
            start: '#00ff88',
            goal: '#ff00a0',
            visited: 'rgba(0, 240, 255, 0.3)',
            frontier: 'rgba(0, 240, 255, 0.6)',
            path: '#00f0ff',
            gridLine: 'rgba(0, 240, 255, 0.1)',
            rrtTree: 'rgba(0, 240, 255, 0.4)'
        };
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.initGrid();
        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
        console.log('PathPlanner initialized successfully');
    }
    
    createUI() {
        this.container.innerHTML = `
            <div class="path-planner-wrapper">
                <div class="planner-controls">
                    <div class="control-group">
                        <label class="control-label">Algorithm</label>
                        <div class="algorithm-buttons">
                            <button class="algo-btn active" data-algo="astar">A*</button>
                            <button class="algo-btn" data-algo="dijkstra">Dijkstra</button>
                            <button class="algo-btn" data-algo="rrt">RRT</button>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Draw Mode</label>
                        <div class="mode-buttons">
                            <button class="mode-btn active" data-mode="obstacle" title="Draw obstacles">
                                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                                <span>Wall</span>
                            </button>
                            <button class="mode-btn" data-mode="start" title="Set start point">
                                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
                                <span>Start</span>
                            </button>
                            <button class="mode-btn" data-mode="goal" title="Set goal point">
                                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9"/></svg>
                                <span>Goal</span>
                            </button>
                            <button class="mode-btn" data-mode="erase" title="Erase obstacles">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                <span>Erase</span>
                            </button>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Speed</label>
                        <input type="range" class="speed-slider" min="5" max="100" value="70">
                    </div>
                    <div class="control-group action-buttons">
                        <button class="action-btn primary run-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                            <span>Run</span>
                        </button>
                        <button class="action-btn pause-btn" disabled>
                            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            <span>Pause</span>
                        </button>
                        <button class="action-btn clear-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6"/></svg>
                            <span>Clear</span>
                        </button>
                        <button class="action-btn reset-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                            <span>Reset</span>
                        </button>
                    </div>
                </div>
                <div class="planner-canvas-container">
                    <canvas class="path-canvas"></canvas>
                    <div class="planner-stats">
                        <div class="stat">
                            <span class="stat-label">Nodes:</span>
                            <span class="stat-value nodes-count">0</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Path:</span>
                            <span class="stat-value path-length">-</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Status:</span>
                            <span class="stat-value status-text">Ready</span>
                        </div>
                    </div>
                </div>
                <div class="planner-legend">
                    <div class="legend-item"><span class="legend-color start"></span>Start</div>
                    <div class="legend-item"><span class="legend-color goal"></span>Goal</div>
                    <div class="legend-item"><span class="legend-color obstacle"></span>Obstacle</div>
                    <div class="legend-item"><span class="legend-color visited"></span>Explored</div>
                    <div class="legend-item"><span class="legend-color frontier"></span>Frontier</div>
                    <div class="legend-item"><span class="legend-color path"></span>Path</div>
                </div>
            </div>
        `;
    }
    
    setupCanvas() {
        this.canvas = this.container.querySelector('.path-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        const containerEl = this.canvas.parentElement;
        const rect = containerEl.getBoundingClientRect();
        const size = Math.min(rect.width - 40, 550);
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.canvasSize = size;
        this.cellSize = size / this.gridSize;
        
        this.draw();
    }
    
    initGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = 0;
            }
        }
        this.addDefaultObstacles();
    }
    
    addDefaultObstacles() {
        // Vertical walls
        for (let y = 3; y < 10; y++) this.grid[y][8] = 1;
        for (let y = 15; y < 22; y++) this.grid[y][8] = 1;
        for (let y = 5; y < 20; y++) this.grid[y][16] = 1;
        
        // Horizontal walls
        for (let x = 10; x < 16; x++) this.grid[6][x] = 1;
        for (let x = 10; x < 14; x++) this.grid[18][x] = 1;
    }
    
    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.handleDraw(e);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.handleDraw(e);
        });
        
        this.canvas.addEventListener('mouseup', () => this.isDrawing = false);
        this.canvas.addEventListener('mouseleave', () => this.isDrawing = false);
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isDrawing = true;
            this.handleDraw(e.touches[0]);
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isDrawing) this.handleDraw(e.touches[0]);
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', () => this.isDrawing = false);
        
        // Algorithm buttons
        this.container.querySelectorAll('.algo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentAlgorithm = btn.dataset.algo;
                this.clearPath();
            });
        });
        
        // Mode buttons
        this.container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.drawMode = btn.dataset.mode;
            });
        });
        
        // Speed slider
        const slider = this.container.querySelector('.speed-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.animationSpeed = 105 - parseInt(e.target.value);
            });
        }
        
        // Action buttons - using class selectors within container
        const runBtn = this.container.querySelector('.run-btn');
        const pauseBtn = this.container.querySelector('.pause-btn');
        const clearBtn = this.container.querySelector('.clear-btn');
        const resetBtn = this.container.querySelector('.reset-btn');
        
        if (runBtn) runBtn.addEventListener('click', () => this.run());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearPath());
        if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
        
        // Resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    getGridPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvasSize / rect.width;
        const scaleY = this.canvasSize / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.cellSize);
        return { 
            x: Math.max(0, Math.min(x, this.gridSize - 1)), 
            y: Math.max(0, Math.min(y, this.gridSize - 1)) 
        };
    }
    
    handleDraw(e) {
        if (this.isRunning) return;
        
        const { x, y } = this.getGridPos(e);
        
        if (this.drawMode === 'obstacle' || this.drawMode === 'erase') {
            if ((x === this.start.x && y === this.start.y) || 
                (x === this.goal.x && y === this.goal.y)) {
                return;
            }
        }
        
        switch (this.drawMode) {
            case 'obstacle':
                this.grid[y][x] = 1;
                break;
            case 'erase':
                this.grid[y][x] = 0;
                break;
            case 'start':
                if (this.grid[y][x] === 0) this.start = { x, y };
                break;
            case 'goal':
                if (this.grid[y][x] === 0) this.goal = { x, y };
                break;
        }
        
        this.clearPath();
        this.draw();
    }
    
    // ==================== ALGORITHMS ====================
    
    async run() {
        if (this.isRunning && !this.isPaused) return;
        
        if (this.isPaused) {
            this.isPaused = false;
            this.updateStatus('Searching...');
            return;
        }
        
        this.clearPath();
        this.isRunning = true;
        this.isPaused = false;
        this.updateUI();
        this.updateStatus('Searching...');
        
        try {
            switch (this.currentAlgorithm) {
                case 'astar':
                    await this.runAStar();
                    break;
                case 'dijkstra':
                    await this.runDijkstra();
                    break;
                case 'rrt':
                    await this.runRRT();
                    break;
            }
        } catch (err) {
            console.error('Algorithm error:', err);
            this.updateStatus('Error');
        }
        
        this.isRunning = false;
        this.updateUI();
    }
    
    async runAStar() {
        const openSet = [{ ...this.start, g: 0, f: this.heuristic(this.start, this.goal), parent: null }];
        const closedSet = new Set();
        const gScores = new Map();
        gScores.set(`${this.start.x},${this.start.y}`, 0);
        
        while (openSet.length > 0 && this.isRunning) {
            while (this.isPaused && this.isRunning) {
                await this.delay(100);
            }
            if (!this.isRunning) break;
            
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            if (current.x === this.goal.x && current.y === this.goal.y) {
                this.reconstructPath(current);
                this.updateStatus('Path Found!');
                return;
            }
            
            closedSet.add(currentKey);
            this.visited.add(currentKey);
            
            this.frontier.clear();
            openSet.forEach(n => this.frontier.add(`${n.x},${n.y}`));
            
            this.updateNodes(closedSet.size);
            this.draw();
            await this.delay(this.animationSpeed);
            
            for (const neighbor of this.getNeighbors(current)) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey)) continue;
                if (this.grid[neighbor.y][neighbor.x] === 1) continue;
                
                const tentativeG = current.g + this.distance(current, neighbor);
                const existingG = gScores.get(neighborKey);
                
                if (existingG === undefined || tentativeG < existingG) {
                    neighbor.g = tentativeG;
                    neighbor.f = tentativeG + this.heuristic(neighbor, this.goal);
                    neighbor.parent = current;
                    gScores.set(neighborKey, tentativeG);
                    
                    if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        if (this.isRunning) this.updateStatus('No Path Found');
    }
    
    async runDijkstra() {
        const openSet = [{ ...this.start, dist: 0, parent: null }];
        const closedSet = new Set();
        const distances = new Map();
        distances.set(`${this.start.x},${this.start.y}`, 0);
        
        while (openSet.length > 0 && this.isRunning) {
            while (this.isPaused && this.isRunning) {
                await this.delay(100);
            }
            if (!this.isRunning) break;
            
            openSet.sort((a, b) => a.dist - b.dist);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            if (closedSet.has(currentKey)) continue;
            
            if (current.x === this.goal.x && current.y === this.goal.y) {
                this.reconstructPath(current);
                this.updateStatus('Path Found!');
                return;
            }
            
            closedSet.add(currentKey);
            this.visited.add(currentKey);
            
            this.frontier.clear();
            openSet.forEach(n => this.frontier.add(`${n.x},${n.y}`));
            
            this.updateNodes(closedSet.size);
            this.draw();
            await this.delay(this.animationSpeed);
            
            for (const neighbor of this.getNeighbors(current)) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey)) continue;
                if (this.grid[neighbor.y][neighbor.x] === 1) continue;
                
                const newDist = current.dist + this.distance(current, neighbor);
                const existingDist = distances.get(neighborKey);
                
                if (existingDist === undefined || newDist < existingDist) {
                    distances.set(neighborKey, newDist);
                    openSet.push({ ...neighbor, dist: newDist, parent: current });
                }
            }
        }
        
        if (this.isRunning) this.updateStatus('No Path Found');
    }
    
    async runRRT() {
        const nodes = [{ ...this.start, parent: null }];
        const maxIter = 1500;
        const stepSize = 2;
        const goalBias = 0.1;
        
        this.rrtTree = nodes;
        
        for (let i = 0; i < maxIter && this.isRunning; i++) {
            while (this.isPaused && this.isRunning) {
                await this.delay(100);
            }
            if (!this.isRunning) break;
            
            // Random point with goal bias
            const rand = Math.random() < goalBias 
                ? { ...this.goal }
                : { x: Math.random() * this.gridSize, y: Math.random() * this.gridSize };
            
            // Find nearest node
            let nearest = nodes[0];
            let minDist = Infinity;
            for (const node of nodes) {
                const d = this.distance(node, rand);
                if (d < minDist) {
                    minDist = d;
                    nearest = node;
                }
            }
            
            // Step towards random point
            const angle = Math.atan2(rand.y - nearest.y, rand.x - nearest.x);
            const newNode = {
                x: nearest.x + Math.cos(angle) * stepSize,
                y: nearest.y + Math.sin(angle) * stepSize,
                parent: nearest
            };
            
            // Bounds check
            if (newNode.x < 0 || newNode.x >= this.gridSize || 
                newNode.y < 0 || newNode.y >= this.gridSize) continue;
            
            // Collision check
            if (!this.lineCollides(nearest, newNode)) {
                nodes.push(newNode);
                this.rrtTree = nodes;
                
                // Goal check
                if (this.distance(newNode, this.goal) < stepSize) {
                    const goalNode = { ...this.goal, parent: newNode };
                    nodes.push(goalNode);
                    this.reconstructRRTPath(goalNode);
                    this.updateStatus('Path Found!');
                    return;
                }
                
                if (i % 3 === 0) {
                    this.updateNodes(nodes.length);
                    this.draw();
                    await this.delay(this.animationSpeed / 2);
                }
            }
        }
        
        if (this.isRunning) this.updateStatus('No Path Found');
    }
    
    lineCollides(from, to) {
        const steps = Math.ceil(this.distance(from, to) * 2);
        for (let i = 0; i <= steps; i++) {
            const t = i / Math.max(steps, 1);
            const x = Math.floor(from.x + (to.x - from.x) * t);
            const y = Math.floor(from.y + (to.y - from.y) * t);
            if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
                if (this.grid[y][x] === 1) return true;
            }
        }
        return false;
    }
    
    getNeighbors(node) {
        const neighbors = [];
        const dirs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
        
        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                // Prevent corner cutting
                if (dx !== 0 && dy !== 0) {
                    if (this.grid[node.y][node.x + dx] === 1 || this.grid[node.y + dy][node.x] === 1) {
                        continue;
                    }
                }
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }
    
    heuristic(a, b) {
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    }
    
    distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    reconstructPath(endNode) {
        this.path = [];
        let current = endNode;
        while (current) {
            this.path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        this.updatePathLength(this.path.length);
        this.draw();
    }
    
    reconstructRRTPath(endNode) {
        this.path = [];
        let current = endNode;
        while (current) {
            this.path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        this.updatePathLength(this.path.length);
        this.draw();
    }
    
    // ==================== UTILITIES ====================
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        
        const pauseBtn = this.container.querySelector('.pause-btn span');
        if (pauseBtn) pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        this.updateStatus(this.isPaused ? 'Paused' : 'Searching...');
    }
    
    clearPath() {
        this.isRunning = false;
        this.isPaused = false;
        this.path = [];
        this.visited.clear();
        this.frontier.clear();
        this.rrtTree = null;
        this.updateNodes(0);
        this.updatePathLength('-');
        this.updateStatus('Ready');
        this.updateUI();
        this.draw();
    }
    
    reset() {
        this.clearPath();
        this.start = { x: 2, y: 12 };
        this.goal = { x: 22, y: 12 };
        this.initGrid();
        this.draw();
    }
    
    updateUI() {
        const runBtn = this.container.querySelector('.run-btn');
        const pauseBtn = this.container.querySelector('.pause-btn');
        
        if (runBtn) runBtn.disabled = this.isRunning && !this.isPaused;
        if (pauseBtn) {
            pauseBtn.disabled = !this.isRunning;
            const span = pauseBtn.querySelector('span');
            if (span && !this.isRunning) span.textContent = 'Pause';
        }
    }
    
    updateStatus(text) {
        const el = this.container.querySelector('.status-text');
        if (el) el.textContent = text;
    }
    
    updateNodes(count) {
        const el = this.container.querySelector('.nodes-count');
        if (el) el.textContent = count;
    }
    
    updatePathLength(length) {
        const el = this.container.querySelector('.path-length');
        if (el) el.textContent = length;
    }
    
    // ==================== DRAWING ====================
    
    draw() {
        if (!this.ctx || !this.canvasSize) return;
        
        const ctx = this.ctx;
        const size = this.canvasSize;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, size, size);
        
        // Grid lines
        ctx.strokeStyle = this.colors.gridLine;
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            const pos = i * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }
        
        // RRT tree
        if (this.rrtTree && this.currentAlgorithm === 'rrt') {
            ctx.strokeStyle = this.colors.rrtTree;
            ctx.lineWidth = 1.5;
            for (const node of this.rrtTree) {
                if (node.parent) {
                    ctx.beginPath();
                    ctx.moveTo((node.parent.x + 0.5) * this.cellSize, (node.parent.y + 0.5) * this.cellSize);
                    ctx.lineTo((node.x + 0.5) * this.cellSize, (node.y + 0.5) * this.cellSize);
                    ctx.stroke();
                }
            }
        }
        
        // Visited cells
        ctx.fillStyle = this.colors.visited;
        this.visited.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            ctx.fillRect(x * this.cellSize + 1, y * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
        });
        
        // Frontier cells
        ctx.fillStyle = this.colors.frontier;
        this.frontier.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            ctx.fillRect(x * this.cellSize + 1, y * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
        });
        
        // Obstacles
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 1) {
                    ctx.fillStyle = this.colors.obstacle;
                    ctx.fillRect(x * this.cellSize + 1, y * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
                    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * this.cellSize + 1, y * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
                }
            }
        }
        
        // Path
        if (this.path.length > 1) {
            ctx.strokeStyle = this.colors.path;
            ctx.lineWidth = this.cellSize * 0.3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = this.colors.path;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo((this.path[0].x + 0.5) * this.cellSize, (this.path[0].y + 0.5) * this.cellSize);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo((this.path[i].x + 0.5) * this.cellSize, (this.path[i].y + 0.5) * this.cellSize);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Start point
        ctx.fillStyle = this.colors.start;
        ctx.shadowColor = this.colors.start;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc((this.start.x + 0.5) * this.cellSize, (this.start.y + 0.5) * this.cellSize, this.cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        // Goal point (star)
        ctx.fillStyle = this.colors.goal;
        ctx.shadowColor = this.colors.goal;
        const gx = (this.goal.x + 0.5) * this.cellSize;
        const gy = (this.goal.y + 0.5) * this.cellSize;
        const or = this.cellSize * 0.4;
        const ir = this.cellSize * 0.2;
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const oa = (i * 72 - 90) * Math.PI / 180;
            const ia = ((i * 72) + 36 - 90) * Math.PI / 180;
            if (i === 0) ctx.moveTo(gx + Math.cos(oa) * or, gy + Math.sin(oa) * or);
            else ctx.lineTo(gx + Math.cos(oa) * or, gy + Math.sin(oa) * or);
            ctx.lineTo(gx + Math.cos(ia) * ir, gy + Math.sin(ia) * ir);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('pathPlannerContainer');
    if (container) {
        window.pathPlanner = new PathPlanner('pathPlannerContainer');
    }
});
