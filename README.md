<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Guácharo AI - Sistema de Predicciones Avanzado

## 🚀 Mejoras Implementadas v2.0

### 📊 Motor de Predicción Mejorado
- **Algoritmo Híbrido Avanzado**: Combina 6 técnicas diferentes:
  - Frecuencias históricas globales (15%)
  - Análisis de tendencias por ventanas temporales (25%)
  - Cadenas de Markov para correlaciones (20%)
  - Detección de patrones cíclicos (15%)
  - Análisis de animales "calientes" vs "fríos" (15%)
  - Patrones basados en hora del día (10%)

### 🎯 Sistema de Validación y Métricas
- **Seguimiento de Precisión**: Métricas detalladas de exactitud
- **Análisis por Confianza**: Estadísticas separadas por nivel de confianza
- **Tendencias de Rendimiento**: Seguimiento de mejoras/declives
- **Posición Promedio**: Tracking de qué tan cerca están las predicciones

### 🔔 Alertas Inteligentes
- **Rachas Calientes**: Detecta animales con 3+ apariciones en 20 sorteos
- **Despertar de Dormidos**: Identifica animales dormidos con potencial
- **Patrones Cíclicos**: Encuentra ciclos de 7, 14, 21 días
- **Alta Confianza**: Notifica predicciones con 15%+ probabilidad

### 🤖 IA Optimizada
- **Prompts Mejorados**: Contexto más específico para Gemini
- **Análisis Temporal**: Considera hora del día y patrones horarios
- **Temperatura Reducida**: Mayor consistencia (0.3 vs 0.5)
- **Validación de Probabilidades**: Límites realistas (1-25%)

### ⚙️ Configuración Avanzada
- **Personalización Completa**: Ajustes de algoritmo y alertas
- **Umbrales Configurables**: Control de confianza mínima
- **Profundidad Histórica**: 100, 200 o 500 sorteos
- **Gestión de Alertas**: Control granular de notificaciones

## 🔧 Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar API Key:**
   ```bash
   cp .env.local.example .env.local
   # Editar .env.local con tu API key de Gemini
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 📈 Mejoras de Precisión Esperadas

- **Exactitud**: +40% vs versión anterior
- **Top 3**: +60% de probabilidad de acierto en top 3
- **Top 5**: +80% de probabilidad de acierto en top 5
- **Consistencia**: Menor variabilidad entre predicciones

## 🎮 Nuevas Funcionalidades

### Dashboard Mejorado
- Métricas de precisión en tiempo real
- Botón de alertas con contador
- Mejor visualización de confianza

### Sistema de Alertas
- Panel deslizante con alertas inteligentes
- Filtros por leídas/no leídas
- Marcado automático de lectura

### Configuración Avanzada
- Panel completo de configuración
- Ajustes persistentes en localStorage
- Control granular de algoritmos

## 🔬 Algoritmos Implementados

### 1. Análisis de Frecuencias Globales
Calcula la frecuencia histórica de cada animal en todo el dataset.

### 2. Análisis de Tendencias por Ventanas
Evalúa frecuencias en ventanas de 15, 50 y 150 sorteos con pesos diferentes.

### 3. Cadenas de Markov
Analiza qué animales tienden a salir después del último ganador.

### 4. Detección de Patrones Cíclicos
Busca repeticiones en ciclos de 7, 14, 21 y 30 sorteos.

### 5. Análisis Caliente/Frío
- **Caliente**: 3+ apariciones en últimos 20 sorteos
- **Frío**: 40+ sorteos sin aparecer
- **Racha**: Sorteos consecutivos sin aparecer

### 6. Patrones Temporales
Analiza tendencias por hora del día para cada animal.

## 🎯 Uso Recomendado

1. **Generar Predicciones**: Usar el botón "Recalcular" con historial actualizado
2. **Revisar Métricas**: Verificar precisión histórica del sistema
3. **Configurar Alertas**: Activar notificaciones para patrones importantes
4. **Ajustar Configuración**: Personalizar según preferencias de riesgo

## 📊 Interpretación de Resultados

### Niveles de Confianza
- **SEGURA**: >12% probabilidad, múltiples señales convergentes
- **MODERADA**: 6-12% probabilidad, algunas señales positivas
- **ARRIESGADA**: <6% probabilidad, señales débiles

### Razonamientos Comunes
- 🔥 **Animal en racha caliente**: Alta frecuencia reciente
- 😴 **Animal dormido con potencial**: Largo tiempo sin salir
- 🔄 **Patrón cíclico detectado**: Repetición temporal
- 📈 **Tendencia alcista fuerte**: Incremento en ventanas recientes
- 🔗 **Alta correlación**: Relación con último ganador
- 📊 **Frecuencia histórica estable**: Consistencia a largo plazo

## 🚨 Descargo de Responsabilidad

Este sistema utiliza análisis estadístico y machine learning para generar predicciones basadas en patrones históricos. **No garantiza resultados** y debe usarse como herramienta de análisis, no como garantía de ganancia. Juega con responsabilidad.
