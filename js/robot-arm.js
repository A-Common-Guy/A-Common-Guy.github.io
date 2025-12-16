/**
 * Interactive Inverse Kinematics Robot Arm
 * A 3-segment robotic arm that follows the mouse cursor
 * Uses analytical IK for smooth, realistic motion
 */

// Polyfill for roundRect (for older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

class RobotArm {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        
        // Arm configuration - 3 segments for more natural movement
        this.segments = [
            { length: 80, angle: 0, width: 18 },
            { length: 70, angle: 0, width: 14 },
            { length: 55, angle: 0, width: 10 }
        ];
        
        // Base position (will be set on resize)
        this.base = { x: 0, y: 0 };
        
        // Target (mouse position)
        this.target = { x: 0, y: 0 };
        this.smoothTarget = { x: 0, y: 0 };
        
        // Animation
        this.animationFrame = null;
        this.time = 0;
        
        // Colors matching the cyberpunk theme
        this.colors = {
            primary: '#00f0ff',
            primaryDim: 'rgba(0, 240, 255, 0.3)',
            primaryGlow: 'rgba(0, 240, 255, 0.6)',
            secondary: '#ff00a0',
            accent: '#00ff88',
            joint: '#0a0a0f',
            metal: '#1a1a2e',
            metalLight: '#2a2a4e'
        };
        
        // Idle animation parameters
        this.idleMode = true;
        this.lastMouseMove = Date.now();
        this.idleTimeout = 3000; // Switch to idle after 3 seconds
        
        this.init();
    }
    
    init() {
        this.resize();
        this.setupEventListeners();
        this.animate();
    }
    
    resize() {
        // Use full viewport dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Set canvas size with device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.scale(dpr, dpr);
        
        this.width = width;
        this.height = height;
        
        // Position base at bottom-left area
        this.base.x = this.width * 0.12;
        this.base.y = this.height * 0.88;
        
        // Initialize target
        this.target.x = this.base.x + 150;
        this.target.y = this.base.y - 100;
        this.smoothTarget = { ...this.target };
    }
    
    setupEventListeners() {
        // Mouse movement - canvas is full viewport, so clientX/Y works directly
        window.addEventListener('mousemove', (e) => {
            this.target.x = e.clientX;
            this.target.y = e.clientY;
            this.lastMouseMove = Date.now();
            this.idleMode = false;
        });
        
        // Touch support
        window.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.target.x = touch.clientX;
            this.target.y = touch.clientY;
            this.lastMouseMove = Date.now();
            this.idleMode = false;
        });
        
        // Resize handler with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });
    }
    
    // FABRIK (Forward And Backward Reaching Inverse Kinematics) algorithm
    solveIK(targetX, targetY) {
        const totalLength = this.segments.reduce((sum, s) => sum + s.length, 0);
        
        // Calculate distance to target
        const dx = targetX - this.base.x;
        const dy = targetY - this.base.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp target if too far
        let clampedX = targetX;
        let clampedY = targetY;
        
        if (distance > totalLength * 0.95) {
            const scale = (totalLength * 0.95) / distance;
            clampedX = this.base.x + dx * scale;
            clampedY = this.base.y + dy * scale;
        }
        
        // Joint positions
        let joints = [{ x: this.base.x, y: this.base.y }];
        
        // Initialize joints in current configuration
        let currentX = this.base.x;
        let currentY = this.base.y;
        for (let i = 0; i < this.segments.length; i++) {
            currentX += this.segments[i].length * Math.cos(this.segments[i].angle);
            currentY += this.segments[i].length * Math.sin(this.segments[i].angle);
            joints.push({ x: currentX, y: currentY });
        }
        
        // FABRIK iterations
        const iterations = 10;
        const tolerance = 1;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Backward reaching (from end effector to base)
            joints[joints.length - 1] = { x: clampedX, y: clampedY };
            
            for (let i = joints.length - 2; i >= 0; i--) {
                const dx = joints[i].x - joints[i + 1].x;
                const dy = joints[i].y - joints[i + 1].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const segLength = this.segments[i].length;
                
                if (dist > 0) {
                    joints[i].x = joints[i + 1].x + (dx / dist) * segLength;
                    joints[i].y = joints[i + 1].y + (dy / dist) * segLength;
                }
            }
            
            // Forward reaching (from base to end effector)
            joints[0] = { x: this.base.x, y: this.base.y };
            
            for (let i = 0; i < this.segments.length; i++) {
                const dx = joints[i + 1].x - joints[i].x;
                const dy = joints[i + 1].y - joints[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const segLength = this.segments[i].length;
                
                if (dist > 0) {
                    joints[i + 1].x = joints[i].x + (dx / dist) * segLength;
                    joints[i + 1].y = joints[i].y + (dy / dist) * segLength;
                }
            }
            
            // Check convergence
            const endDist = Math.sqrt(
                Math.pow(joints[joints.length - 1].x - clampedX, 2) +
                Math.pow(joints[joints.length - 1].y - clampedY, 2)
            );
            
            if (endDist < tolerance) break;
        }
        
        // Calculate angles from joint positions
        for (let i = 0; i < this.segments.length; i++) {
            const dx = joints[i + 1].x - joints[i].x;
            const dy = joints[i + 1].y - joints[i].y;
            this.segments[i].angle = Math.atan2(dy, dx);
        }
        
        return joints;
    }
    
    // Idle animation - gentle waving motion
    getIdleTarget() {
        const centerX = this.base.x + 120;
        const centerY = this.base.y - 80;
        const radiusX = 50;
        const radiusY = 30;
        
        return {
            x: centerX + Math.sin(this.time * 0.8) * radiusX + Math.sin(this.time * 1.3) * 20,
            y: centerY + Math.cos(this.time * 0.6) * radiusY + Math.cos(this.time * 1.1) * 15
        };
    }
    
    update() {
        this.time += 0.016; // Approximate 60fps
        
        // Check if should switch to idle mode
        if (Date.now() - this.lastMouseMove > this.idleTimeout) {
            this.idleMode = true;
        }
        
        // Get target based on mode
        let actualTarget;
        if (this.idleMode) {
            actualTarget = this.getIdleTarget();
        } else {
            actualTarget = this.target;
        }
        
        // Smooth interpolation towards target
        const smoothing = this.idleMode ? 0.03 : 0.08;
        this.smoothTarget.x += (actualTarget.x - this.smoothTarget.x) * smoothing;
        this.smoothTarget.y += (actualTarget.y - this.smoothTarget.y) * smoothing;
        
        // Solve inverse kinematics
        this.solveIK(this.smoothTarget.x, this.smoothTarget.y);
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Calculate joint positions for drawing
        let joints = [{ x: this.base.x, y: this.base.y }];
        let currentX = this.base.x;
        let currentY = this.base.y;
        
        for (let i = 0; i < this.segments.length; i++) {
            currentX += this.segments[i].length * Math.cos(this.segments[i].angle);
            currentY += this.segments[i].length * Math.sin(this.segments[i].angle);
            joints.push({ x: currentX, y: currentY });
        }
        
        // Draw glow effect behind the arm
        this.drawGlow(joints);
        
        // Draw base mount
        this.drawBase();
        
        // Draw arm segments
        for (let i = 0; i < this.segments.length; i++) {
            this.drawSegment(joints[i], joints[i + 1], this.segments[i], i);
        }
        
        // Draw joints
        for (let i = 0; i < joints.length; i++) {
            this.drawJoint(joints[i], i === 0 ? 22 : (i === joints.length - 1 ? 12 : 16), i);
        }
        
        // Draw end effector (gripper/tool)
        this.drawEndEffector(joints[joints.length - 1], this.segments[this.segments.length - 1].angle);
    }
    
    drawGlow(joints) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.15;
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.filter = 'blur(20px)';
        
        this.ctx.beginPath();
        this.ctx.moveTo(joints[0].x, joints[0].y);
        for (let i = 1; i < joints.length; i++) {
            this.ctx.lineTo(joints[i].x, joints[i].y);
        }
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawBase() {
        const ctx = this.ctx;
        const { x, y } = this.base;
        
        // Base plate
        ctx.save();
        
        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 35, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Base cylinder
        const gradient = ctx.createLinearGradient(x - 30, y, x + 30, y);
        gradient.addColorStop(0, this.colors.metal);
        gradient.addColorStop(0.5, this.colors.metalLight);
        gradient.addColorStop(1, this.colors.metal);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x - 30, y);
        ctx.lineTo(x - 25, y - 20);
        ctx.lineTo(x + 25, y - 20);
        ctx.lineTo(x + 30, y);
        ctx.closePath();
        ctx.fill();
        
        // Base rim glow
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 25, y - 20);
        ctx.lineTo(x + 25, y - 20);
        ctx.stroke();
        
        // Accent lights
        ctx.fillStyle = this.colors.primary;
        ctx.shadowColor = this.colors.primary;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x - 15, y - 10, 3, 0, Math.PI * 2);
        ctx.arc(x + 15, y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawSegment(start, end, segment, index) {
        const ctx = this.ctx;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const width = segment.width;
        
        ctx.save();
        
        // Calculate perpendicular offset for width
        const perpX = Math.sin(angle) * width / 2;
        const perpY = -Math.cos(angle) * width / 2;
        
        // Segment body gradient
        const gradient = ctx.createLinearGradient(
            start.x - perpX * 2, start.y - perpY * 2,
            start.x + perpX * 2, start.y + perpY * 2
        );
        gradient.addColorStop(0, this.colors.metal);
        gradient.addColorStop(0.3, this.colors.metalLight);
        gradient.addColorStop(0.7, this.colors.metalLight);
        gradient.addColorStop(1, this.colors.metal);
        
        // Draw segment body
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(start.x + perpX, start.y + perpY);
        ctx.lineTo(end.x + perpX, end.y + perpY);
        ctx.lineTo(end.x - perpX, end.y - perpY);
        ctx.lineTo(start.x - perpX, start.y - perpY);
        ctx.closePath();
        ctx.fill();
        
        // Edge highlights
        ctx.strokeStyle = this.colors.primaryDim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(start.x + perpX, start.y + perpY);
        ctx.lineTo(end.x + perpX, end.y + perpY);
        ctx.stroke();
        
        // Segment details - tech lines
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        
        // Detail lines
        const detailOffset = segment.length * 0.3;
        ctx.beginPath();
        ctx.moveTo(start.x + Math.cos(angle) * 10 + perpX * 0.5, 
                   start.y + Math.sin(angle) * 10 + perpY * 0.5);
        ctx.lineTo(start.x + Math.cos(angle) * (10 + detailOffset) + perpX * 0.5, 
                   start.y + Math.sin(angle) * (10 + detailOffset) + perpY * 0.5);
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawJoint(pos, radius, index) {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Outer ring
        const gradient = ctx.createRadialGradient(pos.x, pos.y, radius * 0.5, pos.x, pos.y, radius);
        gradient.addColorStop(0, this.colors.metalLight);
        gradient.addColorStop(0.7, this.colors.metal);
        gradient.addColorStop(1, this.colors.joint);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner tech circle
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Center glow
        ctx.fillStyle = this.colors.primary;
        ctx.shadowColor = this.colors.primary;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing effect for main joint
        if (index === 0) {
            ctx.globalAlpha = 0.3 + Math.sin(this.time * 3) * 0.2;
            ctx.strokeStyle = this.colors.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * 0.85, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawEndEffector(pos, angle) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        
        // Gripper base
        const gradient = ctx.createLinearGradient(-8, -8, 8, 8);
        gradient.addColorStop(0, this.colors.metal);
        gradient.addColorStop(0.5, this.colors.metalLight);
        gradient.addColorStop(1, this.colors.metal);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-6, -10, 12, 20, 3);
        ctx.fill();
        
        // Gripper fingers
        const fingerOpen = 6 + Math.sin(this.time * 2) * 2;
        
        ctx.fillStyle = this.colors.metalLight;
        
        // Top finger
        ctx.beginPath();
        ctx.moveTo(8, -fingerOpen);
        ctx.lineTo(25, -fingerOpen - 3);
        ctx.lineTo(28, -fingerOpen);
        ctx.lineTo(25, -fingerOpen + 3);
        ctx.lineTo(8, -fingerOpen + 2);
        ctx.closePath();
        ctx.fill();
        
        // Bottom finger
        ctx.beginPath();
        ctx.moveTo(8, fingerOpen);
        ctx.lineTo(25, fingerOpen + 3);
        ctx.lineTo(28, fingerOpen);
        ctx.lineTo(25, fingerOpen - 3);
        ctx.lineTo(8, fingerOpen - 2);
        ctx.closePath();
        ctx.fill();
        
        // Finger tips glow
        ctx.fillStyle = this.colors.accent;
        ctx.shadowColor = this.colors.accent;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(28, -fingerOpen, 2, 0, Math.PI * 2);
        ctx.arc(28, fingerOpen, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Tool light
        ctx.fillStyle = this.colors.primary;
        ctx.shadowColor = this.colors.primary;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
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
    // Small delay to ensure layout is complete
    setTimeout(() => {
        window.robotArm = new RobotArm('robotArmCanvas');
    }, 100);
});

// Reinitialize on page visibility change (for tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.robotArm) {
        window.robotArm.resize();
    }
});

