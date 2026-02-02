import { createWorker, Worker, PSM } from 'tesseract.js';

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  text: string;
  words: OCRWord[];
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('正在初始化 Tesseract OCR...');
      
      // 创建 worker，支持中文简体和英文
      this.worker = await createWorker(['chi_sim', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core' || 
              m.status === 'initializing tesseract' ||
              m.status === 'loading language traineddata') {
            console.log(`Tesseract: ${m.status}...`);
          }
        },
      });

      // 设置识别参数
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO, // 自动页面分割模式
        preserve_interword_spaces: '1', // 保留单词间空格
      });

      this.isInitialized = true;
      console.log('Tesseract OCR 初始化完成');
    } catch (error) {
      console.error('Tesseract OCR 初始化失败:', error);
      throw error;
    }
  }

  async recognize(imageBuffer: Buffer): Promise<string> {
    const result = await this.recognizeWithPosition(imageBuffer);
    return result.text;
  }

  async recognizeWithPosition(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker 未初始化');
    }

    try {
      console.log('开始 OCR 识别...');
      console.log('输入图片大小:', imageBuffer.length, 'bytes');

      // 使用 Tesseract 识别
      const { data } = await this.worker.recognize(imageBuffer);
      
      console.log('OCR 识别完成');
      console.log('识别文字:', data.text);
      console.log('置信度:', data.confidence);
      console.log('data.words 类型:', typeof data.words);
      console.log('data.words 长度:', data.words ? data.words.length : 'undefined');
      
      // 打印前几个 word 的结构
      if (data.words && data.words.length > 0) {
        console.log('第一个 word 的结构:', JSON.stringify(data.words[0], null, 2));
        if (data.words.length > 1) {
          console.log('第二个 word 的结构:', JSON.stringify(data.words[1], null, 2));
        }
      }

      // 提取单词和位置信息
      const words: OCRWord[] = [];
      if (data.words) {
        for (const word of data.words) {
          console.log('处理 word:', word.text, 'bbox:', word.bbox);
          if (word.text.trim() && word.bbox) {
            words.push({
              text: word.text,
              confidence: word.confidence,
              bbox: {
                x0: word.bbox.x0,
                y0: word.bbox.y0,
                x1: word.bbox.x1,
                y1: word.bbox.y1,
              },
            });
          }
        }
      }

      console.log(`提取到 ${words.length} 个有效单词（有位置信息）`);

      return {
        text: data.text.trim(),
        words,
      };
    } catch (error) {
      console.error('OCR 识别失败:', error);
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    console.log('OCR 服务已释放');
  }
}
