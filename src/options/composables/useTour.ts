import introJs from "intro.js";
import { t } from "../i18n";

/**
 * オンボーディングツアー（Intro.js）の管理を行う Composable
 * @returns ツアー開始・終了関数群
 */
export const useTour = () => {
  /** 現在実行中のチュートリアルツアーインスタンス（二重起動防止・クリーンアップ用） */
  let activeTour: ReturnType<typeof introJs.tour> | null = null;

  /**
   * チュートリアルツアーを開始する非同期関数
   * @returns ツアー開始処理の完了を表す Promise
   */
  const startTour = async (): Promise<void> => {
    // すでにツアーが実行中または起動処理中の場合は二重起動を防止する
    if (activeTour !== null) {
      return;
    }

    // トリガーとなったボタン等にフォーカスが残っているとEnterキー押下時に再発火するおそれがあるためフォーカスを外す
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const intro = introJs.tour();
    activeTour = intro;

    intro.setOptions({
      steps: [
        {
          title: t("tourWelcomeTitle"),
          intro: t("tourWelcomeMsg"),
        },
        {
          element: "#env-section-prod .smart-settings-container",
          title: t("tourBadgeTitle"),
          intro: t("tourBadgeMsg"),
          position: "bottom",
        },
        {
          element: "#env-section-prod .hostname-custom-input-group",
          title: t("tourHostnameTitle"),
          intro: t("tourHostnameMsg"),
          position: "bottom",
        },
        {
          element: "#url-checker-card",
          title: t("tourCheckerTitle"),
          intro: t("tourCheckerMsg"),
        },
        {
          element: "#add-env-button",
          title: t("tourAddEnvTitle"),
          intro: t("tourAddEnvMsg"),
          position: "top",
        },
        {
          element: "#save-status",
          title: t("tourSaveTitle"),
          intro: t("tourSaveMsg"),
          position: "top",
        },
        {
          title: t("tourFinalTitle"),
          intro: t("tourFinalMsg"),
        },
      ],
      nextLabel: t("tourNext"),
      prevLabel: t("tourPrev"),
      doneLabel: t("tourFinish"),
      hidePrev: true,
    });

    intro.onComplete(() => {
      void chrome.storage.local.set({ tutorialCompleted: true });
    });

    intro.onExit(() => {
      if (activeTour === intro) {
        activeTour = null;
      }
    });

    // フッターのボタン・ステータス（position: fixedな要素）の場合、intro.jsがスクロール位置を誤判定して
    // 下に少しずつスクロールし続ける不具合を防ぐため、スクロールを無効化する。
    intro.onBeforeChange((targetElement: HTMLElement | undefined) => {
      if (
        targetElement?.id === "add-env-button" ||
        targetElement?.id === "save-status"
      ) {
        intro.setOptions({ scrollToElement: false });
      } else {
        intro.setOptions({ scrollToElement: true });
      }
      return true;
    });

    try {
      await intro.start();
    } finally {
      if (!intro.hasStarted() && activeTour === intro) {
        activeTour = null;
      }
    }
  };

  /**
   * 実行中のツアーがあれば強制終了してリソースを解放するクリーンアップ関数
   * @returns なし
   */
  const exitTour = (): void => {
    if (activeTour?.hasStarted()) {
      void activeTour.exit(true);
      activeTour = null;
    }
  };

  return {
    startTour,
    exitTour,
  };
};
