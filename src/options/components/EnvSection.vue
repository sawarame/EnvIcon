<script setup lang="ts">
import { computed } from 'vue';
import { EnvironmentConfig, HostnamePattern } from '../../types';
import { t } from '../i18n';
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

const props = defineProps<{
  envConfig: EnvironmentConfig;
  checkerHostname?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:envConfig', value: EnvironmentConfig): void;
  (e: 'delete', id: string): void;
}>();

const updateField = <K extends keyof EnvironmentConfig>(field: K, value: EnvironmentConfig[K]) => {
  emit('update:envConfig', { ...props.envConfig, [field]: value });
};

const updateHostnames = (newHostnames: HostnamePattern[]) => {
  emit('update:envConfig', { ...props.envConfig, hostnames: newHostnames });
};

const deleteSection = () => {
  emit('delete', props.envConfig.id);
};

const confirmResetDefault = () => {
  const { id } = props.envConfig;
  const badgeText = id === "prod" ? "prod" : id === "stg" ? "stg" : id === "dev" ? "dev" : props.envConfig.name.substring(0, 4).toLowerCase();
  const badgeColor = id === "prod" ? "#ff0000" : id === "stg" ? "#0000ff" : id === "dev" ? "#008000" : "#888888";
  
  emit('update:envConfig', { 
    ...props.envConfig, 
    badgeText, 
    badgeColor, 
    badgeOutlineColor: "#ffffff",
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
  });
};

const isDefaultEnv = ["prod", "stg", "dev"].includes(props.envConfig.id);
const envNameKey = props.envConfig.id === "prod" ? "ProductionName" : props.envConfig.id === "stg" ? "StagingName" : props.envConfig.id === "dev" ? "DevelopmentName" : "";

const badgePositionOptions = computed(() => [
  { label: t('badgePosTopLeft'), value: 'top-left' },
  { label: t('badgePosTopRight'), value: 'top-right' },
  { label: t('badgePosBottomLeft'), value: 'bottom-left' },
  { label: t('badgePosBottomRight'), value: 'bottom-right' },
]);

const onColorChange = (field: 'badgeColor' | 'badgeOutlineColor', value: string) => {
  const hex = value.startsWith('#') ? value : `#${value}`;
  updateField(field, hex);
};

const getColorValue = (field: 'badgeColor' | 'badgeOutlineColor') => {
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
            {{ t(envNameKey as any) }}
          </span>
          <InputText 
            v-else 
            type="text" 
            class="env-name-input-styled"
            :class="{ 'p-invalid': (envConfig as any)._invalidName }"
            v-model="envConfig.name" 
            @input="updateField('name', ($event.target as HTMLInputElement).value)"
            maxlength="50" 
            placeholder="Environment Name"
          />
        </div>
        
        <div class="flex items-center gap-2">
           <Button 
            icon="pi pi-refresh" 
            text 
            rounded
            severity="secondary"
            @click="confirmResetDefault"
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
        <!-- 3-Column Settings Grid -->
        <div class="smart-settings-container mt-4">
          <div class="settings-grid-layout">
            <!-- Column 1: Toggles -->
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
                    v-model="envConfig.faviconEnabled"
                    @update:modelValue="updateField('faviconEnabled', $event)"
                  />
                </div>
                <div class="toggle-row-item">
                  <div class="toggle-info">
                    <span class="text-sm font-bold">{{ t('enablePageBadgePerEnv') }}</span>
                  </div>
                  <ToggleSwitch
                    v-model="envConfig.pageBadgeEnabled"
                    @update:modelValue="updateField('pageBadgeEnabled', $event)"
                  />
                </div>
              </div>
            </div>

            <!-- Column 2: Appearance -->
            <div class="settings-column appearance-col">
              <div class="group-header">
                <i class="pi pi-palette"></i>
                <span>{{ t('badgeSettings') }}</span>
              </div>
              <div class="column-content appearance-fields">
                <div class="field-item">
                  <label>{{ t('badgeTextLabel') }}</label>
                  <InputText v-model="envConfig.badgeText" maxlength="4" class="w-full" @input="updateField('badgeText', ($event.target as HTMLInputElement).value)" />
                </div>
                
                <div class="field-item">
                  <label>{{ t('badgeColorLabel') }}</label>
                  <InputGroup>
                    <InputGroupAddon>
                      <ColorPicker :modelValue="getColorValue('badgeColor')" @update:modelValue="onColorChange('badgeColor', $event as string)" />
                    </InputGroupAddon>
                    <InputText v-model="envConfig.badgeColor" @input="updateField('badgeColor', ($event.target as HTMLInputElement).value)" />
                  </InputGroup>
                </div>

                <div class="field-item">
                  <label>{{ t('badgeOutlineColorLabel') }}</label>
                  <InputGroup>
                    <InputGroupAddon>
                      <ColorPicker :modelValue="getColorValue('badgeOutlineColor')" @update:modelValue="onColorChange('badgeOutlineColor', $event as string)" />
                    </InputGroupAddon>
                    <InputText v-model="envConfig.badgeOutlineColor" @input="updateField('badgeOutlineColor', ($event.target as HTMLInputElement).value)" />
                  </InputGroup>
                </div>
              </div>
            </div>

            <!-- Column 3: Badge Options -->
            <div class="settings-column options-col" :class="{ 'disabled-opacity': !envConfig.pageBadgeEnabled }">
              <div class="group-header">
                <i class="pi pi-cog"></i>
                <span>{{ t('pageBadgeSettings') }}</span>
              </div>
              <div class="column-content options-fields">
                <div class="field-item">
                  <label>{{ t('pageBadgePosition') }}</label>
                  <Select 
                    v-model="envConfig.pageBadgePosition"
                    :options="badgePositionOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    :disabled="!envConfig.pageBadgeEnabled"
                    @update:modelValue="updateField('pageBadgePosition', $event as any)"
                  />
                </div>

                <div class="field-item">
                  <label>{{ t('pageBadgeFontSize') }}</label>
                  <InputNumber 
                    v-model="envConfig.pageBadgeFontSize"
                    :min="10" :max="100"
                    showButtons
                    buttonLayout="horizontal"
                    class="w-full font-size-input-field"
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
          v-model="envConfig.hostnames" 
          :checkerHostname="checkerHostname"
          @update:modelValue="updateHostnames"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.env-card {
  margin-bottom: 2.5rem;
  border-radius: 1rem;
  background-color: white;
}

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
  color: #1e293b;
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
  background: #f1f5f9;
}

.smart-settings-container {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.settings-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

@media (max-width: 1024px) {
  .settings-grid-layout {
    grid-template-columns: 1fr;
  }
  .settings-column:not(:last-child) {
    border-right: none !important;
    border-bottom: 1px solid #e2e8f0;
  }
}

.settings-column {
  padding: 1.5rem;
}

.settings-column:not(:last-child) {
  border-right: 1px solid #e2e8f0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #94a3b8;
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
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  gap: 1rem;
}

.field-item label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.disabled-opacity {
  opacity: 0.5;
  filter: grayscale(0.8);
}

.my-8 {
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.px-4 { padding-left: 1.5rem; padding-right: 1.5rem; }
.pt-4 { padding-top: 1.5rem; }
.pb-4 { padding-bottom: 1.5rem; }
.mt-4 { margin-top: 1rem; }
</style>
