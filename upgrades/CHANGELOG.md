# REvenge AutoDodge - Mejoras Increíbles

## Resumen de Mejoras

Se han implementado **8 sistemas nuevos** y **15 mejoras** sobre el autododge original, resultando en un sistema de esquivamiento significativamente más inteligente y reactivo.

---

## 🚀 Sistemas Nuevos

### 1. Predicción de Apuntado Enemigo (Enemy Aim Prediction)
El sistema ahora rastrea la dirección en la que miran los enemigos y predice cuándo podrían disparar. Genera "amenazas virtuales" a lo largo de la dirección de apuntado del enemigo, permitiendo esquivar ANTES de que el proyectil sea lanzado.

- Rastrea velocidad y dirección de movimiento de cada enemigo
- Calcula la dirección de apuntado (hacia el jugador)
- Genera proyectiles predictivos con peso reducido (35%) para no sobre-reaccionar
- Limpia automáticamente entradas viejas (>1.5s)

### 2. Patrones de Juke (Juke Pattern System)
Cuando el sistema detecta que el jugador está siendo atacado repetidamente (3+ cambios de dirección rápidos), activa patrones de esquivamiento que rompen la predicción del enemigo:

- **Zigzag**: Oscilación sinusoidal perpendicular al ataque
- **Círculo**: Movimiento circular alrededor del punto seguro
- **Feint**: Cambios bruscos de dirección con pausas intermedias

Los patrones se activan automáticamente según la intensidad del ataque y la proximidad a paredes.

### 3. Anti-Acordonamiento (Anti-Corner Trapping)
Sistema que analiza la proximidad a paredes en 4 direcciones y penaliza direcciones que llevan hacia esquinas:

- Escanea 4 tiles en cada dirección para detectar paredes
- Penaliza moverse hacia paredes cercanas
- **Penaliza pesadamente** moverse hacia esquinas (paredes en 2+ lados)
- Recompensa direcciones que llevan AWAY de esquinas
- También penaliza moverse hacia bordes del mapa

### 4. Conciencia de Supers (Super Attack Awareness)
Detecta proyectiles de super ataques y les aplica márgenes extra:

- Detecta supers por velocidad > 800 + radio > 150
- Aplica `SUPER_EXTRA_MARGIN` (40 unidades extra) a supers
- Override de radio de impacto para supers conocidos (Nani, Tara, Spike, etc.)
- Commit de dodge más largo cuando la amenaza es un super

### 5. Sampling Adaptativo de Direcciones
El número de direcciones evaluadas se adapta a la densidad de amenazas:

- **< 5 amenazas**: 16 direcciones (rápido)
- **5-8 amenazas**: 24 direcciones (balanceado)
- **> 8 amenazas**: 32 direcciones (máxima precisión)

Esto permite responder más rápido cuando hay pocas amenazas y más preciso cuando hay muchas.

### 6. Refinamiento de Dirección (Direction Refinement)
Después de encontrar la mejor dirección en el sampling grueso, se hace una búsqueda fina:

- 5 puntos intermedios entre la mejor dirección y sus vecinos
- Ángulo de búsqueda = mitad del ángulo entre direcciones
- Esto permite encontrar direcciones óptimas que caen entre los puntos de sampleo

### 7. Distancia de Dodge Variable
La distancia del movimiento de dodge ahora se adapta a la urgencia:

- Normal: 500 unidades de distancia
- Amenaza muy cercana (<0.15s de impacto): 600 unidades
- Evita under-dodge en situaciones críticas

### 8. Resolución de "Least Unsafe" (Fallback mejorado)
Cuando NO hay ninguna dirección 100% segura, el sistema original se quedaba con la dirección actual. Ahora:

- Evalúa TODAS las direcciones y elige la "menos peligrosa"
- Esto permite escapar incluso de situaciones aparentemente imposibles

---

## ⚡ Mejoras a Sistemas Existentes

### Timing y Márgenes
| Parámetro | Antes | Después | Razón |
|-----------|-------|---------|-------|
| SAFETY_MARGIN | 25.0 | 30.0 | Más espacio de seguridad |
| MOVING_EXTRA_MARGIN | 20.0 | 25.0 | Margen mientras nos movemos |
| T_URGENT_MIN | 0.45 | 0.40 | Reaccionar más rápido |
| T_URGENT_MAX | 0.70 | 0.65 | Ventana de urgencia más ajustada |
| T_FIELD | 1.0 | 1.2 | Mirar más lejos en el tiempo |
| MIN_CLEARANCE | 70.0 | 80.0 | Mantenerse más lejos de proyectiles |
| DODGE_COMMIT_MS | 100 | 120 | Commit más largo para evitar jitter |
| LAG_COMPENSATION_S | 0.030 | 0.035 | Compensar más lag de red |
| SPIRAL_SAMPLES | 32 | 40 | Búsqueda espiral más exhaustiva |

### Escalado por Velocidad de Proyectil
- El impacto score ahora escala con la velocidad del proyectil (proyectiles más rápidos = más peligrosos)
- Factor de escala: `min(2.0, speed / 1200)`
- Proyectiles lentos no generan sobre-reacción

### Walkability Mejorada
- Se añadieron probes diagonales para detección más precisa de pasos angostos
- Factor de ajuste 0.85 (antes 0.9) para mejor wall-hugging
- 5 rayos de verificación en vez de 3

### Corner Penalty Mejorado
- Ahora verifica 8 vecinos (incluyendo diagonales) en vez de 4
- Pockets (3+ paredes adyacentes) tienen penalización 2x
- Bordes del mapa tienen penalización dedicada
- Integrado con sistema de wall proximity

### Hysteresis de ShouldKeepCurrent
- Factor de hysteresis aumentado de 1.15 a 1.20
- Reduce jitter en cambios de dirección frecuentes

### Búsqueda de "Least Unsafe"
- Cuando applyVO no encuentra dirección segura, busca la menos peligrosa
- Antes se quedaba con la dirección actual sin evaluar alternativas

### Cache LOS en wallCache
- Sistema de caché para checks de línea de visión
- TTL de 150ms por entrada
- Máximo 512 entradas con purga LRU
- Invalidación automática cuando cambia el mapa

---

## 📁 Archivos Modificados

1. **`autododge.js`** - Motor principal completamente mejorado
2. **`config.js`** - Parámetros optimizados con nuevos configs
3. **`wallCache.js`** - LOS con caché para mejor rendimiento

---

## 🔧 Instalación

Reemplaza los archivos en `agent/features/autododge.js`, `agent/utils/config.js`, y `agent/utils/wallCache.js` con las versiones mejoradas.

Los demás archivos (`scanner.js`, `functions.js`, `offsets.js`, etc.) NO necesitan cambios.
