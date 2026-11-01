import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import PopupApp from "./popup/PopupApp.vue";

// PrimeVue 用のアイコンスタイルを読み込む
import "primeicons/primeicons.css";

const app = createApp(PopupApp);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".my-app-dark",
    },
  },
});
app.mount("#app");
