/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import {Request, Response} from "express";
import {translateText, translateToTraditionalChinese} from "./translations";

// Export translation functions
export {translateText, translateToTraditionalChinese};

// Initialize firebase functions
export const initFunctions = onRequest((request: Request, response: Response) => {
  response.send("Firebase Functions initialized");
});
