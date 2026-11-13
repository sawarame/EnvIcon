<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  EnvironmentConfig,
  EnvValidationErrorState,
  HostnamePattern,
  PageBadgePosition,
} from '../../types';
import { t, TranslationKey } from '../i18n';
import HostnameList from './HostnameList.vue';

import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ColorPicker from 'primevue/colorpicker';
import Select from 'primevue/select';
import Button from 'primevue/button';
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

/** 現在選択されているタブ識別子 ('urls' | 'appearance') */
const activeTab = ref<string>('urls');

// URLチェッカーでパターンが一致した場合は自動的にURLパターンタブへ切り替え
watch(
  () => props.matchedPatternIndex,
  (val) => {
    if (typeof val === 'number') {
      activeTab.value = 'urls';
    }
  }
);

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

/** 有効な HEX カラー形式かどうかを判定する正規表現 */
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * プレビュー表示用のバッジ文字列を返す算出プロパティ
 */
const previewBadgeText = computed<string>(() => {
  const raw = props.envConfig.badgeText?.trim();
  if (raw) {
    return raw.substring(0, 4).toUpperCase();
  }
  // 空欄時のフォールバック文字列
  if (isDefaultEnv) {
    return props.envConfig.id.toUpperCase();
  }
  return (props.envConfig.name?.trim().substring(0, 4) || 'ENV').toUpperCase();
});

/**
 * 安全なバッジ文字色を返す算出プロパティ（無効値時はフォールバック）
 */
const safeBadgeColor = computed<string>(() => {
  const color = props.envConfig.badgeColor?.trim();
  return color && HEX_COLOR_REGEX.test(color) ? color : '#3b82f6';
});

/**
 * 安全なバッジフチ色を返す算出プロパティ（無効値時はフォールバック）
 */
const safeBadgeOutlineColor = computed<string>(() => {
  const color = props.envConfig.badgeOutlineColor?.trim();
  return color && HEX_COLOR_REGEX.test(color) ? color : '#ffffff';
});

/**
 * 登録されているURLパターン件数の表示ラベルを返す算出プロパティ
 */
const rulesCountText = computed<string>(() => {
  const count = props.envConfig.hostnames?.length || 0;
  const key = count === 1 ? 'rulesCountSingular' : 'rulesCountPlural';
  return t(key, { count });
});
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
          <!-- ヘッダーミニバッジ -->
          <span 
            class="env-header-mini-badge"
            :style="{ 
              backgroundColor: safeBadgeColor, 
              color: safeBadgeOutlineColor, 
              borderColor: safeBadgeOutlineColor 
            }"
          >
            {{ previewBadgeText }}
          </span>
          <!-- ヘッダールール件数バッジ -->
          <span class="env-header-rules-badge">
            {{ rulesCountText }}
          </span>
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
        <!-- タブ切り替えコンポーネント -->
        <Tabs v-model:value="activeTab" class="env-tabs">
          <TabList class="env-tab-list">
            <!-- タブ 1: URLパターン -->
            <Tab value="urls">
              <div class="tab-item-content">
                <i class="pi pi-link"></i>
                <span>{{ t('tabUrlPatterns') }}</span>
                <span class="tab-count-badge">{{ envConfig.hostnames?.length || 0 }}</span>
              </div>
            </Tab>
            <!-- タブ 2: デザイン・表示設定 -->
            <Tab value="appearance">
              <div class="tab-item-content">
                <i class="pi pi-palette"></i>
                <span>{{ t('tabBadgeAndFeatures') }}</span>
              </div>
            </Tab>
          </TabList>

          <TabPanels class="env-tab-panels">
            <!-- パネル 1: URLパターン一覧（全幅でゆったり表示） -->
            <TabPanel value="urls">
              <div class="urls-tab-wrapper pt-3">
                <HostnameList 
                  :modelValue="envConfig.hostnames"
                  :matchedPatternIndex="matchedPatternIndex"
                  :invalidIndices="validationError?.invalidPatternIndices"
                  @update:modelValue="updateHostnames"
                />
              </div>
            </TabPanel>

            <!-- パネル 2: デザイン・表示設定 -->
            <TabPanel value="appearance">
              <div class="appearance-tab-wrapper pt-3">
                <div class="appearance-grid">
                  <!-- バッジ基本外観設定 -->
                  <div class="settings-group-box">
                    <div class="group-header">
                      <i class="pi pi-palette"></i>
                      <span>{{ t('badgeSettings') }}</span>
                    </div>
                    <div class="appearance-fields">
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

                  <!-- 機能トグル群 -->
                  <div class="settings-group-box">
                    <div class="group-header">
                      <i class="pi pi-bolt"></i>
                      <span>{{ t('featuresTitle') }}</span>
                    </div>
                    <div class="features-list">
                      <!-- Faviconトグル -->
                      <div class="toggle-row-item">
                        <div class="toggle-info">
                          <span class="text-sm font-bold">{{ t('enableFaviconPerEnv') }}</span>
                        </div>
                        <ToggleSwitch
                          :modelValue="envConfig.faviconEnabled !== false"
                          @update:modelValue="updateField('faviconEnabled', Boolean($event))"
                        />
                      </div>

                      <!-- ページ内バッジトグル & 動的付随オプション -->
                      <div class="toggle-bundle-item">
                        <div class="toggle-row-item">
                          <div class="toggle-info">
                            <span class="text-sm font-bold">{{ t('enablePageBadgePerEnv') }}</span>
                          </div>
                          <ToggleSwitch
                            :modelValue="envConfig.pageBadgeEnabled !== false"
                            @update:modelValue="updateField('pageBadgeEnabled', Boolean($event))"
                          />
                        </div>

                        <!-- ページ内バッジ有効時のみ展開表示 (OFF時は非表示) -->
                        <div v-if="envConfig.pageBadgeEnabled !== false" class="bundle-sub-options mt-3">
                          <div class="field-item">
                            <label>{{ t('pageBadgePosition') }}</label>
                            <Select 
                              :modelValue="envConfig.pageBadgePosition"
                              :options="badgePositionOptions"
                              optionLabel="label"
                              optionValue="value"
                              class="w-full"
                              @update:modelValue="onPositionChange($event as PageBadgePosition)"
                            />
                          </div>

                          <div class="field-item mt-2">
                            <label>{{ t('pageBadgeFontSize') }}</label>
                            <InputNumber 
                              :modelValue="envConfig.pageBadgeFontSize"
                              :min="10" :max="100"
                              showButtons
                              buttonLayout="horizontal"
                              class="w-full font-size-input-field"
                              :class="{ 'p-invalid': validationError?.invalidPageBadgeFontSize }"
                              @update:modelValue="updateField('pageBadgeFontSize', $event || 24)"
                            >
                              <template #incrementbuttonicon><i class="pi pi-plus text-xs" /></template>
                              <template #decrementbuttonicon><i class="pi pi-minus text-xs" /></template>
                            </InputNumber>
                          </div>
                        </div>
                      </div>

                      <!-- コンソールログトグル -->
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
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </template>
  </Card>
</template>

<style scoped>
/* 環境ごとの設定カードのスタイル（全幅を100%固定） */
.env-card {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 2.5rem;
  border-radius: 1rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

:deep(.p-card-body) {
  width: 100%;
  box-sizing: border-box;
}

:deep(.p-card-content) {
  width: 100%;
  box-sizing: border-box;
}

.content-wrapper {
  width: 100%;
  box-sizing: border-box;
}

/* ヘッダー周りのレイアウト */
.card-header-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
}

.header-title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
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

/* タブデザイン（タブ切り替え時に横幅がブレないよう全幅を固定） */
.env-tabs {
  width: 100%;
  box-sizing: border-box;
}

:deep(.p-tablist) {
  width: 100%;
  box-sizing: border-box;
  background: transparent !important;
  border-bottom: 1px solid var(--border-color) !important;
}

:deep(.p-tab) {
  padding: 0.75rem 1.25rem !important;
  background: transparent !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  color: var(--text-secondary) !important;
  transition: all 0.2s ease-in-out !important;
}

:deep(.p-tab:hover) {
  color: var(--text-primary) !important;
}

:deep(.p-tab[aria-selected="true"]) {
  color: var(--p-primary-color) !important;
  border-bottom-color: var(--p-primary-color) !important;
}

:deep(.p-tabpanels) {
  width: 100%;
  box-sizing: border-box;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
}

:deep(.p-tabpanel) {
  width: 100%;
  box-sizing: border-box;
}

.tab-item-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.875rem;
}

.tab-count-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background-color: var(--item-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  line-height: 1.2;
}

.urls-tab-wrapper {
  width: 100%;
  box-sizing: border-box;
  padding-top: 1rem;
}

.appearance-tab-wrapper {
  width: 100%;
  box-sizing: border-box;
  padding-top: 1rem;
}

/* デザイン・表示設定タブの2カラム構成（幅広グリッド・minmax指定でコンテンツによる幅押し広げを防止） */
.appearance-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 720px) {
  .appearance-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* 設定グループボックス */
.settings-group-box {
  background: var(--item-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.25rem;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
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
  margin-bottom: 1.25rem;
}

.appearance-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  box-sizing: border-box;
}

.toggle-bundle-item {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
}

.toggle-bundle-item .toggle-row-item {
  background: transparent;
  border: none;
  padding: 0.25rem 0;
}

.bundle-sub-options {
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toggle-info {
  flex: 1;
  min-width: 0;
}

.field-item {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.field-item label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

/* 文字サイズ入力フィールドの水平レイアウト調整（枠はみ出し防止） */
:deep(.font-size-input-field) {
  display: flex !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

:deep(.font-size-input-field .p-inputnumber-input) {
  flex: 1 1 0 !important;
  min-width: 0 !important;
  width: 100% !important;
  text-align: center !important;
  box-sizing: border-box !important;
}

:deep(.font-size-input-field .p-inputnumber-button) {
  flex-shrink: 0 !important;
  width: 2.25rem !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* 各種ユーティリティ */
.mb-4 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.px-4 { padding-left: 1.5rem; padding-right: 1.5rem; }
.pt-4 { padding-top: 1.5rem; }
.pb-4 { padding-bottom: 1.5rem; }
</style>
