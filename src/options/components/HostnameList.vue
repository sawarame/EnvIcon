<script setup lang="ts">
import { ref } from 'vue';
import { HostnamePattern } from '../../types';
import { t } from '../i18n';
import { getHostname } from '../utils';

import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const props = defineProps<{
  modelValue: HostnamePattern[];
  checkerHostname?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: HostnamePattern[]): void;
}>();

const draggingIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const isMatch = (pattern: HostnamePattern) => {
  if (!props.checkerHostname || !pattern.value.trim()) return false;
  if (pattern.isRegex) {
    try {
      return new RegExp(pattern.value).test(props.checkerHostname);
    } catch {
      return false;
    }
  }
  return (getHostname(pattern.value) || pattern.value) === props.checkerHostname;
};

const addInput = () => {
  const newList = [...props.modelValue, { value: '', isRegex: false }];
  emit('update:modelValue', newList);
};

const removeInput = (index: number) => {
  if (props.modelValue.length > 1) {
    const newList = [...props.modelValue];
    newList.splice(index, 1);
    emit('update:modelValue', newList);
  }
};

const updatePath = (index: number, val: string) => {
  const newList = [...props.modelValue];
  newList[index].value = val;
  emit('update:modelValue', newList);
};

const updateRegex = (index: number, isRegex: boolean) => {
  const newList = [...props.modelValue];
  newList[index].isRegex = isRegex;
  emit('update:modelValue', newList);
};

// --- ドラッグ＆ドロップ ---

const onDragStart = (event: DragEvent, index: number) => {
  draggingIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const onDragEnter = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    dragOverIndex.value = index;
  }
};

const onDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
};

const onDragLeave = (event: DragEvent, index: number) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
};

const onDrop = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    const newList = [...props.modelValue];
    const item = newList.splice(draggingIndex.value, 1)[0];
    newList.splice(index, 0, item);
    emit('update:modelValue', newList);
  }
  draggingIndex.value = null;
  dragOverIndex.value = null;
};

const onDragEnd = () => {
  draggingIndex.value = null;
  dragOverIndex.value = null;
};
</script>

<template>
  <div class="hostname-list-container">
    <div class="hostname-rows-group">
      <div
        v-for="(pattern, index) in modelValue"
        :key="index"
        class="hostname-row-wrapper"
        :class="{ 
          'dragging': draggingIndex === Number(index),
          'drag-over': dragOverIndex === Number(index)
        }"
        draggable="true"
        @dragstart="onDragStart($event, Number(index))"
        @dragenter="onDragEnter($event, Number(index))"
        @dragover="onDragOver($event, Number(index))"
        @dragleave="onDragLeave($event, Number(index))"
        @drop="onDrop($event, Number(index))"
        @dragend="onDragEnd"
      >
        <div class="hostname-custom-input-group">
          <!-- 1. Drag Handle -->
          <div class="drag-handle-box">
            <i class="pi pi-ellipsis-v text-slate-300"></i>
            <i class="pi pi-ellipsis-v text-slate-300 -ml-1"></i>
          </div>

          <!-- 2. Regex Checkbox -->
          <div class="regex-addon-box">
            <Checkbox
              :id="'regex-' + index"
              v-model="pattern.isRegex"
              :binary="true"
              @update:modelValue="updateRegex(Number(index), $event)"
              class="w-4 h-4"
            />
            <label :for="'regex-' + index" class="text-xs font-bold text-slate-500 cursor-pointer select-none uppercase tracking-tight">
              {{ t('regex') }}
            </label>
          </div>

          <!-- 3. Hostname Input -->
          <InputText
            :value="pattern.value"
            @input="updatePath(Number(index), ($event.target as HTMLInputElement).value)"
            :placeholder="pattern.isRegex ? t('placeholderRegex') : t('placeholderHostname')"
            :class="{ 
              'p-invalid': (pattern as any)._invalid,
              'match-success': isMatch(pattern)
            }"
            class="hostname-input-field"
          />

          <!-- 4. Remove Button -->
          <Button
            icon="pi pi-trash"
            severity="danger"
            variant="text"
            @click="removeInput(Number(index))"
            :disabled="modelValue.length <= 1"
            class="remove-item-btn"
          />
        </div>
      </div>
    </div>
    
    <div class="add-button-wrapper">
      <Button
        icon="pi pi-plus-circle"
        :label="t('addEnvironmentPattern') || 'Add Hostname Pattern'"
        severity="secondary"
        variant="text"
        @click="addInput"
        class="add-hostname-modern-btn"
      />
    </div>
  </div>
</template>

<style scoped>
.hostname-list-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background-color: white;
}

.hostname-rows-group {
  display: flex;
  flex-direction: column;
}

.hostname-row-wrapper {
  transition: background-color 0.2s;
  border-bottom: 1px solid #f1f5f9;
  margin: 0 !important;
  padding: 0 !important;
}

.hostname-row-wrapper:last-child {
  border-bottom: none;
}

.hostname-row-wrapper.drag-over {
  background-color: color-mix(in srgb, var(--p-primary-color), transparent 95%);
  border-top: 2px solid var(--p-primary-color);
}

/* Custom Input Group Style */
.hostname-custom-input-group {
  display: flex;
  align-items: stretch;
  height: 2.75rem; /* 44px */
  background: white;
}

/* Common styling for all group items to ensure they stick together */
.drag-handle-box,
.regex-addon-box,
.hostname-input-field,
.remove-item-btn {
  border: none !important;
  border-left: 1px solid #cbd5e1 !important; /* Visible divider color */
  border-radius: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
}

/* Hide the very first left border to stay flush with container */
.hostname-custom-input-group > :first-child {
  border-left: none !important;
}

/* 1. Drag Handle Box */
.drag-handle-box {
  width: 3rem;
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}
.drag-handle-box:active { cursor: grabbing; }

/* 2. Regex Addon Box */
.regex-addon-box {
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
}

/* 3. Input Field */
.hostname-input-field {
  flex: 1;
  padding: 0 1rem !important;
  height: 100% !important;
  font-size: 0.875rem;
}
.hostname-input-field:focus {
  z-index: 1;
  background-color: #fff;
}

/* Match Success State for Input */
.match-success {
  background-color: #f0fdf4 !important;
  color: #166534 !important;
  font-weight: 600;
}

/* 4. Remove Button */
.remove-item-btn {
  width: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
  transition: opacity 0.2s, background 0.2s;
}
.remove-item-btn:hover:not(:disabled) {
  opacity: 1;
  background-color: #fef2f2 !important;
}

/* Add Button at bottom */
.add-button-wrapper {
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.add-hostname-modern-btn {
  width: 100% !important;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.05em;
  padding: 1rem !important;
  color: #64748b !important;
  border-radius: 0 !important;
  transition: all 0.2s;
}

.add-hostname-modern-btn:hover {
  background-color: white !important;
  color: var(--p-primary-color) !important;
}

:deep(.p-checkbox-box) {
  border-radius: 4px !important;
}

.-ml-1 { margin-left: -0.25rem; }
</style>
