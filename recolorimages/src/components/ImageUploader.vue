<script setup>
import { ref, computed } from 'vue';

const selectedFile = ref(null);
const imageUrl = ref(null);

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
  
  selectedFile.value = file;
  imageUrl.value = URL.createObjectURL(file);
  emit('file-selected', file);
};

const clearImage = () => {
  selectedFile.value = null;
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
        <button class="clear-button" @click.stop="clearImage">
          Clear Image
        </button>
      </div>
      <div v-else>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h3>Drag & Drop Image</h3>
        <p>or click to browse</p>
        <p class="file-types">Supported formats: JPG, PNG</p>
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

.dropzone-content svg {
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
  justify-content: center;
  align-items: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
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
