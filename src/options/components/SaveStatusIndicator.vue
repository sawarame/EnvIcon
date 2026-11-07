<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  LocalizedValidationErrorGroup,
  ValidationErrorItem,
} from '../../types';
import { currentLanguage, t } from '../i18n';
import { buildLocalizedValidationGroups } from '../utils';

const props = defineProps<{
  /** 現在の自動保存ステータス ('saved' | 'saving' | 'error') */
  saveStatus: 'saved' | 'saving' | 'error';
  /** 構造化バリデーションエラー項目の配列 */
  errorItems: ValidationErrorItem[];
}>();

/** マウス離脱から吹き出しを閉じるまでの猶予時間（ミリ秒） */
const HOVER_CLOSE_DELAY_MS = 120;

/** アンカー要素へのDOM参照（フォーカス移動先判定用） */
const anchorRef = ref<HTMLElement | null>(null);

/** 保存エラー表示または吹き出し上にマウスカーソルがあるかどうか */
const isHovered = ref(false);

/** 保存エラー表示または吹き出し内部にキーボードフォーカスがあるかどうか */
const isFocused = ref(false);

/** 非表示遷移用の遅延タイマーID */
let closeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 待機中のクローズタイマーが存在すれば解除する関数
 * @returns なし
 */
const clearCloseTimer = (): void => {
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
};

/**
 * 現在未保存エラー状態であり表示すべき不備項目が存在するかどうかを返す算出プロパティ
 */
const hasErrors = computed<boolean>(
  () => props.saveStatus === 'error' && props.errorItems.length > 0
);

/**
 * 不備理由ポップオーバーを表示すべきかどうかを返す算出プロパティ
 */
const isPopoverVisible = computed<boolean>(
  () => hasErrors.value && (isHovered.value || isFocused.value)
);

/**
 * 現在の表示言語に応じて環境ごとにグループ化された不備理由一覧を返す算出プロパティ
 */
const localizedGroups = computed<LocalizedValidationErrorGroup[]>(() => {
  // 表示言語の切り替えに連動してリアクティブに再評価させる
  void currentLanguage.value;
  if (!hasErrors.value) {
    return [];
  }
  return buildLocalizedValidationGroups(props.errorItems);
});

/**
 * マウスカーソルがステータス領域または吹き出しに入った際に表示を開く関数
 * @returns なし
 */
const handleMouseEnter = (): void => {
  clearCloseTimer();
  if (hasErrors.value) {
    isHovered.value = true;
  }
};

/**
 * マウスカーソルがステータス領域および吹き出しから離れた際に猶予付きで閉じる関数
 * @returns なし
 */
const handleMouseLeave = (): void => {
  clearCloseTimer();
  closeTimer = setTimeout(() => {
    isHovered.value = false;
    closeTimer = null;
  }, HOVER_CLOSE_DELAY_MS);
};

/**
 * キーボード操作でステータス領域または吹き出しにフォーカスが入った際に表示を開く関数
 * @returns なし
 */
const handleFocusIn = (): void => {
  if (hasErrors.value) {
    isFocused.value = true;
  }
};

/**
 * フォーカスがコンポーネント領域外へ移動した際にフォーカス起因の表示を解除する関数
 * @param event - フォーカスイベントオブジェクト
 * @returns なし
 */
const handleFocusOut = (event: FocusEvent): void => {
  const nextTarget = event.relatedTarget as Node | null;
  if (!anchorRef.value || !nextTarget || !anchorRef.value.contains(nextTarget)) {
    isFocused.value = false;
  }
};

/**
 * Escape キー押下時に吹き出しを即座に閉じるキーボードイベントハンドラ
 * @param event - キーボードイベントオブジェクト
 * @returns なし
 */
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isPopoverVisible.value) {
    event.preventDefault();
    clearCloseTimer();
    isHovered.value = false;
    isFocused.value = false;
  }
};

// 保存ステータスがエラー以外（保存中・保存完了）へ遷移した際は即座に吹き出しとタイマーをリセットする
watch(
  () => props.saveStatus,
  (nextStatus) => {
    if (nextStatus !== 'error') {
      clearCloseTimer();
      isHovered.value = false;
      isFocused.value = false;
    }
  }
);

onUnmounted(() => {
  clearCloseTimer();
});
</script>

<template>
  <div
    ref="anchorRef"
    class="save-status-anchor ms-auto"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
    @keydown="handleKeydown"
  >
    <!-- 不備理由ポップオーバー（エラー発生かつホバーまたはフォーカス中のみアンカー上方に展開） -->
    <Transition name="save-popover-fade">
      <div
        v-if="isPopoverVisible"
        id="save-error-details-popover"
        class="save-error-popover"
        role="region"
        :aria-label="t('saveErrorDetailsTitle')"
      >
        <div class="popover-header">
          <i class="pi pi-exclamation-triangle popover-header-icon" aria-hidden="true"></i>
          <span class="popover-header-title">{{ t('saveErrorDetailsTitle') }}</span>
        </div>

        <div class="popover-body">
          <div
            v-for="group in localizedGroups"
            :key="group.envId"
            class="error-env-group"
          >
            <div class="error-env-name">{{ group.envDisplayName }}</div>
            <ul class="error-reason-list">
              <li
                v-for="(reason, idx) in group.reasons"
                :key="idx"
                class="error-reason-item"
              >
                {{ reason }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 保存ステータスピル（オンボーディングツアー互換のため id="save-status" を維持） -->
    <div
      id="save-status"
      class="save-status-container flex items-center gap-2"
      :class="{ 'save-status-error': hasErrors }"
      :tabindex="hasErrors ? 0 : undefined"
      :aria-expanded="hasErrors ? (isPopoverVisible ? 'true' : 'false') : undefined"
      :aria-controls="hasErrors ? 'save-error-details-popover' : undefined"
    >
      <template v-if="saveStatus === 'saving'">
        <i class="pi pi-spin pi-spinner text-secondary" aria-hidden="true"></i>
        <span class="status-text text-secondary">{{ t('saving') }}</span>
      </template>
      <template v-else-if="saveStatus === 'error'">
        <i class="pi pi-exclamation-triangle save-error-icon" aria-hidden="true"></i>
        <span class="status-text save-error-text font-medium">{{ t('saveError') }}</span>
        <i
          v-if="hasErrors"
          class="pi pi-info-circle save-error-hint-icon"
          aria-hidden="true"
        ></i>
      </template>
      <template v-else>
        <i class="pi pi-check text-green-500" aria-hidden="true"></i>
        <span class="status-text text-green-500">{{ t('allSaved') }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ポップオーバーの基準となるアンカーラッパー */
.save-status-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* エラー発生時のステータスピル視覚強調とホバー手がかり */
.save-status-error {
  cursor: help;
  background-color: #fffbeb;
  border-color: #fcd34d;
}

.save-status-error:hover,
.save-status-error:focus-visible {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
  outline: none;
}

.save-error-icon,
.save-error-text {
  color: #b45309;
}

.save-error-hint-icon {
  font-size: 0.8125rem;
  color: #d97706;
  opacity: 0.85;
  margin-left: 0.125rem;
}

:global(:root.my-app-dark) .save-status-error {
  background-color: #451a03;
  border-color: #78350f;
}

:global(:root.my-app-dark) .save-status-error:hover,
:global(:root.my-app-dark) .save-status-error:focus-visible {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.25);
}

:global(:root.my-app-dark) .save-error-icon,
:global(:root.my-app-dark) .save-error-text,
:global(:root.my-app-dark) .save-error-hint-icon {
  color: #fcd34d;
}

/* アンカー直上に展開する不備理由吹き出し */
.save-error-popover {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  width: min(440px, calc(100vw - 3rem));
  min-width: 280px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.875rem;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
  z-index: 1010;
  overflow: visible;
}

:global(:root.my-app-dark) .save-error-popover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

/* ピル要素と吹き出しの間の 10px の隙間を繋ぐ透明ホバーブリッジ */
.save-error-popover::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 12px;
}

.popover-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--item-bg);
  border-radius: 0.875rem 0.875rem 0 0;
}

.popover-header-icon {
  color: #f59e0b;
  font-size: 0.9375rem;
}

.popover-header-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-primary);
}

.popover-body {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: min(300px, calc(100vh - 140px));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.error-env-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error-env-group:not(:last-child) {
  padding-bottom: 0.625rem;
  border-bottom: 1px dashed var(--border-color);
}

.error-env-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.error-reason-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error-reason-item {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* ポップオーバー開閉トランジション */
.save-popover-fade-enter-active,
.save-popover-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.save-popover-fade-enter-from,
.save-popover-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
