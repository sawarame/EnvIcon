import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import App from './options/App.vue';

// PrimeVueのスタイル（アイコンなど）
import 'primeicons/primeicons.css';

const app = createApp(App);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.my-app-dark', 
        }
    }
});
app.use(ToastService);
app.mount('#app');

