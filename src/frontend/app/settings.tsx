import React, { useState, useEffect } from 'react';
import {
    Settings,
    Sun,
    Moon,
    Bell,
    Lock,
    User,
    Globe,
    Save,
    X,
    Shield,
    Info,
    Download,
    Trash2,
    AlertCircle,
} from 'lucide-react';

interface SettingsState {
    theme: 'light' | 'dark';
    notifications: boolean;
    emailNotifications: boolean;
    language: string;
    privacy: 'public' | 'private';
    autoSave: boolean;
    twoFactorAuth: boolean;
    dataCollection: boolean;
}

const STORAGE_KEY = 'app_settings';
const DEFAULT_SETTINGS: SettingsState = {
    theme: 'light',
    notifications: true,
    emailNotifications: false,
    language: 'pt-BR',
    privacy: 'private',
    autoSave: true,
    twoFactorAuth: false,
    dataCollection: false,
};

const SettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
    const [isSaved, setIsSaved] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Load settings from localStorage on component mount
    useEffect(() => {
        const savedSettings = localStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings));
            } catch (error) {
                console.error('Erro ao carregar configurações:', error);
                setSettings(DEFAULT_SETTINGS);
            }
        }
    }, []);

    const handleSettingChange = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
        setIsSaved(false);
        setPasswordError('');
    };

    const handleThemeChange = () => {
        handleSettingChange('theme', settings.theme === 'light' ? 'dark' : 'light');
    };

    const handleNotificationsChange = () => {
        handleSettingChange('notifications', !settings.notifications);
    };

    const handleEmailNotificationsChange = () => {
        handleSettingChange('emailNotifications', !settings.emailNotifications);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleSettingChange('language', e.target.value);
    };

    const handlePrivacyChange = (privacy: 'public' | 'private') => {
        handleSettingChange('privacy', privacy);
    };

    const handleAutoSaveChange = () => {
        handleSettingChange('autoSave', !settings.autoSave);
    };

    const handleTwoFactorChange = () => {
        handleSettingChange('twoFactorAuth', !settings.twoFactorAuth);
    };

    const handleDataCollectionChange = () => {
        handleSettingChange('dataCollection', !settings.dataCollection);
    };

    const handleSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            console.log('Configurações salvas:', settings);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        }
    };

    const handleReset = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem(STORAGE_KEY);
        setIsSaved(false);
        setPasswordError('');
    };

    const handleChangePassword = () => {
        setPasswordError('');
        if (!newPassword || !confirmPassword) {
            setPasswordError('Preencha todos os campos');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('A senha deve ter pelo menos 8 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem');
            return;
        }
        console.log('Senha alterada com sucesso');
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordOpen(false);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleDeleteAccount = () => {
        console.log('Conta deletada');
        localStorage.removeItem(STORAGE_KEY);
        setDeleteModalOpen(false);
    };

    const handleExportSettings = () => {
        const dataStr = JSON.stringify(settings, null, 2);
        const element = document.createElement('a');
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(dataStr)
        );
        element.setAttribute('download', 'configuracoes.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const isDark = settings.theme === 'dark';

    return (
        <div
            className={`min-h-screen transition-colors duration-300 ${
                isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
            }`}
        >
            {/* Header */}
            <div
                className={`border-b ${
                    isDark ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-white'
                } shadow-sm sticky top-0 z-10`}
            >
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Settings size={32} className="text-blue-600" />
                            <h1 className="text-3xl font-bold">Configurações</h1>
                        </div>
                        {isSaved && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                                <span className="text-sm font-medium">✓ Salvo com sucesso</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Appearance Section */}
                    <section
                        className={`p-6 rounded-lg border ${
                            isDark
                                ? 'border-gray-700 bg-gray-800'
                                : 'border-gray-200 bg-white'
                        }`}
                    >
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            {isDark ? (
                                <Moon size={24} className="text-blue-600" />
                            ) : (
                                <Sun size={24} className="text-blue-600" />
                            )}
                            Aparência
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Tema</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        {settings.theme === 'light' ? 'Claro' : 'Escuro'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleThemeChange}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settings.theme === 'light'
                                            ? 'bg-blue-600'
                                            : 'bg-gray-600'
                                    }`}
                                >
                  <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          settings.theme === 'light'
                              ? 'translate-x-1'
                              : 'translate-x-7'
                      }`}
                  />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Idioma</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Selecione seu idioma preferido
                                    </p>
                                </div>
                                <select
                                    value={settings.language}
                                    onChange={handleLanguageChange}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${
                                        isDark
                                            ? 'border-gray-600 bg-gray-700 text-white'
                                            : 'border-gray-300 bg-white text-gray-900'
                                    } focus:outline-none focus:ring-2 focus:ring-blue-600`}
                                >
                                    <option value="pt-BR">Português (Brasil)</option>
                                    <option value="pt-PT">Português (Portugal)</option>
                                    <option value="en-US">English (US)</option>
                                    <option value="es-ES">Español</option>
                                    <option value="fr-FR">Français</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Notifications Section */}
                    <section
                        className={`p-6 rounded-lg border ${
                            isDark
                                ? 'border-gray-700 bg-gray-800'
                                : 'border-gray-200 bg-white'
                        }`}
                    >
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Bell size={24} className="text-blue-600" />
                            Notificações
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Notificações Push</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Receba notificações no seu dispositivo
                                    </p>
                                </div>
                                <button
                                    onClick={handleNotificationsChange}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settings.notifications ? 'bg-blue-600' : 'bg-gray-400'
                                    }`}
                                >
                  <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          settings.notifications
                              ? 'translate-x-7'
                              : 'translate-x-1'
                      }`}
                  />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Notificações por Email</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Receba atualizações por email
                                    </p>
                                </div>
                                <button
                                    onClick={handleEmailNotificationsChange}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settings.emailNotifications
                                            ? 'bg-blue-600'
                                            : 'bg-gray-400'
                                    }`}
                                >
                  <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          settings.emailNotifications
                              ? 'translate-x-7'
                              : 'translate-x-1'
                      }`}
                  />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Salvamento Automático</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Salve automaticamente suas alterações
                                    </p>
                                </div>
                                <button
                                    onClick={handleAutoSaveChange}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settings.autoSave ? 'bg-blue-600' : 'bg-gray-400'
                                    }`}
                                >
                  <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          settings.autoSave ? 'translate-x-7' : 'translate-x-1'
                      }`}
                  />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Privacy Section */}
                    <section
                        className={`p-6 rounded-lg border ${
                            isDark
                                ? 'border-gray-700 bg-gray-800'
                                : 'border-gray-200 bg-white'
                        }`}
                    >
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Lock size={24} className="text-blue-600" />
                            Privacidade
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Perfil Privado</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Mantenha seu perfil privado
                                    </p>
                                </div>
                                <button
                                    onClick={() => handlePrivacyChange('private')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        settings.privacy === 'private'
                                            ? 'bg-blue-600 text-white'
                                            : isDark
                                                ? 'bg-gray-700 text-gray-300'
                                                : 'bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    {settings.privacy === 'private' ? '✓ Privado' : 'Privado'}
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Perfil Público</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Permita que outros vejam seu perfil
                                    </p>
                                </div>
                                <button
                                    onClick={() => handlePrivacyChange('public')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        settings.privacy === 'public'
                                            ? 'bg-blue-600 text-white'
                                            : isDark
                                                ? 'bg-gray-700 text-gray-300'
                                                : 'bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    {settings.privacy === 'public' ? '✓ Público' : 'Público'}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Security Section */}
                    <section
                        className={`p-6 rounded-lg border ${
                            isDark
                                ? 'border-gray-700 bg-gray-800'
                                : 'border-gray-200 bg-white'
                        }`}
                    >
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Shield size={24} className="text-blue-600" />
                            Segurança
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Autenticação de Dois Fatores</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Adicione uma camada extra de segurança
                                    </p>
                                </div>
                                <button
                                    onClick={handleTwoFactorChange}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settings.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-400'
                                    }`}
                                >
                   <span
                       className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                           settings.twoFactorAuth ? 'translate-x-7' : 'translate-x-1'
                       }`}
                   />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-opacity-50">
                                <div>
                                    <p className="font-medium mb-1">Coleta de Dados</p>
                                    <p
                                        className={`text-sm ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                    >
                                        Permitir coleta de dados para melhorar serviços
                                    </p>
                                </div>
                                <button
                                    onClick={handleDataCollectionChange}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settings.dataCollection ? 'bg-blue-600' : 'bg-gray-400'
                                    }`}
                                >
                   <span
                       className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                           settings.dataCollection ? 'translate-x-7' : 'translate-x-1'
                       }`}
                   />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Account Section */}
                    <section
                        className={`p-6 rounded-lg border ${
                            isDark
                                ? 'border-gray-700 bg-gray-800'
                                : 'border-gray-200 bg-white'
                        }`}
                    >
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <User size={24} className="text-blue-600" />
                            Conta
                        </h2>
                        <div className="space-y-4">
                            <button
                                onClick={() => setChangePasswordOpen(true)}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                                    isDark
                                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                }`}
                            >
                                Alterar Senha
                            </button>
                            <button
                                onClick={() => setDeleteModalOpen(true)}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                                    isDark
                                        ? 'bg-red-900 hover:bg-red-800 text-red-100'
                                        : 'bg-red-100 hover:bg-red-200 text-red-900'
                                }`}
                            >
                                Deletar Conta
                            </button>
                            <button
                                onClick={handleExportSettings}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                    isDark
                                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                }`}
                            >
                                <Download size={18} />
                                Exportar Configurações
                            </button>
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Salvar Configurações
                        </button>
                        <button
                            onClick={handleReset}
                            className={`flex-1 py-3 px-6 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                isDark
                                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            }`}
                        >
                            <X size={20} />
                            Resetar
                        </button>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {changePasswordOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
                            isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                        }`}
                    >
                        <h3 className="text-xl font-bold mb-4">Alterar Senha</h3>
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Nova Senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                                    isDark
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-gray-900'
                                } focus:outline-none focus:ring-2 focus:ring-blue-600`}
                            />
                            <input
                                type="password"
                                placeholder="Confirmar Senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                                    isDark
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-gray-900'
                                } focus:outline-none focus:ring-2 focus:ring-blue-600`}
                            />
                            {passwordError && (
                                <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded-lg">
                                    <AlertCircle size={18} />
                                    <span className="text-sm">{passwordError}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 pt-6">
                            <button
                                onClick={() => {
                                    setChangePasswordOpen(false);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setPasswordError('');
                                }}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    isDark
                                        ? 'bg-gray-700 hover:bg-gray-600'
                                        : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleChangePassword}
                                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Alterar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
                            isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle size={28} className="text-red-600" />
                            <h3 className="text-xl font-bold">Deletar Conta</h3>
                        </div>
                        <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Tem certeza que deseja deletar sua conta? Esta ação é irreversível e
                            todos os seus dados serão perdidos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                    isDark
                                        ? 'bg-gray-700 hover:bg-gray-600'
                                        : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                Deletar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;

