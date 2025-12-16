/**
 * Interactive PID Ball Balancing Demo
 * Demonstrates PID control concepts visually
 * For robotics portfolio - showcasing control systems expertise
 */

class PIDDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('PIDDemo: Container not found:', containerId);
            return;
        }
        
        // Physics
        this.ballPos = 0;          // -1 to 1, center is 0
        this.ballVel = 0;
        this.beamAngle = 0;        // radians
        this.gravity = 0.0015;
        this.friction = 0.995;
        this.maxAngle = Math.PI / 6; // 30 degrees max tilt
        
        // Setpoint (target position)
        this.setpoint = 0;
        this.setpointMode = 'center'; // 'center', 'left', 'right', 'sine'
        
        // PID gains
        this.kP = 2.0;
        this.kI = 0.1;
        this.kD = 1.5;
        
        // PID state
        this.integral = 0;
        this.lastError = 0;
        this.integralLimit = 0.5;
        
        // Animation
        this.animationFrame = null;
        this.time = 0;
        this.isRunning = true;
        
        // History for graph
        this.historyLength = 200;
        this.positionHistory = [];
        this.setpointHistory = [];
        this.errorHistory = [];
        
        // Disturbance
        this.disturbance = 0;
        
        // Colors
        this.colors = {
            beam: '#1a1a2e',
            beamHighlight: '#2a2a4e',
            ball: '#00f0ff',
            ballGlow: 'rgba(0, 240, 255, 0.5)',
            pivot: '#00ff88',
            setpoint: '#ff00a0',
            error: '#ff6b6b',
            graphLine: '#00f0ff',
            graphSetpoint: '#ff00a0',
            graphBg: 'rgba(10, 10, 20, 0.8)'
        };
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupCanvas();
        this.setupEventListeners();
        this.animate();
        console.log('PIDDemo initialized successfully');
    }
    
    createUI() {
        this.container.innerHTML = `
            <div class="pid-demo-wrapper">
                <div class="pid-visualization">
                    <canvas class="pid-canvas"></canvas>
                    <div class="pid-stats">
                        <div class="pid-stat">
                            <span class="stat-label">Position</span>
                            <span class="stat-value position-value">0.00</span>
                        </div>
                        <div class="pid-stat">
                            <span class="stat-label">Error</span>
                            <span class="stat-value error-value">0.00</span>
                        </div>
                        <div class="pid-stat">
                            <span class="stat-label">Output</span>
                            <span class="stat-value output-value">0.00</span>
                        </div>
                    </div>
                </div>
                <div class="pid-controls">
                    <div class="pid-sliders">
                        <div class="slider-group">
                            <div class="slider-header">
                                <label>P <span class="gain-label">(Proportional)</span></label>
                                <span class="slider-value kp-value">2.0</span>
                            </div>
                            <input type="range" class="pid-slider kp-slider" min="0" max="5" step="0.1" value="2.0">
                            <div class="slider-hint">Reacts to current error</div>
                        </div>
                        <div class="slider-group">
                            <div class="slider-header">
                                <label>I <span class="gain-label">(Integral)</span></label>
                                <span class="slider-value ki-value">0.1</span>
                            </div>
                            <input type="range" class="pid-slider ki-slider" min="0" max="1" step="0.01" value="0.1">
                            <div class="slider-hint">Eliminates steady-state error</div>
                        </div>
                        <div class="slider-group">
                            <div class="slider-header">
                                <label>D <span class="gain-label">(Derivative)</span></label>
                                <span class="slider-value kd-value">1.5</span>
                            </div>
                            <input type="range" class="pid-slider kd-slider" min="0" max="5" step="0.1" value="1.5">
                            <div class="slider-hint">Dampens oscillations</div>
                        </div>
                    </div>
                    <div class="pid-actions">
                        <div class="setpoint-buttons">
                            <span class="action-label">Target:</span>
                            <button class="setpoint-btn" data-pos="left">← Left</button>
                            <button class="setpoint-btn active" data-pos="center">Center</button>
                            <button class="setpoint-btn" data-pos="right">Right →</button>
                            <button class="setpoint-btn" data-pos="sine">~ Wave</button>
                        </div>
                        <div class="control-buttons">
                            <button class="pid-btn disturb-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                <span>Disturb!</span>
                            </button>
                            <button class="pid-btn reset-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>
                    <div class="pid-presets">
                        <span class="preset-label">Presets:</span>
                        <button class="preset-btn" data-p="3" data-i="0" data-d="0">P only</button>
                        <button class="preset-btn" data-p="2" data-i="0.5" data-d="0">PI</button>
                        <button class="preset-btn" data-p="2" data-i="0.1" data-d="1.5">PID (tuned)</button>
                        <button class="preset-btn" data-p="5" data-i="0.5" data-d="0.5">Aggressive</button>
                        <button class="preset-btn" data-p="0.5" data-i="0.05" data-d="2">Damped</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupCanvas() {
        this.canvas = this.container.querySelector('.pid-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        const containerEl = this.canvas.parentElement;
        const rect = containerEl.getBoundingClientRect();
        const width = Math.min(rect.width - 20, 600);
        const height = 280;
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.width = width;
        this.height = height;
    }
    
    setupEventListeners() {
        // Sliders
        const kpSlider = this.container.querySelector('.kp-slider');
        const kiSlider = this.container.querySelector('.ki-slider');
        const kdSlider = this.container.querySelector('.kd-slider');
        
        if (kpSlider) {
            kpSlider.addEventListener('input', (e) => {
                this.kP = parseFloat(e.target.value);
                this.container.querySelector('.kp-value').textContent = this.kP.toFixed(1);
            });
        }
        
        if (kiSlider) {
            kiSlider.addEventListener('input', (e) => {
                this.kI = parseFloat(e.target.value);
                this.container.querySelector('.ki-value').textContent = this.kI.toFixed(2);
                this.integral = 0; // Reset integral when gain changes
            });
        }
        
        if (kdSlider) {
            kdSlider.addEventListener('input', (e) => {
                this.kD = parseFloat(e.target.value);
                this.container.querySelector('.kd-value').textContent = this.kD.toFixed(1);
            });
        }
        
        // Setpoint buttons
        this.container.querySelectorAll('.setpoint-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.setpoint-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setpointMode = btn.dataset.pos;
                this.integral = 0;
            });
        });
        
        // Disturb button
        const disturbBtn = this.container.querySelector('.disturb-btn');
        if (disturbBtn) {
            disturbBtn.addEventListener('click', () => {
                this.ballVel += (Math.random() - 0.5) * 0.1;
                this.disturbance = (Math.random() - 0.5) * 0.3;
                setTimeout(() => this.disturbance = 0, 500);
            });
        }
        
        // Reset button
        const resetBtn = this.container.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        
        // Preset buttons
        this.container.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.kP = parseFloat(btn.dataset.p);
                this.kI = parseFloat(btn.dataset.i);
                this.kD = parseFloat(btn.dataset.d);
                
                const kpSlider = this.container.querySelector('.kp-slider');
                const kiSlider = this.container.querySelector('.ki-slider');
                const kdSlider = this.container.querySelector('.kd-slider');
                
                if (kpSlider) kpSlider.value = this.kP;
                if (kiSlider) kiSlider.value = this.kI;
                if (kdSlider) kdSlider.value = this.kD;
                
                this.container.querySelector('.kp-value').textContent = this.kP.toFixed(1);
                this.container.querySelector('.ki-value').textContent = this.kI.toFixed(2);
                this.container.querySelector('.kd-value').textContent = this.kD.toFixed(1);
                
                this.integral = 0;
            });
        });
        
        // Resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    reset() {
        this.ballPos = 0;
        this.ballVel = 0;
        this.beamAngle = 0;
        this.integral = 0;
        this.lastError = 0;
        this.positionHistory = [];
        this.setpointHistory = [];
        this.disturbance = 0;
    }
    
    getSetpoint() {
        switch (this.setpointMode) {
            case 'left': return -0.6;
            case 'right': return 0.6;
            case 'sine': return Math.sin(this.time * 0.02) * 0.5;
            default: return 0;
        }
    }
    
    update() {
        this.time++;
        
        // Get current setpoint
        this.setpoint = this.getSetpoint();
        
        // Calculate error
        const error = this.setpoint - this.ballPos;
        
        // PID calculations
        // Proportional
        const P = this.kP * error;
        
        // Integral (with anti-windup)
        this.integral += error;
        this.integral = Math.max(-this.integralLimit, Math.min(this.integralLimit, this.integral));
        const I = this.kI * this.integral;
        
        // Derivative
        const D = this.kD * (error - this.lastError);
        this.lastError = error;
        
        // Control output (beam angle)
        let output = P + I + D;
        output = Math.max(-1, Math.min(1, output));
        
        // Smooth beam angle transition
        const targetAngle = output * this.maxAngle;
        this.beamAngle += (targetAngle - this.beamAngle) * 0.1;
        
        // Physics: ball acceleration from beam angle + disturbance
        const acceleration = Math.sin(this.beamAngle) * this.gravity + this.disturbance * 0.01;
        this.ballVel += acceleration;
        this.ballVel *= this.friction;
        this.ballPos += this.ballVel;
        
        // Boundary bounce
        if (this.ballPos > 1) {
            this.ballPos = 1;
            this.ballVel *= -0.5;
        } else if (this.ballPos < -1) {
            this.ballPos = -1;
            this.ballVel *= -0.5;
        }
        
        // Update history
        this.positionHistory.push(this.ballPos);
        this.setpointHistory.push(this.setpoint);
        if (this.positionHistory.length > this.historyLength) {
            this.positionHistory.shift();
            this.setpointHistory.shift();
        }
        
        // Update stats display
        this.updateStats(error, output);
    }
    
    updateStats(error, output) {
        const posEl = this.container.querySelector('.position-value');
        const errEl = this.container.querySelector('.error-value');
        const outEl = this.container.querySelector('.output-value');
        
        if (posEl) posEl.textContent = this.ballPos.toFixed(2);
        if (errEl) errEl.textContent = error.toFixed(2);
        if (outEl) outEl.textContent = output.toFixed(2);
    }
    
    draw() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
        
        // Draw graph area (bottom portion)
        const graphHeight = 80;
        const graphY = h - graphHeight - 10;
        this.drawGraph(ctx, 10, graphY, w - 20, graphHeight);
        
        // Draw beam and ball (top portion)
        const beamCenterX = w / 2;
        const beamCenterY = (graphY - 20) / 2 + 20;
        const beamLength = Math.min(w * 0.7, 350);
        const beamHeight = 12;
        
        this.drawBeam(ctx, beamCenterX, beamCenterY, beamLength, beamHeight);
        this.drawBall(ctx, beamCenterX, beamCenterY, beamLength);
        this.drawSetpointMarker(ctx, beamCenterX, beamCenterY, beamLength);
    }
    
    drawBeam(ctx, cx, cy, length, height) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.beamAngle);
        
        // Beam shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, height + 5, length / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Beam body
        const gradient = ctx.createLinearGradient(0, -height, 0, height);
        gradient.addColorStop(0, this.colors.beamHighlight);
        gradient.addColorStop(0.5, this.colors.beam);
        gradient.addColorStop(1, '#0f0f1a');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-length / 2, -height / 2, length, height, 4);
        ctx.fill();
        
        // Beam edge highlight
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-length / 2 + 4, -height / 2);
        ctx.lineTo(length / 2 - 4, -height / 2);
        ctx.stroke();
        
        // Track groove
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-length / 2 + 20, 0);
        ctx.lineTo(length / 2 - 20, 0);
        ctx.stroke();
        
        // End caps
        ctx.fillStyle = this.colors.beam;
        ctx.beginPath();
        ctx.arc(-length / 2 + 10, 0, 6, 0, Math.PI * 2);
        ctx.arc(length / 2 - 10, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Pivot point (fixed, doesn't rotate)
        ctx.fillStyle = this.colors.pivot;
        ctx.shadowColor = this.colors.pivot;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy + height / 2 + 3, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Pivot inner
        ctx.fillStyle = '#0a0a0f';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy + height / 2 + 3, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Base
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy + height / 2 + 10);
        ctx.lineTo(cx + 25, cy + height / 2 + 10);
        ctx.lineTo(cx + 35, cy + height / 2 + 40);
        ctx.lineTo(cx - 35, cy + height / 2 + 40);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawBall(ctx, cx, cy, beamLength) {
        // Calculate ball position on beam
        const ballX = this.ballPos * (beamLength / 2 - 30);
        const ballRadius = 14;
        
        // Transform to beam coordinates
        const cosA = Math.cos(this.beamAngle);
        const sinA = Math.sin(this.beamAngle);
        
        const worldX = cx + ballX * cosA;
        const worldY = cy + ballX * sinA - ballRadius - 4;
        
        // Ball shadow on beam
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.beamAngle);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(ballX, -2, ballRadius * 0.8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Ball glow
        ctx.fillStyle = this.colors.ballGlow;
        ctx.shadowColor = this.colors.ball;
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(worldX, worldY, ballRadius + 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball body
        const ballGradient = ctx.createRadialGradient(
            worldX - 4, worldY - 4, 2,
            worldX, worldY, ballRadius
        );
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(0.3, this.colors.ball);
        ballGradient.addColorStop(1, '#0088aa');
        
        ctx.fillStyle = ballGradient;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(worldX, worldY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(worldX - 4, worldY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawSetpointMarker(ctx, cx, cy, beamLength) {
        const markerX = this.setpoint * (beamLength / 2 - 30);
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.beamAngle);
        
        // Setpoint indicator (triangle pointing down)
        ctx.fillStyle = this.colors.setpoint;
        ctx.shadowColor = this.colors.setpoint;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(markerX, -35);
        ctx.lineTo(markerX - 8, -45);
        ctx.lineTo(markerX + 8, -45);
        ctx.closePath();
        ctx.fill();
        
        // Dashed line to beam
        ctx.strokeStyle = this.colors.setpoint;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(markerX, -35);
        ctx.lineTo(markerX, -8);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }
    
    drawGraph(ctx, x, y, width, height) {
        // Background
        ctx.fillStyle = this.colors.graphBg;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 6);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.beginPath();
        // Horizontal center
        ctx.moveTo(x, y + height / 2);
        ctx.lineTo(x + width, y + height / 2);
        // Quarters
        ctx.moveTo(x, y + height / 4);
        ctx.lineTo(x + width, y + height / 4);
        ctx.moveTo(x, y + 3 * height / 4);
        ctx.lineTo(x + width, y + 3 * height / 4);
        ctx.stroke();
        
        // Labels
        ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('+1', x + 4, y + 12);
        ctx.fillText('0', x + 4, y + height / 2 + 4);
        ctx.fillText('-1', x + 4, y + height - 4);
        
        if (this.positionHistory.length < 2) return;
        
        const padding = 30;
        const graphWidth = width - padding;
        const graphHeight = height - 10;
        const graphX = x + padding;
        const graphY = y + 5;
        
        // Draw setpoint line
        ctx.strokeStyle = this.colors.setpoint;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < this.setpointHistory.length; i++) {
            const px = graphX + (i / this.historyLength) * graphWidth;
            const py = graphY + graphHeight / 2 - this.setpointHistory[i] * (graphHeight / 2);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Draw position line
        ctx.strokeStyle = this.colors.graphLine;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.colors.graphLine;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let i = 0; i < this.positionHistory.length; i++) {
            const px = graphX + (i / this.historyLength) * graphWidth;
            const py = graphY + graphHeight / 2 - this.positionHistory[i] * (graphHeight / 2);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Current position dot
        if (this.positionHistory.length > 0) {
            const lastIdx = this.positionHistory.length - 1;
            const lastX = graphX + (lastIdx / this.historyLength) * graphWidth;
            const lastY = graphY + graphHeight / 2 - this.positionHistory[lastIdx] * (graphHeight / 2);
            
            ctx.fillStyle = this.colors.ball;
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Legend
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = this.colors.graphLine;
        ctx.fillText('● Position', x + width - 100, y + 15);
        ctx.fillStyle = this.colors.setpoint;
        ctx.fillText('● Target', x + width - 100, y + 28);
    }
    
    animate() {
        this.update();
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('pidDemoContainer');
    if (container) {
        window.pidDemo = new PIDDemo('pidDemoContainer');
    }
});

