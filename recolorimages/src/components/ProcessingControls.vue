<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false
  },
  hasImage: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['process', 'update:settings']);

// Local copies of settings
const colorCount = ref(props.settings.colorCount);
const grayscaleThreshold = ref(props.settings.grayscaleThreshold);
const hueDistanceThreshold = ref(props.settings.hueDistanceThreshold);
const slDistanceThreshold = ref(props.settings.slDistanceThreshold);
const outlierPercentage = ref(props.settings.outlierPercentage);

// Watch for changes in settings from parent
watch(() => props.settings, (newSettings) => {
  colorCount.value = newSettings.colorCount;
  grayscaleThreshold.value = newSettings.grayscaleThreshold;
  hueDistanceThreshold.value = newSettings.hueDistanceThreshold;
  slDistanceThreshold.value = newSettings.slDistanceThreshold;
  outlierPercentage.value = newSettings.outlierPercentage;
}, { deep: true });

// Update settings when local values change
watch(colorCount, (newValue) => {
  emit('update:settings', { ...props.settings, colorCount: newValue });
});

watch(grayscaleThreshold, (newValue) => {
  emit('update:settings', { ...props.settings, grayscaleThreshold: newValue });
});

watch(hueDistanceThreshold, (newValue) => {
  emit('update:settings', { ...props.settings, hueDistanceThreshold: newValue });
});

watch(slDistanceThreshold, (newValue) => {
  emit('update:settings', { ...props.settings, slDistanceThreshold: newValue });
});

watch(outlierPercentage, (newValue) => {
  emit('update:settings', { ...props.settings, outlierPercentage: newValue });
});

const handleProcess = () => {
  emit('process');
};

const showAdvancedSettings = ref(false);

const toggleAdvancedSettings = () => {
  showAdvancedSettings.value = !showAdvancedSettings.value;
};
</script>

<template>
  <div class="processing-controls">
    <div class="main-controls">
      <div class="setting-group">
        <label for="color-count">Color Count: {{ colorCount }}</label>
        <input 
          id="color-count"
          type="range" 
          v-model.number="colorCount" 
          min="2" 
          max="16" 
          step="1"
          :disabled="isProcessing || !hasImage"
        />
      </div>
      
      <button 
        class="process-btn" 
        @click="handleProcess"
        :disabled="isProcessing || !hasImage"
      >
        <span v-if="isProcessing">Processing... {{ Math.round(progress) }}%</span>
        <span v-else>Recolor Image</span>
      </button>
    </div>
    
    <div class="advanced-settings-toggle">
      <button class="toggle-btn" @click="toggleAdvancedSettings">
        {{ showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings' }}
      </button>
    </div>
    
    <div v-if="showAdvancedSettings" class="advanced-settings">
      <div class="setting-group">
        <label for="grayscale-threshold">Grayscale Threshold: {{ grayscaleThreshold.toFixed(2) }}</label>
        <input 
          id="grayscale-threshold"
          type="range" 
          v-model.number="grayscaleThreshold" 
          min="0.01" 
          max="0.5" 
          step="0.01"
          :disabled="isProcessing || !hasImage"
        />
      </div>
      
      <div class="setting-group">
        <label for="hue-distance">Hue Distance Threshold: {{ hueDistanceThreshold }}</label>
        <input 
          id="hue-distance"
          type="range" 
          v-model.number="hueDistanceThreshold" 
          min="5" 
          max="45" 
          step="1"
          :disabled="isProcessing || !hasImage"
        />
      </div>
      
      <div class="setting-group">
        <label for="sl-distance">SL Distance Threshold: {{ slDistanceThreshold.toFixed(2) }}</label>
        <input 
          id="sl-distance"
          type="range" 
          v-model.number="slDistanceThreshold" 
          min="0.05" 
          max="0.5" 
          step="0.01"
          :disabled="isProcessing || !hasImage"
        />
      </div>
      
      <div class="setting-group">
        <label for="outlier-percentage">Outlier Percentage: {{ outlierPercentage }}%</label>
        <input 
          id="outlier-percentage"
          type="range" 
          v-model.number="outlierPercentage" 
          min="0" 
          max="10" 
          step="1"
          :disabled="isProcessing || !hasImage"
        />
      </div>
    </div>
    
    <div v-if="isProcessing" class="progress-bar-container">
      <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.processing-controls {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.main-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-group label {
  font-weight: bold;
  color: #333;
}

.setting-group input[type="range"] {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: #ddd;
  border-radius: 4px;
  outline: none;
}

.setting-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
}

.setting-group input[type="range"]:disabled {
  opacity: 0.5;
}

.process-btn {
  padding: 0.75rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.process-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.process-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.advanced-settings-toggle {
  margin: 1rem 0;
}

.toggle-btn {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  text-decoration: underline;
}

.advanced-settings {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.progress-bar-container {
  height: 8px;
  background-color: #ddd;
  border-radius: 4px;
  margin-top: 1rem;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

@media (min-width: 768px) {
  .main-controls {
    flex-direction: row;
    align-items: center;
  }
  
  .setting-group {
    flex: 1;
  }
  
  .process-btn {
    align-self: flex-end;
  }
}
</style>
