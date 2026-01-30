import type { ReactElement } from 'react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useLang from '../../hooks/useLang';
import useBounds from '../../hooks/useBounds';
import useStore from '../../hooks/useStore';
import './index.less';

interface Language {
  code: string;
  name: string;
}

const languages: Language[] = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'th', name: 'ไทย' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ko', name: '한국어' },
  { code: 'vi', name: 'Tiếng Việt' },
];

export default function Translate(): ReactElement {
  const lang = useLang();
  const [bounds] = useBounds();
  const { image } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(languages[0]);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      let placement: 'top' | 'bottom';

      // 如果下方空间不足且上方空间更大，则显示在上方
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        placement = 'top';
        top = buttonRect.top - Math.min(dropdownHeight, spaceAbove) - 5;
      } else {
        placement = 'bottom';
        top = buttonRect.bottom + 5;
      }

      const left = buttonRect.left;

      setDropdownPosition({ top, left, placement });
    }
  }, [showDropdown]);

  const handleTranslate = useCallback(async () => {
    if (isLoading || !bounds || !image) {
      return;
    }

    setIsLoading(true);

    try {
      // 模拟 OCR 和翻译过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟提取的文字 + 随机数
      const extractedText = `提取的文字内容 ${Math.random().toFixed(4)}`;
      
      // 这里可以调用实际的翻译接口
      console.log('翻译到:', selectedLang.name);
      console.log('提取的文字:', extractedText);
      
      // TODO: 显示翻译结果（可以通过 alert 或其他方式）
      alert(`翻译结果:\n${extractedText}\n目标语言: ${selectedLang.name}`);
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, bounds, image, selectedLang]);

  const toggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoading) {
      if (showDropdown) {
        setShowDropdown(false);
        setDropdownPosition(null);
      } else {
        setShowDropdown(true);
      }
    }
  }, [isLoading, showDropdown]);

  const handleLanguageSelect = useCallback((language: Language) => {
    setSelectedLang(language);
    setShowDropdown(false);
  }, []);

  const buttonClassNames = ['screenshots-translate-button'];
  if (isLoading) {
    buttonClassNames.push('screenshots-translate-button-loading');
  }

  return (
    <>
      <div className="screenshots-translate" ref={buttonRef}>
        <div className="screenshots-translate-wrapper">
          <div
            className={buttonClassNames.join(' ')}
            title={lang.operation_translate_title || '翻译'}
            onClick={handleTranslate}
          >
            {!isLoading && <span className="icon-text" />}
            {isLoading && <span className="screenshots-translate-loading-spinner" />}
          </div>
          <div
            className="screenshots-translate-arrow"
            onClick={toggleDropdown}
            title="选择目标语言"
          >
            <span className="screenshots-translate-arrow-icon">{showDropdown ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {showDropdown && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className={`screenshots-translate-dropdown screenshots-translate-dropdown-${dropdownPosition.placement}`}
          style={{
            position: 'fixed',
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
                key={language.code}
                className={`screenshots-translate-dropdown-item ${
                  selectedLang.code === language.code ? 'selected' : ''
                }`}
                onClick={() => handleLanguageSelect(language)}
              >
                {language.name}
                {selectedLang.code === language.code && (
                  <span className="screenshots-translate-dropdown-check">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
