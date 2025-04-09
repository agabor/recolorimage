<script setup>
import { ref, computed } from 'vue';

const selectedFile = ref(null);
const imageUrl = ref(null);
const wasResized = ref(false);
const originalDimensions = ref(null);
const resizedDimensions = ref(null);

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['file-selected']);

const dragActive = ref(false);
const fileInput = ref(null);

const handleDragEnter = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = false;
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = true;
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragActive.value = false;
  
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
};

const handleFileInputChange = (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
};

const handleFiles = (files) => {
  const file = files[0];
  
  // Check if file is an image
  if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
    alert('Please select a JPG or PNG image.');
    return;
  }
  
  // Resize image if needed
  resizeImageIfNeeded(file).then(resizedFile => {
    selectedFile.value = resizedFile;
    imageUrl.value = URL.createObjectURL(resizedFile);
    emit('file-selected', resizedFile);
  }).catch(error => {
    console.error('Error resizing image:', error);
    // Fallback to original file if resizing fails
    selectedFile.value = file;
    imageUrl.value = URL.createObjectURL(file);
    emit('file-selected', file);
  });
};

// Function to resize image if it exceeds 1000x1000 pixels
const resizeImageIfNeeded = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Store original dimensions
      originalDimensions.value = { width: img.width, height: img.height };
      
      // Check if resizing is needed
      if (img.width <= 1000 && img.height <= 1000) {
        // No need to resize
        wasResized.value = false;
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }
      
      // Calculate new dimensions while maintaining aspect ratio
      let newWidth, newHeight;
      if (img.width > img.height) {
        newWidth = 1000;
        newHeight = Math.round((img.height / img.width) * 1000);
      } else {
        newHeight = 1000;
        newWidth = Math.round((img.width / img.height) * 1000);
      }
      
      // Store resized dimensions
      resizedDimensions.value = { width: newWidth, height: newHeight };
      wasResized.value = true;
      
      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw resized image on canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }
        
        // Create new file from blob
        const resizedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });
        
        URL.revokeObjectURL(img.src);
        resolve(resizedFile);
      }, file.type);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for resizing'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const clearImage = () => {
  selectedFile.value = null;
  wasResized.value = false;
  originalDimensions.value = null;
  resizedDimensions.value = null;
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = null;
  }
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const dropzoneClasses = computed(() => {
  return {
    'dropzone': true,
    'dropzone-active': dragActive.value,
    'dropzone-disabled': props.isProcessing
  };
});

const resizeInfo = computed(() => {
  if (!wasResized.value || !originalDimensions.value || !resizedDimensions.value) {
    return null;
  }
  
  return `Resized from ${originalDimensions.value.width}<i class="fa-duotone fa-light fa-xmark"></i>${originalDimensions.value.height} to ${resizedDimensions.value.width}<i class="fa-duotone fa-light fa-xmark"></i>${resizedDimensions.value.height}`;
});
</script>

<template>
  <div 
    :class="dropzoneClasses"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="triggerFileInput"
  >
    <input 
      ref="fileInput"
      type="file"
      accept="image/jpeg, image/png"
      class="file-input"
      @change="handleFileInputChange"
    />
    
    <div class="dropzone-content">
      <div v-if="isProcessing" class="processing-overlay">
        <span>Processing...</span>
      </div>
      <div v-else-if="imageUrl" class="image-preview">
        <img :src="imageUrl" alt="Selected image" />
        <div v-if="wasResized" class="resize-notification">
          {{ resizeInfo }}
        </div>
        <button class="clear-button" @click.stop="clearImage">
          Clear Image
        </button>
      </div>
      <div v-else>
        <i class="fa-duotone fa-light fa-cloud-arrow-up upload-icon"></i>
        <h3>Drag & Drop Image</h3>
        <p>or click to browse</p>
        <p class="file-types">Supported formats: JPG, PNG (max 1000×1000px)</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background-color: #f9f9f9;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropzone-active {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}

.dropzone-disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.dropzone-content {
  width: 100%;
}

.upload-icon {
  font-size: 64px;
  margin-bottom: 1rem;
  color: #666;
}

.dropzone-content h3 {
  margin: 0 0 0.5rem;
  color: #333;
}

.dropzone-content p {
  margin: 0.5rem 0;
  color: #666;
}

.file-types {
  font-size: 0.8rem;
  color: #999;
  margin-top: 1rem;
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.resize-notification {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 4px;
  font-size: 0.8rem;
  color: #856404;
}

.clear-button {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 16px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.clear-button:hover {
  background-color: #cc0000;
}
</style>
