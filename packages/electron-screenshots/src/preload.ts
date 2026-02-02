/* eslint-disable no-console */
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import type { Display } from "./getDisplay.js";
import type {
  LanguageItem,
  TranslateRequest,
  TranslateResponse,
  GetLanguagesResponse,
} from "./types.js";

type IpcRendererListener = (
  event: IpcRendererEvent,
  ...args: unknown[]
) => void;
type ScreenshotsListener = (...args: unknown[]) => void;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotsData {
  bounds: Bounds;
  display: Display;
}

const map = new Map<ScreenshotsListener, Record<string, IpcRendererListener>>();

contextBridge.exposeInMainWorld("screenshots", {
  ready: () => {
    console.log("contextBridge ready");

    ipcRenderer.send("SCREENSHOTS:ready");
  },
  reset: () => {
    console.log("contextBridge reset");

    ipcRenderer.send("SCREENSHOTS:reset");
  },
  save: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => {
    console.log("contextBridge save", arrayBuffer, data);

    ipcRenderer.send("SCREENSHOTS:save", Buffer.from(arrayBuffer), data);
  },
  cancel: () => {
    console.log("contextBridge cancel");

    ipcRenderer.send("SCREENSHOTS:cancel");
  },
  ok: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => {
    console.log("contextBridge ok", arrayBuffer, data);

    ipcRenderer.send("SCREENSHOTS:ok", Buffer.from(arrayBuffer), data);
  },
  ocr: async (
    imageDataUrl: string,
  ): Promise<{ success: boolean; text?: string; error?: string }> => {
    console.log("contextBridge ocr");

    return await ipcRenderer.invoke("SCREENSHOTS:ocr", imageDataUrl);
  },
  /**
   * 获取支持的语言列表
   */
  getLanguages: async (): Promise<GetLanguagesResponse> => {
    console.log("contextBridge getLanguages");

    return await ipcRenderer.invoke("SCREENSHOTS:getLanguages");
  },
  /**
   * 翻译文本
   */
  translate: async (request: TranslateRequest): Promise<TranslateResponse> => {
    console.log("contextBridge translate", request);

    return await ipcRenderer.invoke("SCREENSHOTS:translate", request);
  },
  on: (channel: string, fn: ScreenshotsListener) => {
    console.log("contextBridge on", fn);

    const listener = (_event: IpcRendererEvent, ...args: unknown[]) => {
      console.log("contextBridge on", channel, fn, ...args);
      fn(...args);
    };

    const listeners = map.get(fn) ?? {};
    listeners[channel] = listener;
    map.set(fn, listeners);

    ipcRenderer.on(`SCREENSHOTS:${channel}`, listener);
  },
  off: (channel: string, fn: ScreenshotsListener) => {
    console.log("contextBridge off", fn);

    const listeners = map.get(fn) ?? {};
    const listener = listeners[channel];
    delete listeners[channel];

    if (!listener) {
      return;
    }

    ipcRenderer.off(`SCREENSHOTS:${channel}`, listener);
  },
});
