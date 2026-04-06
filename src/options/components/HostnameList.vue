<script setup lang="ts">
import { ref } from 'vue';
import { HostnamePattern } from '../../types';
import { t } from '../i18n';
import { getHostname } from '../utils';

const props = defineProps<{
  modelValue: HostnamePattern[];
  checkerHostname?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: HostnamePattern[]): void;
}>();

const draggingIndex = ref<number | null>(null); // 現在ドラッグ中のアイテムのインデックス
const dragOverIndex = ref<number | null>(null); // 現在ドラッグオーバーされているアイテムのインデックス

/**
 * 特定のホスト名パターンが現在の検証ホスト名と一致するかどうかを判定する
 */
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

/**
 * リストの末尾に空の入力行を追加する
 */
const addInput = () => {
  const newList = [...props.modelValue, { value: '', isRegex: false }];
  emit('update:modelValue', newList);
};

/**
 * 指定されたインデックスの入力行を削除する（ただし行が1つしかない場合は削除不可）
 */
const removeInput = (index: number) => {
  if (props.modelValue.length > 1) {
    const newList = [...props.modelValue];
    newList.splice(index, 1);
    emit('update:modelValue', newList);
  }
};

/**
 * 指定されたインデックスのホスト名（または正規表現）の入力値を更新する
 */
const updatePath = (index: number, val: string) => {
  const newList = [...props.modelValue];
  newList[index].value = val;
  emit('update:modelValue', newList);
};

/**
 * 指定されたインデックスのトグル（正規表現かどうか）のオンオフを更新する
 */
const updateRegex = (index: number, isRegex: boolean) => {
  const newList = [...props.modelValue];
  newList[index].isRegex = isRegex;
  emit('update:modelValue', newList);
};

// --- ドラッグ＆ドロップ (Drag and Drop) イベントハンドラー ---

/**
 * ドラッグ開始時の処理
 */
const onDragStart = (event: DragEvent, index: number) => {
  draggingIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

/**
 * ドラッグ要素が別の要素に入ったときの処理
 */
const onDragEnter = (event: DragEvent, index: number) => {
  event.preventDefault(); // ドロップ先として有効にするため
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    dragOverIndex.value = index;
  }
};

/**
 * ドラッグ要素が要素上にある間の処理
 */
const onDragOver = (event: DragEvent, index: number) => {
  event.preventDefault(); // ドロップを許可するために必須
};

/**
 * ドラッグ要素が要素外に出たときの処理
 */
const onDragLeave = (event: DragEvent, index: number) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
};

/**
 * ドラッグ要素がドロップされたときの処理
 */
const onDrop = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    const newList = [...props.modelValue];
    // ドラッグ元のアイテムを配列から取り出し、ドロップ先の位置に挿入する
    const item = newList.splice(draggingIndex.value, 1)[0];
    newList.splice(index, 0, item);
    emit('update:modelValue', newList);
  }
  // 状態のリセット
  draggingIndex.value = null;
  dragOverIndex.value = null;
};

/**
 * ドラッグ操作が終了したときの処理（キャンセル時など）
 */
const onDragEnd = () => {
  draggingIndex.value = null;
  dragOverIndex.value = null;
};
</script>

<template>
  <div class="hostnames-container">
    <div
      v-for="(pattern, index) in modelValue"
      :key="index"
      class="input-group mb-2"
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
      <div class="drag-handle" :title="t('dragHandle')">
        ⋮⋮
      </div>
      <div class="input-group-text">
        <input
          class="form-check-input mt-0 is-regex"
          type="checkbox"
          :id="'regex-' + index + '-' + Math.random().toString(36).substr(2, 9)"
          :title="t('useRegex')"
          :checked="pattern.isRegex"
          @change="updateRegex(Number(index), ($event.target as HTMLInputElement).checked)"
        />
        <label
          class="ms-2 small mb-0"
          style="cursor: pointer"
          :for="'regex-' + index + '-' + Math.random().toString(36).substr(2, 9)"
          :title="t('useRegex')"
        >
          {{ t('regex') }}
        </label>
      </div>
      <input
        type="text"
        class="form-control hostname-input"
        :value="pattern.value"
        @input="updatePath(Number(index), ($event.target as HTMLInputElement).value)"
        :placeholder="pattern.isRegex ? t('placeholderRegex') : t('placeholderHostname')"
        :class="{ 
          'is-invalid': (pattern as any)._invalid,
          'is-valid bg-success-subtle': isMatch(pattern)
        }"
      />
      <button
        class="btn btn-outline-danger"
        type="button"
        @click="removeInput(Number(index))"
        :disabled="modelValue.length <= 1"
      >
        {{ t('remove') }}
      </button>
    </div>
  </div>
  <div class="d-flex justify-content-center mt-3">
    <button
      type="button"
      class="btn btn-outline-secondary btn-circle"
      @click="addInput"
    >
      <span style="font-size: 1.5rem; line-height: 1;">+</span>
    </button>
  </div>
</template>
