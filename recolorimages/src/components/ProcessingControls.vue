<script setup>
import { ref } from 'vue';

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
  selectedPalette: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['process']);

const handleProcess = () => {
  emit('process');
};
</script>

<template>
  <div class="processing-controls">
    <div class="main-controls">
      <button 
        class="process-btn" 
        @click="handleProcess"
        :disabled="isProcessing || !hasImage"
      >
        <span v-if="isProcessing">Processing...</span>
        <span v-else>Recolor Image</span>
      </button>
    </div>
    
    <div v-if="isProcessing" class="processing-indicator">
      <div class="spinner"></div>
      <span>Processing image...</span>
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

.processing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  color: #4CAF50;
  font-weight: bold;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(76, 175, 80, 0.3);
  border-radius: 50%;
  border-top-color: #4CAF50;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
