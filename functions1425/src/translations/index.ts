import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {v2} from "@google-cloud/translate";
const {Translate} = v2;

interface TranslationRequest {
  text: string;
  targetLang?: string;
}

const translate = new Translate({projectId: process.env.GOOGLE_CLOUD_PROJECT});

/**
 * Translates the given text to the target language
 * @param {TranslationRequest} data Request data containing text and target language
 * @return {Promise<{result: string}>} The translated text
 */
export const translateText = onCall<TranslationRequest>(
  async (request: CallableRequest<TranslationRequest>) => {
    const {text, targetLang = "en"} = request.data;

    try {
      const [translation] = await translate.translate([text], targetLang);
      return {result: translation};
    } catch (error) {
      throw new HttpsError("internal", "Translation failed", error);
    }
  }
);

export const translateToTraditionalChinese = onCall<TranslationRequest>(
  async (request: CallableRequest<TranslationRequest>) => {
    const {text} = request.data;

    try {
      const [translation] = await translate.translate([text], "zh-TW");
      return {result: translation};
    } catch (error) {
      throw new HttpsError("internal", "Translation failed", error);
    }
  }
);
