/**
 * DrawingMaster - Professional Drawing Application
 * A feature-rich drawing application with modern UI/UX and professional tools
 * 
 * Features:
 * - Multiple drawing tools (pencil, brush, eraser, shapes)
 * - Color palette with custom color picker
 * - Adjustable brush size and opacity
 * - Undo/Redo functionality
 * - Project save/load with gallery
 * - Export to PNG/JPEG
 * - Keyboard shortcuts
 * - Mobile touch support
 * - Responsive design
 */

class DrawingMaster {
    // Clear the canvas and save state
    clearCanvas() {
        this.clearCanvasToWhite();
        this.saveState();
        this.showNotification('Canvas cleared', 'info');
    }

    // Export the canvas as PNG or JPEG
    exportImage(type = 'png') {
        let mimeType = 'image/png';
        let ext = 'png';
        if (type === 'jpeg' || type === 'jpg') {
            mimeType = 'image/jpeg';
            ext = 'jpg';
        }
        const dataURL = this.canvas.toDataURL(mimeType);
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `${this.currentProject.name || 'drawing'}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showNotification(`Exported as ${ext.toUpperCase()}`,'success');
    }
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Drawing state
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.currentColor = '#000000';
        this.brushSize = 5;
        this.opacity = 1;
        
        // Shape drawing state
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        
        // History management for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySteps = 50;
        
        // Current project information
        this.currentProject = {
            name: 'Untitled Project',
            created: new Date(),
            modified: new Date(),
            saved: false
        };
        
        // UI elements
        this.coordinatesDisplay = document.getElementById('coordinates');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        
        // Initialize the application
        this.initializeApp();
    }

    /**
     * Initialize the drawing application
     */
    async initializeApp() {
        try {
            // Show loading spinner
            this.showLoadingSpinner();
            
            // Setup canvas
            this.setupCanvas();
            
            // Bind all event listeners
            this.bindEvents();
            
            // Load any existing projects
            this.loadProjectsCount();
            
            // Initialize with a clean canvas
            this.clearCanvasToWhite();
            this.saveState(); // Save initial state
            
            // Hide loading spinner after everything is ready
            setTimeout(() => {
                this.hideLoadingSpinner();
                this.showNotification('DrawingMaster is ready!', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('Failed to initialize DrawingMaster:', error);
            this.hideLoadingSpinner();
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    /**
     * Setup canvas properties and initial state
     */
    setupCanvas() {
        // Set high DPI support
        this.setupHighDPICanvas();
        
        // Set drawing properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Update cursor
        this.updateCanvasCursor();
    }

    /**
     * Setup high DPI canvas for crisp rendering
     */
    setupHighDPICanvas() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        // Save current image
        let imageData = null;
        try {
            imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        } catch (e) {}

        // Set display size (css pixels)
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        // Set actual size in memory (scaled to device pixels)
        this.canvas.width = Math.round(rect.width * devicePixelRatio);
        this.canvas.height = Math.round(rect.height * devicePixelRatio);

        // Reset transform before scaling
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(devicePixelRatio, devicePixelRatio);

        // Restore image if available
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Canvas drawing events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseout', this.handleMouseUp.bind(this));
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Mouse coordinate tracking
        this.canvas.addEventListener('mousemove', this.updateCoordinates.bind(this));
        this.canvas.addEventListener('mouseleave', () => {
            this.coordinatesDisplay.style.opacity = '0';
        });
        this.canvas.addEventListener('mouseenter', () => {
            this.coordinatesDisplay.style.opacity = '1';
        });

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(btn.dataset.tool);
            });
        });

        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectColor(btn.dataset.color);
            });
        });

        // Custom color picker
        const customColorInput = document.getElementById('customColor');
        customColorInput.addEventListener('change', (e) => {
            this.selectColor(e.target.value);
        });

        // Brush size control
        const brushSizeInput = document.getElementById('brushSize');
        brushSizeInput.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize;
        });

        // Opacity control
        const opacityInput = document.getElementById('brushOpacity');
        opacityInput.addEventListener('input', (e) => {
            this.opacity = parseInt(e.target.value) / 100;
            document.getElementById('opacityValue').textContent = e.target.value;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Window resize handler
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));

        // Modal close handlers
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('projectsModal');
            if (e.target === modal) {
                this.hideProjectsModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideProjectsModal();
            }
        });
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(e) {
        e.preventDefault();
        this.isDrawing = true;
        const pos = this.getMousePosition(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.endX = pos.x;
        this.endY = pos.y;

        this.setupDrawingContext();
        this.executeToolAction(pos, 'start');
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(e) {
        e.preventDefault();
        const pos = this.getMousePosition(e);
        
        if (this.isDrawing) {
            this.endX = pos.x;
            this.endY = pos.y;
            this.executeToolAction(pos, 'move');
        }
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        e.preventDefault();
        this.isDrawing = false;
        const pos = this.getMousePosition(e);
        this.executeToolAction(pos, 'end');
        
        // Save state for undo/redo (except for tools that save immediately)
        if (!['eyedropper', 'fill'].includes(this.currentTool)) {
            this.saveState();
        }
    }

    /**
     * Handle touch events for mobile support
     */
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.canvas.dispatchEvent(mouseEvent);
    }

    /**
     * Get mouse position relative to canvas
     */
    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Use devicePixelRatio to get correct coordinates for high-DPI screens
        const dpr = window.devicePixelRatio || 1;
        return {
            x: (e.clientX - rect.left) * dpr,
            y: (e.clientY - rect.top) * dpr
        };
    }

    /**
     * Update coordinate display
     */
    updateCoordinates(e) {
        const pos = this.getMousePosition(e);
        this.coordinatesDisplay.textContent = `x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)}`;
    }

    /**
     * Setup drawing context properties
     */
    setupDrawingContext() {
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
        this.ctx.fillStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.globalAlpha = this.currentTool === 'eraser' ? 1 : this.opacity;
        this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
    }

    /**
     * Execute tool-specific actions
     */
    executeToolAction(pos, phase) {
        switch (this.currentTool) {
            case 'pencil':
            case 'brush':
                this.handleFreeDrawing(pos, phase);
                break;
            case 'eraser':
                this.handleEraser(pos, phase);
                break;
            case 'line':
                this.handleLineDrawing(pos, phase);
                break;
            case 'rectangle':
                this.handleRectangleDrawing(pos, phase);
                break;
            case 'circle':
                this.handleCircleDrawing(pos, phase);
                break;
            case 'fill':
                if (phase === 'start') this.handleFloodFill(pos);
                break;
            case 'eyedropper':
                if (phase === 'start') this.handleColorPicker(pos);
                break;
            case 'text':
                if (phase === 'start') this.handleTextTool(pos);
                break;
        }
    }

    /**
     * Handle free drawing (pencil/brush)
     */
    handleFreeDrawing(pos, phase) {
        if (phase === 'start') {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (phase === 'move') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }
    }

    /**
     * Handle eraser tool
     */
    handleEraser(pos, phase) {
        if (phase === 'start') {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (phase === 'move') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }
    }

    /**
     * Handle line drawing
     */
    handleLineDrawing(pos, phase) {
        if (phase === 'move') {
            this.redrawCanvas();
            this.drawLinePreview();
        } else if (phase === 'end') {
            this.drawLine();
        }
    }

    /**
     * Handle rectangle drawing
     */
    handleRectangleDrawing(pos, phase) {
        if (phase === 'move') {
            this.redrawCanvas();
            this.drawRectanglePreview();
        } else if (phase === 'end') {
            this.drawRectangle();
        }
    }

    /**
     * Handle circle drawing
     */
    handleCircleDrawing(pos, phase) {
        if (phase === 'move') {
            this.redrawCanvas();
            this.drawCirclePreview();
        } else if (phase === 'end') {
            this.drawCircle();
        }
    }

    /**
     * Draw line preview
     */
    drawLinePreview() {
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(this.endX, this.endY);
        this.ctx.stroke();
    }

    /**
     * Draw final line
     */
    drawLine() {
        this.setupDrawingContext();
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(this.endX, this.endY);
        this.ctx.stroke();
    }

    /**
     * Draw rectangle preview
     */
    drawRectanglePreview() {
        const width = this.endX - this.startX;
        const height = this.endY - this.startY;
        this.ctx.strokeRect(this.startX, this.startY, width, height);
    }

    /**
     * Draw final rectangle
     */
    drawRectangle() {
        this.setupDrawingContext();
        const width = this.endX - this.startX;
        const height = this.endY - this.startY;
        this.ctx.strokeRect(this.startX, this.startY, width, height);
    }

    /**
     * Draw circle preview
     */
    drawCirclePreview() {
        const radius = Math.sqrt(
            Math.pow(this.endX - this.startX, 2) + Math.pow(this.endY - this.startY, 2)
        );
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    /**
     * Draw final circle
     */
    drawCircle() {
        this.setupDrawingContext();
        const radius = Math.sqrt(
            Math.pow(this.endX - this.startX, 2) + Math.pow(this.endY - this.startY, 2)
        );
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    /**
     * Handle flood fill tool
     */
    handleFloodFill(pos) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const targetColor = this.getPixelColor(imageData, Math.floor(pos.x), Math.floor(pos.y));
        const fillColor = this.hexToRgba(this.currentColor);
        
        if (this.colorsEqual(targetColor, fillColor)) {
            return; // Same color, no need to fill
        }
        
        this.floodFill(imageData, Math.floor(pos.x), Math.floor(pos.y), targetColor, fillColor);
        this.ctx.putImageData(imageData, 0, 0);
        this.saveState();
    }

    /**
     * Flood fill algorithm implementation
     */
    floodFill(imageData, x, y, targetColor, fillColor) {
        const width = imageData.width;
        const height = imageData.height;
        const visited = new Set();
        const stack = [{x, y}];
        
        while (stack.length > 0) {
            const {x: currentX, y: currentY} = stack.pop();
            
            if (currentX < 0 || currentX >= width || currentY < 0 || currentY >= height) {
                continue;
            }
            
            const key = `${currentX},${currentY}`;
            if (visited.has(key)) {
                continue;
            }
            
            const currentColor = this.getPixelColor(imageData, currentX, currentY);
            if (!this.colorsEqual(currentColor, targetColor)) {
                continue;
            }
            
            visited.add(key);
            this.setPixelColor(imageData, currentX, currentY, fillColor);
            
            // Add neighboring pixels to stack
            stack.push(
                {x: currentX + 1, y: currentY},
                {x: currentX - 1, y: currentY},
                {x: currentX, y: currentY + 1},
                {x: currentX, y: currentY - 1}
            );
        }
    }

    /**
     * Get pixel color at coordinates
     */
    getPixelColor(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }

    /**
     * Set pixel color at coordinates
     */
    setPixelColor(imageData, x, y, color) {
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = color.a;
    }

    /**
     * Check if two colors are equal
     */
    colorsEqual(color1, color2) {
        return color1.r === color2.r && color1.g === color2.g && 
               color1.b === color2.b && color1.a === color2.a;
    }

    /**
     * Convert hex color to RGBA
     */
    hexToRgba(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: Math.round(this.opacity * 255)
        } : {r: 0, g: 0, b: 0, a: 255};
    }

    /**
     * Convert RGBA to hex
     */
    rgbaToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    }

    /**
     * Handle color picker tool
     */
    handleColorPicker(pos) {
        const imageData = this.ctx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1);
        const pixel = imageData.data;
        const color = this.rgbaToHex(pixel[0], pixel[1], pixel[2]);
        this.selectColor(color);
        this.showNotification(`Color picked: ${color}`, 'info');
    }

    /**
     * Handle text tool
     */
    handleTextTool(pos) {
        const text = prompt('Enter text:');
        if (text && text.trim()) {
            this.setupDrawingContext();
            this.ctx.font = `${this.brushSize * 3}px Arial`;
            this.ctx.fillText(text, pos.x, pos.y);
            this.saveState();
        }
    }

    /**
     * Redraw canvas from history (for shape previews)
     */
    redrawCanvas() {
        if (this.history.length > 0 && this.historyIndex >= 0) {
            const imageData = this.history[this.historyIndex];
            this.ctx.putImageData(imageData, 0, 0);
        }
    }

    /**
     * Select a drawing tool
     */
    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update cursor
        this.updateCanvasCursor();
        
        // Show tool notification
        const toolNames = {
            pencil: 'Pencil',
            brush: 'Brush',
            eraser: 'Eraser',
            line: 'Line',
            rectangle: 'Rectangle',
            circle: 'Circle',
            fill: 'Fill Bucket',
            text: 'Text',
            eyedropper: 'Color Picker'
        };
        
        this.showNotification(`${toolNames[tool]} selected`, 'info');
    }

    /**
     * Select a color
     */
    selectColor(color) {
        this.currentColor = color;
        
        // Update UI
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        const colorBtn = document.querySelector(`[data-color="${color}"]`);
        if (colorBtn) {
            colorBtn.classList.add('active');
        }
        // Update custom color input if needed
        const customColorInput = document.getElementById('customColor');
        if (customColorInput && customColorInput.value !== color) {
            customColorInput.value = color;
        }
        this.updateCanvasCursor();
    }

    // Update the canvas cursor based on the current tool
    updateCanvasCursor() {
        switch (this.currentTool) {
            case 'eraser':
                this.canvas.style.cursor = 'cell';
                break;
            case 'fill':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eyedropper':
                this.canvas.style.cursor = 'copy';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }

    // Save the current canvas state for undo/redo
    saveState() {
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
            this.historyIndex--;
        }
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(imageData);
        this.historyIndex = this.history.length - 1;
    }

    // Undo the last action
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
        }
    }

    // Redo the next action
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
        }
    }

    // Clear the canvas to white
    clearCanvasToWhite() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    // Show a notification message
    showNotification(message, type = 'info') {
        // Simple notification (can be replaced with a better UI)
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Show loading spinner
    showLoadingSpinner() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'block';
        }
    }

    // Hide loading spinner
    hideLoadingSpinner() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }

    // Debounce utility
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Handle window resize
    handleResize() {
    this.setupHighDPICanvas();
    }

    // Handle keyboard shortcuts
    handleKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    this.undo();
                    break;
                case 'y':
                    this.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveProject();
                    break;
                case 'o':
                    e.preventDefault();
                    this.showProjectsModal();
                    break;
            }
        }
    }

    // Save project (stub)
    saveProject() {
        this.showNotification('Project saved (stub)', 'success');
    }

    // Show projects modal (stub)
    showProjectsModal() {
        const modal = document.getElementById('projectsModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    // Hide projects modal (stub)
    hideProjectsModal() {
        const modal = document.getElementById('projectsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Load projects count (stub)
    loadProjectsCount() {
        // Placeholder for loading projects from storage
    }
}

// Initialize DrawingMaster when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.drawingApp = new DrawingMaster();
});