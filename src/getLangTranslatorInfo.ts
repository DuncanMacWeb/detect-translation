import whichClientTranslation from "./whichClientTranslation";
import whichProxyTranslation from "./whichProxyTranslation";
import getDocumentLang, { LangIds } from "./getDocumentLang";
import identifyIBMWatson from "./services/identifyIBMWatson";
import { Services } from "./translationServices";
import { UNDETERMINED_LANGUAGE } from "./constants";

export type TranslatorType = "client" | "proxy" | "unknown";

export type LangTranslatorInfo = {
  lang?: string;
  service?: Services;
  type?: TranslatorType;
};

export interface GetLangTranslatorInfoParams {
  lastKnownLang: string;
  sourceLang: string,
  sourceUrl?: string;
  textSelector?: string;
  text?: string;
  textIsFirstContentfulChild?: boolean;
  langIds?: LangIds;
  includeTranslatorInLangTag?: boolean;
}

const getLangTranslatorInfo = ({
  lastKnownLang,
  sourceLang,
  sourceUrl,
  textSelector,
  text,
  textIsFirstContentfulChild,
  langIds,
  includeTranslatorInLangTag,
}: GetLangTranslatorInfoParams): LangTranslatorInfo => {
  let identified: LangTranslatorInfo = getDocumentLang({
    lang: sourceLang,
    canary: {
      selector: textSelector,
      text,
      isFirstContentfulChild: textIsFirstContentfulChild,
      langIds,
    },
  });

  if (identified.lang === lastKnownLang) {
    return identified;
  }

  identified = whichProxyTranslation(identified);

  if (identified.type !== "proxy") {
    identified = whichClientTranslation(identified);
  }

  // We check for IBM Watson after checking for client translations,
  // as the IBM Watson check is brittle as it’s purely based on the filename
  if (!identified.type) {
    identified = identifyIBMWatson(identified, sourceUrl);
  }

  if (!identified.lang || identified.lang === UNDETERMINED_LANGUAGE) {
    return;
  }

  identified.service ||= Services.UNDETERMINED;
  identified.type ||= "unknown";

  if (includeTranslatorInLangTag) {
    // https://unicode-org.github.io/cldr/ldml/tr35.html#t_Extension
    identified.lang = `${identified.lang}-t-${sourceLang}-t0-${identified.service}`;
  }

  return identified;
};

export default getLangTranslatorInfo;
