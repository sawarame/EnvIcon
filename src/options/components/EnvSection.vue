<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  EnvironmentConfig,
  EnvValidationErrorState,
  HostnamePattern,
  PageBadgePosition,
} from '../../types';
import { t, TranslationKey } from '../i18n';
import HostnameList from './HostnameList.vue';

import Card from 'primevue/card';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ColorPicker from 'primevue/colorpicker';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';

/** PrimeVue InputText コンポーネントのフォーカス操作用参照型 */
interface FocusableInputRef {
  focus?: () => void;
  $el?: HTMLElement;
}

const props = defineProps<{
  /** 対象環境の設定データ */
  envConfig: EnvironmentConfig;
  /** URLチェッカーでこの環境が採用された場合の該当パターン行インデックス（非該当時は null） */
  matchedPatternIndex?: number | null;
  /** この環境のバリデーションエラー状態 */
  validationError?: EnvValidationErrorState;
}>();

const emit = defineEmits<{
  (e: 'update:envConfig', value: EnvironmentConfig): void;
  (e: 'delete', id: string): void;
  (e: 'undo'): void;
}>();

const nameInput = ref<FocusableInputRef | null>(null);

/**
 * 環境設定の特定フィールドを更新して親コンポーネントへ通知する関数
 * @param field - 更新対象のプロパティ名
 * @param value - 設定する新しい値
 * @returns なし
 */
const updateField = <K extends keyof EnvironmentConfig>(
  field: K,
  value: EnvironmentConfig[K]
): void => {
  emit('update:envConfig', { ...props.envConfig, [field]: value });
};

/**
 * URLパターンリストの更新を親コンポーネントへ通知する関数
 * @param newHostnames - 更新後のパターン配列
 * @returns なし
 */
const updateHostnames = (newHostnames: HostnamePattern[]): void => {
  emit('update:envConfig', { ...props.envConfig, hostnames: newHostnames });
};

/**
 * ページ内バッジ表示位置の選択変更を親コンポーネントへ通知する関数
 * @param position - 選択された表示位置
 * @returns なし
 */
const onPositionChange = (position: PageBadgePosition): void => {
  updateField('pageBadgePosition', position);
};

/**
 * この環境セクションの削除イベントを発火する関数
 * @returns なし
 */
const deleteSection = (): void => {
  emit('delete', props.envConfig.id);
};

/**
 * この環境セクションの編集取り消しイベントを発火する関数
 * @returns なし
 */
const undoChanges = (): void => {
  emit('undo');
};

/**
 * カスタム環境名の入力フィールドにフォーカスを当てる関数
 * @returns なし
 */
const focusNameInput = (): void => {
  if (nameInput.value) {
    if (typeof nameInput.value.focus === 'function') {
      nameInput.value.focus();
    } else if (nameInput.value.$el && typeof nameInput.value.$el.focus === 'function') {
      nameInput.value.$el.focus();
    }
  }
};

const isDefaultEnv = ["prod", "stg", "dev"].includes(props.envConfig.id);
const defaultEnvNameKey: TranslationKey | null =
  props.envConfig.id === "prod"
    ? "ProductionName"
    : props.envConfig.id === "stg"
      ? "StagingName"
      : props.envConfig.id === "dev"
        ? "DevelopmentName"
        : null;

/**
 * デフォルト環境（PROD / STG / DEV）のローカライズ済み表示タイトルを返す算出プロパティ
 */
const defaultEnvTitle = computed<string>(() =>
  defaultEnvNameKey ? t(defaultEnvNameKey) : ""
);

/**
 * 現在の表示言語に応じたページ内バッジ位置の選択肢リストを返す算出プロパティ
 */
const badgePositionOptions = computed(() => [
  { label: t('badgePosTopLeft'), value: 'top-left' as PageBadgePosition },
  { label: t('badgePosTopRight'), value: 'top-right' as PageBadgePosition },
  { label: t('badgePosBottomLeft'), value: 'bottom-left' as PageBadgePosition },
  { label: t('badgePosBottomRight'), value: 'bottom-right' as PageBadgePosition },
]);

/**
 * カラーピッカーからの選択値を HEX 形式に整えて更新する関数
 * @param field - 更新対象のカラーフィールド名
 * @param value - カラーピッカーから渡された色文字列
 * @returns なし
 */
const onColorChange = (
  field: 'badgeColor' | 'badgeOutlineColor',
  value: string
): void => {
  const hex = value.startsWith('#') ? value : `#${value}`;
  updateField(field, hex);
};

/**
 * カラーピッカー表示用に先頭の '#' を除いた色文字列を取得する関数
 * @param field - 取得対象のカラーフィールド名
 * @returns '#' を除いたHEXカラー文字列
 */
const getColorValue = (field: 'badgeColor' | 'badgeOutlineColor'): string => {
  const val = props.envConfig[field] || '#ffffff';
  return val.replace('#', '');
};
</script>

<template>
  <Card :id="'env-section-' + envConfig.id" class="env-card">
    <template #title>
      <div class="card-header-flex px-4 pt-4">
        <div class="header-title-area">
          <span v-if="isDefaultEnv" class="env-title-text">
            {{ defaultEnvTitle }}
          </span>
          <div v-else class="flex items-center gap-1">
            <Button 
              icon="pi pi-pencil" 
              text 
              rounded 
              severity="secondary" 
              size="small"
              @click="focusNameInput"
              class="edit-icon-btn"
            />
            <InputText 
              ref="nameInput"
              type="text" 
              class="env-name-input-styled"
              :class="{ 'p-invalid': validationError?.invalidName }"
              :modelValue="envConfig.name"
              @input="updateField('name', ($event.target as HTMLInputElement).value)"
              maxlength="50" 
              placeholder="Environment Name"
            />
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Button 
            icon="pi pi-undo" 
            text 
            rounded
            severity="secondary"
            @click="undoChanges"
            :title="t('undoChanges')"
          />
          <Button 
            v-if="envConfig.isDeletable" 
            icon="pi pi-trash" 
            severity="danger" 
            text 
            rounded 
            @click="deleteSection"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="content-wrapper px-4 pb-4">
        <!-- 3カラム設定グリッド -->
        <div class="smart-settings-container mt-4">
          <div class="settings-grid-layout">
            <!-- カラム 1: 機能トグル -->
            <div class="settings-column toggles-col">
              <div class="group-header">
                <i class="pi pi-bolt"></i>
                <span>{{ t('featuresTitle') }}</span>
              </div>
              <div class="column-content">
                <div class="toggle-row-item">
                  <div class="toggle-info">
                    <span class="text-sm font-bold">{{ t('enableFaviconPerEnv') }}</span>
                  </div>
                  <ToggleSwitch
                    :modelValue="envConfig.faviconEnabled !== false"
                    @update:modelValue="updateField('faviconEnabled', Boolean($event))"
                  />
                </div>
                <div class="toggle-row-item">
                  <div class="toggle-info">
                    <span class="text-sm font-bold">{{ t('enablePageBadgePerEnv') }}</span>
                  </div>
                  <ToggleSwitch
                    :modelValue="envConfig.pageBadgeEnabled !== false"
                    @update:modelValue="updateField('pageBadgeEnabled', Boolean($event))"
                  />
                </div>
                <div class="toggle-row-item">
                  <div class="toggle-info">
                    <span class="text-sm font-bold">{{ t('enableConsoleLogPerEnv') }}</span>
                  </div>
                  <ToggleSwitch
                    :modelValue="envConfig.consoleLogEnabled !== false"
                    @update:modelValue="updateField('consoleLogEnabled', Boolean($event))"
                  />
                </div>
              </div>
            </div>

            <!-- カラム 2: バッジ外観設定 -->
            <div class="settings-column appearance-col">
              <div class="group-header">
                <i class="pi pi-palette"></i>
                <span>{{ t('badgeSettings') }}</span>
              </div>
              <div class="column-content appearance-fields">
                <div class="field-item">
                  <label>{{ t('badgeTextLabel') }}</label>
                  <InputText
                    :modelValue="envConfig.badgeText"
                    maxlength="4"
                    class="w-full"
                    @input="updateField('badgeText', ($event.target as HTMLInputElement).value)"
                  />
                </div>
                
                <div class="field-item">
                  <label>{{ t('badgeColorLabel') }}</label>
                  <InputGroup>
                    <InputGroupAddon>
                      <ColorPicker
                        :modelValue="getColorValue('badgeColor')"
                        @update:modelValue="onColorChange('badgeColor', String($event))"
                      />
                    </InputGroupAddon>
                    <InputText
                      :modelValue="envConfig.badgeColor"
                      :class="{ 'p-invalid': validationError?.invalidBadgeColor }"
                      @input="updateField('badgeColor', ($event.target as HTMLInputElement).value)"
                    />
                  </InputGroup>
                </div>

                <div class="field-item">
                  <label>{{ t('badgeOutlineColorLabel') }}</label>
                  <InputGroup>
                    <InputGroupAddon>
                      <ColorPicker
                        :modelValue="getColorValue('badgeOutlineColor')"
                        @update:modelValue="onColorChange('badgeOutlineColor', String($event))"
                      />
                    </InputGroupAddon>
                    <InputText
                      :modelValue="envConfig.badgeOutlineColor"
                      :class="{ 'p-invalid': validationError?.invalidBadgeOutlineColor }"
                      @input="updateField('badgeOutlineColor', ($event.target as HTMLInputElement).value)"
                    />
                  </InputGroup>
                </div>
              </div>
            </div>

            <!-- カラム 3: ページ内バッジ設定 -->
            <div class="settings-column options-col" :class="{ 'disabled-opacity': !envConfig.pageBadgeEnabled }">
              <div class="group-header">
                <i class="pi pi-cog"></i>
                <span>{{ t('pageBadgeSettings') }}</span>
              </div>
              <div class="column-content options-fields">
                <div class="field-item">
                  <label>{{ t('pageBadgePosition') }}</label>
                  <Select 
                    :modelValue="envConfig.pageBadgePosition"
                    :options="badgePositionOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    :disabled="!envConfig.pageBadgeEnabled"
                    @update:modelValue="onPositionChange($event as PageBadgePosition)"
                  />
                </div>

                <div class="field-item">
                  <label>{{ t('pageBadgeFontSize') }}</label>
                  <InputNumber 
                    :modelValue="envConfig.pageBadgeFontSize"
                    :min="10" :max="100"
                    showButtons
                    buttonLayout="horizontal"
                    class="w-full font-size-input-field"
                    :class="{ 'p-invalid': validationError?.invalidPageBadgeFontSize }"
                    :disabled="!envConfig.pageBadgeEnabled"
                    @update:modelValue="updateField('pageBadgeFontSize', $event || 24)"
                  >
                    <template #incrementbuttonicon><i class="pi pi-plus text-xs" /></template>
                    <template #decrementbuttonicon><i class="pi pi-minus text-xs" /></template>
                  </InputNumber>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Divider align="left" class="my-8">
          <div class="flex items-center gap-2">
            <i class="pi pi-link"></i>
            <span>{{ t('hostnamePatterns') }}</span>
          </div>
        </Divider>

        <HostnameList 
          :modelValue="envConfig.hostnames"
          :matchedPatternIndex="matchedPatternIndex"
          :invalidIndices="validationError?.invalidPatternIndices"
          @update:modelValue="updateHostnames"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
/* 環境ごとの設定カードのスタイル */
.env-card {
  margin-bottom: 2.5rem;
  border-radius: 1rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

/* ヘッダー周りのレイアウト */
.card-header-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.env-title-text {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
}

.env-name-input-styled {
  font-size: 1.125rem;
  font-weight: 700;
  border: none;
  background: transparent;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.env-name-input-styled:hover, .env-name-input-styled:focus {
  background: var(--item-bg-hover);
}

/* 3カラム設定エリアのグリッド構成 */
.smart-settings-container {
  background: var(--item-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
}

.settings-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

/* 画面幅1024px以下では縦並び1カラムに変更 */
@media (max-width: 1024px) {
  .settings-grid-layout {
    grid-template-columns: 1fr;
  }
  .settings-column:not(:last-child) {
    border-right: none !important;
    border-bottom: 1px solid var(--border-color);
  }
}

.settings-column {
  padding: 1.5rem;
}

.settings-column:not(:last-child) {
  border-right: 1px solid var(--border-color);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1.5rem;
}

.column-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.toggle-row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  gap: 1rem;
  width: 100%;
}

.toggle-info {
  flex: 1;
  min-width: 0;
}

.field-item label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.disabled-opacity {
  opacity: 0.5;
  filter: grayscale(0.8);
}

/* 各種ユーティリティ */
.my-8 {
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.px-4 { padding-left: 1.5rem; padding-right: 1.5rem; }
.pt-4 { padding-top: 1.5rem; }
.pb-4 { padding-bottom: 1.5rem; }
.mt-4 { margin-top: 1rem; }
</style>
