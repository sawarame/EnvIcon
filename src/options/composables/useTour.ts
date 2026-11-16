import introJs from "intro.js";
import { EnvSectionTab } from "../../types";
import { t } from "../i18n";

/**
 * オンボーディングツアー連携オプションを表すインターフェース
 */
export interface UseTourOptions {
  /** 指定環境の現在選択中タブを取得するコールバック */
  getEnvTab?: (envId: string) => EnvSectionTab;
  /** 指定環境のタブを切り替え、DOM・レイアウト反映まで待機するコールバック */
  setEnvTab?: (envId: string, tab: EnvSectionTab) => Promise<void> | void;
}

/** ステップインデックス（0始まり）ごとの必要タブマッピング */
const STEP_REQUIRED_TAB: Partial<
  Record<number, { envId: string; tab: EnvSectionTab }>
> = {
  // Step 1: URLパターンの設定（「URLパターン」タブ内）
  1: { envId: "prod", tab: "urls" },
  // Step 2: バッジのカスタマイズ（「デザイン・表示設定」タブ内）
  2: { envId: "prod", tab: "appearance" },
};

/**
 * 環境カード内の要素をフォーカスする際、環境名ヘッダーとタブ一覧が見切れない範囲で必要最小限だけスクロール調整する関数
 * @param envId - 対象の環境識別子
 * @param targetElement - ツアーでフォーカスする対象要素
 * @returns なし
 */
const scrollEnvStepIntoView = (
  envId: string,
  targetElement: HTMLElement
): void => {
  const sectionEl = document.getElementById(`env-section-${envId}`);
  if (!sectionEl) {
    return;
  }

  const tabListEl = sectionEl.querySelector<HTMLElement>(".env-tab-list");
  const sectionRect = sectionEl.getBoundingClientRect();
  const tabTop = tabListEl
    ? tabListEl.getBoundingClientRect().top
    : sectionRect.top;
  const targetRect = targetElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  // 対象要素の下に表示されるツールチップが見切れないための余白見込み
  const tooltipClearance = 180;

  let desiredDelta = 0;

  if (tabTop < 12) {
    // タブ一覧が画面上端より上に隠れている場合は、カード見出し（または狭い画面ならタブ一覧）が見える位置まで戻す
    const upDeltaForCard = sectionRect.top - 16;
    const upDeltaForTab = tabTop - 12;
    desiredDelta =
      targetRect.bottom - upDeltaForCard + tooltipClearance <= viewportHeight
        ? upDeltaForCard
        : upDeltaForTab;
  } else if (targetRect.bottom + tooltipClearance > viewportHeight) {
    // 下部（対象要素＋ツールチップ）がはみ出る場合のみ、タブ一覧が上端に隠れない範囲で必要最小限だけ下にスクロールする
    const neededDownDelta =
      targetRect.bottom + tooltipClearance - viewportHeight;
    const maxDownDeltaKeepingTab = Math.max(0, tabTop - 12);
    desiredDelta = Math.min(neededDownDelta, maxDownDeltaKeepingTab);
  }

  if (Math.abs(desiredDelta) > 1) {
    // ツアー座標計算のズレを防ぐためアニメーションなしの即時スクロールを行う
    window.scrollBy(0, desiredDelta);
  }
};

/**
 * URLチェッカー等の上部要素がすでに画面内に収まっている場合はスクロールを行わず、画面外に隠れている場合のみ最小限表示位置へ戻す関数
 * @param targetElement - ツアーでフォーカスする対象要素
 * @returns なし
 */
const ensureElementVisibleWithoutExcessScroll = (
  targetElement: HTMLElement
): void => {
  const rect = targetElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const tooltipClearance = 160;

  if (rect.top < 12) {
    // 前のステップのスクロール等で画面上端より上に隠れている場合のみ、上端が見える位置へ戻す
    window.scrollBy(0, rect.top - 16);
  } else if (rect.bottom + tooltipClearance > viewportHeight) {
    // 画面下端からはみ出ている場合のみ、要素上端が見切れない範囲で最小限下にスクロールする
    const neededDownDelta = rect.bottom + tooltipClearance - viewportHeight;
    const maxDownDelta = Math.max(0, rect.top - 16);
    const delta = Math.min(neededDownDelta, maxDownDelta);
    if (delta > 1) {
      window.scrollBy(0, delta);
    }
  }
};

/**
 * オンボーディングツアー（Intro.js）の管理を行う Composable
 * @param options - 環境カードのタブ状態を取得・切り替えするための連携オプション
 * @returns ツアー開始・終了関数群
 */
export const useTour = (options: UseTourOptions = {}) => {
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

    // ツアー完了・途中終了時に元の閲覧状態へ戻せるよう開始前のタブを記録する
    const initialProdTab: EnvSectionTab | undefined = options.getEnvTab?.("prod");
    let isTabRestored = false;

    /**
     * ツアー開始前に開かれていたタブ状態を重複なく一度だけ復元する関数
     * @returns なし
     */
    const restoreInitialTab = (): void => {
      if (isTabRestored || !initialProdTab) {
        return;
      }
      isTabRestored = true;
      void options.setEnvTab?.("prod", initialProdTab);
    };

    const intro = introJs.tour();
    activeTour = intro;

    intro.setOptions({
      steps: [
        {
          title: t("tourWelcomeTitle"),
          intro: t("tourWelcomeMsg"),
        },
        {
          element: "#env-section-prod .hostname-custom-input-group",
          title: t("tourHostnameTitle"),
          intro: t("tourHostnameMsg"),
          position: "bottom",
        },
        {
          element: "#env-section-prod .badge-settings-box",
          title: t("tourBadgeTitle"),
          intro: t("tourBadgeMsg"),
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
      restoreInitialTab();
    });

    // ステップ描画前に、対象要素が含まれるタブへ切り替えてレイアウトを確定させる。
    // 環境カード・URLチェッカー・固定フッターでは intro.js による過剰な自動スクロールを無効化し、
    // 画面内に収まっている場合は不要なスクロールを行わないようにする。
    intro.onBeforeChange(
      async (
        targetElement: HTMLElement | undefined,
        currentStep: number
      ): Promise<boolean> => {
        const requiredTabConfig = STEP_REQUIRED_TAB[currentStep];
        if (requiredTabConfig) {
          if (options.setEnvTab) {
            await options.setEnvTab(
              requiredTabConfig.envId,
              requiredTabConfig.tab
            );
          }
          if (targetElement) {
            scrollEnvStepIntoView(requiredTabConfig.envId, targetElement);
          }
          intro.setOptions({ scrollToElement: false });
          return true;
        }

        if (targetElement?.id === "url-checker-card") {
          ensureElementVisibleWithoutExcessScroll(targetElement);
          intro.setOptions({ scrollToElement: false });
          return true;
        }

        if (
          targetElement?.id === "add-env-button" ||
          targetElement?.id === "save-status"
        ) {
          intro.setOptions({ scrollToElement: false });
        } else {
          intro.setOptions({ scrollToElement: true });
        }
        return true;
      }
    );

    try {
      await intro.start();
    } finally {
      if (!intro.hasStarted() && activeTour === intro) {
        activeTour = null;
        restoreInitialTab();
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
