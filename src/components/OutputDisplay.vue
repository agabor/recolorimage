<script setup>
import { computed } from 'vue';

const props = defineProps({
  processedImageUrl: {
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

const handleDownload = () => {
  emit('download');
};

const imageDimensions = computed(() => {
  if (!props.imageInfo) return '';
  
  return `${props.imageInfo.width} <i class="fa-solid fa-xmark"></i> ${props.imageInfo.height}`;
});
</script>

<template>
  <div class="output-display">
    <div v-if="processedImageUrl" class="image-container">
      <div class="image-view">
        <img 
          :src="processedImageUrl" 
          alt="Processed Image"
          class="display-image"
        />
      </div>
      
      <div class="image-info">
        <span v-if="imageInfo">{{ imageDimensions }}</span>
        
        <div class="image-actions">
          <button 
            v-if="hasProcessedImage"
            class="action-btn download-btn" 
            @click="handleDownload"
          >
            <i class="fa-solid fa-download"></i>
            Download
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
