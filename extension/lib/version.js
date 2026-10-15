// This version travels with the page code; Chrome retains its loaded manifest until reload.
export const APP_VERSION='2.0.1';
export const needsRuntimeReload=()=>chrome.runtime.getManifest().version!==APP_VERSION;
