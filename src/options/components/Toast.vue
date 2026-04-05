<script setup lang="ts">
const props = defineProps<{
  // トーストを表示するかどうかのフラグ
  show: boolean;
  // トーストに表示するメッセージ本文
  message: string;
  // エラーとしての表示かどうかのフラグ
  isError: boolean;
}>();

const emit = defineEmits<{
  // トーストを手動で閉じたときに親へ通知するイベント
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="margin-bottom: 4rem;">
    <div 
      class="toast align-items-center border-0" 
      :class="{ 'show': show, 'text-bg-danger': isError, 'text-bg-success': !isError }" 
      role="alert" 
      aria-live="assertive" 
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">
          <svg v-if="!isError" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill me-2" viewBox="0 0 16 16">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
          <span>{{ message }}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close" @click="$emit('close')"></button>
      </div>
    </div>
  </div>
</template>
