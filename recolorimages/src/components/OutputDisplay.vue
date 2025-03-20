<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  originalImageUrl: {
    type: String,
    default: null
  },
  processedImageUrl: {
    type: String,
    default: null
  },
  luminanceAdjustedImageUrl: {
    type: String,
    default: null
  },
  luminanceMappedImageUrl: {
    type: String,
    default: null
  },
  hueClassificationImageUrl: {
    type: String,
    default: null
  },
  imageInfo: {
    type: Object,
    default: null
  },
  hasProcessedImage: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['download']);

const activeTab = ref('original');
const showIntermediateSteps = ref(false);

// Reset to original tab when a new image is loaded
watch(() => props.originalImageUrl, () => {
  activeTab.value = 'original';
});

// Switch to processed tab when processing is complete
watch(() => props.processedImageUrl, (newUrl) => {
  if (newUrl) {
    activeTab.value = 'processed';
  }
});

const handleDownload = () => {
  emit('download');
};

const toggleIntermediateSteps = () => {
  showIntermediateSteps.value = !showIntermediateSteps.value;
};

const imageDimensions = computed(() => {
  if (!props.imageInfo) return '';
  
  return `${props.imageInfo.width} × ${props.imageInfo.height}`;
});
</script>

<template>
  <div class="output-display">
    <div v-if="originalImageUrl || processedImageUrl" class="image-container">
      <div class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'original' }"
          @click="activeTab = 'original'"
          :disabled="!originalImageUrl"
        >
          Original
        </button>
        
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'processed' }"
          @click="activeTab = 'processed'"
          :disabled="!processedImageUrl"
        >
          Processed
        </button>
        
        <template v-if="showIntermediateSteps">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'luminanceAdjusted' }"
            @click="activeTab = 'luminanceAdjusted'"
            :disabled="!luminanceAdjustedImageUrl"
          >
            Luminance Adjusted
          </button>
          
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'luminance' }"
            @click="activeTab = 'luminance'"
            :disabled="!luminanceMappedImageUrl"
          >
            Luminance Mapped
          </button>
          
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'hueClassification' }"
            @click="activeTab = 'hueClassification'"
            :disabled="!hueClassificationImageUrl"
          >
            Hue Classification
          </button>
          
        </template>
      </div>
      
      <div class="image-view">
        <img 
          v-if="activeTab === 'original' && originalImageUrl" 
          :src="originalImageUrl" 
          alt="Original Image"
          class="display-image"
        />
        
        <img 
          v-else-if="activeTab === 'processed' && processedImageUrl" 
          :src="processedImageUrl" 
          alt="Processed Image"
          class="display-image"
        />
        
        <img 
          v-else-if="activeTab === 'luminanceAdjusted' && luminanceAdjustedImageUrl" 
          :src="luminanceAdjustedImageUrl" 
          alt="Luminance Adjusted Image"
          class="display-image"
        />
        
        <img 
          v-else-if="activeTab === 'luminance' && luminanceMappedImageUrl" 
          :src="luminanceMappedImageUrl" 
          alt="Luminance Mapped Image"
          class="display-image"
        />
        
        <img 
          v-else-if="activeTab === 'hueClassification' && hueClassificationImageUrl" 
          :src="hueClassificationImageUrl" 
          alt="Hue Classification Image"
          class="display-image"
        />
        
        <div v-else class="no-image">
          <p>No image available for this view</p>
        </div>
      </div>
      
      <div class="image-info">
        <span v-if="imageInfo">{{ imageDimensions }}</span>
        
        <div class="image-actions">
          <button 
            v-if="hasProcessedImage"
            class="action-btn download-btn" 
            @click="handleDownload"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
          </button>
          
          <button 
            v-if="hasProcessedImage"
            class="action-btn toggle-btn" 
            @click="toggleIntermediateSteps"
          >
            {{ showIntermediateSteps ? 'Hide Steps' : 'Show Steps' }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>Upload an image and process it to see the results here</p>
    </div>
  </div>
</template>

<style scoped>
.output-display {
  margin-bottom: 2rem;
}

.image-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  background-color: #f5f5f5;
  overflow-x: auto;
}

.tab-btn {
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
}

.tab-btn.active {
  border-bottom-color: #4CAF50;
  color: #4CAF50;
  font-weight: bold;
}

.tab-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.image-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background-color: #f9f9f9;
  position: relative;
}

.display-image {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.no-image {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #999;
}

.image-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  font-size: 0.9rem;
  color: #666;
}

.image-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.download-btn {
  background-color: #4CAF50;
  color: white;
}

.toggle-btn {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: #999;
}

@media (max-width: 768px) {
  .tabs {
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: 1;
    text-align: center;
  }
  
  .image-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .image-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
