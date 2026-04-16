<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { SyncData, EnvironmentConfig } from '../types';
import { currentLanguage, setLanguage, t, Language } from './i18n';
import { getHostname } from './utils';
import EnvSection from './components/EnvSection.vue';
import Toast from './components/Toast.vue';
import introJs from 'intro.js';

// --- チュートリアルに関する関数 ---
const startTour = () => {
  const intro = introJs.tour();
  intro.setOptions({
    steps: [
      {
        title: t('tourWelcomeTitle'),
        intro: t('tourWelcomeMsg'),
      },
      {
        element: '#env-section-prod .hostname-input',
        title: t('tourHostnameTitle'),
        intro: t('tourHostnameMsg'),
        position: 'bottom'
      },
      {
        element: '#badge-settings-prod',
        title: t('tourBadgeTitle'),
        intro: t('tourBadgeMsg'),
        position: 'bottom'
      },
      {
        element: '#url-checker-card',
        title: t('tourCheckerTitle'),
        intro: t('tourCheckerMsg'),
      },
      {
        element: '#save-button',
        title: t('tourSaveTitle'),
        intro: t('tourSaveMsg'),
        position: 'top'
      },
    ],
    nextLabel: t('tourNext'),
    prevLabel: t('tourPrev'),
    doneLabel: t('tourFinish'),
    hidePrev: true,
  });

  intro.oncomplete(() => {
    chrome.storage.local.set({ tutorialCompleted: true });
  });

  intro.onexit(() => {
    // スキップされた場合も一応保存するかは要検討だが、ここでは完了時のみとする
  });

  intro.start();
};

// 現在設定されている環境のリスト
const environments = ref<EnvironmentConfig[]>([]);

// --- トースト通知に関する状態管理 ---
const toastMsg = ref(''); // トーストに表示するメッセージ
const toastShow = ref(false); // トーストの表示/非表示フラグ
const toastIsError = ref(false); // エラー表示かどうか（背景色に影響）
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// --- URLチェッカーに関する状態管理 ---
const checkerUrl = ref('');
const showUrlChecker = ref(false);
const checkerResult = computed(() => {
  const url = checkerUrl.value.trim();
  if (!url) return null;
  const hostname = getHostname(url);
  if (!hostname) return null;
  
  for (const env of environments.value) {
    if (!env.hostnames) continue;
    const matched = env.hostnames.some(p => {
      if (!p.value.trim()) return false;
      if (p.isRegex) {
        try {
          return new RegExp(p.value).test(hostname);
        } catch {
          return false;
        }
      }
      return (getHostname(p.value) || p.value) === hostname;
    });
    
    if (matched) {
      return { match: true, hostname: hostname, env: env };
    }
  }
  return { match: false, hostname: hostname, env: null };
});

/**
 * 組み込み環境の名前を翻訳キー経由で取得し、それ以外は設定された名前を返す
 */
const getEnvName = (env: EnvironmentConfig) => {
  if (env.id === 'prod') return t('ProductionName');
  if (env.id === 'stg') return t('StagingName');
  if (env.id === 'dev') return t('DevelopmentName');
  return env.name;
};

/**
 * トースト通知を表示する
 * @param message 表示するメッセージ内容
 * @param isError エラー表示にする場合は true を指定する
 */
const showToast = (message: string, isError: boolean = false) => {
  toastMsg.value = message;
  toastIsError.value = isError;
  toastShow.value = true;
  if (toastTimeout) clearTimeout(toastTimeout);
  
  // 3秒後に自動で非表示にする
  toastTimeout = setTimeout(() => {
    toastShow.value = false;
  }, 3000);
};

// --- 未保存状態（Dirty状態）の管理 ---
const isDirty = ref(false); // 設定が編集され、未保存かどうか
let initialSettingsStr = ''; // 読み込み時点での設定値（JSON文字列）

/**
 * 現在のフォーム状態を文字列（JSON）として取得する
 * この文字列を比較して、設定が変更されたか（Dirty状態か）を判定する
 */
const getUIStateString = () => {
  return JSON.stringify({
    envs: environments.value.map(env => ({
      ...env,
      // バリデーション用の一時的なプロパティを除外し、ホスト名のみを抽出
      hostnames: env.hostnames.map(hn => ({ value: hn.value, isRegex: hn.isRegex }))
    }))
  });
};

/**
 * 値が変更されたら呼び出され、初期状態と比較して未保存状態（isDirty）を更新する
 */
const checkDirtyState = () => {
  isDirty.value = getUIStateString() !== initialSettingsStr;
};

// 値の変更を監視してDirty判定を走らせる
watch(environments, checkDirtyState, { deep: true });

onMounted(() => {
  // ① Chromeストレージから現在の言語設定を読み込む
  chrome.storage.local.get(["language", "tutorialCompleted"], (localData) => {
    let lang: Language = "en";
    if (localData.language === "ja" || localData.language === "en") {
      lang = localData.language;
    } else {
      // 保存された言語がない場合はブラウザの言語情報から推測する
      lang = navigator.language.startsWith("ja") ? "ja" : "en";
    }
    setLanguage(lang);

    // ② Chromeストレージ（Sync）から保存済みの拡張機能設定を読み込む
    chrome.storage.sync.get(null, (data: SyncData) => {
      const defaultEnvs: EnvironmentConfig[] = [
        { id: "prod", name: "Production", badgeText: "prod", badgeColor: "#ff0000", badgeOutlineColor: "#ffffff", faviconEnabled: true, pageBadgeEnabled: true, pageBadgePosition: "bottom-right", pageBadgeFontSize: 24, hostnames: [], isDeletable: false },
        { id: "stg",  name: "Staging",    badgeText: "stg",  badgeColor: "#0000ff", badgeOutlineColor: "#ffffff", faviconEnabled: true, pageBadgeEnabled: true, pageBadgePosition: "bottom-right", pageBadgeFontSize: 24, hostnames: [], isDeletable: false },
        { id: "dev",  name: "Development",badgeText: "dev",  badgeColor: "#008000", badgeOutlineColor: "#ffffff", faviconEnabled: true, pageBadgeEnabled: true, pageBadgePosition: "bottom-right", pageBadgeFontSize: 24, hostnames: [], isDeletable: false },
      ];

      // 保存された環境設定が存在すればそれを、なければデフォルト設定をセットする
      environments.value = (data.environments && data.environments.length > 0)
        ? data.environments
        : defaultEnvs;

      // 既存データの移行: faviconEnabled / pageBadgeEnabledが未定義ならデフォルト(true)を補完する
      environments.value.forEach(env => {
        if (env.faviconEnabled === undefined) env.faviconEnabled = true;
        if (env.pageBadgeEnabled === undefined) env.pageBadgeEnabled = true;
        if (!env.pageBadgePosition) env.pageBadgePosition = "bottom-right";
        if (!env.pageBadgeFontSize) env.pageBadgeFontSize = 24;
      });

      // ホスト名リストが空の場合は初期入力行を1つ追加しておく
      environments.value.forEach(env => {
        if (!env.hostnames || env.hostnames.length === 0) {
          env.hostnames = [{ value: '', isRegex: false }];
        }
      });

      // 描画後（DOM適用後）に現在の状態をデフォルトとして保存し、Dirty状態をリセットする
      nextTick(() => {
        initialSettingsStr = getUIStateString();
        isDirty.value = false;

        // チュートリアル未完了なら開始
        if (!localData.tutorialCompleted) {
          setTimeout(() => {
            startTour();
          }, 500);
        }
      });
    });
  });
});

/**
 * 言語が変更されたときの処理
 */
const onLanguageChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value as Language;
  setLanguage(val); // 画面上の言語アセットを即時変更する
  chrome.storage.local.set({ language: val }); // 設定として即時保存
  checkDirtyState();
};

/**
 * 指定されたIDの環境セクションを削除する
 */
const deleteEnvironment = (id: string) => {
  environments.value = environments.value.filter(env => env.id !== id);
};

/**
 * カスタム環境（新規環境）をリストの最後に追加する
 */
const addEnvironment = () => {
  const defaultName = t("newEnvDefaultName");
  const id = `custom_${Date.now()}`;
  const newEnv: EnvironmentConfig = {
    id,
    name: defaultName,
    badgeText: defaultName.substring(0, 4).toLowerCase(),
    badgeColor: "#888888",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [{ value: '', isRegex: false }],
    isDeletable: true,
  };
  environments.value.push(newEnv);
  
  // 追加されたらスムーズに画面の一番下までスクロールして追加要素を目視しやすくする
  nextTick(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  });
};

/**
 * 設定（フォーム）の内容を検証し、問題なければChrome Storage (sync)へ保存する
 */
const saveSettings = () => {
  let hasInvalid = false;  // 無効な入力があるか
  let hasDuplicate = false; // 重複した入力があるか
  let hasEmptyName = false; // 空の環境名があるか
  const seenPatterns = new Set<string>(); // 重複検証用セット

  // すべてのバリデーション状態（エラー表示用のフラグ）を一旦リセット
  environments.value.forEach(env => {
    (env as any)._invalidName = false;
    env.hostnames.forEach(hn => {
      (hn as any)._invalid = false;
    });
  });

  // 環境名のバリデーション処理
  environments.value.forEach(env => {
    const name = env.name.trim();
    if (name === "") {
      (env as any)._invalidName = true;
      hasEmptyName = true;
    }
  });

  // 環境ごとのホスト名を検証しながら保存用データ（envsToSave）を作成する
  const envsToSave = environments.value.map(env => {
    // 空欄のホスト名項目は無視する
    const validHostnames = env.hostnames.filter(hn => hn.value.trim() !== "");
    const processedHostnames = validHostnames.map(hn => {
      const rawValue = hn.value.trim();
      let patternKey = "";
      let processedValue = rawValue;

      if (hn.isRegex) {
        // 正規表現として有効かテストする
        try {
          new RegExp(rawValue);
          patternKey = `regex:${rawValue}`;
        } catch {
          (hn as any)._invalid = true;
          hasInvalid = true;
        }
      } else {
        // URL、またはホスト名として有効かバリデーション（getHostname() ユーティリティを利用）
        const hostname = getHostname(rawValue);
        if (!hostname) {
          (hn as any)._invalid = true;
          hasInvalid = true;
        } else {
          processedValue = hostname; // "http://example.com" 等の形式ならホスト名だけに整形される
          patternKey = `host:${hostname}`;
        }
      }

      // 重複チェック
      if (!hasInvalid && patternKey) {
        if (seenPatterns.has(patternKey)) {
          (hn as any)._invalid = true;
          hasDuplicate = true;
        } else {
          seenPatterns.add(patternKey);
        }
      }

      return { value: processedValue, isRegex: hn.isRegex };
    });

    return {
      ...env,
      name: env.name.trim(),
      hostnames: processedHostnames
    };
  });

  // バリデーションエラーがあった場合は保存を中止しエラーメッセージを出す
  if (hasInvalid || hasDuplicate || hasEmptyName) {
    showToast(hasDuplicate ? t("errorDuplicate") : t("errorInvalid"), true);
    return;
  }

  // 保存する設定オブジェクトの構築
  const settings: SyncData = {
    environments: envsToSave,
  };

  // Chromeストレージへ保存する
  chrome.storage.sync.set(settings, () => {
    showToast(t("saved"), false); // 保存成功メッセージを出す
    initialSettingsStr = getUIStateString();
    isDirty.value = false;
    
    // 不要な空白行が削除され、パース＆整形された後の値をUIへ反映し直す
    environments.value = envsToSave;
    environments.value.forEach(env => {
      // 削除された結果すべて0行になった場合は、空の入力行を一つだけ追加しておく
      if (!env.hostnames || env.hostnames.length === 0) {
        env.hostnames = [{ value: '', isRegex: false }];
      }
    });
  });
};
</script>

<template>
  <div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4 pt-3">
      <h1 id="header-logo" class="mb-0 d-flex align-items-center gap-2">
        <img src="/images/icon48.png" alt="EnvIcon Logo" width="32" height="32"> 
        <span>EnvIcon</span>
      </h1>
      <div class="d-flex align-items-center gap-2">
        <button 
          class="btn btn-sm btn-outline-info rounded-circle d-flex align-items-center justify-content-center" 
          style="width: 28px; height: 28px; padding: 0;"
          @click="startTour"
          :title="t('tourWelcomeTitle')"
        >
          <span style="font-weight: bold; font-size: 14px;">?</span>
        </button>
        <select 
          class="form-select form-select-sm w-auto" 
          :value="currentLanguage" 
          @change="onLanguageChange"
        >
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </div>


    <!-- URLチェッカー -->
    <div id="url-checker-card" class="card mb-4 overflow-hidden shadow-sm">
      <div 
        class="card-header bg-light d-flex align-items-center justify-content-between" 
        @click="showUrlChecker = !showUrlChecker" 
        style="cursor: pointer; border-bottom: none;"
        :class="{ 'border-bottom': showUrlChecker }"
      >
        <h6 class="fw-bold mb-0">
          🔍 {{ t("urlCheckerTitle") }}
        </h6>
        <span class="small text-muted">
          {{ showUrlChecker ? '▲' : '▼' }}
        </span>
      </div>
      
      <div v-if="showUrlChecker" class="card-body bg-light pt-0">
        <p class="text-muted small mb-3">
          {{ t("urlCheckerDescription") }}
        </p>
        <input 
          type="text" 
          class="form-control mb-2" 
          v-model="checkerUrl" 
          :placeholder="t('urlCheckerPlaceholder')"
        />
        <div style="min-height: 24px;">
          <div v-if="checkerResult" class="d-flex align-items-center gap-2">
            <span v-if="checkerResult.match" class="text-success fw-bold">
              {{ t("urlCheckerMatched") }} 
              <span 
                class="badge" 
                :style="{ backgroundColor: checkerResult.env?.badgeColor, color: checkerResult.env?.badgeOutlineColor, borderColor: checkerResult.env?.badgeOutlineColor, border: '1px solid' }"
              >{{ checkerResult.env ? getEnvName(checkerResult.env) : '' }}</span> 
            </span>
            <span v-else class="text-danger fw-bold">
              {{ t("urlCheckerNotMatched") }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div id="environmentsContainer">
      <EnvSection 
        v-for="(env, index) in environments" 
        :key="env.id"
        v-model:envConfig="environments[index]"
        :checkerHostname="checkerResult?.hostname || null"
        @delete="deleteEnvironment"
      />
    </div>
  </div>

  <div class="sticky-footer">
    <div class="container d-flex align-items-center gap-2">
      <button 
        id="save-button"
        class="btn btn-primary" 
        @click="saveSettings"
        :disabled="!isDirty"
      >
        {{ t("save") }}
      </button>
      <button 
        class="btn btn-outline-secondary" 
        @click="addEnvironment"
      >
        {{ t("addEnvironment") }}
      </button>
    </div>
  </div>

  <Toast 
    :show="toastShow" 
    :message="toastMsg" 
    :is-error="toastIsError" 
    @close="toastShow = false" 
  />
</template>

<style>
/* intro.js のスタイルをグローバルに適用 */
@import 'intro.js/introjs.css';
</style>

<style scoped>
/* コンポーネント固有のスタイル */
</style>
