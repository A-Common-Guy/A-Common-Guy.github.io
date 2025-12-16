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
        
        // Gripper state
        this.gripperClosed = false;
        this.gripperAmount = 0; // 0 = open, 1 = closed
        this.gripperTarget = 0;
        
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
        
        // Click to grip
        window.addEventListener('mousedown', () => {
            this.gripperTarget = 1;
        });
        
        window.addEventListener('mouseup', () => {
            this.gripperTarget = 0;
        });
        
        // Touch grip support
        window.addEventListener('touchstart', () => {
            this.gripperTarget = 1;
        });
        
        window.addEventListener('touchend', () => {
            this.gripperTarget = 0;
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
        
        // Shoulder position (on top of dome)
        const shoulderOffset = 40;
        const shoulderX = this.base.x;
        const shoulderY = this.base.y - shoulderOffset;
        
        // Calculate distance to target from shoulder
        const dx = targetX - shoulderX;
        const dy = targetY - shoulderY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp target if too far
        let clampedX = targetX;
        let clampedY = targetY;
        
        if (distance > totalLength * 0.95) {
            const scale = (totalLength * 0.95) / distance;
            clampedX = shoulderX + dx * scale;
            clampedY = shoulderY + dy * scale;
        }
        
        // Joint positions - starting from shoulder
        let joints = [{ x: shoulderX, y: shoulderY }];
        
        // Initialize joints in current configuration
        let currentX = shoulderX;
        let currentY = shoulderY;
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
            
            // Forward reaching (from shoulder to end effector)
            joints[0] = { x: shoulderX, y: shoulderY };
            
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
        const shoulderY = this.base.y - 40;
        const centerX = this.base.x + 140;
        const centerY = shoulderY - 60;
        const radiusX = 60;
        const radiusY = 40;
        
        return {
            x: centerX + Math.sin(this.time * 0.8) * radiusX + Math.sin(this.time * 1.3) * 25,
            y: centerY + Math.cos(this.time * 0.6) * radiusY + Math.cos(this.time * 1.1) * 20
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
        
        // Animate gripper open/close
        const gripSpeed = 0.15;
        this.gripperAmount += (this.gripperTarget - this.gripperAmount) * gripSpeed;
        
        // Solve inverse kinematics
        this.solveIK(this.smoothTarget.x, this.smoothTarget.y);
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Calculate joint positions for drawing
        // First joint sits on top of the dome (offset up from base)
        const shoulderOffset = 40; // Height above base where arm connects
        let joints = [{ x: this.base.x, y: this.base.y - shoulderOffset }];
        let currentX = this.base.x;
        let currentY = this.base.y - shoulderOffset;
        
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
        
        ctx.save();
        
        // Large ground shadow for grounding effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 50, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ground plate / floor connection
        const plateGradient = ctx.createLinearGradient(x - 45, y, x + 45, y);
        plateGradient.addColorStop(0, '#0a0a12');
        plateGradient.addColorStop(0.3, this.colors.metal);
        plateGradient.addColorStop(0.7, this.colors.metal);
        plateGradient.addColorStop(1, '#0a0a12');
        
        ctx.fillStyle = plateGradient;
        ctx.beginPath();
        ctx.ellipse(x, y, 45, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Plate rim glow
        ctx.strokeStyle = this.colors.primaryDim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, 45, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Spherical dome base
        const domeRadius = 35;
        const domeGradient = ctx.createRadialGradient(
            x - 10, y - domeRadius * 0.6, 5,
            x, y - domeRadius * 0.3, domeRadius
        );
        domeGradient.addColorStop(0, this.colors.metalLight);
        domeGradient.addColorStop(0.4, this.colors.metal);
        domeGradient.addColorStop(0.8, '#0f0f1a');
        domeGradient.addColorStop(1, this.colors.joint);
        
        ctx.fillStyle = domeGradient;
        ctx.beginPath();
        ctx.arc(x, y - 5, domeRadius, Math.PI, 0, false);
        ctx.quadraticCurveTo(x + domeRadius, y, x + 40, y);
        ctx.lineTo(x - 40, y);
        ctx.quadraticCurveTo(x - domeRadius, y, x - domeRadius, y - 5);
        ctx.closePath();
        ctx.fill();
        
        // Dome highlight arc
        ctx.strokeStyle = this.colors.primaryDim;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y - 5, domeRadius - 2, Math.PI * 1.15, Math.PI * 1.85, false);
        ctx.stroke();
        
        // Central rotating turret
        const turretGradient = ctx.createRadialGradient(x, y - 25, 5, x, y - 20, 25);
        turretGradient.addColorStop(0, this.colors.metalLight);
        turretGradient.addColorStop(0.5, this.colors.metal);
        turretGradient.addColorStop(1, '#0a0a15');
        
        ctx.fillStyle = turretGradient;
        ctx.beginPath();
        ctx.arc(x, y - 20, 22, 0, Math.PI * 2);
        ctx.fill();
        
        // Turret ring
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 20, 18, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner tech ring with rotation animation
        ctx.save();
        ctx.translate(x, y - 20);
        ctx.rotate(this.time * 0.5);
        
        ctx.strokeStyle = this.colors.primaryDim;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
        
        // Center power core glow
        ctx.fillStyle = this.colors.primary;
        ctx.shadowColor = this.colors.primary;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y - 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing core
        ctx.globalAlpha = 0.4 + Math.sin(this.time * 4) * 0.3;
        ctx.beginPath();
        ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Side accent lights on dome
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.colors.accent;
        ctx.shadowColor = this.colors.accent;
        ctx.beginPath();
        ctx.arc(x - 25, y - 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 25, y - 15, 3, 0, Math.PI * 2);
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
        
        // Wrist joint
        const wristGradient = ctx.createRadialGradient(0, 0, 3, 0, 0, 12);
        wristGradient.addColorStop(0, this.colors.metalLight);
        wristGradient.addColorStop(0.6, this.colors.metal);
        wristGradient.addColorStop(1, this.colors.joint);
        
        ctx.fillStyle = wristGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Wrist ring
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // Gripper base housing
        const gradient = ctx.createLinearGradient(-8, -12, 8, 12);
        gradient.addColorStop(0, this.colors.metal);
        gradient.addColorStop(0.5, this.colors.metalLight);
        gradient.addColorStop(1, this.colors.metal);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(6, -8, 16, 16, 3);
        ctx.fill();
        
        // Housing detail line
        ctx.strokeStyle = this.colors.primaryDim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, -6);
        ctx.lineTo(10, 6);
        ctx.stroke();
        
        // Gripper fingers - interpolate between open (10) and closed (2)
        const fingerOpen = 10 - (this.gripperAmount * 8);
        const fingerLength = 22;
        
        // Finger gradient
        const fingerGradient = ctx.createLinearGradient(18, -10, 18, 10);
        fingerGradient.addColorStop(0, this.colors.metalLight);
        fingerGradient.addColorStop(0.5, this.colors.metal);
        fingerGradient.addColorStop(1, this.colors.metalLight);
        
        ctx.fillStyle = fingerGradient;
        
        // Top finger
        ctx.beginPath();
        ctx.moveTo(20, -4);
        ctx.lineTo(20 + fingerLength - 5, -fingerOpen - 2);
        ctx.lineTo(20 + fingerLength, -fingerOpen);
        ctx.lineTo(20 + fingerLength - 3, -fingerOpen + 3);
        ctx.lineTo(20, 0);
        ctx.closePath();
        ctx.fill();
        
        // Bottom finger
        ctx.beginPath();
        ctx.moveTo(20, 4);
        ctx.lineTo(20 + fingerLength - 5, fingerOpen + 2);
        ctx.lineTo(20 + fingerLength, fingerOpen);
        ctx.lineTo(20 + fingerLength - 3, fingerOpen - 3);
        ctx.lineTo(20, 0);
        ctx.closePath();
        ctx.fill();
        
        // Finger edges
        ctx.strokeStyle = this.colors.primaryDim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, -4);
        ctx.lineTo(20 + fingerLength - 5, -fingerOpen - 2);
        ctx.moveTo(20, 4);
        ctx.lineTo(20 + fingerLength - 5, fingerOpen + 2);
        ctx.stroke();
        
        // Finger tips glow - brighter when gripping
        const tipGlow = this.gripperAmount > 0.5 ? this.colors.secondary : this.colors.accent;
        const tipSize = 2 + this.gripperAmount * 1.5;
        
        ctx.fillStyle = tipGlow;
        ctx.shadowColor = tipGlow;
        ctx.shadowBlur = 8 + this.gripperAmount * 6;
        ctx.beginPath();
        ctx.arc(20 + fingerLength, -fingerOpen, tipSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20 + fingerLength, fingerOpen, tipSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Center tool light
        ctx.fillStyle = this.colors.primary;
        ctx.shadowColor = this.colors.primary;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(14, 0, 3, 0, Math.PI * 2);
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

