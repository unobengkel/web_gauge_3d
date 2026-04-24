# 3D Gauge Widget

Widget Gauge 3D berbasis [Three.js](https://threejs.org/) yang elegan dan interaktif. Nyaman digunakan dalam proyek HTML polos maupun framework dengan API yang sederhana. Widget ini memiliki animasi yang mulus, sistem pencahayaan 3D, dan transisi warna adaptif berdasarkan rentang nilainya.

## 🗂 Struktur Direktori
```text
web_gauge_3d/
├── asset/
│   ├── web/               # File spesifik aplikasi utama
│   │   ├── main.css
│   │   └── main.js
│   └── widgetgauge/       # KOMPONEN GAUGE INTI UTAMA (Reusable)
│       ├── gauge.css      
│       └── gauge.js       
├── examples/              # Contoh Implementasi Dasar & Lanjutan
│   ├── contoh1.html
│   └── contoh2.html
├── index.html             # Demo Aplikasi Utama
└── tutorial.html          # Panduan dan Tutorial Setup Singkat (Web HTML)
```

## 🚀 Fitur Utama
- **3D Render**: Menggunakan WebGL rendering via Three.js untuk tampilan widget 3D berkinerja tinggi.
- **Kustomisasi Tema Warna**: Dapat mengubah warna zona indikator mudah melalui objek konfigurasi.
- **Auto Resize**: Secara otomatis ikut menyesuaikan saat viewport atau container berubah ukuran.
- **Data Binding**: Memiliki method bawaan untuk sinkronisasi nilai dengan Input Range (Slider) dan Text Display.
- **Simulation Mode**: Menyediakan mode simulasi gerak acak untuk visualisasi tes animasi.

## 🛠 Cara Memulai Cepat (Quick Start)

Lihat detail tutorial bergambar di `tutorial.html` (Buka via browser) atau ikuti langkah singkat di bawah:

1. **Tambahkan Dependensi Library ke dalam file HTML Anda**
   Pertama panggil script dari `Three.js`, lalu panggil CSS dan JS milik widget:

   ```html
   <!-- Three.js (Harus dipanggil paling atas) -->
   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
   
   <!-- Core Gauge Style dan Script -->
   <link rel="stylesheet" href="asset/widgetgauge/gauge.css">
   <script src="asset/widgetgauge/gauge.js"></script>
   ```

2. **Sediakan Kotak Div pada HTML**
   Pastikan menggunakan lebar/tinggi spesifik, misal melalui CSS.

   ```html
   <div id="my-gauge-box" style="width: 300px; height: 300px;"></div>
   ```

3. **Jalankan Javascript Anda**
   Gunakan properti `initialValue` lalu update nilai barunya secara asinkron atau bersamaan interaksi user.

   ```javascript
   const myGauge = new GaugeWidget('#my-gauge-box', {
       minValue: 0,
       maxValue: 100,
       initialValue: 20
   });
   
   // Setel nilainya, jarum akan teranimasi mengikuti
   myGauge.setValue(85);
   ```

Lihat folder `/examples` untuk melihat 2 skenario contoh penulisan sintaks program.

## 🔧 Properti Konfigurasi (`options`)
Ketika Anda menginisiasi instance dari class dengan `new GaugeWidget(container, options)`, berikut yang bisa dikonfigurasi:

| Option Property | Tipe Data | Default Value | Deskripsi |
| --- | --- | --- | --- |
| `minValue` | `Number` | `0` | Angka batas bawah. |
| `maxValue` | `Number` | `100` | Angka batas atas. |
| `initialValue`| `Number` | `0` | Nilai saat widget baru dibentuk. |
| `width` | `Number` | *(Auto)* | Otomatis mengambil `clientWidth` dari container HTML nya. |
| `height` | `Number` | `300` | Tinggi frame render 3D dari gauge. |
| `colors` | `Object` | *Objek Hex Red-Yellow-Green* | Untuk mengubah warna tema indikasi suhu, format: `{low:0xHEX, mid:0xHEX, high:0xHEX}` |

## 📖 Referensi Methods API

- `gauge.setValue(value, animate = true)`: Memberi nilai baru ke Gauge untuk menggerakkan jarum. Animasi bawaan aktif.
- `gauge.getValue()`: Mengambil angka Integer (bulat) nilai terkini jarum Gauge.
- `gauge.setValueInstant(value)`: Memberi jarum nilai tanpa efek animasi transit.
- `gauge.bindToDisplay(element)`: Menyelaraskan teks isi dari element HTML tertentu agar sesuai dengan perputaran nilai Gauge.
- `gauge.bindToSlider(inputRangeElement)`: Mengikat Input element tipe Slider sehingga nilainya terikat ke dalam Gauge secara live.
- `gauge.startSimulation(intervalMs)`: Memutar nilai secara acak untuk mensimulasikan alat setiap sekian milisecton.
- `gauge.stopSimulation()`: Menyatupkan simulasi acak yang sedang berjalan.
- `gauge.onValueChange(callback)`: Mendaftarkan fungsi function callback yang ditembak tatkala jarum Gauge mengalami perpindahan.
- `gauge.destroy()`: Menghapus instansi renderer Three.js dan mematikan pengamat listener Resize dari web.
