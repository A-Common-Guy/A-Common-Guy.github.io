/**
 * Interactive Path Planning Visualizer
 * Demonstrates A*, Dijkstra, and RRT algorithms
 * For robotics portfolio - showcasing motion planning skills
 */

class PathPlanner {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        // Grid configuration
        this.gridSize = 25; // cells
        this.cellSize = 0;  // calculated on init
        
        // Grid state
        this.grid = [];
        this.start = { x: 2, y: 12 };
        this.goal = { x: 22, y: 12 };
        
        // Drawing state
        this.isDrawing = false;
        this.drawMode = 'obstacle'; // 'obstacle', 'start', 'goal', 'erase'
        
        // Algorithm state
        this.currentAlgorithm = 'astar';
        this.isRunning = false;
        this.isPaused = false;
        this.animationSpeed = 30; // ms per step
        this.animationQueue = [];
        this.animationTimer = null;
        
        // Path result
        this.path = [];
        this.visited = new Set();
        this.frontier = new Set();
        
        // Colors matching cyberpunk theme
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
        this.createCanvas();
        this.initGrid();
        this.setupEventListeners();
        this.draw();
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
                        <input type="range" class="speed-slider" min="5" max="100" value="30">
                    </div>
                    <div class="control-group action-buttons">
                        <button class="action-btn primary" id="runBtn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                            <span>Run</span>
                        </button>
                        <button class="action-btn" id="pauseBtn" disabled>
                            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            <span>Pause</span>
                        </button>
                        <button class="action-btn" id="clearPathBtn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6"/></svg>
                            <span>Clear Path</span>
                        </button>
                        <button class="action-btn" id="resetBtn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                            <span>Reset All</span>
                        </button>
                    </div>
                </div>
                <div class="planner-canvas-container">
                    <canvas id="pathPlannerCanvas"></canvas>
                    <div class="planner-stats">
                        <div class="stat">
                            <span class="stat-label">Nodes Explored:</span>
                            <span class="stat-value" id="nodesExplored">0</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Path Length:</span>
                            <span class="stat-value" id="pathLength">-</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Status:</span>
                            <span class="stat-value" id="plannerStatus">Ready</span>
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
    
    createCanvas() {
        this.canvas = document.getElementById('pathPlannerCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const size = Math.min(rect.width - 20, 600);
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
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
                this.grid[y][x] = 0; // 0 = empty, 1 = obstacle
            }
        }
        
        // Add some default obstacles (maze-like pattern)
        this.addDefaultObstacles();
    }
    
    addDefaultObstacles() {
        // Vertical walls
        for (let y = 3; y < 10; y++) {
            this.grid[y][8] = 1;
        }
        for (let y = 15; y < 22; y++) {
            this.grid[y][8] = 1;
        }
        for (let y = 5; y < 20; y++) {
            this.grid[y][16] = 1;
        }
        
        // Horizontal walls
        for (let x = 10; x < 16; x++) {
            this.grid[6][x] = 1;
        }
        for (let x = 10; x < 14; x++) {
            this.grid[18][x] = 1;
        }
        
        // Some scattered obstacles
        const scattered = [[5,5], [5,6], [6,5], [19,3], [20,3], [19,4], [4,19], [5,19], [4,20]];
        scattered.forEach(([y, x]) => {
            if (y < this.gridSize && x < this.gridSize) {
                this.grid[y][x] = 1;
            }
        });
    }
    
    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.isDrawing = false);
        this.canvas.addEventListener('mouseleave', () => this.isDrawing = false);
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
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
        this.container.querySelector('.speed-slider').addEventListener('input', (e) => {
            this.animationSpeed = 105 - parseInt(e.target.value);
        });
        
        // Action buttons
        document.getElementById('runBtn').addEventListener('click', () => this.run());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('clearPathBtn').addEventListener('click', () => this.clearPath());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // Resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    getGridPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        return { x: Math.max(0, Math.min(x, this.gridSize - 1)), y: Math.max(0, Math.min(y, this.gridSize - 1)) };
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        this.handleDraw(this.getGridPos(e));
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        this.handleDraw(this.getGridPos(e));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.isDrawing = true;
        const touch = e.touches[0];
        this.handleDraw(this.getGridPos(touch));
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        const touch = e.touches[0];
        this.handleDraw(this.getGridPos(touch));
    }
    
    handleDraw(pos) {
        if (this.isRunning) return;
        
        const { x, y } = pos;
        
        // Don't draw on start or goal
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
                if (this.grid[y][x] === 0) {
                    this.start = { x, y };
                }
                break;
            case 'goal':
                if (this.grid[y][x] === 0) {
                    this.goal = { x, y };
                }
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
            this.processAnimationQueue();
            return;
        }
        
        this.clearPath();
        this.isRunning = true;
        this.isPaused = false;
        this.updateUI();
        
        document.getElementById('plannerStatus').textContent = 'Searching...';
        
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
    }
    
    async runAStar() {
        const openSet = [{ ...this.start, g: 0, f: this.heuristic(this.start, this.goal), parent: null }];
        const closedSet = new Set();
        const gScores = {};
        gScores[`${this.start.x},${this.start.y}`] = 0;
        
        while (openSet.length > 0 && this.isRunning) {
            if (this.isPaused) {
                await this.waitForResume();
            }
            
            // Sort by f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            if (current.x === this.goal.x && current.y === this.goal.y) {
                this.reconstructPath(current);
                document.getElementById('plannerStatus').textContent = 'Path Found!';
                this.isRunning = false;
                this.updateUI();
                return;
            }
            
            closedSet.add(currentKey);
            this.visited.add(currentKey);
            
            // Update frontier visualization
            this.frontier.clear();
            openSet.forEach(n => this.frontier.add(`${n.x},${n.y}`));
            
            this.draw();
            await this.delay(this.animationSpeed);
            
            // Explore neighbors (8-directional)
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) continue;
                if (this.grid[neighbor.y][neighbor.x] === 1) continue;
                
                const tentativeG = current.g + this.distance(current, neighbor);
                
                const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                
                if (!existingNode) {
                    neighbor.g = tentativeG;
                    neighbor.f = tentativeG + this.heuristic(neighbor, this.goal);
                    neighbor.parent = current;
                    openSet.push(neighbor);
                    gScores[neighborKey] = tentativeG;
                } else if (tentativeG < gScores[neighborKey]) {
                    existingNode.g = tentativeG;
                    existingNode.f = tentativeG + this.heuristic(neighbor, this.goal);
                    existingNode.parent = current;
                    gScores[neighborKey] = tentativeG;
                }
            }
            
            document.getElementById('nodesExplored').textContent = closedSet.size;
        }
        
        if (this.isRunning) {
            document.getElementById('plannerStatus').textContent = 'No Path Found';
            this.isRunning = false;
            this.updateUI();
        }
    }
    
    async runDijkstra() {
        const openSet = [{ ...this.start, dist: 0, parent: null }];
        const closedSet = new Set();
        const distances = {};
        distances[`${this.start.x},${this.start.y}`] = 0;
        
        while (openSet.length > 0 && this.isRunning) {
            if (this.isPaused) {
                await this.waitForResume();
            }
            
            // Sort by distance
            openSet.sort((a, b) => a.dist - b.dist);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            if (closedSet.has(currentKey)) continue;
            
            if (current.x === this.goal.x && current.y === this.goal.y) {
                this.reconstructPath(current);
                document.getElementById('plannerStatus').textContent = 'Path Found!';
                this.isRunning = false;
                this.updateUI();
                return;
            }
            
            closedSet.add(currentKey);
            this.visited.add(currentKey);
            
            this.frontier.clear();
            openSet.forEach(n => this.frontier.add(`${n.x},${n.y}`));
            
            this.draw();
            await this.delay(this.animationSpeed);
            
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) continue;
                if (this.grid[neighbor.y][neighbor.x] === 1) continue;
                
                const newDist = current.dist + this.distance(current, neighbor);
                
                if (distances[neighborKey] === undefined || newDist < distances[neighborKey]) {
                    distances[neighborKey] = newDist;
                    neighbor.dist = newDist;
                    neighbor.parent = current;
                    openSet.push(neighbor);
                }
            }
            
            document.getElementById('nodesExplored').textContent = closedSet.size;
        }
        
        if (this.isRunning) {
            document.getElementById('plannerStatus').textContent = 'No Path Found';
            this.isRunning = false;
            this.updateUI();
        }
    }
    
    async runRRT() {
        const nodes = [{ ...this.start, parent: null }];
        const maxIterations = 2000;
        const stepSize = 2;
        const goalBias = 0.1;
        
        this.rrtTree = nodes;
        
        for (let i = 0; i < maxIterations && this.isRunning; i++) {
            if (this.isPaused) {
                await this.waitForResume();
            }
            
            // Random point (with goal bias)
            let randomPoint;
            if (Math.random() < goalBias) {
                randomPoint = { ...this.goal };
            } else {
                randomPoint = {
                    x: Math.random() * this.gridSize,
                    y: Math.random() * this.gridSize
                };
            }
            
            // Find nearest node
            let nearest = nodes[0];
            let minDist = this.distance(nearest, randomPoint);
            
            for (const node of nodes) {
                const d = this.distance(node, randomPoint);
                if (d < minDist) {
                    minDist = d;
                    nearest = node;
                }
            }
            
            // Step towards random point
            const angle = Math.atan2(randomPoint.y - nearest.y, randomPoint.x - nearest.x);
            const newNode = {
                x: nearest.x + Math.cos(angle) * stepSize,
                y: nearest.y + Math.sin(angle) * stepSize,
                parent: nearest
            };
            
            // Check bounds
            if (newNode.x < 0 || newNode.x >= this.gridSize || 
                newNode.y < 0 || newNode.y >= this.gridSize) {
                continue;
            }
            
            // Check collision
            if (!this.lineCollision(nearest, newNode)) {
                nodes.push(newNode);
                this.rrtTree = nodes;
                
                // Check if we reached the goal
                if (this.distance(newNode, this.goal) < stepSize) {
                    const goalNode = { ...this.goal, parent: newNode };
                    nodes.push(goalNode);
                    this.reconstructRRTPath(goalNode);
                    document.getElementById('plannerStatus').textContent = 'Path Found!';
                    this.isRunning = false;
                    this.updateUI();
                    return;
                }
                
                if (i % 5 === 0) {
                    this.draw();
                    await this.delay(this.animationSpeed / 3);
                }
            }
            
            document.getElementById('nodesExplored').textContent = nodes.length;
        }
        
        if (this.isRunning) {
            document.getElementById('plannerStatus').textContent = 'No Path Found';
            this.isRunning = false;
            this.updateUI();
        }
    }
    
    lineCollision(from, to) {
        const steps = Math.ceil(this.distance(from, to) * 2);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.floor(from.x + (to.x - from.x) * t);
            const y = Math.floor(from.y + (to.y - from.y) * t);
            
            if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
                if (this.grid[y][x] === 1) {
                    return true;
                }
            }
        }
        return false;
    }
    
    getNeighbors(node) {
        const neighbors = [];
        const dirs = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],          [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            
            if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                // Check diagonal movement validity
                if (dx !== 0 && dy !== 0) {
                    // Prevent corner cutting
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
        // Octile distance for 8-directional movement
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
        
        document.getElementById('pathLength').textContent = this.path.length;
        this.draw();
    }
    
    reconstructRRTPath(endNode) {
        this.path = [];
        let current = endNode;
        
        while (current) {
            this.path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        
        document.getElementById('pathLength').textContent = this.path.length + ' nodes';
        this.draw();
    }
    
    // ==================== UTILITIES ====================
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    waitForResume() {
        return new Promise(resolve => {
            const checkResume = () => {
                if (!this.isPaused) {
                    resolve();
                } else {
                    setTimeout(checkResume, 100);
                }
            };
            checkResume();
        });
    }
    
    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').querySelector('span').textContent = 
            this.isPaused ? 'Resume' : 'Pause';
        document.getElementById('plannerStatus').textContent = 
            this.isPaused ? 'Paused' : 'Searching...';
    }
    
    clearPath() {
        this.stopRunning();
        this.path = [];
        this.visited.clear();
        this.frontier.clear();
        this.rrtTree = null;
        document.getElementById('nodesExplored').textContent = '0';
        document.getElementById('pathLength').textContent = '-';
        document.getElementById('plannerStatus').textContent = 'Ready';
        this.draw();
    }
    
    reset() {
        this.stopRunning();
        this.start = { x: 2, y: 12 };
        this.goal = { x: 22, y: 12 };
        this.initGrid();
        this.clearPath();
    }
    
    stopRunning() {
        this.isRunning = false;
        this.isPaused = false;
        this.updateUI();
    }
    
    updateUI() {
        const runBtn = document.getElementById('runBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        runBtn.disabled = this.isRunning && !this.isPaused;
        pauseBtn.disabled = !this.isRunning;
        
        if (!this.isRunning) {
            pauseBtn.querySelector('span').textContent = 'Pause';
        }
    }
    
    // ==================== DRAWING ====================
    
    draw() {
        const ctx = this.ctx;
        const size = this.canvasSize;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, size, size);
        
        // Draw grid
        this.drawGrid();
        
        // Draw RRT tree if applicable
        if (this.rrtTree && this.currentAlgorithm === 'rrt') {
            this.drawRRTTree();
        }
        
        // Draw visited cells
        this.visited.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.drawCell(x, y, this.colors.visited);
        });
        
        // Draw frontier
        this.frontier.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.drawCell(x, y, this.colors.frontier);
        });
        
        // Draw obstacles
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 1) {
                    this.drawObstacle(x, y);
                }
            }
        }
        
        // Draw path
        if (this.path.length > 0) {
            this.drawPath();
        }
        
        // Draw start and goal
        this.drawStartGoal();
    }
    
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.gridLine;
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.gridSize; i++) {
            const pos = i * this.cellSize;
            
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, this.canvasSize);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(this.canvasSize, pos);
            ctx.stroke();
        }
    }
    
    drawCell(x, y, color) {
        const ctx = this.ctx;
        const padding = 1;
        
        ctx.fillStyle = color;
        ctx.fillRect(
            x * this.cellSize + padding,
            y * this.cellSize + padding,
            this.cellSize - padding * 2,
            this.cellSize - padding * 2
        );
    }
    
    drawObstacle(x, y) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const padding = 1;
        
        // Dark fill with subtle gradient
        const gradient = ctx.createLinearGradient(
            x * cs, y * cs, 
            (x + 1) * cs, (y + 1) * cs
        );
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            x * cs + padding,
            y * cs + padding,
            cs - padding * 2,
            cs - padding * 2
        );
        
        // Subtle border
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x * cs + padding,
            y * cs + padding,
            cs - padding * 2,
            cs - padding * 2
        );
    }
    
    drawStartGoal() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        // Start point
        ctx.fillStyle = this.colors.start;
        ctx.shadowColor = this.colors.start;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(
            (this.start.x + 0.5) * cs,
            (this.start.y + 0.5) * cs,
            cs * 0.35,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Goal point (star shape)
        ctx.fillStyle = this.colors.goal;
        ctx.shadowColor = this.colors.goal;
        ctx.shadowBlur = 15;
        
        const gx = (this.goal.x + 0.5) * cs;
        const gy = (this.goal.y + 0.5) * cs;
        const outerR = cs * 0.4;
        const innerR = cs * 0.2;
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = (i * 72 - 90) * Math.PI / 180;
            const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
            
            if (i === 0) {
                ctx.moveTo(gx + Math.cos(outerAngle) * outerR, gy + Math.sin(outerAngle) * outerR);
            } else {
                ctx.lineTo(gx + Math.cos(outerAngle) * outerR, gy + Math.sin(outerAngle) * outerR);
            }
            ctx.lineTo(gx + Math.cos(innerAngle) * innerR, gy + Math.sin(innerAngle) * innerR);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
    
    drawPath() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        if (this.path.length < 2) return;
        
        // Glow effect
        ctx.strokeStyle = this.colors.path;
        ctx.lineWidth = cs * 0.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = this.colors.path;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo((this.path[0].x + 0.5) * cs, (this.path[0].y + 0.5) * cs);
        
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo((this.path[i].x + 0.5) * cs, (this.path[i].y + 0.5) * cs);
        }
        ctx.stroke();
        
        // Inner bright line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = cs * 0.1;
        ctx.shadowBlur = 0;
        
        ctx.beginPath();
        ctx.moveTo((this.path[0].x + 0.5) * cs, (this.path[0].y + 0.5) * cs);
        
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo((this.path[i].x + 0.5) * cs, (this.path[i].y + 0.5) * cs);
        }
        ctx.stroke();
    }
    
    drawRRTTree() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        ctx.strokeStyle = this.colors.rrtTree;
        ctx.lineWidth = 1.5;
        
        for (const node of this.rrtTree) {
            if (node.parent) {
                ctx.beginPath();
                ctx.moveTo((node.parent.x + 0.5) * cs, (node.parent.y + 0.5) * cs);
                ctx.lineTo((node.x + 0.5) * cs, (node.y + 0.5) * cs);
                ctx.stroke();
            }
        }
        
        // Draw nodes
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        for (const node of this.rrtTree) {
            ctx.beginPath();
            ctx.arc((node.x + 0.5) * cs, (node.y + 0.5) * cs, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure the section exists
    setTimeout(() => {
        if (document.getElementById('pathPlannerContainer')) {
            window.pathPlanner = new PathPlanner('pathPlannerContainer');
        }
    }, 200);
});

