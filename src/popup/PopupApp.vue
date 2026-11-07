<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Button from "primevue/button";
import ToggleSwitch from "primevue/toggleswitch";
import { EnvironmentConfig, SyncData, TargetLocation } from "../types";
import { Language, setLanguage, t } from "../options/i18n";
import { normalizeUrlPattern } from "../options/utils";
import {
  createDefaultEnvironments,
  findMatchingDetail,
  getSessionData,
  parseTargetLocation,
} from "../features/utils";

/** 拡張機能全体が有効かどうか（false の場合は全体一時OFF） */
const globalEnabled = ref<boolean>(true);
/** サイト単位で一時OFFにしているホスト識別子（hostname[:port]）のリスト */
const disabledHostnames = ref<string[]>([]);
/** 環境設定一覧 */
const environments = ref<EnvironmentConfig[]>([]);
/** 現在アクティブなタブの評価対象ロケーション（対象外ページの場合は null） */
const currentTarget = ref<TargetLocation | null>(null);
/** 初期データ読み込み完了フラグ */
const isLoaded = ref<boolean>(false);

/**
 * 現在アクティブなタブのホスト識別子（hostname[:port]）を返す算出プロパティ
 */
const currentHostWithPort = computed<string | null>(
  () => currentTarget.value?.hostWithPort ?? null
);

/**
 * 現在のページが拡張機能の動作対象URLかどうかを判定する算出プロパティ
 */
const isSupportedPage = computed<boolean>(() => Boolean(currentTarget.value));

/**
 * 現在のサイト（hostname[:port]）がサイト単位の一時OFF対象に含まれているかを判定する算出プロパティ
 */
const isSiteMuted = computed<boolean>(() => {
  if (!currentHostWithPort.value) return false;
  const hostKey = currentHostWithPort.value.toLowerCase();
  return disabledHostnames.value.some((h) => h.toLowerCase() === hostKey);
});

/**
 * 全体OFFまたはサイト単位OFFのいずれかによって現在ミュート中かどうかを判定する算出プロパティ
 */
const isEffectiveMuted = computed<boolean>(
  () => !globalEnabled.value || isSiteMuted.value
);

/**
 * 現在のタブのロケーションに対する環境マッチング詳細情報を返す算出プロパティ
 */
const matchDetail = computed(() => {
  if (!currentTarget.value) return null;
  return findMatchingDetail(environments.value, currentTarget.value);
});

/**
 * 現在一致している環境設定を返す算出プロパティ
 */
const matchedEnv = computed<EnvironmentConfig | null>(
  () => matchDetail.value?.env ?? null
);

/**
 * パス指定・正規表現・ポートなし親ルール等によりポップアップ編集をロックすべきかを返す算出プロパティ
 */
const isPatternLocked = computed<boolean>(() =>
  Boolean(matchDetail.value && !matchDetail.value.isExactHostPortMatch)
);

/**
 * 環境設定オブジェクトから現在の表示言語に応じた環境名を取得する関数
 * @param env - 対象の環境設定オブジェクト
 * @returns ローカライズされた環境名
 */
const getEnvDisplayName = (env: EnvironmentConfig): string => {
  if (env.id === "prod") return t("ProductionName");
  if (env.id === "stg") return t("StagingName");
  if (env.id === "dev") return t("DevelopmentName");
  return env.name;
};

/**
 * 環境設定オブジェクトからバッジ表示用テキスト（最大4文字）を取得する関数
 * @param env - 対象の環境設定オブジェクト
 * @returns 大文字化したバッジ文字列
 */
const getBadgeLabel = (env: EnvironmentConfig): string => {
  return (env.badgeText || env.id).substring(0, 4).toUpperCase();
};

/**
 * 拡張機能全体のON/OFFスイッチを切り替えてセッションストレージに保存する非同期関数
 * @param enabled - 有効にする場合は true、全体一時OFFにする場合は false
 * @returns 保存完了を表す Promise
 */
const onToggleGlobal = async (enabled: boolean): Promise<void> => {
  globalEnabled.value = enabled;
  await chrome.storage.session.set({ globalDisabled: !enabled });
};

/**
 * 現在のサイト（hostname[:port]）の一時OFFスイッチを切り替えてセッションストレージに保存する非同期関数
 * @param muted - このサイトを一時OFFにする場合は true、解除する場合は false
 * @returns 保存完了を表す Promise
 */
const onToggleSiteMute = async (muted: boolean): Promise<void> => {
  if (!currentHostWithPort.value) return;
  const hostKey = currentHostWithPort.value.toLowerCase();
  const filtered = disabledHostnames.value.filter(
    (h) => h.toLowerCase() !== hostKey
  );
  const updated = muted ? [...filtered, hostKey] : filtered;
  disabledHostnames.value = updated;
  await chrome.storage.session.set({ disabledHostnames: updated });
};

/**
 * 全環境の通常パターンリストから指定された hostWithPort と完全一致する項目および空行を除去する関数
 * パス指定パターンや正規表現パターン、別ポートの設定は保護してそのまま残す
 * @param sourceEnvs - 元となる環境設定の配列
 * @param targetHostWithPort - 除去対象のホスト識別子（小文字の hostname[:port]）
 * @returns 整理済みの新しい環境設定配列
 */
const removeExactHostPortFromEnvs = (
  sourceEnvs: EnvironmentConfig[],
  targetHostWithPort: string
): EnvironmentConfig[] => {
  return sourceEnvs.map((env) => {
    const cleanedHostnames = (env.hostnames || []).filter((hn) => {
      const trimmed = hn.value.trim();
      if (!trimmed) return false;
      if (hn.isRegex) return true;
      const normalized = normalizeUrlPattern(trimmed) ?? trimmed.toLowerCase();
      return normalized !== targetHostWithPort;
    });
    return {
      ...env,
      hostnames: cleanedHostnames,
    };
  });
};

/**
 * 現在の hostWithPort の環境登録を解除して同期ストレージへ保存する非同期関数
 * @returns 保存完了を表す Promise
 */
const unassignCurrentHostname = async (): Promise<void> => {
  if (!currentHostWithPort.value || isPatternLocked.value) return;
  const hostKey = currentHostWithPort.value.toLowerCase();
  const updatedEnvs = removeExactHostPortFromEnvs(environments.value, hostKey);
  environments.value = updatedEnvs;
  await chrome.storage.sync.set({ environments: updatedEnvs });
};

/**
 * 現在の hostWithPort を指定された環境へ割り当て（既に選択中の場合は登録解除）して保存する非同期関数
 * @param targetEnvId - 割り当て先の環境ID
 * @returns 保存完了を表す Promise
 */
const assignToEnvironment = async (targetEnvId: string): Promise<void> => {
  if (!currentHostWithPort.value || isPatternLocked.value) return;

  // 既に同じ環境に完全一致パターンで割り当て済みの場合は再クリックで解除する
  if (matchedEnv.value?.id === targetEnvId) {
    await unassignCurrentHostname();
    return;
  }

  const hostKey = currentHostWithPort.value.toLowerCase();
  const cleanedEnvs = removeExactHostPortFromEnvs(environments.value, hostKey);
  const updatedEnvs = cleanedEnvs.map((env) => {
    if (env.id !== targetEnvId) return env;
    return {
      ...env,
      hostnames: [
        ...env.hostnames,
        { value: hostKey, isRegex: false, enabled: true },
      ],
    };
  });

  environments.value = updatedEnvs;
  await chrome.storage.sync.set({ environments: updatedEnvs });
};

/**
 * オプション設定画面を開いてポップアップを閉じる非同期関数
 * @returns 処理完了を表す Promise
 */
const openOptionsPage = async (): Promise<void> => {
  try {
    await chrome.runtime.openOptionsPage();
  } catch {
    await chrome.tabs.create({ url: "options.html" });
  }
  window.close();
};

/**
 * ストレージの変更を監視してポップアップ内の表示状態を最新化するリスナー関数
 * @param changes - 変更されたストレージキーのマップ
 * @param areaName - 変更が発生したストレージ領域名
 * @returns 更新処理完了を表す Promise
 */
const handleStorageChanged = async (
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): Promise<void> => {
  if (areaName === "sync" && changes.environments) {
    const syncData = (await chrome.storage.sync.get("environments")) as SyncData;
    environments.value =
      syncData.environments && syncData.environments.length > 0
        ? syncData.environments
        : createDefaultEnvironments();
  } else if (areaName === "session") {
    const sessionData = await getSessionData();
    globalEnabled.value = !sessionData.globalDisabled;
    disabledHostnames.value = sessionData.disabledHostnames ?? [];
  }
};

/**
 * chrome.storage.onChanged に登録するためのイベントリスナーラッパー関数
 * @param changes - 変更されたストレージキーのマップ
 * @param areaName - 変更が発生したストレージ領域名
 * @returns なし
 */
const storageListener = (
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): void => {
  void handleStorageChanged(changes, areaName);
};

onMounted(async () => {
  const [localData, tabs, syncData, sessionData] = await Promise.all([
    chrome.storage.local.get(["language", "darkMode"]),
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.sync.get(null) as Promise<SyncData>,
    getSessionData(),
  ]);

  // 表示言語の適用
  const lang: Language =
    localData.language === "ja" || localData.language === "en"
      ? localData.language
      : navigator.language.startsWith("ja")
        ? "ja"
        : "en";
  setLanguage(lang);

  // ダークモード設定の適用
  const darkMode =
    typeof localData.darkMode === "boolean"
      ? localData.darkMode
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("my-app-dark", darkMode);

  // アクティブタブのロケーション情報を抽出
  const activeTab = tabs[0];
  currentTarget.value = parseTargetLocation(activeTab?.url);

  // 環境リストの初期化
  environments.value =
    syncData.environments && syncData.environments.length > 0
      ? syncData.environments
      : createDefaultEnvironments();

  // 一時OFF状態の初期化
  globalEnabled.value = !sessionData.globalDisabled;
  disabledHostnames.value = sessionData.disabledHostnames ?? [];

  chrome.storage.onChanged.addListener(storageListener);
  isLoaded.value = true;
});

onUnmounted(() => {
  chrome.storage.onChanged.removeListener(storageListener);
});
</script>

<template>
  <div v-if="isLoaded" class="popup-root">
    <!-- ヘッダーバー：ロゴ・全体ON/OFF・設定画面ボタン -->
    <header class="popup-header">
      <div class="brand-area">
        <img
          src="/icons/icon32.png"
          alt="EnvIcon"
          class="brand-icon"
          :class="{ 'icon-muted': !globalEnabled }"
        />
        <span class="brand-title">EnvIcon</span>
      </div>

      <div class="header-controls">
        <div
          class="global-toggle-wrap"
          :title="t('popupGlobalToggleTitle')"
        >
          <ToggleSwitch
            :modelValue="globalEnabled"
            @update:modelValue="onToggleGlobal"
            aria-label="Global Toggle"
          />
        </div>
        <Button
          icon="pi pi-cog"
          text
          rounded
          severity="secondary"
          size="small"
          :title="t('popupOpenSettings')"
          @click="openOptionsPage"
        />
      </div>
    </header>

    <!-- 全体一時OFF中の通知バナー -->
    <div v-if="!globalEnabled" class="global-paused-banner">
      <i class="pi pi-pause-circle"></i>
      <span>{{ t("popupGlobalDisabledBanner") }}</span>
    </div>

    <!-- メインコンテンツ -->
    <main class="popup-body">
      <!-- 対象外ページ（chrome:// 等）の場合 -->
      <div v-if="!isSupportedPage" class="unsupported-card">
        <i class="pi pi-info-circle unsupported-icon"></i>
        <p class="unsupported-text">{{ t("popupUnsupportedPage") }}</p>
      </div>

      <!-- 動作対象サイトの場合 -->
      <template v-else>
        <!-- 現在のサイト情報＆サイト単位の一時OFFカード -->
        <section class="site-card">
          <div class="site-card-top">
            <span class="section-caption">{{ t("popupCurrentSite") }}</span>
            <!-- 現在のステータスバッジ -->
            <span v-if="isEffectiveMuted" class="status-pill status-paused">
              <i class="pi pi-eye-slash"></i>
              {{ t("popupStatusPaused") }}
            </span>
            <span
              v-else-if="matchedEnv"
              class="status-pill status-matched"
              :style="{
                backgroundColor: matchedEnv.badgeColor,
                color: matchedEnv.badgeOutlineColor,
              }"
            >
              {{ getBadgeLabel(matchedEnv) }}
            </span>
            <span v-else class="status-pill status-unassigned">
              {{ t("popupStatusUnassigned") }}
            </span>
          </div>

          <div class="hostname-display" :title="currentHostWithPort || ''">
            {{ currentHostWithPort }}
          </div>

          <!-- このサイトを一時OFFトグル -->
          <div
            class="site-mute-row"
            :class="{ 'row-disabled': !globalEnabled }"
          >
            <div class="site-mute-labels">
              <span class="site-mute-title">{{ t("popupSiteMuteLabel") }}</span>
              <span class="site-mute-hint">{{ t("popupSiteMuteHint") }}</span>
            </div>
            <ToggleSwitch
              :modelValue="isSiteMuted"
              :disabled="!globalEnabled"
              @update:modelValue="onToggleSiteMute"
              aria-label="Pause on this site"
            />
          </div>
        </section>

        <!-- 環境の割り当てセクション -->
        <section class="assign-section">
          <div class="assign-header">
            <span class="section-caption">{{ t("popupAssignEnvTitle") }}</span>
            <button
              v-if="matchedEnv && !isPatternLocked"
              type="button"
              class="unassign-link-btn"
              @click="unassignCurrentHostname"
            >
              <i class="pi pi-times"></i>
              {{ t("popupUnassign") }}
            </button>
          </div>

          <!-- パス指定・正規表現・広域ホストパターンで一致中のロック案内 -->
          <div v-if="isPatternLocked && matchDetail" class="regex-lock-box">
            <div class="regex-lock-header">
              <i class="pi pi-lock"></i>
              <span>{{ getEnvDisplayName(matchDetail.env) }}</span>
              <span
                class="mini-env-badge ms-auto"
                :style="{
                  backgroundColor: matchDetail.env.badgeColor,
                  color: matchDetail.env.badgeOutlineColor,
                }"
              >
                {{ getBadgeLabel(matchDetail.env) }}
              </span>
            </div>
            <div class="regex-pattern-code">
              <span class="regex-label">{{ t("popupRegexPatternLabel") }}</span>
              <code>{{ matchDetail.pattern.value }}</code>
            </div>
            <p class="regex-lock-desc">
              {{
                matchDetail.isRegexMatch
                  ? t("popupRegexLockedMsg")
                  : t("popupPatternLockedMsg")
              }}
            </p>
            <Button
              :label="t('popupOpenSettings')"
              icon="pi pi-external-link"
              size="small"
              severity="secondary"
              outlined
              class="w-full"
              @click="openOptionsPage"
            />
          </div>

          <!-- ワンクリック環境選択リスト -->
          <template v-else>
            <div class="env-button-list">
              <button
                v-for="env in environments"
                :key="env.id"
                type="button"
                class="env-select-btn"
                :class="{ 'is-active': matchedEnv?.id === env.id }"
                @click="assignToEnvironment(env.id)"
              >
                <span
                  class="mini-env-badge"
                  :style="{
                    backgroundColor: env.badgeColor,
                    color: env.badgeOutlineColor,
                  }"
                >
                  {{ getBadgeLabel(env) }}
                </span>
                <span class="env-btn-name">{{ getEnvDisplayName(env) }}</span>
                <i
                  v-if="matchedEnv?.id === env.id"
                  class="pi pi-check-circle active-check-icon"
                ></i>
              </button>
            </div>
            <p class="assign-hint">{{ t("popupAssignHint") }}</p>
          </template>
        </section>
      </template>
    </main>
  </div>
</template>

<style>
:root {
  --popup-bg: #f8fafc;
  --popup-card-bg: #ffffff;
  --popup-item-bg: #f1f5f9;
  --popup-item-hover: #e2e8f0;
  --popup-border: #cbd5e1;
  --popup-text: #1e293b;
  --popup-text-sub: #64748b;
  --popup-text-muted: #94a3b8;
  --popup-banner-bg: #fef3c7;
  --popup-banner-text: #92400e;
  --popup-banner-border: #fcd34d;
  --popup-active-bg: #eff6ff;
  --popup-active-border: #3b82f6;
}

:root.my-app-dark {
  --popup-bg: #0f172a;
  --popup-card-bg: #1e293b;
  --popup-item-bg: #0f172a;
  --popup-item-hover: #334155;
  --popup-border: #334155;
  --popup-text: #f8fafc;
  --popup-text-sub: #94a3b8;
  --popup-text-muted: #64748b;
  --popup-banner-bg: #451a03;
  --popup-banner-text: #fcd34d;
  --popup-banner-border: #78350f;
  --popup-active-bg: rgba(59, 130, 246, 0.16);
  --popup-active-border: #60a5fa;
}

body {
  background-color: var(--popup-bg);
  color: var(--popup-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.popup-root {
  display: flex;
  flex-direction: column;
  background-color: var(--popup-bg);
  color: var(--popup-text);
}

/* ヘッダー */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--popup-card-bg);
  border-bottom: 1px solid var(--popup-border);
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-icon {
  width: 22px;
  height: 22px;
  transition: filter 0.2s, opacity 0.2s;
}

.brand-icon.icon-muted {
  filter: grayscale(1);
  opacity: 0.55;
}

.brand-title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.global-toggle-wrap {
  display: flex;
  align-items: center;
}

/* 全体一時OFFバナー */
.global-paused-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--popup-banner-bg);
  color: var(--popup-banner-text);
  border-bottom: 1px solid var(--popup-banner-border);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.35;
}

/* メイン領域 */
.popup-body {
  padding: 0.875rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* 対象外ページ表示 */
.unsupported-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem 1rem;
  background-color: var(--popup-card-bg);
  border: 1px solid var(--popup-border);
  border-radius: 12px;
  gap: 0.5rem;
}

.unsupported-icon {
  font-size: 1.5rem;
  color: var(--popup-text-muted);
}

.unsupported-text {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--popup-text-sub);
}

/* 現在のサイトカード */
.site-card {
  background-color: var(--popup-card-bg);
  border: 1px solid var(--popup-border);
  border-radius: 12px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.site-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.section-caption {
  font-size: 0.6875rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--popup-text-sub);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.status-unassigned {
  background-color: var(--popup-item-bg);
  color: var(--popup-text-sub);
}

.status-paused {
  background-color: var(--popup-banner-bg);
  color: var(--popup-banner-text);
}

.hostname-display {
  font-size: 0.9375rem;
  font-weight: 700;
  word-break: break-all;
  line-height: 1.3;
}

.site-mute-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--popup-border);
}

.site-mute-row.row-disabled {
  opacity: 0.5;
}

.site-mute-labels {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.site-mute-title {
  font-size: 0.8125rem;
  font-weight: 600;
}

.site-mute-hint {
  font-size: 0.6875rem;
  color: var(--popup-text-sub);
}

/* 環境割り当てセクション */
.assign-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.assign-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.unassign-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: none;
  padding: 0.125rem 0.375rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #ef4444;
  cursor: pointer;
  transition: background-color 0.15s;
}

.unassign-link-btn:hover {
  background-color: rgba(239, 68, 68, 0.12);
}

.env-button-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}

.env-select-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  background-color: var(--popup-card-bg);
  border: 1px solid var(--popup-border);
  border-radius: 10px;
  color: var(--popup-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.env-select-btn:hover {
  background-color: var(--popup-item-hover);
}

.env-select-btn.is-active {
  background-color: var(--popup-active-bg);
  border-color: var(--popup-active-border);
  box-shadow: 0 0 0 1px var(--popup-active-border);
}

.mini-env-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.env-btn-name {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-check-icon {
  color: var(--popup-active-border);
  font-size: 1rem;
  flex-shrink: 0;
}

.assign-hint {
  margin: 0;
  font-size: 0.6875rem;
  color: var(--popup-text-sub);
  text-align: center;
}

/* パターン一致ロック表示 */
.regex-lock-box {
  background-color: var(--popup-card-bg);
  border: 1px solid var(--popup-border);
  border-radius: 12px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.regex-lock-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.regex-pattern-code {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background-color: var(--popup-item-bg);
  border-radius: 6px;
  font-size: 0.75rem;
  overflow-x: auto;
}

.regex-label {
  color: var(--popup-text-sub);
  font-weight: 600;
  flex-shrink: 0;
}

.regex-lock-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--popup-text-sub);
  line-height: 1.4;
}

.ms-auto {
  margin-left: auto;
}

.w-full {
  width: 100%;
}
</style>
