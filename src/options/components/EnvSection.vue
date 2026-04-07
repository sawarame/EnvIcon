<script setup lang="ts">
import { EnvironmentConfig, HostnamePattern } from '../../types';
import { t } from '../i18n';
import HostnameList from './HostnameList.vue';

const props = defineProps<{
  // 表示と操作対象となる各環境の設定情報（名前、色、ホスト名リスト）
  envConfig: EnvironmentConfig;
  // URLチェッカーから渡される現在検証中のホスト名（一致判定用）
  checkerHostname?: string | null;
}>();

const emit = defineEmits<{
  // 設定情報の子コンポーネントからの変更を親へ同期するためのイベント
  (e: 'update:envConfig', value: EnvironmentConfig): void;
  // この環境セクションを削除するイベント
  (e: 'delete', id: string): void;
}>();

/**
 * 環境名の文字列やバッジの色など、特定のプロパティ1つを更新・イベント発行する
 * @param field 更新するフィールド名 (例: 'name', 'badgeColor')
 * @param value 新しい値
 */
const updateField = <K extends keyof EnvironmentConfig>(field: K, value: EnvironmentConfig[K]) => {
  emit('update:envConfig', { ...props.envConfig, [field]: value });
};

/**
 * ホスト名一覧(HostnamePattern)の配列がHostNameListから更新されたときに呼び出される
 */
const updateHostnames = (newHostnames: HostnamePattern[]) => {
  emit('update:envConfig', { ...props.envConfig, hostnames: newHostnames });
};

/**
 * 削除ボタンが押下されたときの処理
 */
const deleteSection = () => {
  emit('delete', props.envConfig.id);
};

/**
 * 環境ごとの背景色・名前などの設定を標準の値（デフォルト）にリセットする
 */
const confirmResetDefault = () => {
  const { id } = props.envConfig;
  
  // 標準の設定値（Production/Staging/Development）がある場合はそれを利用し、カスタムの場合は先頭4文字等を参照する
  const badgeText = id === "prod" ? "prod" : id === "stg" ? "stg" : id === "dev" ? "dev" : props.envConfig.name.substring(0, 4).toLowerCase();
  const badgeColor = id === "prod" ? "#ff0000" : id === "stg" ? "#0000ff" : id === "dev" ? "#008000" : "#888888";
  
  // 親に変更を通知する
  emit('update:envConfig', { 
    ...props.envConfig, 
    badgeText, 
    badgeColor, 
    badgeOutlineColor: "#ffffff",
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
  });
};

// 組み込みで提供されている初期環境かどうか（prod / stg / dev）を判定する。これらは名前変更と削除が不可。
const isDefaultEnv = ["prod", "stg", "dev"].includes(props.envConfig.id);

// 組み込み環境の名前表示用のi18n翻訳キー
const envNameKey = props.envConfig.id === "prod" ? "ProductionName" : props.envConfig.id === "stg" ? "StagingName" : props.envConfig.id === "dev" ? "DevelopmentName" : "";
</script>

<template>
  <div class="card mb-4 env-section">
    <div class="card-header d-flex align-items-center bg-light">
      <label v-if="isDefaultEnv" class="form-label fw-bold mb-0">
        {{ t(envNameKey as any) }}
      </label>
      <input 
        v-else 
        type="text" 
        class="form-control form-control-sm fw-bold w-auto border-0 bg-transparent ps-0 env-name-input"
        :class="{ 'is-invalid': (envConfig as any)._invalidName }"
        :value="envConfig.name" 
        @input="updateField('name', ($event.target as HTMLInputElement).value)"
        maxlength="50" 
      />
      
      <button 
        v-if="envConfig.isDeletable" 
        type="button" 
        class="btn btn-outline-danger btn-circle-sm ms-auto"
        :title="t('deleteEnvironment')"
        @click="deleteSection"
      >
        &times;
      </button>
    </div>

    <div class="card-body">
      <div class="row align-items-center mb-4 pb-3 border-bottom">
        <div class="col-auto">
          <label class="col-form-label small text-muted">{{ t('badgeTextLabel') }}</label>
        </div>
        <div class="col-auto">
          <input 
            type="text" 
            class="form-control form-control-sm" 
            style="width: 80px;" 
            maxlength="4" 
            :value="envConfig.badgeText"
            @input="updateField('badgeText', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="col-auto">
          <label class="col-form-label small text-muted">{{ t('badgeColorLabel') }}</label>
        </div>
        <div class="col-auto">
          <input 
            type="color" 
            class="form-control form-control-color" 
            :value="envConfig.badgeColor"
            @input="updateField('badgeColor', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="col-auto">
          <label class="col-form-label small text-muted">{{ t('badgeOutlineColorLabel') }}</label>
        </div>
        <div class="col-auto">
          <input 
            type="color" 
            class="form-control form-control-color" 
            :value="envConfig.badgeOutlineColor"
            @input="updateField('badgeOutlineColor', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="col-auto ms-auto">
          <button 
            type="button" 
            class="btn btn-sm btn-link text-decoration-none"
            @click="confirmResetDefault"
          >
            {{ t('resetDefault') }}
          </button>
        </div>
      </div>

      <div class="row align-items-center mb-4 pb-3 border-bottom">
        <div class="col-auto">
          <label class="col-form-label small text-muted">{{ t('pageBadgePosition') }}</label>
        </div>
        <div class="col-auto">
          <select 
            class="form-select form-select-sm" 
            :value="envConfig.pageBadgePosition || 'bottom-right'"
            @change="updateField('pageBadgePosition', ($event.target as HTMLSelectElement).value as any)"
          >
            <option value="top-left">{{ t('badgePosTopLeft') }}</option>
            <option value="top-right">{{ t('badgePosTopRight') }}</option>
            <option value="bottom-left">{{ t('badgePosBottomLeft') }}</option>
            <option value="bottom-right">{{ t('badgePosBottomRight') }}</option>
          </select>
        </div>

        <div class="col-auto ms-3">
          <label class="col-form-label small text-muted">{{ t('pageBadgeFontSize') }} (px)</label>
        </div>
        <div class="col-auto">
          <input 
            type="number" 
            class="form-control form-control-sm" 
            style="width: 80px;" 
            min="10" max="100"
            :value="envConfig.pageBadgeFontSize || 24"
            @input="updateField('pageBadgeFontSize', parseInt(($event.target as HTMLInputElement).value, 10))"
          />
        </div>
      </div>

      <HostnameList 
        :modelValue="envConfig.hostnames" 
        :checkerHostname="checkerHostname"
        @update:modelValue="updateHostnames"
      />
    </div>
  </div>
</template>
