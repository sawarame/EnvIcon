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

// --- ホスト名判定（URLチェッカープレビュー用） ---
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

// --- ホスト名パターンの更新・追加・削除処理 ---

// 特定のインデックスのパターン値（URL文字列など）を更新する
const updatePath = (index: number, val: string) => {
  const newList = [...props.modelValue];
  newList[index].value = val;
  emit('update:modelValue', newList);
};

// 正規表現（Regex）使用フラグのON/OFFを切り替える
const updateRegex = (index: number, isRegex: boolean) => {
  const newList = [...props.modelValue];
  newList[index].isRegex = isRegex;
  emit('update:modelValue', newList);
};

// 最後の1行でなければ該当の入力行を削除する
const removeInput = (index: number) => {
  if (props.modelValue.length > 1) {
    const newList = [...props.modelValue];
    newList.splice(index, 1);
    emit('update:modelValue', newList);
  }
};

// 新たに空のホスト名パターンを追加する
const addInput = () => {
  const newList = [...props.modelValue, { value: '', isRegex: false }];
  emit('update:modelValue', newList);
};

// --- ドラッグアンドドロップ (並び替え) 処理 ---
// HTML5の標準API (draggable="true") を利用し、ライブラリを使わずにリストの並び替えを実現している

// ドラッグ開始時（掴んだインデックスを保存し、見た目調整用のエフェクトを設定）
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

// ドラッグ中（要素が別要素上に重なったときの処理）
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

// ドロップ完了時・ドラッグ終了時のリセット
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
            <i class="pi pi-bars"></i>
          </div>

          <!-- 2. Regex Checkbox -->
          <div class="regex-addon-box">
            <Checkbox
              :id="'regex-' + index"
              v-model="pattern.isRegex"
              :binary="true"
              @update:modelValue="updateRegex(Number(index), $event)"
            />
            <label :for="'regex-' + index">
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
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--card-bg);
}

.hostname-rows-group {
  display: flex;
  flex-direction: column;
}

/* 
  入力を包むラッパーコンポーネント。
  ボーダーと少しの影でグループとして見せる。
*/
.hostname-row-wrapper {
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--border-color);
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
  background: var(--card-bg);
}

/* Common styling for all group items to ensure they stick together */
.drag-handle-box,
.regex-addon-box,
.hostname-input-field,
.remove-item-btn {
  border: none !important;
  border-left: 1px solid var(--border-color) !important; /* Visible divider color */
  border-radius: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
}

/* Hide the very first left border to stay flush with container */
.hostname-custom-input-group > :first-child {
  border-left: none !important;
}

/* 1. Drag Handle Box: ドラッグ操作用のハンドルエリア */
.drag-handle-box {
  width: 3rem;
  background-color: var(--item-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}
.drag-handle-box:active { cursor: grabbing; }

/* 2. Regex Addon Box */
.regex-addon-box {
  background-color: var(--item-bg);
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
  z-index: 2;
  background-color: transparent;
  box-shadow: inset 0 0 0 1px var(--p-primary-color) !important;
}

/* Match Success State for Input */
.match-success {
  background-color: var(--success-bg) !important;
  color: var(--success-text) !important;
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
  background-color: var(--danger-bg-hover) !important;
}

/* Add Button at bottom */
.add-button-wrapper {
  background-color: var(--item-bg);
  border-top: 1px solid var(--border-color);
}

.add-hostname-modern-btn {
  width: 100% !important;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.05em;
  padding: 1rem !important;
  color: var(--text-secondary) !important;
  border-radius: 0 !important;
  transition: all 0.2s;
}

.add-hostname-modern-btn:hover {
  background-color: var(--card-bg) !important;
  color: var(--p-primary-color) !important;
}

:deep(.p-checkbox-box) {
  border-radius: 4px !important;
}
</style>
