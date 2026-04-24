/**
 * GaugeWidget - Reusable 3D Temperature Gauge Component
 *
 * Usage:
 *   const gauge = new GaugeWidget(containerElement, {
 *     minValue: 0,
 *     maxValue: 100,
 *     initialValue: 0
 *   });
 *   gauge.setValue(50);
 *   gauge.getValue();
 *   gauge.onValueChange(callback);
 */

class GaugeWidget {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        this.options = {
            minValue: options.minValue ?? 0,
            maxValue: options.maxValue ?? 100,
            initialValue: options.initialValue ?? 0,
            width: options.width ?? this.container?.clientWidth ?? 400,
            height: options.height ?? 300
        };

        this.currentValue = this.options.initialValue;
        this.callbacks = [];
        this.isInitialized = false;

        // Color zones (can be customized)
        this.colors = {
            low: options.colors?.low ?? 0x10b981,    // Green (0-30%)
            mid: options.colors?.mid ?? 0xf59e0b,   // Yellow (30-50%)
            high: options.colors?.high ?? 0xef4444  // Red (50-100%)
        };

        if (this.container) {
            this._init();
        }
    }

    _init() {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('GaugeWidget: Three.js is required. Please include three.min.js before gauge.js');
            return;
        }

        this._setupScene();
        this._buildGauge();
        this._startAnimation();

        this.isInitialized = true;

        // Handle resize
        this._resizeHandler = () => this._onResize();
        window.addEventListener('resize', this._resizeHandler);
    }

    _setupScene() {
        const { width, height } = this.options;

        // Create scene
        this.scene = new THREE.Scene();

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 14);
        this.camera.lookAt(0, 1, 0);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        this.glowLight = new THREE.PointLight(this.colors.low, 2, 10);
        this.glowLight.position.set(0, 1, 2);
        this.scene.add(this.glowLight);

        // Group for gauge elements
        this.gaugeGroup = new THREE.Group();
        this.scene.add(this.gaugeGroup);
    }

    _buildGauge() {
        const trackRadius = 4;
        const trackTube = 0.3;
        const trackMaterialConfig = { roughness: 0.6, metalness: 0.3 };

        // Background track
        const bgTrackGeo = new THREE.TorusGeometry(trackRadius, 0.4, 16, 100, Math.PI);
        const bgTrackMesh = new THREE.Mesh(bgTrackGeo, new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 1
        }));
        bgTrackMesh.position.z = -0.2;
        this.gaugeGroup.add(bgTrackMesh);

        // Red segment (50-100) - Right side
        const redGeo = new THREE.TorusGeometry(trackRadius, trackTube, 16, 50, 0.5 * Math.PI);
        const redMesh = new THREE.Mesh(redGeo, new THREE.MeshStandardMaterial({
            color: this.colors.high,
            ...trackMaterialConfig
        }));
        this.gaugeGroup.add(redMesh);

        // Yellow segment (30-50) - Middle
        const yellowGeo = new THREE.TorusGeometry(trackRadius, trackTube, 16, 20, 0.2 * Math.PI);
        const yellowMesh = new THREE.Mesh(yellowGeo, new THREE.MeshStandardMaterial({
            color: this.colors.mid,
            ...trackMaterialConfig
        }));
        yellowMesh.rotation.z = 0.5 * Math.PI;
        this.gaugeGroup.add(yellowMesh);

        // Green segment (0-30) - Left side
        const greenGeo = new THREE.TorusGeometry(trackRadius, trackTube, 16, 30, 0.3 * Math.PI);
        const greenMesh = new THREE.Mesh(greenGeo, new THREE.MeshStandardMaterial({
            color: this.colors.low,
            ...trackMaterialConfig
        }));
        greenMesh.rotation.z = 0.7 * Math.PI;
        this.gaugeGroup.add(greenMesh);

        // Tick marks
        const tickMaterial = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.5,
            metalness: 0.8
        });

        const majorTicks = [0, 30, 50, 100];
        for (let i = 0; i <= 100; i += 5) {
            if (i % 10 !== 0 && !majorTicks.includes(i)) continue;

            const isMajor = majorTicks.includes(i);
            const tickGeo = new THREE.BoxGeometry(0.08, isMajor ? 0.7 : 0.3, 0.1);

            let tickColor = 0x94a3b8;
            if (isMajor) {
                if (i === 0 || i === 30) tickColor = this.colors.low;
                else if (i === 50) tickColor = this.colors.mid;
                else if (i === 100) tickColor = this.colors.high;
            }

            const tMat = new THREE.MeshStandardMaterial({
                color: tickColor,
                roughness: 0.4,
                metalness: 0.5
            });
            const tickMesh = new THREE.Mesh(tickGeo, tMat);

            const ratio = i / 100;
            const angle = Math.PI - (ratio * Math.PI);
            const r = 3.5;

            tickMesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0.1);
            tickMesh.rotation.z = angle - Math.PI / 2;
            this.gaugeGroup.add(tickMesh);
        }

        // Needle pivot
        this.needlePivot = new THREE.Group();
        this.gaugeGroup.add(this.needlePivot);

        // Center hub
        const centerHubMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.2,
            metalness: 0.9
        });

        const hubMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 0.4, 32),
            centerHubMaterial
        );
        hubMesh.rotation.x = Math.PI / 2;
        this.needlePivot.add(hubMesh);

        const innerHubMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.45, 32),
            tickMaterial
        );
        innerHubMesh.rotation.x = Math.PI / 2;
        this.needlePivot.add(innerHubMesh);

        // Needle
        this.needleMaterial = new THREE.MeshPhysicalMaterial({
            color: this.colors.low,
            emissive: this.colors.low,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        const pointerGeo = new THREE.ConeGeometry(0.15, 3.8, 16);
        pointerGeo.translate(0, 1.9, 0);
        this.pointerMesh = new THREE.Mesh(pointerGeo, this.needleMaterial);
        this.pointerMesh.position.z = 0.1;
        this.needlePivot.add(this.pointerMesh);

        // Target color for smooth transitions
        this.targetColorObj = new THREE.Color();
    }

    _startAnimation() {
        this.clock = new THREE.Clock();

        const animate = () => {
            this._animationFrameId = requestAnimationFrame(animate);
            const delta = this.clock.getDelta();
            this._animate(delta);
        };

        animate();
    }

    _animate(delta) {
        // Update needle rotation
        const ratio = this.currentValue / 100;
        const targetAngle = (Math.PI / 2) - (ratio * Math.PI);
        this.needlePivot.rotation.z = targetAngle;

        // Determine target color based on value zones
        if (this.currentValue < 30) {
            this.targetColorObj.setHex(this.colors.low);
        } else if (this.currentValue < 50) {
            this.targetColorObj.setHex(this.colors.mid);
        } else {
            this.targetColorObj.setHex(this.colors.high);
        }

        // Smooth color transition
        this.needleMaterial.color.lerp(this.targetColorObj, 8 * delta);
        this.needleMaterial.emissive.copy(this.needleMaterial.color);
        this.glowLight.color.copy(this.needleMaterial.color);
        this.glowLight.intensity = 1.5 + (ratio * 1.5);

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    // Public API

    /**
     * Set the gauge value
     * @param {number} value - New value for the gauge
     * @param {boolean} animate - Whether to animate the transition
     */
    setValue(value, animate = true) {
        const oldValue = this.currentValue;

        if (animate) {
            this._targetValue = value;
            this._animating = true;
        } else {
            this.currentValue = value;
        }

        this._checkAndTriggerCallback(oldValue, value);
    }

    /**
     * Get current gauge value
     * @returns {number}
     */
    getValue() {
        return Math.round(this.currentValue);
    }

    /**
     * Set value instantly without animation
     * @param {number} value
     */
    setValueInstant(value) {
        this.setValue(value, false);
    }

    /**
     * Register callback for value changes
     * @param {function} callback - Function to call when value changes
     */
    onValueChange(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }

    /**
     * Remove all callbacks
     */
    offValueChange() {
        this.callbacks = [];
    }

    _checkAndTriggerCallback(oldValue, newValue) {
        if (oldValue !== newValue && this.callbacks.length > 0) {
            this.callbacks.forEach(cb => {
                try {
                    cb(newValue, oldValue);
                } catch (e) {
                    console.error('GaugeWidget callback error:', e);
                }
            });
        }
    }

    /**
     * Update the display element with current value
     * @param {HTMLElement} element - The display element
     * @param {string} unit - Unit suffix (e.g., '°C')
     */
    bindToDisplay(element, unit = '') {
        if (!element) return;

        this.onValueChange((value) => {
            element.textContent = Math.round(value);
        });

        element.textContent = this.getValue();
    }

    /**
     * Connect to an input range slider
     * @param {HTMLElement} sliderElement - The range input element
     */
    bindToSlider(sliderElement) {
        if (!sliderElement) return;

        sliderElement.addEventListener('input', (e) => {
            this.setValueInstant(parseFloat(e.target.value));
        });
    }

    /**
     * Start random simulation mode
     * @param {number} interval - Interval in ms (default: 2500)
     */
    startSimulation(interval = 2500) {
        if (this._simulationInterval) {
            clearInterval(this._simulationInterval);
        }

        this._simulationInterval = setInterval(() => {
            const newValue = Math.random() * 100;
            this.setValue(newValue, true);
        }, interval);
    }

    /**
     * Stop simulation mode
     */
    stopSimulation() {
        if (this._simulationInterval) {
            clearInterval(this._simulationInterval);
            this._simulationInterval = null;
        }
    }

    /**
     * Destroy the gauge and cleanup
     */
    destroy() {
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
        }

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }

        this.stopSimulation();

        if (this.renderer) {
            this.renderer.dispose();
            this.container?.removeChild(this.renderer.domElement);
        }

        this.callbacks = [];
        this.isInitialized = false;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GaugeWidget;
} else if (typeof window !== 'undefined') {
    window.GaugeWidget = GaugeWidget;
}