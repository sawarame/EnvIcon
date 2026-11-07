<script setup lang="ts">
import { ref } from 'vue';
import { HostnamePattern } from '../../types';
import { t } from '../i18n';

import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';

const props = defineProps<{
  /** パターン設定オブジェクトの配列 */
  modelValue: HostnamePattern[];
  /** URLチェッカーで最終的に採用されたパターンの行インデックス（未採用時は null） */
  matchedPatternIndex?: number | null;
  /** バリデーションエラーが発生している行インデックスの配列 */
  invalidIndices?: number[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: HostnamePattern[]): void;
}>();

const draggingIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

/**
 * 指定された行インデックスがURLチェッカーで採用された行かどうかを判定する関数
 * @param index - 検査対象の行インデックス
 * @returns 採用された行である場合は true、それ以外は false
 */
const isMatchedRow = (index: number): boolean => {
  return typeof props.matchedPatternIndex === 'number' && props.matchedPatternIndex === index;
};

/**
 * 指定された行インデックスにバリデーションエラーがあるかどうかを判定する関数
 * @param index - 検査対象の行インデックス
 * @returns エラーがある場合は true、それ以外は false
 */
const isInvalidRow = (index: number): boolean => {
  return Array.isArray(props.invalidIndices) && props.invalidIndices.includes(index);
};

/**
 * 特定のインデックスのパターン文字列を更新して親へ通知する関数
 * @param index - 更新対象の行インデックス
 * @param val - 新しい入力文字列
 * @returns なし
 */
const updatePath = (index: number, val: string): void => {
  const newList = props.modelValue.map((item: HostnamePattern, i: number) =>
    i === index ? { ...item, value: val } : item
  );
  emit('update:modelValue', newList);
};

/**
 * 特定のインデックスの正規表現フラグを更新して親へ通知する関数
 * @param index - 更新対象の行インデックス
 * @param isRegex - 正規表現を使用する場合は true
 * @returns なし
 */
const updateRegex = (index: number, isRegex: boolean): void => {
  const newList = props.modelValue.map((item: HostnamePattern, i: number) =>
    i === index ? { ...item, isRegex } : item
  );
  emit('update:modelValue', newList);
};

/**
 * 特定のインデックスの有効・無効フラグを更新して親へ通知する関数
 * @param index - 更新対象の行インデックス
 * @param enabled - 有効にする場合は true
 * @returns なし
 */
const updateEnabled = (index: number, enabled: boolean): void => {
  const newList = props.modelValue.map((item: HostnamePattern, i: number) =>
    i === index ? { ...item, enabled } : item
  );
  emit('update:modelValue', newList);
};

/**
 * 最後の1行でなければ該当の入力行を削除する関数
 * @param index - 削除対象の行インデックス
 * @returns なし
 */
const removeInput = (index: number): void => {
  if (props.modelValue.length > 1) {
    const newList = [...props.modelValue];
    newList.splice(index, 1);
    emit('update:modelValue', newList);
  }
};

/**
 * 新たに空のURLパターン行を末尾へ追加する関数
 * @returns なし
 */
const addInput = (): void => {
  const newList = [...props.modelValue, { value: '', isRegex: false, enabled: true }];
  emit('update:modelValue', newList);
};

// --- ドラッグアンドドロップ（並び替え）処理 ---

/**
 * ドラッグ開始時に対象行のインデックスを記録しエフェクトを設定する関数
 * @param event - ドラッグイベント
 * @param index - ドラッグ開始した行インデックス
 * @returns なし
 */
const onDragStart = (event: DragEvent, index: number): void => {
  draggingIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

/**
 * ドラッグ要素が別要素に入った際にハイライト対象を更新する関数
 * @param event - ドラッグイベント
 * @param index - 重なった行インデックス
 * @returns なし
 */
const onDragEnter = (event: DragEvent, index: number): void => {
  event.preventDefault();
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    dragOverIndex.value = index;
  }
};

/**
 * ドロップを許可するためデフォルト動作を抑制する関数
 * @param event - ドラッグイベント
 * @returns なし
 */
const onDragOver = (event: DragEvent): void => {
  event.preventDefault();
};

/**
 * ドラッグ要素が離れた際にハイライト状態を解除する関数
 * @param index - 離れた行インデックス
 * @returns なし
 */
const onDragLeave = (index: number): void => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
};

/**
 * ドロップ時にパターン配列の順序を入れ替えて親へ通知する関数
 * @param event - ドロップイベント
 * @param index - ドロップ先の行インデックス
 * @returns なし
 */
const onDrop = (event: DragEvent, index: number): void => {
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

/**
 * ドラッグ終了時に内部状態をリセットする関数
 * @returns なし
 */
const onDragEnd = (): void => {
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
          'drag-over': dragOverIndex === Number(index),
          'row-disabled': pattern.enabled === false
        }"
        draggable="true"
        @dragstart="onDragStart($event, Number(index))"
        @dragenter="onDragEnter($event, Number(index))"
        @dragover="onDragOver($event)"
        @dragleave="onDragLeave(Number(index))"
        @drop="onDrop($event, Number(index))"
        @dragend="onDragEnd"
      >
        <div class="hostname-custom-input-group">
          <!-- 1. ドラッグハンドル -->
          <div class="drag-handle-box">
            <i class="pi pi-bars"></i>
          </div>

          <!-- 2. 有効/無効トグル -->
          <div class="enabled-addon-box">
            <ToggleSwitch
              :modelValue="pattern.enabled !== false"
              @update:modelValue="updateEnabled(Number(index), $event)"
              aria-label="Toggle URL Pattern"
            />
          </div>

          <!-- 3. 正規表現チェックボックス -->
          <div class="regex-addon-box">
            <Checkbox
              :id="'regex-' + index"
              :modelValue="pattern.isRegex"
              :binary="true"
              @update:modelValue="updateRegex(Number(index), Boolean($event))"
            />
            <label :for="'regex-' + index">
              {{ t('regex') }}
            </label>
          </div>

          <!-- 4. URL・ホスト名パターン入力欄 -->
          <InputText
            :value="pattern.value"
            @input="updatePath(Number(index), ($event.target as HTMLInputElement).value)"
            :placeholder="pattern.isRegex ? t('placeholderRegex') : t('placeholderHostname')"
            :class="{ 
              'p-invalid': isInvalidRow(Number(index)),
              'match-success': isMatchedRow(Number(index))
            }"
            class="hostname-input-field"
            :disabled="pattern.enabled === false"
          />

          <!-- 5. 行削除ボタン -->
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
        :label="t('addEnvironmentPattern')"
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

/* 入力行を包むラッパー要素 */
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

.row-disabled {
  opacity: 0.6;
  background-color: var(--item-bg);
}

/* カスタム入力グループのレイアウト */
.hostname-custom-input-group {
  display: flex;
  align-items: stretch;
  height: 2.75rem;
  background: var(--card-bg);
}

/* 各要素間の境界線を統一する共通スタイル */
.drag-handle-box,
.enabled-addon-box,
.regex-addon-box,
.hostname-input-field,
.remove-item-btn {
  border: none !important;
  border-left: 1px solid var(--border-color) !important;
  border-radius: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
}

/* 先頭要素の左境界線を非表示にして外枠と密着させる */
.hostname-custom-input-group > :first-child {
  border-left: none !important;
}

/* 1. ドラッグ操作用のハンドルエリア */
.drag-handle-box {
  width: 3rem;
  background-color: var(--item-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}
.drag-handle-box:active { cursor: grabbing; }

/* 2. 有効/無効トグルエリア */
.enabled-addon-box {
  background-color: var(--item-bg);
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
}

/* 3. 正規表現チェックボックスエリア */
.regex-addon-box {
  background-color: var(--item-bg);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
}

/* 4. テキスト入力フィールド */
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

/* URLチェッカー採用行のハイライト表示 */
.match-success {
  background-color: var(--success-bg) !important;
  color: var(--success-text) !important;
  font-weight: 600;
}

/* 5. 削除ボタン */
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

/* 下部のパターン追加ボタン領域 */
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

:deep(.p-toggleswitch) {
  transform: scale(0.8);
}
</style>
