import React from 'react';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLang } from '../context/LangContext';

/** Three-way UI language: English (default), 中文, Indonesia — compact width; height aligned with header theme toggle via `.fm-lang-select` */
export default function LanguageSelect({ style, size = 'middle' }) {
  const { lang, setLanguage } = useLang();
  return (
    <Select
      value={lang}
      onChange={setLanguage}
      size={size}
      suffixIcon={<GlobalOutlined />}
      rootClassName="fm-lang-select"
      style={{ width: 118, ...style }}
      options={[
        { value: 'en', label: 'English' },
        { value: 'zh', label: '中文' },
        { value: 'id', label: 'Indonesia' },
      ]}
      popupMatchSelectWidth={false}
    />
  );
}
