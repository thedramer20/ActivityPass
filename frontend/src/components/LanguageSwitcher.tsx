import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();
    const change = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
    };
    return (
        <div style={{ marginLeft: '1rem' }}>
            <label style={{ marginRight: 4 }}>{t('lang.switch')}:</label>
            <button onClick={() => change('en')}>{t('lang.english')}</button>
            <button onClick={() => change('zh')} style={{ marginLeft: 6 }}>{t('lang.chinese')}</button>
        </div>
    );
};

export default LanguageSwitcher;
