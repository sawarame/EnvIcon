<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { SyncData, EnvironmentConfig } from '../types';
import { currentLanguage, setLanguage, t, Language } from './i18n';
import { getHostname } from './utils';
import EnvSection from './components/EnvSection.vue';
import introJs from 'intro.js';
import { useToast } from 'primevue/usetoast';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Toast from 'primevue/toast';
import TieredMenu from 'primevue/tieredmenu';

const toast = useToast();

const menu = ref();
const fileInput = ref<HTMLInputElement | null>(null);

const isDarkMode = ref(false);

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('my-app-dark');
  } else {
    document.documentElement.classList.remove('my-app-dark');
  }
  chrome.storage.local.set({ darkMode: isDarkMode.value });
};

const toggleMenu = (event: Event) => {
  menu.value.toggle(event);
};

const menuItems = computed(() => [
  {
    label: t('changeLanguage'),
    icon: 'pi pi-globe',
    items: [
      {
        label: 'English',
        isLangCheck: currentLanguage.value === 'en',
        command: () => onLanguageChange('en')
      },
      {
        label: '日本語',
        isLangCheck: currentLanguage.value === 'ja',
        command: () => onLanguageChange('ja')
      }
    ]
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

const undoChanges = (envId: string) => {
  if (!initialSettingsStr) return;
  try {
    const initialData = JSON.parse(initialSettingsStr);
    const originalEnv = initialData.envs.find((e: any) => e.id === envId);
    
    if (originalEnv) {
      const index = environments.value.findIndex(e => e.id === envId);
      if (index !== -1) {
        // Deep copy to avoid reference issues
        environments.value[index] = JSON.parse(JSON.stringify(originalEnv));
        // Ensure at least one hostname field exists
        if (!environments.value[index].hostnames || environments.value[index].hostnames.length === 0) {
          environments.value[index].hostnames = [{ value: '', isRegex: false }];
        }
        checkDirtyState();
      }
    } else {
      // If it's a new environment that wasn't in initialSettings, we might want to remove it or just ignore
      // For now, let's just ignore or we could delete it if the user expects "undo" to revert "add"
    }
  } catch (err) {
    console.error("Failed to undo changes:", err);
  }
};

watch(environments, checkDirtyState, { deep: true });

onMounted(() => {
  chrome.storage.local.get(["language", "tutorialCompleted", "darkMode"], (localData) => {
    let lang: Language = "en";
    if (localData.language === "ja" || localData.language === "en") {
      lang = localData.language;
    } else {
      lang = navigator.language.startsWith("ja") ? "ja" : "en";
    }
    setLanguage(lang);

    if (typeof localData.darkMode === 'boolean') {
      isDarkMode.value = localData.darkMode;
    } else {
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDarkMode.value) {
      document.documentElement.classList.add('my-app-dark');
    }

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
            :icon="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'" 
            @click="toggleDarkMode" 
            rounded 
            text 
            severity="secondary" 
            :title="isDarkMode ? t('lightMode') : t('darkMode')" 
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
          <TieredMenu ref="menu" id="overlay_menu" :model="menuItems" :popup="true">
            <template #item="{ item, props, hasSubmenu }: any">
              <a v-bind="props.action" class="flex items-center gap-2 w-full">
                <span v-if="item.icon" :class="item.icon" class="p-menuitem-icon" style="margin-right: 0.5rem;"></span>
                <span class="p-menuitem-text">{{ item.label }}</span>
                <span v-if="item.isLangCheck" class="pi pi-check" style="font-size: 0.75rem; color: var(--p-primary-color); margin-left: 0.25rem;"></span>
                <span v-if="hasSubmenu" class="pi pi-angle-right ms-auto"></span>
              </a>
            </template>
          </TieredMenu>
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
          @undo="undoChanges(env.id)"
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

    <Toast position="bottom-right" />
  </div>
</template>

<style src="./App.css"></style>
