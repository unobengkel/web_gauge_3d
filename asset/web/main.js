/**
 * Main Application Script
 * Controls the temperature gauge demo page
 */

// Application State
const AppState = {
    currentValue: 0,
    targetValue: 0,
    isRandomMode: false,
    randomInterval: null,
    gauge: null
};

// DOM Elements
const DOM = {
    container: null,
    slider: null,
    sliderContainer: null,
    valueDisplay: null,
    toggleBtn: null,
    modeBadge: null,
    labelsContainer: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    initGauge();
    setupEventListeners();
    updateLabelsPosition();
});

/**
 * Initialize DOM element references
 */
function initDOM() {
    DOM.container = document.getElementById('gauge-container');
    DOM.slider = document.getElementById('value-slider');
    DOM.sliderContainer = document.getElementById('slider-container');
    DOM.valueDisplay = document.getElementById('value-display');
    DOM.toggleBtn = document.getElementById('toggle-btn');
    DOM.modeBadge = document.getElementById('mode-badge');
    DOM.labelsContainer = document.getElementById('labels-container');
}

/**
 * Initialize the gauge widget
 */
function initGauge() {
    AppState.gauge = new GaugeWidget(DOM.container, {
        minValue: 0,
        maxValue: 100,
        initialValue: 0
    });

    // Update display when value changes
    AppState.gauge.onValueChange((newValue) => {
        DOM.valueDisplay.textContent = Math.round(newValue);

        // Update slider if in random mode
        if (AppState.isRandomMode) {
            DOM.slider.value = newValue;
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Slider control
    DOM.slider.addEventListener('input', (e) => {
        if (!AppState.isRandomMode) {
            const value = parseFloat(e.target.value);
            AppState.gauge.setValueInstant(value);
            DOM.valueDisplay.textContent = value;
        }
    });

    // Toggle button
    DOM.toggleBtn.addEventListener('click', toggleMode);

    // Window resize
    window.addEventListener('resize', () => {
        updateLabelsPosition();
    });
}

/**
 * Toggle between manual and random mode
 */
function toggleMode() {
    AppState.isRandomMode = !AppState.isRandomMode;

    if (AppState.isRandomMode) {
        // Switch to random mode
        AppState.gauge.startSimulation(2500);

        DOM.modeBadge.textContent = 'Acak';
        DOM.modeBadge.className = 'inline-block px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold uppercase ml-1';
        DOM.toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg> Ubah ke Manual`;
        DOM.toggleBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
        DOM.toggleBtn.classList.add('bg-purple-600', 'hover:bg-purple-500');
        DOM.sliderContainer.classList.add('opacity-40', 'pointer-events-none');

    } else {
        // Switch to manual mode
        AppState.gauge.stopSimulation();

        const currentValue = parseFloat(DOM.slider.value);
        AppState.gauge.setValueInstant(currentValue);
        DOM.valueDisplay.textContent = currentValue;

        DOM.modeBadge.textContent = 'Manual';
        DOM.modeBadge.className = 'inline-block px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold uppercase ml-1';
        DOM.toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg> Simulasi Acak`;
        DOM.toggleBtn.classList.remove('bg-purple-600', 'hover:bg-purple-500');
        DOM.toggleBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
        DOM.sliderContainer.classList.remove('opacity-40', 'pointer-events-none');
    }
}

/**
 * Update label positions based on gauge calculations
 */
function updateLabelsPosition() {
    if (!AppState.gauge || !DOM.labelsContainer) return;

    // Clear existing labels
    DOM.labelsContainer.innerHTML = '';

    const labelsData = [
        { value: 0, text: '0', color: 'text-emerald-400', labelClass: 'gauge-label-green' },
        { value: 30, text: '30', color: 'text-emerald-400', labelClass: 'gauge-label-green' },
        { value: 50, text: '50', color: 'text-amber-400', labelClass: 'gauge-label-yellow' },
        { value: 100, text: '100', color: 'text-rose-400', labelClass: 'gauge-label-red' }
    ];

    const containerWidth = DOM.container.clientWidth;
    const containerHeight = DOM.container.clientHeight;
    const labelRadius = 4.8;

    labelsData.forEach(data => {
        const el = document.createElement('div');
        el.className = `absolute transform -translate-x-1/2 -translate-y-1/2 text-base font-bold bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700/50 backdrop-blur-sm ${data.color} ${data.labelClass}`;
        el.innerText = data.text;
        DOM.labelsContainer.appendChild(el);

        // Calculate 3D position
        const ratio = data.value / 100;
        const angle = Math.PI - (ratio * Math.PI);

        // Project to 2D (simplified projection)
        const x = (Math.cos(angle) * labelRadius / 6 + 0.5) * containerWidth;
        const y = (1 - (Math.sin(angle) * labelRadius / 5 + 0.5)) * containerHeight * 0.8 + containerHeight * 0.15;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
    });
}