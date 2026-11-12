import { ref } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { EnvironmentConfig } from "../../types";
import { t } from "../i18n";

/**
 * 数値を2桁ゼロ埋めの文字列へ変換する補助関数
 * @param n - 変換対象の数値
 * @returns 2桁にゼロ埋めされた数値文字列
 */
const padTwoDigits = (n: number): string => n.toString().padStart(2, "0");

/**
 * 設定のエクスポート（JSONダウンロード）およびインポート（JSON読み込み・検証）を管理する Composable
 * @param showToast - トースト通知関数
 * @returns ファイル入力参照および転送ハンドラ群
 */
export const useSettingsTransfer = (
  showToast: (message: string, isError?: boolean) => void
) => {
  const confirm = useConfirm();
  const fileInput = ref<HTMLInputElement | null>(null);

  /**
   * 現在の環境設定をJSONファイルとしてダウンロード（エクスポート）する関数
   * @param environments - エクスポート対象の環境設定配列
   * @returns なし
   */
  const exportSettings = (environments: EnvironmentConfig[]): void => {
    const dataToExport = { environments };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = padTwoDigits(now.getMonth() + 1);
    const dd = padTwoDigits(now.getDate());
    const hh = padTwoDigits(now.getHours());
    const min = padTwoDigits(now.getMinutes());
    const ss = padTwoDigits(now.getSeconds());
    const filename = `EnvIcon_${yyyy}${mm}${dd}${hh}${min}${ss}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * 選択されたJSONファイルから設定を読み込み、確認ダイアログを経て反映する関数
   * @param event - ファイル入力イベントオブジェクト
   * @param onImportConfirmed - インポート確定時に実行されるコールバック関数
   * @returns なし
   */
  const handleImportFile = (
    event: Event,
    onImportConfirmed: (importedEnvs: EnvironmentConfig[]) => void
  ): void => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content =
          typeof e.target?.result === "string" ? e.target.result : "";
        const parsed: unknown = JSON.parse(content);

        if (
          typeof parsed !== "object" ||
          parsed === null ||
          !("environments" in parsed) ||
          !Array.isArray((parsed as { environments: unknown }).environments)
        ) {
          throw new Error("Invalid format");
        }
        const importedEnvs = (parsed as { environments: EnvironmentConfig[] })
          .environments;

        confirm.require({
          message: t("importConfirmMessage"),
          header: t("importConfirmTitle"),
          icon: "pi pi-exclamation-triangle",
          rejectProps: {
            label: t("confirmNo"),
            severity: "secondary",
            outlined: true,
          },
          acceptProps: {
            label: t("confirmImport"),
            severity: "primary",
          },
          accept: () => {
            onImportConfirmed(importedEnvs);
          },
        });
      } catch {
        showToast(t("importError"), true);
      } finally {
        target.value = "";
      }
    };
    reader.readAsText(file);
  };

  /**
   * 隠しファイル入力要素をクリックしてファイル選択ダイアログを開く関数
   * @returns なし
   */
  const triggerFileInput = (): void => {
    fileInput.value?.click();
  };

  return {
    fileInput,
    exportSettings,
    handleImportFile,
    triggerFileInput,
  };
};
