# 🛍️ Scrap-Ofertas Backend

Sistema de scraping automatizado para ofertas de productos deportivos de múltiples tiendas argentinas.

## 🏪 Tiendas Soportadas

- **Solo Deportes** - `https://www.solodeportes.com.ar/ofertas.html`
- **Stock Center** - `https://www.stockcenter.com.ar/ofertas`
- **OpenSports** - `https://www.opensports.com.ar/ofertas.html?p=2`

## 🚀 Características Principales

### ✅ **Scraping Inteligente**
- **Selectores dinámicos** con fallbacks múltiples
- **Manejo de carga lazy** con scroll automático
- **Optimizado para GitHub Actions** con timeouts extendidos
- **Extracción de imágenes** de optimizadores Next.js

### 🗄️ **Base de Datos**
- **Firestore** para almacenamiento en la nube
- **Limpieza automática** por origen antes de cada scrapeo
- **Metadata de actualización** con timestamp
- **Batch operations** para mejor rendimiento

### 🔄 **Automatización**
- **GitHub Actions** programado diario (10 AM Argentina)
- **Ejecución manual** disponible
- **Logs detallados** para debugging
- **Manejo de errores** robusto

## 📁 Estructura del Proyecto

```
scrap_ofertas-back/
├── index.js              # Lógica principal de scraping
├── server.js              # API REST endpoints
├── dbFunctions.js         # Funciones Firestore
├── firebase.js            # Configuración Firebase Admin
├── package.json           # Dependencias y scripts
└── .github/workflows/     # GitHub Actions
    └── scraper.yml        # Automatización diaria
```

## 🛠️ **Tecnologías**

- **Node.js** + **ES6 Modules**
- **Puppeteer** para web scraping
- **Firebase Admin SDK** para base de datos
- **Express** para API REST
- **GitHub Actions** para CI/CD

## 📊 **Endpoints API**

| Método | Endpoint | Descripción |
|---------|-----------|-------------|
| `GET` | `/productos` | Obtiene todos los productos |
| `GET` | `/productos/buscar?q=` | Busca productos por nombre |
| `GET` | `/ultima-actualizacion` | Obtiene fecha última actualización |

## 🔧 **Variables de Entorno**

```bash
FIREBASE_SERVICE_ACCOUNT    # JSON credenciales Firebase
NODE_ENV                 # development/production
GITHUB_ACTIONS           # true/false (automático)
```

## 🚀 **Instalación y Uso**

### **Local:**
```bash
# Instalar dependencias
npm install

# Configurar Firebase
cp serviceAccountKey.json.example serviceAccountKey.json
# Editar serviceAccountKey.json con tus credenciales

# Ejecutar scraper
node index.js

# Iniciar API
npm run dev
```

### **Producción (GitHub Actions):**
1. **Configurar Secret** `FIREBASE_SERVICE_ACCOUNT` en GitHub
2. **Hacer push** al repositorio
3. **Workflow** se ejecuta automáticamente diariamente
4. **Manual**: Actions → "Ejecutar Scraper" → "Run workflow"

## 📝 **Datos Extraídos**

Por cada producto se extrae:
- **nombre**: Nombre del producto
- **precio**: Precio formateado
- **imagen**: URL optimizada (extraída de Next.js si aplica)
- **url**: Enlace directo al producto
- **origen**: Tienda de origen
- **fecha**: Timestamp de extracción

## 🐛 **Troubleshooting**

### **Problemas Comunes:**

**❌ Timeout en selectores:**
- GitHub Actions tiene tiempos más estrictos
- Solución: Timeouts extendidos + scroll automático

**❌ Imágenes no cargan:**
- URLs de optimizadores Next.js
- Solución: Extracción de parámetro `url` de `/next/image`

**❌ Productos duplicados:**
- Acumulación en base de datos
- Solución: Limpieza automática por origen

### **Logs de Debug:**
- **GitHub Actions**: Ver logs en Actions tab
- **Local**: Consola muestra proceso detallado
- **Selectores**: Prueba múltiple con fallbacks

## 🔄 **Flujo de Actualización**

1. **Ejecución** (automática o manual)
2. **Scraping** por tienda con selectores dinámicos
3. **Limpieza** de productos anteriores por origen
4. **Guardado** batch en Firestore
5. **Actualización** de metadata con timestamp
6. **Disponibilidad** vía API REST

## 📈 **Monitoreo**

- **Logs de ejecución** en consola
- **Timestamps** de actualización
- **Contadores** de productos por tienda
- **Errores** con stack trace completo

---

**Desarrollado con 🧠 por Alejandro Ponce**  
**Automatización con ⚡ GitHub Actions**  
**Base de datos con 🔥 Firebase**