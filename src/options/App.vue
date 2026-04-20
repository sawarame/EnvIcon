<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { SyncData, EnvironmentConfig } from '../types';
import { currentLanguage, setLanguage, t, Language } from './i18n';
import { getHostname } from './utils';
import EnvSection from './components/EnvSection.vue';
import introJs from 'intro.js';
import { useToast } from 'primevue/usetoast';

import Button from 'primevue/button';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Toast from 'primevue/toast';
import Menu from 'primevue/menu';
import Dialog from 'primevue/dialog';

const toast = useToast();

const menu = ref();
const showLanguageDialog = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const toggleMenu = (event: Event) => {
  menu.value.toggle(event);
};

const menuItems = computed(() => [
  {
    label: t('changeLanguage'),
    icon: 'pi pi-globe',
    command: () => {
      showLanguageDialog.value = true;
    }
  },
  {
    label: t('exportSettings'),
    icon: 'pi pi-upload',
    command: () => handleExport()
  },
  {
    label: t('importSettings'),
    icon: 'pi pi-download',
    command: () => {
      fileInput.value?.click();
    }
  }
]);

const handleExport = () => {
  const dataToExport = { environments: environments.value };
  const dataStr = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const filename = `EnvIcon_${yyyy}${mm}${dd}${hh}${min}${ss}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleImportFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);
      
      if (!parsed || !parsed.environments || !Array.isArray(parsed.environments)) {
        throw new Error("Invalid format");
      }
      
      environments.value = parsed.environments;
      isDirty.value = true;
      showToast(t('importSuccess'), false);
    } catch (err) {
      showToast(t('importError'), true);
    } finally {
      target.value = '';
    }
  };
  reader.readAsText(file);
};

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
        element: '#env-section-prod .smart-settings-container',
        title: t('tourBadgeTitle'),
        intro: t('tourBadgeMsg'),
        position: 'bottom'
      },
      {
        element: '#env-section-prod .hostname-custom-input-group',
        title: t('tourHostnameTitle'),
        intro: t('tourHostnameMsg'),
        position: 'bottom'
      },
      {
        element: '#url-checker-card',
        title: t('tourCheckerTitle'),
        intro: t('tourCheckerMsg'),
      },
      {
        element: '#add-env-button',
        title: t('tourAddEnvTitle'),
        intro: t('tourAddEnvMsg'),
        position: 'top'
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

  // フッターのボタン（position: fixedな要素）の場合、intro.jsがスクロール位置を誤判定して
  // 下に少しずつスクロールし続ける不具合を防ぐため、スクロールを無効化する
  intro.onbeforechange((targetElement) => {
    if (targetElement.id === 'add-env-button' || targetElement.id === 'save-button') {
      intro.setOptions({ scrollToElement: false });
    } else {
      intro.setOptions({ scrollToElement: true });
    }
    return true;
  });

  intro.start();
};

const environments = ref<EnvironmentConfig[]>([]);

// --- URLチェッカー機能 ---
// ユーザーが入力したURLがいずれかの環境（ホスト名や正規表現）に一致するか即座に判定する
const checkerUrl = ref('');
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

const getEnvName = (env: EnvironmentConfig) => {
  if (env.id === 'prod') return t('ProductionName');
  if (env.id === 'stg') return t('StagingName');
  if (env.id === 'dev') return t('DevelopmentName');
  return env.name;
};

const showToast = (message: string, isError: boolean = false) => {
  toast.add({
    severity: isError ? 'error' : 'success',
    summary: isError ? t('errorTitle') || 'Error' : t('successTitle') || 'Success',
    detail: message,
    life: 3000
  });
};

// --- 状態管理・ダーティチェック ---
const isDirty = ref(false); // 変更が未保存かどうかのフラグ
let initialSettingsStr = ''; // 初期化時や保存時の状態文字列を保持

// 画面表示用の内部状態（バリデーション用プロパティなど）を省いた設定オブジェクトのJSON文字列を返す
const getUIStateString = () => {
  return JSON.stringify({
    envs: environments.value.map(env => ({
      ...env,
      hostnames: env.hostnames.map(hn => ({ value: hn.value, isRegex: hn.isRegex }))
    }))
  });
};

const checkDirtyState = () => {
  isDirty.value = getUIStateString() !== initialSettingsStr;
};

watch(environments, checkDirtyState, { deep: true });

onMounted(() => {
  chrome.storage.local.get(["language", "tutorialCompleted"], (localData) => {
    let lang: Language = "en";
    if (localData.language === "ja" || localData.language === "en") {
      lang = localData.language;
    } else {
      lang = navigator.language.startsWith("ja") ? "ja" : "en";
    }
    setLanguage(lang);

    chrome.storage.sync.get(null, (data: SyncData) => {
      const defaultEnvs: EnvironmentConfig[] = [
        { id: "prod", name: "Production", badgeText: "prod", badgeColor: "#ff0000", badgeOutlineColor: "#ffffff", faviconEnabled: true, pageBadgeEnabled: true, pageBadgePosition: "bottom-right", pageBadgeFontSize: 24, hostnames: [], isDeletable: false },
        { id: "stg",  name: "Staging",    badgeText: "stg",  badgeColor: "#0000ff", badgeOutlineColor: "#ffffff", faviconEnabled: true, pageBadgeEnabled: true, pageBadgePosition: "bottom-right", pageBadgeFontSize: 24, hostnames: [], isDeletable: false },
        { id: "dev",  name: "Development",badgeText: "dev",  badgeColor: "#008000", badgeOutlineColor: "#ffffff", faviconEnabled: true, pageBadgeEnabled: true, pageBadgePosition: "bottom-right", pageBadgeFontSize: 24, hostnames: [], isDeletable: false },
      ];

      environments.value = (data.environments && data.environments.length > 0)
        ? data.environments
        : defaultEnvs;

      environments.value.forEach(env => {
        if (env.faviconEnabled === undefined) env.faviconEnabled = true;
        if (env.pageBadgeEnabled === undefined) env.pageBadgeEnabled = true;
        if (!env.pageBadgePosition) env.pageBadgePosition = "bottom-right";
        if (!env.pageBadgeFontSize) env.pageBadgeFontSize = 24;
      });

      environments.value.forEach(env => {
        if (!env.hostnames || env.hostnames.length === 0) {
          env.hostnames = [{ value: '', isRegex: false }];
        }
      });

      nextTick(() => {
        initialSettingsStr = getUIStateString();
        isDirty.value = false;

        if (!localData.tutorialCompleted) {
          setTimeout(() => {
            startTour();
          }, 500);
        }
      });
    });
  });
});

const onLanguageChange = (val: Language) => {
  setLanguage(val);
  chrome.storage.local.set({ language: val });
  checkDirtyState();
};

const deleteEnvironment = (id: string) => {
  environments.value = environments.value.filter(env => env.id !== id);
};

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
  
  nextTick(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  });
};

// --- 設定の保存処理・バリデーション ---
const saveSettings = () => {
  let hasInvalid = false;
  let hasDuplicate = false;
  let hasEmptyName = false;
  const seenPatterns = new Set<string>();

  // 1. 各項目のバリデーション用フラグを初期化
  environments.value.forEach(env => {
    (env as any)._invalidName = false;
    (env as any)._invalidBadgeColor = false;
    (env as any)._invalidBadgeOutlineColor = false;
    (env as any)._invalidPageBadgeFontSize = false;
    env.hostnames.forEach(hn => {
      (hn as any)._invalid = false;
    });
  });

  // 2. 正規表現を用いて設定値の正しさをチェック
  const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  environments.value.forEach(env => {
    // 環境名の空チェック
    const name = env.name.trim();
    if (name === "") {
      (env as any)._invalidName = true;
      hasEmptyName = true;
    }
    
    // 文字色・フチ色のHEX形式チェック
    if (env.badgeColor && !hexColorRegex.test(env.badgeColor.trim())) {
      (env as any)._invalidBadgeColor = true;
      hasInvalid = true;
    }
    
    if (env.badgeOutlineColor && !hexColorRegex.test(env.badgeOutlineColor.trim())) {
      (env as any)._invalidBadgeOutlineColor = true;
      hasInvalid = true;
    }
    
    // フォントサイズの検証（空ではない、数値である、1〜500の範囲内）
    if (env.pageBadgeEnabled) {
      if (typeof env.pageBadgeFontSize !== 'number' || isNaN(env.pageBadgeFontSize) || env.pageBadgeFontSize < 1 || env.pageBadgeFontSize > 500) {
        (env as any)._invalidPageBadgeFontSize = true;
        hasInvalid = true;
      }
    }
  });

  // 3. ホスト名パターンの検証とデータの成形
  const envsToSave = environments.value.map(env => {
    const validHostnames = env.hostnames.filter(hn => hn.value.trim() !== "");
    const processedHostnames = validHostnames.map(hn => {
      const rawValue = hn.value.trim();
      let patternKey = "";
      let processedValue = rawValue;

      if (hn.isRegex) {
        try {
          new RegExp(rawValue);
          patternKey = `regex:${rawValue}`;
        } catch {
          (hn as any)._invalid = true;
          hasInvalid = true;
        }
      } else {
        const hostname = getHostname(rawValue);
        if (!hostname) {
          (hn as any)._invalid = true;
          hasInvalid = true;
        } else {
          processedValue = hostname;
          patternKey = `host:${hostname}`;
        }
      }

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

  if (hasInvalid || hasDuplicate || hasEmptyName) {
    showToast(hasDuplicate ? t("errorDuplicate") : t("errorInvalid"), true);
    return;
  }

  const settings: SyncData = {
    environments: envsToSave,
  };

  chrome.storage.sync.set(settings, () => {
    showToast(t("saved"), false);
    initialSettingsStr = getUIStateString();
    isDirty.value = false;
    
    environments.value = envsToSave;
    environments.value.forEach(env => {
      if (!env.hostnames || env.hostnames.length === 0) {
        env.hostnames = [{ value: '', isRegex: false }];
      }
    });
  });
};

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' }
];
</script>

<template>
  <div class="app-wrapper">
    <div class="container main-content">
      <!-- Header Section -->
      <header class="header-section">
        <div class="logo-area">
          <img src="/images/icon48.png" alt="EnvIcon Logo" class="logo-img">
          <span class="logo-text">EnvIcon</span>
        </div>
        <div class="header-actions">
          <Button 
            icon="pi pi-question" 
            rounded 
            text
            severity="secondary"
            @click="startTour"
            :title="t('tourWelcomeTitle')"
          />
          <Button 
            type="button" 
            icon="pi pi-bars" 
            @click="toggleMenu" 
            aria-haspopup="true" 
            aria-controls="overlay_menu" 
            rounded 
            text 
            severity="secondary" 
          />
          <Menu ref="menu" id="overlay_menu" :model="menuItems" :popup="true" />
          <input type="file" ref="fileInput" accept=".json" style="display: none" @change="handleImportFile" />
        </div>
      </header>

      <!-- URL Checker -->
      <Accordion id="url-checker-card" class="mb-8">
        <AccordionPanel value="0">
          <AccordionHeader>
            <div class="flex items-center gap-3">
              <i class="pi pi-search"></i>
              <span>{{ t("urlCheckerTitle") }}</span>
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="p-2">
              <p>
                {{ t("urlCheckerDescription") }}
              </p>
              <div class="checker-input-area">
                <InputText 
                  v-model="checkerUrl" 
                  :placeholder="t('urlCheckerPlaceholder')"
                  class="w-full"
                />
              </div>
              <div class="checker-result flex items-center mt-4" style="min-height: 1.5rem;">
                <div v-if="checkerResult" class="flex items-center gap-3 animate-fade-in">
                  <template v-if="checkerResult.match">
                    <i class="pi pi-check-circle"></i>
                    <span>
                      {{ t("urlCheckerMatched") }} 
                    </span>
                    <span 
                      class="env-badge-tag" 
                      :style="{ backgroundColor: checkerResult.env?.badgeColor, color: checkerResult.env?.badgeOutlineColor, borderColor: checkerResult.env?.badgeOutlineColor }"
                    >
                      {{ checkerResult.env ? getEnvName(checkerResult.env) : '' }}
                    </span> 
                  </template>
                  <template v-else>
                    <i class="pi pi-times-circle"></i>
                    <span>
                      {{ t("urlCheckerNotMatched") }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>

      <!-- Environment Settings -->
      <section id="environmentsContainer" class="env-list">
        <EnvSection 
          v-for="(env, index) in environments" 
          :key="env.id"
          v-model:envConfig="environments[index]"
          :checkerHostname="checkerResult?.hostname || null"
          @delete="deleteEnvironment"
        />
      </section>
    </div>

    <!-- Sticky Footer -->
    <footer class="sticky-footer">
      <div class="container footer-content">
        <Button 
          id="save-button"
          :label="t('save')"
          icon="pi pi-save"
          @click="saveSettings"
          :disabled="!isDirty"
          size="large"
          class="save-btn px-8"
        />
        <Button 
          id="add-env-button"
          :label="t('addEnvironment')"
          icon="pi pi-plus"
          @click="addEnvironment"
          severity="secondary"
          variant="text"
          size="large"
          class="add-btn"
        />
        <div v-if="isDirty" class="ms-auto flex items-center gap-2">
          <i class="pi pi-exclamation-circle"></i>
          <span>Unsaved changes</span>
        </div>
      </div>
    </footer>

    <Dialog v-model:visible="showLanguageDialog" :header="t('changeLanguage')" :modal="true" :style="{ width: '25rem' }">
      <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem 0;">
        <Select 
          v-model="currentLanguage" 
          :options="languageOptions" 
          optionLabel="label" 
          optionValue="value"
          @update:modelValue="onLanguageChange"
          class="w-full"
          variant="filled"
        />
      </div>
    </Dialog>

    <Toast position="bottom-right" />
  </div>
</template>

<style>
/* 
  Global Styles 
  全体のアセット、変数、構造を定義します。
*/
@import 'intro.js/introjs.css';

:root {
  --app-bg: #f8fafc;
  --header-height: 80px;
  --footer-height: 80px;
}

body {
  background-color: var(--app-bg);
  color: #1e293b;
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* アプリケーション全体のラッパー（フッターを固定するための最小高さ確保） */
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 個別のカードやコンテンツを内包するコンテナ制限 */
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* メインコンテンツ（フッターの高さ分だけ下の余白を取る） */
.main-content {
  padding-top: 2rem;
  padding-bottom: calc(var(--footer-height) + 3rem);
  flex: 1;
}

/* Header */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-img {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.logo-text {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.language-select {
  width: 130px;
  border-radius: 10px;
}

/* 
  Utilities 
  Tailwindがない環境下で、HTMLのclassでレイアウトを補助するために用いるユーティリティクラス
*/
.mb-8 { margin-bottom: 2rem; }
.mt-4 { margin-top: 1rem; }
.ms-auto { margin-left: auto; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.w-full { width: 100%; }
.rounded-xl { border-radius: 0.75rem; }

/* チェッカー等でバッジをプレビュー表示させるためのダミー要素用クラス */
.env-badge-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 700;
  border: 1px solid;
  text-transform: uppercase;
}

/* 
  Footer
  画面下部に常に固定表示されるボタン群（保存・追加）
  backdrop-filterを用いて背後を透過的にぼかす
*/
.sticky-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 1rem 0;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.03);
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.save-btn {
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(var(--p-primary-rgb), 0.3);
}

.add-btn {
  font-weight: 600;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

/* Intro.js Customization */
.introjs-tooltip {
  border-radius: 16px;
  padding: 10px;
}
.introjs-button {
  border-radius: 8px;
  text-shadow: none;
}

/* 
  intro.js実行時バグ回避用ハック
  Chrome等の合成レイヤー処理において backdrop-filter と explicit z-index を持つ要素が
  intro.jsの絶対配置オーバーレイ（z-index: 999999）を貫通してしまう問題を解消する。
  `:has(.introjs-overlay)` により、ツアー中のみz-indexを自動解除（JSで状態管理しない）。
*/
body:has(.introjs-overlay) .sticky-footer {
  z-index: auto !important;
}

/* 
  p-divider-content はz-index: 1を解除した代償として背後の線に埋もれてしまう（打ち消し線現象）ため、
  position: relative を付与して描画フローを上に持ち上げる 
*/
body:has(.introjs-overlay) .p-divider-content {
  z-index: auto !important;
  position: relative !important;
}

body:has(.introjs-overlay) .hostname-input-field:focus {
  z-index: auto !important;
}

/* 
  URLチェッカーのカードスタイル 
  各環境セクションと同様のボーダー・シャドウを適用する
*/
#url-checker-card {
  border: 1px solid #cbd5e1;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
  background-color: white;
}
</style>
