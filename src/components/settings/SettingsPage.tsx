import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  ShieldCheckIcon,
  ArchiveBoxArrowDownIcon,
  ChartBarIcon,
  PaintBrushIcon,
  TagIcon 
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { MasterKeyConfirmationModal } from '../auth/MasterKeyConfirmationModal';
import { UpdateMasterKeyModal } from './UpdateMasterKeyModal';
import { SuccessPopup } from './SuccessPopup';
import { DeleteVaultModal } from './DeleteVaultModal';
import { TabButton } from './TabButton';
import { AppearanceSettings } from './tabs/AppearanceSettings';
import { SecuritySettings } from './tabs/SecuritySettings';
import { VaultManagementSettings } from './tabs/VaultManagementSettings';
import { VaultStats } from './tabs/VaultStats';
import { TagManagementSettings } from './tabs/TagManagementSettings';
import { useSettings } from '../../hooks/useSettings';
import { useVaultManagement } from '../../hooks/useVaultManagement';
import { useVaultStats } from '../../hooks/useVaultStats';

type Tab = 'appearance' | 'security' | 'management' | 'stats' | 'tags';

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  
  const { autoLock, sortOrder, vaultView, requireKeyOnAccess } = useSettings();
  const { stats } = useVaultStats();
  const vaultManagement = useVaultManagement();

  const [isUpdateKeyModalOpen, setIsUpdateKeyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteVaultModalOpen, setIsDeleteVaultModalOpen] = useState(false);
  
  const renderTabContent = () => {
    switch(activeTab) {
        case 'appearance':
            return <AppearanceSettings 
                        vaultView={vaultView.value} 
                        setVaultView={vaultView.setValue} 
                        sortOrder={sortOrder.value} 
                        setSortOrder={sortOrder.setValue} 
                    />;
        case 'security':
            return <SecuritySettings 
                        onUpdateKey={() => setIsUpdateKeyModalOpen(true)} 
                        requireKeyOnAccess={requireKeyOnAccess.value} 
                        setRequireKeyOnAccess={requireKeyOnAccess.setValue} 
                        autoLock={autoLock.value} 
                        setAutoLock={autoLock.setValue} 
                    />;
        case 'management':
            return <VaultManagementSettings 
                        onExportEncrypted={vaultManagement.handleExportEncrypted} 
                        onExportDecrypted={() => setIsExportModalOpen(true)} 
                        onDeleteVault={() => setIsDeleteVaultModalOpen(true)} 
                    />;
        case 'stats':
            return <VaultStats stats={stats} />;
        case 'tags':
            return <TagManagementSettings />;
        default:
            return null;
    }
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-semibold text-white">Settings</h1>
            <button onClick={() => navigate('/')} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50">
                <XMarkIcon className="h-5 w-5" />
            </button>
        </div>

        <div className="flex flex-col md:flex-row md:space-x-8">
            <div className="w-full md:w-1/4 flex-shrink-0 mb-8 md:mb-0">
                <div className="space-y-1">
                    <TabButton label="Appearance" icon={PaintBrushIcon} isActive={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
                    <TabButton label="Security" icon={ShieldCheckIcon} isActive={activeTab === 'security'} onClick={() => setActiveTab('security')} />
                    <TabButton label="Vault Management" icon={ArchiveBoxArrowDownIcon} isActive={activeTab === 'management'} onClick={() => setActiveTab('management')} />
                    <TabButton label="Statistics" icon={ChartBarIcon} isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
                    <TabButton label="Tag Management" icon={TagIcon} isActive={activeTab === 'tags'} onClick={() => setActiveTab('tags')} />
                </div>
            </div>

            <main className="flex-1 bg-gray-800/40 rounded-xl border border-gray-700/60 p-2 sm:p-4">
                {renderTabContent()}
            </main>
        </div>

        <SuccessPopup 
            show={vaultManagement.isSuccess}
            title="Master Key Updated"
            message="The application will reload in 3 seconds to apply changes."
            onClose={() => {}}
        />
        <UpdateMasterKeyModal
            isOpen={isUpdateKeyModalOpen}
            onClose={() => setIsUpdateKeyModalOpen(false)}
            onConfirm={vaultManagement.handleUpdateMasterKey}
            isLoading={vaultManagement.isLoading}
            error={vaultManagement.error}
        />
        <MasterKeyConfirmationModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onConfirm={async (key) => {
              try {
                  const success = await vaultManagement.handleExportDecrypted(key);
                  if (success) setIsExportModalOpen(false);
              } catch (e) {
                    console.error("Export failed:", e);
              }
          }}
          title="Confirm Decrypted Export"
          description="This will export all your vault data as an unencrypted JSON file. Please enter your master key to proceed."
          actionLabel="Confirm & Export"
          isLoading={vaultManagement.isLoading}
          error={vaultManagement.error}
          clearError={vaultManagement.clearError}
        />
        <DeleteVaultModal
          isOpen={isDeleteVaultModalOpen}
          onClose={() => setIsDeleteVaultModalOpen(false)}
          onConfirm={vaultManagement.handleDeleteVault}
        />
      </div>
    </div>
  );
}