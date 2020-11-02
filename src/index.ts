import { LangIds } from "./getDocumentLang";
import { Services } from "./translationServices";
import skipToMainContentLangIds from "../translations/Skip-to-main-content";
import getLangTranslatorInfo, { LangTranslatorInfo, TranslatorType } from './getLangTranslatorInfo'

export interface TranslationDetectorParams {
  source?: SourcePageMetadata;
  includeTranslatorInLang?: boolean;
}

export type CanaryElementMetadata = {
  selector?: string;
  isFirstInDom?: boolean;
  text?: string;
  langIds?: LangIds;
}

export type SourcePageMetadata = {
  lang?: string;
  url?: string;
  canary?: CanaryElementMetadata;
}

export type Callback = (
  lang: string,
  {
    service,
    type,
  }: {
    service: Services;
    type: TranslatorType;
  }
) => void;
export interface ObserverParams {
  onTranslation: Callback;
  sourceLang: string;
  sourceUrl?: string;
  textSelector?: string;
  text?: string;
  textIsFirstContentfulChild?: boolean;
  langIds?: LangIds;
  includeTranslatorInLangTag?: boolean;
}

class TranslationDetector {
  #source: SourcePageMetadata;
  #extensions: string[];
  #lastKnownLang: LangTranslatorInfo;

  constructor({
    source,
    includeTranslatorInLang = false,
  }: TranslationDetectorParams = {}) {
    this.#source = {
      lang: source?.lang ?? "en",
      url: source?.url,
      canary: {
        selector: source?.canary?.selector ?? ".skip-link",
        text: source?.canary?.text ?? "Skip to main content",
        langIds: source?.canary?.langIds ?? skipToMainContentLangIds,
        isFirstInDom: source?.canary?.isFirstInDom ?? true,
      },
    };
    this.#extensions = includeTranslatorInLang ? ['t'] : [];
    this.#lastKnownLang = { lang: this.#source.lang };
  }

  detect(): LangTranslatorInfo {
    return this.getLangTranslatorInfo();
  }

  onTranslation(callback: Callback) {
    const observer = () => {
      const identified = this.getLangTranslatorInfo();

      callback(identified.lang as string, {
        service: identified.service as Services,
        type: identified.type as TranslatorType,
      });
      this.#lastKnownLang = identified.lang as string;
    };

    const mutationObserver = new MutationObserver(observer);
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "lang", "_msttexthash"],
    });
    if (this.#canary?.selector) {
      const canaryEl = document.querySelector(this.#canary.selector);
      if (canaryEl) {
        mutationObserver.observe(
          canaryEl,
          // we need to observe any and all changes made to our canary content element
          {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true,
          }
        );
      }
    }

    return mutationObserver;
  }

  private getLangTranslatorInfo() {
    return getLangTranslatorInfo({
      lastKnownLang: this.#lastKnownLang,
      source: this.#source,
      extensions: this.#extensions,
    });
  }
}
