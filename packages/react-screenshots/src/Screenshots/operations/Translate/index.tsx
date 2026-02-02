import type { ReactElement } from "react";
import { useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import useLang from "../../hooks/useLang";
import useBounds from "../../hooks/useBounds";
import useStore from "../../hooks/useStore";
import useHistory from "../../hooks/useHistory";
import { HistoryItemType } from "../../types";
import type { HistoryItemSource } from "../../types";
import "./index.less";

// 行分组类型定义
interface LineGroup {
  words: any[];
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// 语言项类型（与 electron-screenshots 一致）
interface LanguageItem {
  languageCode: string;
  channelLanguageCode: string;
  nameCn: string;
  nameEn: string;
  channelType: string;
}

// 翻译请求参数
interface TranslateRequest {
  text: string;
  targetLang: string;
  channelType: string;
}

export default function Translate(): ReactElement {
  const lang = useLang();
  const [bounds] = useBounds();
  const { image, width, height } = useStore();
  const [history, historyDispatcher] = useHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [selectedLang, setSelectedLang] = useState<LanguageItem | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 初始化时获取语言列表
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const result = await (window as any).screenshots.getLanguages();
        if (result.success && result.languages && result.languages.length > 0) {
          setLanguages(result.languages);
          // 默认选择第一个语言
          setSelectedLang(result.languages[0]);
        } else {
          console.warn("获取语言列表失败或为空:", result.error);
        }
      } catch (error) {
        console.error("获取语言列表失败:", error);
      }
    };
    fetchLanguages();
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // 计算下拉菜单位置
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 450; // 最大高度

      // 检查下方空间
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      // 检查上方空间
      const spaceAbove = buttonRect.top;

      let top: number;
      let placement: "top" | "bottom";

      // 如果下方空间不足且上方空间更大，则显示在上方
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        placement = "top";
        top = buttonRect.top - Math.min(dropdownHeight, spaceAbove) - 5;
      } else {
        placement = "bottom";
        top = buttonRect.bottom + 5;
      }

      const left = buttonRect.left;

      setDropdownPosition({ top, left, placement });
    }
  }, [showDropdown, bounds]);

  // 从截图区域提取图片
  const extractImageFromBounds = useCallback(async (): Promise<
    string | null
  > => {
    if (!bounds || !image || !width || !height) {
      console.error("缺少必要参数:", { bounds, image, width, height });
      return null;
    }

    try {
      console.log("开始提取图片...");
      console.log("bounds:", bounds);
      console.log(
        "image 自然尺寸:",
        image.naturalWidth,
        "x",
        image.naturalHeight,
      );
      console.log("显示尺寸:", width, "x", height);
      console.log("devicePixelRatio:", window.devicePixelRatio);

      // 计算图片自然尺寸和显示尺寸的比例
      const rx = image.naturalWidth / width;
      const ry = image.naturalHeight / height;

      console.log("缩放比例 rx:", rx, "ry:", ry);

      // 创建临时 canvas，使用原始图片的尺寸
      const canvas = document.createElement("canvas");
      const cropWidth = Math.round(bounds.width * rx);
      const cropHeight = Math.round(bounds.height * ry);

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      console.log("Canvas 尺寸:", canvas.width, "x", canvas.height);

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.error("无法获取 canvas context");
        return null;
      }

      // 直接绘制原始图片的截图区域，不使用变换矩阵
      ctx.drawImage(
        image,
        bounds.x * rx,
        bounds.y * ry,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );

      // 转换为 base64
      const dataUrl = canvas.toDataURL("image/png");
      console.log("图片提取完成，大小:", dataUrl.length, "bytes");
      console.log("图片 data URL 前缀:", dataUrl.substring(0, 100));

      // 调试：在新窗口显示提取的图片
      console.log("提取的图片预览（可在控制台复制 data URL 到浏览器查看）");

      return dataUrl;
    } catch (error) {
      console.error("提取图片失败:", error);
      return null;
    }
  }, [bounds, image, width, height]);

  const handleTranslate = useCallback(async () => {
    if (isLoading || !bounds || !image) {
      return;
    }

    setIsLoading(true);

    // 使用 setTimeout 让 loading 状态先更新到 UI，避免卡顿
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // 1. 提取截图区域的图片
      console.log("正在提取截图区域...");
      const imageData = await extractImageFromBounds();

      if (!imageData) {
        console.error("提取图片失败");
        return;
      }

      // 2. 调用主进程 OCR
      console.log("正在识别文字...");
      const result = await (window as any).screenshots.ocr(imageData);

      console.log("OCR 结果:", result);

      if (!result.success) {
        console.error(`OCR 识别失败: ${result.error}`);
        return;
      }

      const text = result.text || "";
      const words = result.words || [];

      console.log("识别到的文字:", text);
      console.log("识别到的单词数:", words.length);

      if (!text || words.length === 0) {
        console.warn("未识别到文字，可能的原因：");
        console.warn("1. 图片中没有文字");
        console.warn("2. 文字太小或太模糊");
        console.warn("3. OCR 引擎无法识别该语言");
        console.warn("4. 图片提取有问题");
        return;
      }

      console.log(`识别到 ${words.length} 个单词/字符`);

      // 3. 按行分组并翻译（方案 A 改进版）
      console.log("正在分组和翻译...");
      await drawTranslationOverlay(words);

      console.log("翻译完成！");
    } catch (error) {
      console.error("翻译失败:", error);
      console.error(
        `翻译失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, bounds, image, selectedLang, extractImageFromBounds]);

  // 按 Y 坐标将 words 分组成行
  const groupWordsIntoLines = (words: any[]): LineGroup[] => {
    if (words.length === 0) return [];

    // 过滤掉没有 bbox 的 word
    const validWords = words.filter((w) => w.bbox);
    if (validWords.length === 0) return [];

    // 按 centerY 排序
    const sorted = [...validWords].sort((a, b) => {
      const centerA = (a.bbox.y0 + a.bbox.y1) / 2;
      const centerB = (b.bbox.y0 + b.bbox.y1) / 2;
      return centerA - centerB;
    });

    const lines: LineGroup[] = [];
    let currentLineWords: any[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevWord = sorted[i - 1];
      const currWord = sorted[i];

      const prevCenterY = (prevWord.bbox.y0 + prevWord.bbox.y1) / 2;
      const currCenterY = (currWord.bbox.y0 + currWord.bbox.y1) / 2;
      const lineHeight = prevWord.bbox.y1 - prevWord.bbox.y0;

      // 如果 Y 差值小于行高的 60%，认为是同一行
      if (Math.abs(currCenterY - prevCenterY) < lineHeight * 0.6) {
        currentLineWords.push(currWord);
      } else {
        lines.push(createLineGroup(currentLineWords));
        currentLineWords = [currWord];
      }
    }

    // 最后一行
    if (currentLineWords.length > 0) {
      lines.push(createLineGroup(currentLineWords));
    }

    return lines;
  };

  const createLineGroup = (words: any[]): LineGroup => {
    // 按 X 坐标排序
    const sortedWords = [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0);

    // 合并 bbox
    const bbox = {
      x0: Math.min(...sortedWords.map((w) => w.bbox.x0)),
      y0: Math.min(...sortedWords.map((w) => w.bbox.y0)),
      x1: Math.max(...sortedWords.map((w) => w.bbox.x1)),
      y1: Math.max(...sortedWords.map((w) => w.bbox.y1)),
    };

    // 合并文字（用空格连接同一行的单词）
    const text = sortedWords.map((w) => w.text).join(" ");

    return { words: sortedWords, text, bbox };
  };

  // 智能拆分文本为单词（支持中英文混合）
  const splitIntoWords = (text: string): string[] => {
    const words: string[] = [];
    let currentWord = "";
    let isInEnglish = false;

    for (const char of text) {
      const isEnglishChar = /[a-zA-Z0-9]/.test(char);
      const isSpace = /\s/.test(char);

      if (isSpace) {
        if (currentWord) {
          words.push(currentWord);
          currentWord = "";
        }
        isInEnglish = false;
      } else if (isEnglishChar) {
        if (!isInEnglish && currentWord) {
          words.push(currentWord);
          currentWord = "";
        }
        currentWord += char;
        isInEnglish = true;
      } else {
        // 中文或其他字符
        if (currentWord) {
          words.push(currentWord);
          currentWord = "";
        }
        words.push(char); // 中文每个字单独作为一个"词"
        isInEnglish = false;
      }
    }

    if (currentWord) {
      words.push(currentWord);
    }

    return words;
  };

  // 智能合并单词（英文用空格，中文不用）
  const joinWords = (words: string[]): string => {
    if (words.length === 0) return "";

    let result = words[0];
    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      const curr = words[i];
      const prevIsEnglish = /[a-zA-Z0-9]$/.test(prev);
      const currIsEnglish = /^[a-zA-Z0-9]/.test(curr);

      // 两个英文单词之间加空格
      if (prevIsEnglish && currIsEnglish) {
        result += " " + curr;
      } else {
        result += curr;
      }
    }

    return result;
  };

  // 按原文比例分配译文到各行（按单词边界）
  const distributeTranslationByRatio = (
    translatedText: string,
    lines: LineGroup[],
  ): string[] => {
    if (lines.length === 0) return [];
    if (lines.length === 1) return [translatedText.trim()];

    // 计算每行原文字符数和总字符数
    const lineLengths = lines.map((l) => l.text.length);
    const totalLength = lineLengths.reduce((a, b) => a + b, 0);
    const ratios = lineLengths.map((len) => len / totalLength);

    console.log("行长度分布:", lineLengths);
    console.log("行比例:", ratios);

    // 拆分译文为单词（支持中英文混合）
    const words = splitIntoWords(translatedText.trim());
    const totalWords = words.length;

    console.log(
      "译文单词数:",
      totalWords,
      "单词列表:",
      words.slice(0, 10),
      "...",
    );

    if (totalWords === 0) return lines.map(() => "");

    const result: string[] = [];
    let wordIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const ratio = ratios[i];
      let wordCount = Math.round(totalWords * ratio);

      // 确保至少分配1个单词（如果还有剩余）
      if (wordCount === 0 && wordIndex < words.length) {
        wordCount = 1;
      }

      // 最后一行拿走所有剩余
      if (i === lines.length - 1) {
        wordCount = words.length - wordIndex;
      }

      // 提取该行的单词
      const lineWords = words.slice(wordIndex, wordIndex + wordCount);
      const lineText = joinWords(lineWords);
      result.push(lineText);

      console.log(`行${i + 1}: 分配 ${wordCount} 个单词, 内容: "${lineText}"`);

      wordIndex += wordCount;
    }

    return result;
  };

  // 计算能放入 bbox 的最大字号
  const fitTextToBox = (
    ctx: CanvasRenderingContext2D,
    text: string,
    bbox: { x0: number; y0: number; x1: number; y1: number },
  ): number => {
    const maxWidth = bbox.x1 - bbox.x0;
    const maxHeight = bbox.y1 - bbox.y0;
    let fontSize = maxHeight * 0.85;
    const minFontSize = 8;

    while (fontSize > minFontSize) {
      ctx.font = `${fontSize}px Arial, "Microsoft YaHei", sans-serif`;
      const metrics = ctx.measureText(text);
      if (metrics.width <= maxWidth) {
        return fontSize;
      }
      fontSize -= 1;
    }

    return minFontSize;
  };

  // 调用翻译接口
  const translateText = async (
    text: string,
    targetLang: string,
    channelType: string,
  ): Promise<string> => {
    try {
      const request: TranslateRequest = {
        text,
        targetLang,
        channelType,
      };

      const result = await (window as any).screenshots.translate(request);

      if (result.success && result.text) {
        return result.text;
      } else {
        console.error("翻译失败:", result.error);
        throw new Error(result.error || "翻译失败");
      }
    } catch (error) {
      console.error("翻译接口调用失败:", error);
      throw error;
    }
  };

  // 计算背景色的亮度（0-255）
  const getBackgroundBrightness = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): number => {
    try {
      // 采样区域中心点周围的像素
      const sampleSize = Math.min(
        10,
        Math.floor(width / 2),
        Math.floor(height / 2),
      );
      const centerX = Math.floor(x + width / 2);
      const centerY = Math.floor(y + height / 2);

      const imageData = ctx.getImageData(
        Math.max(0, centerX - sampleSize),
        Math.max(0, centerY - sampleSize),
        sampleSize * 2,
        sampleSize * 2,
      );

      let totalBrightness = 0;
      let count = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        // 使用感知亮度公式
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        totalBrightness += brightness;
        count++;
      }

      return count > 0 ? totalBrightness / count : 128;
    } catch (error) {
      console.warn("无法获取背景色，使用默认值", error);
      return 128; // 默认中等亮度
    }
  };

  // 在截图上绘制翻译覆盖（方案 A 改进版：按比例 + 单词边界）
  const drawTranslationOverlay = async (words: any[]) => {
    if (!bounds || !image || !width || !height) {
      console.error("缺少必要参数");
      return;
    }

    console.log("开始绘制翻译覆盖（方案 A 改进版）...");
    console.log("words 数量:", words.length);

    // 计算图片自然尺寸和显示尺寸的比例
    const rx = image.naturalWidth / width;
    const ry = image.naturalHeight / height;

    console.log("缩放比例 rx:", rx, "ry:", ry);

    // 创建临时 canvas
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bounds.width * rx);
    canvas.height = Math.round(bounds.height * ry);

    console.log("Canvas 尺寸:", canvas.width, "x", canvas.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("无法获取 canvas context");
      return;
    }

    // 1. 绘制原始截图区域
    ctx.drawImage(
      image,
      bounds.x * rx,
      bounds.y * ry,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    console.log("原始图片已绘制");

    // 2. 使用新的行分组函数
    if (words.length > 0) {
      console.log("开始按行分组...");

      const lines = groupWordsIntoLines(words);
      console.log(`文字分为 ${lines.length} 行`);

      // 打印每行信息
      lines.forEach((line, i) => {
        console.log(
          `行${i + 1}: "${line.text}" bbox: (${line.bbox.x0},${line.bbox.y0}) - (${line.bbox.x1},${line.bbox.y1})`,
        );
      });

      // 3. 合并所有行文字（用空格连接，不用换行）
      const fullText = lines.map((l) => l.text).join(" ");
      console.log("完整文本:", fullText);

      // 检查是否选择了语言
      if (!selectedLang) {
        console.error("未选择目标语言");
        return;
      }

      // 4. 翻译完整文本
      console.log("正在翻译完整文本...");
      const translatedText = await translateText(
        fullText,
        selectedLang.channelLanguageCode,
        selectedLang.channelType,
      );
      console.log("翻译结果:", translatedText);

      // 5. 按原文比例分配译文到各行
      const distributedLines = distributeTranslationByRatio(
        translatedText,
        lines,
      );
      console.log("分配后的译文:", distributedLines);

      // 6. 逐行绘制
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const translatedLine = distributedLines[i] || "";

        if (!translatedLine.trim()) continue;

        const bbox = line.bbox;
        const lineWidth = bbox.x1 - bbox.x0;
        const lineHeight = bbox.y1 - bbox.y0;

        // 6.1 检测该行的背景亮度
        const bgBrightness = getBackgroundBrightness(
          ctx,
          bbox.x0,
          bbox.y0,
          lineWidth,
          lineHeight,
        );
        const isLightBackground = bgBrightness > 128;
        const textColor = isLightBackground ? "#000000" : "#FFFFFF";
        const bgColor = isLightBackground ? "#FFFFFF" : "#000000";

        // 6.2 用背景色覆盖该行 bbox
        ctx.fillStyle = bgColor;
        ctx.fillRect(bbox.x0, bbox.y0, lineWidth, lineHeight);

        // 6.3 计算自适应字号
        const fontSize = fitTextToBox(ctx, translatedLine, bbox);
        ctx.font = `${fontSize}px Arial, "Microsoft YaHei", sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = textColor;

        // 6.4 绘制译文（垂直居中）
        const textY = bbox.y0 + lineHeight / 2;
        ctx.fillText(translatedLine, bbox.x0, textY);

        console.log(
          `行${i + 1}: 字号=${fontSize}px, 绘制 "${translatedLine}" at (${bbox.x0}, ${textY})`,
        );
      }

      console.log("翻译文字绘制完成");
    }

    // 4. 将翻译后的图片转换为 Image 对象
    const resultDataUrl = canvas.toDataURL("image/png");
    console.log("翻译覆盖完成，结果图片大小:", resultDataUrl.length);

    // 5. 创建新的 Image 对象
    const translatedImage = new Image();
    translatedImage.src = resultDataUrl;

    await new Promise((resolve) => {
      translatedImage.onload = () => {
        console.log(
          "翻译图片加载完成:",
          translatedImage.width,
          "x",
          translatedImage.height,
        );
        resolve(null);
      };
    });

    // 6. 将翻译后的图片添加到编辑历史中
    // 创建一个完整的历史项，符合 HistoryItemSource 类型
    const translationHistoryItem: HistoryItemSource<any, any> = {
      name: "Translation",
      type: HistoryItemType.Source,
      data: {
        image: translatedImage,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
      editHistory: [],
      draw: (context: CanvasRenderingContext2D) => {
        console.log("正在绘制翻译图片到 canvas...");
        console.log("Canvas 坐标系是相对的，从 (0, 0) 开始绘制");
        console.log("目标尺寸:", bounds.width, bounds.height);

        // Canvas 的坐标系是相对于截图区域的，所以从 (0, 0) 开始绘制
        context.drawImage(translatedImage, 0, 0, bounds.width, bounds.height);

        console.log("翻译图片已绘制到 canvas");
      },
    };

    // 使用 historyDispatcher.push 添加到历史记录
    console.log("当前历史记录:", history);
    historyDispatcher.push(translationHistoryItem);
    console.log(
      "翻译结果已添加到编辑历史，新的历史记录索引:",
      history.index + 1,
    );
  };

  const toggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isLoading) {
        if (showDropdown) {
          setShowDropdown(false);
          setDropdownPosition(null);
        } else {
          setShowDropdown(true);
        }
      }
    },
    [isLoading, showDropdown],
  );

  const handleLanguageSelect = useCallback((language: LanguageItem) => {
    setSelectedLang(language);
    setShowDropdown(false);
  }, []);

  const buttonClassNames = ["screenshots-translate-button"];
  if (isLoading) {
    buttonClassNames.push("screenshots-translate-button-loading");
  }

  return (
    <>
      <div className="screenshots-translate" ref={buttonRef}>
        <div className="screenshots-translate-wrapper">
          <div
            className={buttonClassNames.join(" ")}
            title={lang.operation_translate_title || "翻译"}
            onClick={handleTranslate}
          >
            {!isLoading && (
              <svg
                viewBox="0 0 1024 1024"
                width="26"
                height="26"
                style={{ display: "block" }}
              >
                <path
                  d="M550.761412 343.762824l1.716706 3.312941 122.970353 281.118117a26.352941 26.352941 0 0 1-46.772706 24.064l-1.505883-2.951529-31.533176-72.071529h-134.625882l-31.503059 72.071529a26.352941 26.352941 0 0 1-49.423059-18.010353l1.114353-3.102118 123.00047-281.118117a26.383059 26.383059 0 0 1 46.561883-3.312941z m-22.40753 79.600941l-44.272941 101.165176h88.515765l-44.272941-101.165176z"
                  fill="currentColor"
                />
                <path
                  d="M521.306353 120.470588a377.825882 377.825882 0 0 1 370.145882 302.200471 26.352941 26.352941 0 1 1-51.621647 10.480941 325.12 325.12 0 0 0-623.194353-48.489412l-0.903529 2.56 58.307765-19.425882a26.352941 26.352941 0 0 1 32.105411 13.583059l1.204706 3.072a26.352941 26.352941 0 0 1-13.552941 32.105411l-3.102118 1.204706-105.411764 35.147294a26.352941 26.352941 0 0 1-34.153412-30.238117A377.825882 377.825882 0 0 1 521.276235 120.470588zM856.184471 543.864471a26.352941 26.352941 0 0 1 35.297882 29.846588 377.825882 377.825882 0 0 1-740.352 0 26.352941 26.352941 0 0 1 51.651765-10.480941 325.12 325.12 0 0 0 620.212706 56.229647l2.891294-7.469177-42.134589 16.203294a26.352941 26.352941 0 0 1-32.677647-12.107294l-1.385411-3.011764a26.352941 26.352941 0 0 1 12.137411-32.677648l3.011765-1.385411 91.346824-35.147294z"
                  fill="currentColor"
                />
              </svg>
            )}
            {isLoading && (
              <span className="screenshots-translate-loading-spinner" />
            )}
          </div>
          <div
            className="screenshots-translate-arrow"
            onClick={toggleDropdown}
            title="选择目标语言"
          >
            <span
              className={`screenshots-translate-arrow-icon ${showDropdown ? "rotate-180" : ""}`}
            >
              <svg viewBox="0 0 1024 1024" width="12" height="12">
                <path
                  d="M463.744 709.546667c-2.474667-2.389333-13.056-11.52-21.76-19.968-54.741333-49.706667-144.341333-179.370667-171.690667-247.253334-4.394667-10.325333-13.696-36.394667-14.293333-50.304 0-13.354667 3.072-26.026667 9.301333-38.186666 8.704-15.146667 22.4-27.306667 38.570667-33.92 11.221333-4.266667 44.8-10.922667 45.397333-10.922667 36.736-6.656 96.426667-10.325333 162.389334-10.325333 62.848 0 120.106667 3.669333 157.397333 9.088 0.597333 0.64 42.325333 7.253333 56.618667 14.549333 26.112 13.354667 42.325333 39.424 42.325333 67.328v2.389333c-0.64 18.176-16.853333 56.362667-17.450667 56.362667-27.392 64.213333-112.597333 190.890667-169.216 241.834667 0 0-14.549333 14.336-23.637333 20.565333a76.074667 76.074667 0 0 1-45.397333 14.549333c-18.048 0-34.858667-5.461333-48.554667-15.786666z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {showDropdown &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`screenshots-translate-dropdown screenshots-translate-dropdown-${dropdownPosition.placement}`}
            style={{
              position: "fixed",
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="screenshots-translate-dropdown-header">
              将内容翻译为
            </div>
            <div className="screenshots-translate-dropdown-list">
              {languages.map((language) => (
                <div
                  key={language.languageCode}
                  className={`screenshots-translate-dropdown-item ${
                    selectedLang?.languageCode === language.languageCode
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleLanguageSelect(language)}
                >
                  {language.nameCn}
                  {selectedLang?.languageCode === language.languageCode && (
                    <span className="screenshots-translate-dropdown-check">
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
