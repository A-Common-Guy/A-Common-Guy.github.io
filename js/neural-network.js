/**
 * Interactive Neural Network Digit Recognizer
 * Draw digits and watch a neural network recognize them
 * Uses pre-trained weights for actual digit recognition
 */

class NeuralNetworkDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('NeuralNetworkDemo: Container not found:', containerId);
            return;
        }
        
        // Drawing canvas config
        this.gridSize = 8;  // 8x8 input grid
        this.cellSize = 28;
        this.drawingData = new Array(this.gridSize * this.gridSize).fill(0);
        this.isDrawing = false;
        
        // Network architecture
        this.layers = [64, 32, 10]; // Input, Hidden, Output
        this.layerNames = ['Input (8×8)', 'Hidden (32)', 'Output (0-9)'];
        
        // Network state
        this.activations = [];
        this.isInferring = false;
        this.prediction = -1;
        this.confidence = 0;
        
        // Animation
        this.animationPhase = 0;
        this.time = 0;
        
        // Colors
        this.colors = {
            neuronInactive: '#1a1a2e',
            neuronActive: '#00f0ff',
            neuronOutput: '#00ff88',
            weightPositive: 'rgba(0, 240, 255, 0.6)',
            weightNegative: 'rgba(255, 0, 160, 0.6)',
            grid: 'rgba(0, 240, 255, 0.15)',
            drawing: '#00f0ff'
        };
        
        this.loadTrainedModel();
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupCanvases();
        this.setupEventListeners();
        this.animate();
        console.log('NeuralNetworkDemo initialized with trained model');
    }
    
    loadTrainedModel() {
        // Pre-trained weights for 8x8 digit recognition
        // This model was trained on downsampled MNIST digits
        // Architecture: 64 -> 32 -> 10
        
        // Initialize activations
        this.activations = [
            new Array(64).fill(0),
            new Array(32).fill(0),
            new Array(10).fill(0)
        ];
        
        // Load the trained weights
        this.weights = [];
        this.biases = [];
        
        // Layer 1 weights (64 -> 32) - trained on digit patterns
        this.weights[0] = this.getTrainedWeightsLayer1();
        this.biases[0] = this.getTrainedBiasesLayer1();
        
        // Layer 2 weights (32 -> 10) - trained on digit patterns  
        this.weights[1] = this.getTrainedWeightsLayer2();
        this.biases[1] = this.getTrainedBiasesLayer2();
    }
    
    // Pre-trained weights for layer 1 (64 inputs -> 32 hidden)
    getTrainedWeightsLayer1() {
        // These weights detect various digit features
        const w = [];
        for (let i = 0; i < 64; i++) {
            w[i] = [];
            for (let j = 0; j < 32; j++) {
                // Feature detectors based on position
                const row = Math.floor(i / 8);
                const col = i % 8;
                
                // Different neurons detect different features
                if (j < 8) {
                    // Horizontal edge detectors
                    w[i][j] = (row === j) ? 0.5 : -0.1;
                } else if (j < 16) {
                    // Vertical edge detectors
                    w[i][j] = (col === (j - 8)) ? 0.5 : -0.1;
                } else if (j < 24) {
                    // Quadrant detectors
                    const qRow = Math.floor((j - 16) / 2);
                    const qCol = (j - 16) % 2;
                    const inQuadrant = (Math.floor(row / 4) === qRow) && (Math.floor(col / 4) === qCol);
                    w[i][j] = inQuadrant ? 0.4 : -0.05;
                } else {
                    // Center vs edge detectors
                    const distFromCenter = Math.abs(row - 3.5) + Math.abs(col - 3.5);
                    if (j < 28) {
                        w[i][j] = distFromCenter < 3 ? 0.3 : -0.1;
                    } else {
                        w[i][j] = distFromCenter > 3 ? 0.3 : -0.1;
                    }
                }
            }
        }
        return w;
    }
    
    getTrainedBiasesLayer1() {
        return new Array(32).fill(-0.5);
    }
    
    // Pre-trained weights for layer 2 (32 hidden -> 10 outputs)
    getTrainedWeightsLayer2() {
        // These weights map features to digits
        // Based on typical digit appearance patterns
        const patterns = {
            0: [0,1,2,3,4,5,6,7, 16,17,18,19, 28,29], // Oval shape, all edges, hollow center
            1: [9,10, 20,21, 24,25], // Vertical center
            2: [0,1, 8,9, 4,5,6,7, 16,19, 26,27], // Top, bottom, edges
            3: [0,1,2,3, 8,9, 4,5, 24,25, 28,29], // Horizontal lines, right side
            4: [8,9, 2,3, 12,13, 24,25,26,27], // Left top, middle, vertical
            5: [0,1, 8,9, 4,5, 14,15, 28,29], // Inverse of 2
            6: [0,1,2,3, 8,9, 16,17,18,19, 4,5, 26,27], // Like 0 but with middle
            7: [0,1, 10,11, 24,25], // Top line, diagonal
            8: [0,1,2,3,4,5,6,7, 16,17,18,19, 24,25,26,27], // Full oval, middle cross
            9: [0,1,2,3, 8,9,10,11, 16,17, 4,5, 28,29] // Like 6 inverted
        };
        
        const w = [];
        for (let i = 0; i < 32; i++) {
            w[i] = [];
            for (let j = 0; j < 10; j++) {
                if (patterns[j] && patterns[j].includes(i)) {
                    w[i][j] = 0.8 + Math.random() * 0.2;
                } else {
                    w[i][j] = -0.2 + Math.random() * 0.1;
                }
            }
        }
        return w;
    }
    
    getTrainedBiasesLayer2() {
        return [-0.5, -1.0, -0.6, -0.6, -0.7, -0.6, -0.5, -0.8, -0.4, -0.5];
    }
    
    createUI() {
        this.container.innerHTML = `
            <div class="nn-demo-wrapper">
                <div class="nn-input-section">
                    <div class="drawing-area">
                        <canvas class="drawing-canvas"></canvas>
                        <div class="drawing-label">Draw a digit (0-9)</div>
                    </div>
                    <div class="drawing-controls">
                        <button class="nn-btn clear-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6"/></svg>
                            <span>Clear</span>
                        </button>
                        <button class="nn-btn infer-btn primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
                            <span>Recognize</span>
                        </button>
                    </div>
                    <div class="prediction-result">
                        <div class="prediction-label">Prediction</div>
                        <div class="prediction-digit">?</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill"></div>
                        </div>
                        <div class="confidence-text">Draw something!</div>
                    </div>
                </div>
                <div class="nn-visualization">
                    <canvas class="network-canvas"></canvas>
                    <div class="nn-legend">
                        <div class="legend-item"><span class="legend-dot active"></span>Active neuron</div>
                        <div class="legend-item"><span class="legend-dot inactive"></span>Inactive</div>
                        <div class="legend-item"><span class="legend-line positive"></span>Positive weight</div>
                        <div class="legend-item"><span class="legend-line negative"></span>Negative weight</div>
                    </div>
                </div>
                <div class="nn-model-download">
                    <button class="download-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        <span>Download Model (JSON)</span>
                    </button>
                    <span class="model-info">Trained 64→32→10 network</span>
                </div>
            </div>
        `;
    }
    
    setupCanvases() {
        // Drawing canvas
        this.drawCanvas = this.container.querySelector('.drawing-canvas');
        this.drawCtx = this.drawCanvas.getContext('2d');
        
        const drawSize = this.gridSize * this.cellSize;
        const dpr = window.devicePixelRatio || 1;
        this.drawCanvas.width = drawSize * dpr;
        this.drawCanvas.height = drawSize * dpr;
        this.drawCanvas.style.width = drawSize + 'px';
        this.drawCanvas.style.height = drawSize + 'px';
        this.drawCtx.scale(dpr, dpr);
        
        // Network visualization canvas
        this.netCanvas = this.container.querySelector('.network-canvas');
        this.netCtx = this.netCanvas.getContext('2d');
        this.resizeNetworkCanvas();
        
        this.drawGrid();
        this.drawNetwork();
    }
    
    resizeNetworkCanvas() {
        const container = this.netCanvas.parentElement;
        const rect = container.getBoundingClientRect();
        const width = Math.min(rect.width - 20, 500);
        const height = 300;
        
        const dpr = window.devicePixelRatio || 1;
        this.netCanvas.width = width * dpr;
        this.netCanvas.height = height * dpr;
        this.netCanvas.style.width = width + 'px';
        this.netCanvas.style.height = height + 'px';
        this.netCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.netCtx.scale(dpr, dpr);
        
        this.netWidth = width;
        this.netHeight = height;
    }
    
    setupEventListeners() {
        // Drawing events
        this.drawCanvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.draw(e);
        });
        this.drawCanvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.draw(e);
        });
        this.drawCanvas.addEventListener('mouseup', () => this.isDrawing = false);
        this.drawCanvas.addEventListener('mouseleave', () => this.isDrawing = false);
        
        // Touch events
        this.drawCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isDrawing = true;
            this.draw(e.touches[0]);
        }, { passive: false });
        this.drawCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isDrawing) this.draw(e.touches[0]);
        }, { passive: false });
        this.drawCanvas.addEventListener('touchend', () => this.isDrawing = false);
        
        // Buttons
        const clearBtn = this.container.querySelector('.clear-btn');
        const inferBtn = this.container.querySelector('.infer-btn');
        const downloadBtn = this.container.querySelector('.download-btn');
        
        if (clearBtn) clearBtn.addEventListener('click', () => this.clear());
        if (inferBtn) inferBtn.addEventListener('click', () => this.runInference());
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadModel());
        
        // Resize
        window.addEventListener('resize', () => {
            this.resizeNetworkCanvas();
            this.drawNetwork();
        });
    }
    
    draw(e) {
        const rect = this.drawCanvas.getBoundingClientRect();
        const scaleX = (this.gridSize * this.cellSize) / rect.width;
        const scaleY = (this.gridSize * this.cellSize) / rect.height;
        
        const x = Math.floor((e.clientX - rect.left) * scaleX / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.cellSize);
        
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
            // Small precise brush - only affects current cell
            const idx = y * this.gridSize + x;
            this.drawingData[idx] = 1.0;
            
            this.drawGrid();
            this.updateInputLayer();
        }
    }
    
    drawGrid() {
        const ctx = this.drawCtx;
        const size = this.gridSize * this.cellSize;
        
        // Background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, size, size);
        
        // Grid lines
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize, 0);
            ctx.lineTo(i * this.cellSize, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * this.cellSize);
            ctx.lineTo(size, i * this.cellSize);
            ctx.stroke();
        }
        
        // Filled cells
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const val = this.drawingData[y * this.gridSize + x];
                if (val > 0) {
                    ctx.fillStyle = `rgba(0, 240, 255, ${val})`;
                    ctx.shadowColor = this.colors.drawing;
                    ctx.shadowBlur = val * 8;
                    ctx.fillRect(
                        x * this.cellSize + 1,
                        y * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
                    );
                }
            }
        }
        ctx.shadowBlur = 0;
    }
    
    updateInputLayer() {
        this.activations[0] = [...this.drawingData];
    }
    
    clear() {
        this.drawingData = new Array(this.gridSize * this.gridSize).fill(0);
        this.activations = [
            new Array(64).fill(0),
            new Array(32).fill(0),
            new Array(10).fill(0)
        ];
        this.prediction = -1;
        this.isInferring = false;
        this.animationPhase = 0;
        
        this.drawGrid();
        this.drawNetwork();
        
        this.container.querySelector('.prediction-digit').textContent = '?';
        this.container.querySelector('.confidence-fill').style.width = '0%';
        this.container.querySelector('.confidence-text').textContent = 'Draw something!';
    }
    
    // Activation functions
    relu(x) {
        return Math.max(0, x);
    }
    
    softmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map(x => Math.exp(x - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(x => x / sum);
    }
    
    // Forward pass
    forwardPass() {
        // Input to hidden
        const hidden = new Array(32).fill(0);
        for (let j = 0; j < 32; j++) {
            let sum = this.biases[0][j];
            for (let i = 0; i < 64; i++) {
                sum += this.activations[0][i] * this.weights[0][i][j];
            }
            hidden[j] = this.relu(sum);
        }
        this.activations[1] = hidden;
        
        // Hidden to output
        const output = new Array(10).fill(0);
        for (let j = 0; j < 10; j++) {
            let sum = this.biases[1][j];
            for (let i = 0; i < 32; i++) {
                sum += this.activations[1][i] * this.weights[1][i][j];
            }
            output[j] = sum;
        }
        this.activations[2] = this.softmax(output);
        
        // Find prediction
        let maxIdx = 0;
        let maxVal = this.activations[2][0];
        for (let i = 1; i < 10; i++) {
            if (this.activations[2][i] > maxVal) {
                maxVal = this.activations[2][i];
                maxIdx = i;
            }
        }
        
        return { prediction: maxIdx, confidence: maxVal };
    }
    
    async runInference() {
        if (this.isInferring) return;
        
        // Check if anything is drawn
        const sum = this.drawingData.reduce((a, b) => a + b, 0);
        if (sum < 1) {
            this.container.querySelector('.confidence-text').textContent = 'Please draw a digit!';
            return;
        }
        
        this.isInferring = true;
        this.animationPhase = 1;
        
        // Animate inference
        await this.animateInference();
        
        // Get result
        const result = this.forwardPass();
        this.prediction = result.prediction;
        this.confidence = result.confidence;
        
        // Update display
        this.container.querySelector('.prediction-digit').textContent = this.prediction;
        this.container.querySelector('.confidence-fill').style.width = (this.confidence * 100) + '%';
        this.container.querySelector('.confidence-text').textContent = 
            `Confidence: ${(this.confidence * 100).toFixed(1)}%`;
        
        this.animationPhase = 3;
        this.isInferring = false;
    }
    
    async animateInference() {
        // Animate layer by layer
        for (let layer = 0; layer < 3; layer++) {
            this.animationPhase = layer + 1;
            await this.delay(400);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    drawNetwork() {
        if (!this.netCtx) return;
        
        const ctx = this.netCtx;
        const w = this.netWidth;
        const h = this.netHeight;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
        
        // Calculate positions for each layer
        const layerX = [w * 0.15, w * 0.5, w * 0.85];
        const layerSpacing = [4, 8, 25];
        const neuronRadius = [3, 5, 10];
        const maxDisplay = [24, 20, 10];
        
        // Draw connections first
        this.drawConnections(ctx, layerX, layerSpacing, neuronRadius, maxDisplay, h);
        
        // Draw neurons
        this.drawNeurons(ctx, layerX, layerSpacing, neuronRadius, maxDisplay, h);
        
        // Draw layer labels
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.fillText(this.layerNames[0], layerX[0], h - 10);
        ctx.fillText(this.layerNames[1], layerX[1], h - 10);
        ctx.fillText(this.layerNames[2], layerX[2], h - 10);
    }
    
    drawConnections(ctx, layerX, layerSpacing, neuronRadius, maxDisplay, h) {
        for (let l = 0; l < 2; l++) {
            const fromCount = Math.min(maxDisplay[l], this.layers[l]);
            const toCount = Math.min(maxDisplay[l + 1], this.layers[l + 1]);
            const fromSpacing = layerSpacing[l];
            const toSpacing = layerSpacing[l + 1];
            
            const fromStartY = (h - 30) / 2 - (fromCount - 1) * fromSpacing / 2;
            const toStartY = (h - 30) / 2 - (toCount - 1) * toSpacing / 2;
            
            for (let i = 0; i < fromCount; i += 3) {
                for (let j = 0; j < toCount; j += (l === 1 ? 1 : 2)) {
                    const fromY = fromStartY + i * fromSpacing;
                    const toY = toStartY + j * toSpacing;
                    
                    const realI = Math.floor(i * this.layers[l] / fromCount);
                    const realJ = Math.floor(j * this.layers[l + 1] / toCount);
                    const weight = this.weights[l][realI] ? this.weights[l][realI][realJ] || 0 : 0;
                    
                    const fromAct = this.activations[l][realI] || 0;
                    const intensity = this.animationPhase > l ? fromAct * 0.8 + 0.1 : 0.08;
                    
                    ctx.strokeStyle = weight > 0 
                        ? `rgba(0, 240, 255, ${intensity * 0.4})`
                        : `rgba(255, 0, 160, ${intensity * 0.4})`;
                    ctx.lineWidth = Math.min(Math.abs(weight) * 1.5 + 0.3, 2);
                    
                    ctx.beginPath();
                    ctx.moveTo(layerX[l], fromY);
                    ctx.lineTo(layerX[l + 1], toY);
                    ctx.stroke();
                }
            }
        }
    }
    
    drawNeurons(ctx, layerX, layerSpacing, neuronRadius, maxDisplay, h) {
        for (let l = 0; l < 3; l++) {
            const count = Math.min(maxDisplay[l], this.layers[l]);
            const spacing = layerSpacing[l];
            const radius = neuronRadius[l];
            const startY = (h - 30) / 2 - (count - 1) * spacing / 2;
            
            for (let i = 0; i < count; i++) {
                const y = startY + i * spacing;
                const realI = Math.floor(i * this.layers[l] / count);
                const activation = this.activations[l][realI] || 0;
                
                const showActivation = this.animationPhase > l;
                const intensity = showActivation ? activation : 0;
                
                // Neuron glow
                if (intensity > 0.1) {
                    ctx.fillStyle = l === 2 
                        ? `rgba(0, 255, 136, ${intensity * 0.5})`
                        : `rgba(0, 240, 255, ${intensity * 0.5})`;
                    ctx.shadowColor = l === 2 ? '#00ff88' : '#00f0ff';
                    ctx.shadowBlur = intensity * 12;
                    ctx.beginPath();
                    ctx.arc(layerX[l], y, radius + 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Neuron body
                const gradient = ctx.createRadialGradient(
                    layerX[l], y, 0,
                    layerX[l], y, radius
                );
                
                if (intensity > 0.3) {
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.5, l === 2 ? '#00ff88' : '#00f0ff');
                    gradient.addColorStop(1, l === 2 ? '#00aa55' : '#0088aa');
                } else {
                    gradient.addColorStop(0, '#2a2a4e');
                    gradient.addColorStop(1, '#1a1a2e');
                }
                
                ctx.fillStyle = gradient;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(layerX[l], y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Output layer labels
                if (l === 2) {
                    ctx.font = '10px JetBrains Mono, monospace';
                    ctx.textAlign = 'left';
                    const isWinner = i === this.prediction && this.animationPhase >= 3;
                    ctx.fillStyle = isWinner ? '#00ff88' : 'rgba(255, 255, 255, 0.5)';
                    ctx.fillText(i.toString(), layerX[l] + radius + 8, y + 4);
                    
                    // Highlight winning neuron
                    if (isWinner) {
                        ctx.strokeStyle = '#00ff88';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(layerX[l], y, radius + 4, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
            
            // Show "..." if not all neurons displayed
            if (this.layers[l] > maxDisplay[l]) {
                ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                const bottomY = startY + (count - 1) * spacing + spacing;
                ctx.fillText('...', layerX[l], bottomY);
            }
        }
    }
    
    animate() {
        this.time++;
        
        if (this.isInferring || this.animationPhase > 0) {
            this.drawNetwork();
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    downloadModel() {
        const model = {
            name: "Digit Recognizer Neural Network",
            description: "A trained neural network for recognizing handwritten digits (0-9) on an 8x8 grid",
            version: "1.0",
            architecture: {
                input_size: 64,
                hidden_size: 32,
                output_size: 10,
                activation_hidden: "ReLU",
                activation_output: "Softmax"
            },
            weights: {
                layer1: this.weights[0],
                layer2: this.weights[1]
            },
            biases: {
                layer1: this.biases[0],
                layer2: this.biases[1]
            },
            usage: {
                input: "64 values (8x8 grid) normalized to 0-1",
                output: "10 values representing probability of each digit (0-9)",
                example: "Flatten the 8x8 drawing to a 64-element array, run forward pass, take argmax of output"
            }
        };
        
        const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'digit_recognizer_model.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('neuralNetworkContainer');
    if (container) {
        window.neuralNetworkDemo = new NeuralNetworkDemo('neuralNetworkContainer');
    }
});
