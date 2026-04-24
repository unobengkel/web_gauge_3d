/**
 * GaugeWidget - Komponen Gauge Suhu 3D yang dapat digunakan kembali (Reusable)
 *
 * Cara Penggunaan:
 * const gauge = new GaugeWidget(containerElement, {
 * minValue: 0,
 * maxValue: 100,
 * initialValue: 0
 * });
 * gauge.setValue(50);
 * gauge.getValue();
 * gauge.onValueChange(callback);
 */
class GaugeWidget {
    /**
     * Konstruktor untuk membuat instance GaugeWidget baru.
     * @param {HTMLElement|string} container - Elemen DOM atau selector CSS untuk membungkus kanvas 3D.
     * @param {Object} options - Objek konfigurasi opsional (nilai min/max, warna, dll).
     */
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        // Pastikan container valid sebelum mengambil dimensinya
        const clientWidth = this.container ? this.container.clientWidth : 400;
        const clientHeight = this.container ? this.container.clientHeight : 300;

        this.options = {
            minValue: options.minValue ?? 0,
            maxValue: options.maxValue ?? 100,
            initialValue: options.initialValue ?? 0,
            width: options.width ?? clientWidth,
            height: options.height ?? clientHeight
        };

        // State (Status saat ini)
        this.currentValue = this.options.initialValue; // Nilai render (untuk animasi)
        this.targetValue = this.options.initialValue;  // Nilai tujuan (target)
        this.callbacks = [];
        this.isInitialized = false;
        this._displayElement = null; // Referensi untuk span teks nilai

        // Zona Warna
        this.colors = {
            low: options.colors?.low ?? 0x10b981,    // Hijau
            mid: options.colors?.mid ?? 0xf59e0b,    // Kuning
            high: options.colors?.high ?? 0xef4444   // Merah
        };

        if (this.container) {
            this._init();
        }
    }

    /**
     * Inisialisasi awal. Memeriksa library, menyiapkan scene 3D, membangun objek,
     * dan memulai loop animasi.
     * @private
     */
    _init() {
        if (typeof THREE === 'undefined') {
            console.error('GaugeWidget: Three.js diperlukan. Harap muat three.min.js sebelum gauge.js');
            return;
        }

        this.container.style.position = 'relative'; // Dibutuhkan untuk penempatan label absolut
        this._setupScene();
        this._buildGauge();
        this._buildLabels(); // Membangun label HTML overlay 0, 30, 50, 100
        
        // Atur posisi awal label HTML agar sesuai dengan posisi objek 3D
        this._updateLabelsPosition();

        this._startAnimation();
        this.isInitialized = true;

        // Tangani saat ukuran layar berubah (resize)
        this._resizeHandler = () => this._onResize();
        window.addEventListener('resize', this._resizeHandler);
    }

    /**
     * Menyiapkan scene Three.js, kamera, renderer, dan pencahayaan dasar.
     * @private
     */
    _setupScene() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 14);
        this.camera.lookAt(0, 1, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        // Lampu yang akan berubah warna dan intensitas mengikuti jarum
        this.glowLight = new THREE.PointLight(this.colors.low, 2, 10);
        this.glowLight.position.set(0, 1, 2);
        this.scene.add(this.glowLight);

        this.gaugeGroup = new THREE.Group();
        this.scene.add(this.gaugeGroup);
    }

    /**
     * Membangun geometri dan material untuk komponen gauge 3D (trek, segmen warna, tanda, jarum).
     * @private
     */
    _buildGauge() {
        const trackRadius = 4;
        const trackTube = 0.3;
        const trackMaterialConfig = { roughness: 0.6, metalness: 0.3 };

        // Trek latar belakang hitam
        const bgTrackGeo = new THREE.TorusGeometry(trackRadius, 0.4, 16, 100, Math.PI);
        const bgTrackMesh = new THREE.Mesh(bgTrackGeo, new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 1
        }));
        bgTrackMesh.position.z = -0.2;
        this.gaugeGroup.add(bgTrackMesh);

        // Segmen Merah (Zona Tinggi)
        const redGeo = new THREE.TorusGeometry(trackRadius, trackTube, 16, 50, 0.5 * Math.PI);
        const redMesh = new THREE.Mesh(redGeo, new THREE.MeshStandardMaterial({ color: this.colors.high, ...trackMaterialConfig }));
        this.gaugeGroup.add(redMesh);

        // Segmen Kuning (Zona Menengah)
        const yellowGeo = new THREE.TorusGeometry(trackRadius, trackTube, 16, 20, 0.2 * Math.PI);
        const yellowMesh = new THREE.Mesh(yellowGeo, new THREE.MeshStandardMaterial({ color: this.colors.mid, ...trackMaterialConfig }));
        yellowMesh.rotation.z = 0.5 * Math.PI;
        this.gaugeGroup.add(yellowMesh);

        // Segmen Hijau (Zona Rendah)
        const greenGeo = new THREE.TorusGeometry(trackRadius, trackTube, 16, 30, 0.3 * Math.PI);
        const greenMesh = new THREE.Mesh(greenGeo, new THREE.MeshStandardMaterial({ color: this.colors.low, ...trackMaterialConfig }));
        greenMesh.rotation.z = 0.7 * Math.PI;
        this.gaugeGroup.add(greenMesh);

        // Tanda Centang (Tick marks)
        const tickMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.8 });
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

            const tMat = new THREE.MeshStandardMaterial({ color: tickColor, roughness: 0.4, metalness: 0.5 });
            const tickMesh = new THREE.Mesh(tickGeo, tMat);

            const ratio = i / 100;
            const angle = Math.PI - (ratio * Math.PI);
            const r = 3.5;

            tickMesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0.1);
            tickMesh.rotation.z = angle - Math.PI / 2;
            this.gaugeGroup.add(tickMesh);
        }

        // Grup rotasi jarum
        this.needlePivot = new THREE.Group();
        this.gaugeGroup.add(this.needlePivot);

        // Hub / Poros pusat
        const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 32), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 }));
        hubMesh.rotation.x = Math.PI / 2;
        this.needlePivot.add(hubMesh);

        const innerHubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 32), tickMaterial);
        innerHubMesh.rotation.x = Math.PI / 2;
        this.needlePivot.add(innerHubMesh);

        // Jarum penunjuk
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

        this.targetColorObj = new THREE.Color();
    }

    /**
     * Membangun elemen HTML untuk label angka (0, 30, 50, 100)
     * agar melayang dengan tepat di atas koordinat 3D.
     * @private
     */
    _buildLabels() {
        this.labelsContainer = document.createElement('div');
        this.labelsContainer.className = 'absolute inset-0 pointer-events-none z-10';
        this.container.appendChild(this.labelsContainer);

        const labelsData = [
            { value: 0, text: '0', color: 'text-emerald-400' },
            { value: 30, text: '30', color: 'text-emerald-400' },
            { value: 50, text: '50', color: 'text-amber-400' },
            { value: 100, text: '100', color: 'text-rose-400' }
        ];
        
        this.labelElements = [];
        const labelRadius = 4.8;

        labelsData.forEach(data => {
            const el = document.createElement('div');
            el.className = `absolute transform -translate-x-1/2 -translate-y-1/2 text-base font-bold bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700/50 backdrop-blur-sm ${data.color}`;
            el.innerText = data.text;
            this.labelsContainer.appendChild(el);
            
            const ratio = data.value / 100;
            const angle = Math.PI - (ratio * Math.PI);
            const pos3D = new THREE.Vector3(Math.cos(angle) * labelRadius, Math.sin(angle) * labelRadius, 0);
            
            this.labelElements.push({ el, pos3D });
        });
    }

    /**
     * Memproyeksikan koordinat 3D label angka ke layar 2D
     * agar posisinya mengikuti responsivitas kanvas.
     * @private
     */
    _updateLabelsPosition() {
        if (!this.labelElements || !this.camera) return;
        this.camera.updateMatrixWorld();
        
        this.labelElements.forEach(item => {
            const vector = item.pos3D.clone();
            vector.project(this.camera);
            
            const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
            const y = (vector.y * -0.5 + 0.5) * this.container.clientHeight;
            
            item.el.style.left = `${x}px`;
            item.el.style.top = `${y}px`;
        });
    }

    /**
     * Memulai loop animasi menggunakan requestAnimationFrame.
     * @private
     */
    _startAnimation() {
        this.clock = new THREE.Clock();
        const animate = () => {
            this._animationFrameId = requestAnimationFrame(animate);
            const delta = this.clock.getDelta();
            this._animate(delta);
        };
        animate();
    }

    /**
     * Fungsi utama yang dieksekusi di setiap frame animasi.
     * Mengatur pergerakan jarum, pembaruan warna, dan merender scene.
     * @param {number} delta - Jeda waktu antar frame untuk konsistensi kecepatan animasi.
     * @private
     */
    _animate(delta) {
        // Interpolasi (Lerp) untuk gerakan jarum dan angka yang mulus
        this.currentValue += (this.targetValue - this.currentValue) * 5 * delta;

        // Pembaruan teks HTML secara real-time
        if (this._displayElement) {
            this._displayElement.textContent = Math.round(this.currentValue);
        }

        // Rotasi jarum berdasarkan nilai saat ini
        const ratio = this.currentValue / 100;
        const targetAngle = (Math.PI / 2) - (ratio * Math.PI);
        this.needlePivot.rotation.z = targetAngle;

        // Menentukan target warna jarum berdasarkan zona suhu
        if (this.currentValue < 30) {
            this.targetColorObj.setHex(this.colors.low);
        } else if (this.currentValue < 50) {
            this.targetColorObj.setHex(this.colors.mid);
        } else {
            this.targetColorObj.setHex(this.colors.high);
        }

        // Transisi warna perlahan (smooth transition)
        this.needleMaterial.color.lerp(this.targetColorObj, 8 * delta);
        this.needleMaterial.emissive.copy(this.needleMaterial.color);
        this.glowLight.color.copy(this.needleMaterial.color);
        this.glowLight.intensity = 1.5 + (ratio * 1.5); // Cahaya menguat saat suhu naik

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Dipanggil ketika ukuran jendela browser berubah.
     * Memperbarui aspek rasio kamera dan ukuran renderer.
     * @private
     */
    _onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Sesuaikan kembali posisi label HTML
        this._updateLabelsPosition();
    }

    // =====================================
    // PUBLIC API (Fungsi yang bisa diakses dari luar)
    // =====================================

    /**
     * Mengatur nilai baru pada gauge.
     * @param {number} value - Nilai suhu baru (0 - 100).
     * @param {boolean} instant - Jika true, jarum meloncat tanpa animasi lambat.
     */
    setValue(value, instant = false) {
        const oldValue = this.targetValue;
        this.targetValue = value;

        // Jika mode instan, paksa currentValue melompat langsung ke target
        if (instant) {
            this.currentValue = value; 
        }

        this._checkAndTriggerCallback(oldValue, value);
    }

    /**
     * Mengambil nilai aktual saat ini.
     * @returns {number} Nilai gauge yang dibulatkan.
     */
    getValue() {
        return Math.round(this.currentValue);
    }

    /**
     * Memperbarui nilai gauge seketika tanpa animasi.
     * Sama dengan setValue(value, true).
     * @param {number} value - Nilai suhu baru.
     */
    setValueInstant(value) {
        this.setValue(value, true);
    }

    /**
     * Mendaftarkan fungsi callback yang dipanggil tiap kali nilai target diubah.
     * @param {Function} callback - Fungsi dengan parameter (newValue, oldValue).
     */
    onValueChange(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }

    /**
     * Menghapus semua callback yang telah didaftarkan.
     */
    offValueChange() {
        this.callbacks = [];
    }

    /**
     * Mengeksekusi callback secara internal jika terjadi perubahan nilai target.
     * @private
     * @param {number} oldValue - Nilai sebelum diubah.
     * @param {number} newValue - Nilai setelah diubah.
     */
    _checkAndTriggerCallback(oldValue, newValue) {
        if (oldValue !== newValue && this.callbacks.length > 0) {
            this.callbacks.forEach(cb => {
                try { cb(newValue, oldValue); } catch (e) { console.error(e); }
            });
        }
    }

    /**
     * Menautkan (bind) gauge ke sebuah elemen teks HTML untuk menampilkan nilai secara sinkron.
     * @param {HTMLElement} element - Elemen yang menampilkan teks (contoh: div atau span).
     */
    bindToDisplay(element) {
        this._displayElement = element;
        if (element) {
            element.textContent = Math.round(this.currentValue);
        }
    }

    /**
     * Menautkan gauge dua-arah ke elemen input slider HTML.
     * @param {HTMLInputElement} sliderElement - Elemen input dengan type="range".
     */
    bindToSlider(sliderElement) {
        if (!sliderElement) return;

        // Update Gauge ketika slider digeser oleh user
        sliderElement.addEventListener('input', (e) => {
            this.setValue(parseFloat(e.target.value));
        });

        // Update posisi slider ketika gauge diubah dari luar (misal simulasi acak)
        this.onValueChange((val) => {
            sliderElement.value = val;
        });
    }

    /**
     * Memulai mode simulasi, di mana nilai gauge akan berubah secara acak berdasarkan interval.
     * @param {number} interval - Jeda waktu dalam milidetik antar perubahan (default: 2500ms).
     */
    startSimulation(interval = 2500) {
        this.stopSimulation(); // Hentikan yang lama jika ada
        this._simulationInterval = setInterval(() => {
            const newValue = Math.round(Math.random() * 100);
            this.setValue(newValue); // Panggil normal dengan animasi mulus
        }, interval);
    }

    /**
     * Menghentikan mode simulasi acak.
     */
    stopSimulation() {
        if (this._simulationInterval) {
            clearInterval(this._simulationInterval);
            this._simulationInterval = null;
        }
    }

    /**
     * Menghancurkan (destroy) komponen, membersihkan memori, menghapus event listener,
     * dan mencabut elemen kanvas dari DOM.
     */
    destroy() {
        if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        this.stopSimulation();

        // Bersihkan memori dan elemen ThreeJS
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement.parentNode) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        // Bersihkan div label
        if(this.labelsContainer && this.labelsContainer.parentNode) {
            this.container.removeChild(this.labelsContainer);
        }

        this.callbacks = [];
        this.isInitialized = false;
    }
}

// Export agar kompatibel dengan berbagai modul sistem di javascript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GaugeWidget;
} else if (typeof window !== 'undefined') {
    window.GaugeWidget = GaugeWidget;
}
