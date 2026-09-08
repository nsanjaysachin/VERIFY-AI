import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Plus, 
  Flame, 
  Zap, 
  Lock, 
  MoreHorizontal,
  Sparkles,
  Share2,
  CheckSquare,
  Square,
  ChevronRight,
  RefreshCw,
  CheckCheck,
  ArrowLeft,
  Trash2,
  X,
  LogOut
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { ChecklistItem, VerificationResult, ItemCategory } from '../types';
import { storageService } from '../services/storageService';

interface ChecklistScreenProps {
  items: ChecklistItem[];
  onUpdateItems: (items: ChecklistItem[]) => void;
  onRescan: () => void;
  onGoToLocationSetup?: () => void;
  onGoToLeavingHome?: () => void;
  onBack?: () => void;
  currentUser?: FirebaseUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const getItemIcon = (objectName: string, category: ItemCategory) => {
  const name = objectName.toLowerCase();
  if (name.includes('stove') || name.includes('gas') || name.includes('heater') || name.includes('cylinder') || name.includes('burn')) {
    return '🔥';
  }
  if (name.includes('ac') || name.includes('conditioner') || name.includes('cooler')) {
    return '❄️';
  }
  if (name.includes('light') || name.includes('lamp') || name.includes('bulb')) {
    return '💡';
  }
  if (name.includes('window') || name.includes('balcony glass') || name.includes('pane')) {
    return '🪟';
  }
  if (name.includes('door') || name.includes('lock') || name.includes('gate') || name.includes('entrance')) {
    return '🚪';
  }
  if (name.includes('fan')) {
    return '🌀';
  }
  if (name.includes('iron') || name.includes('kettle') || name.includes('toaster') || name.includes('appliance') || name.includes('straightener')) {
    return '🔌';
  }
  if (name.includes('tap') || name.includes('faucet') || name.includes('sink') || name.includes('water')) {
    return '🚰';
  }
  if (name.includes('tv') || name.includes('television') || name.includes('screen')) {
    return '📺';
  }
  if (category === 'SAFETY') return '⚠️';
  if (category === 'ENERGY') return '⚡';
  if (category === 'SECURITY') return '🔒';
  return '📌';
};

export const ChecklistScreen: React.FC<ChecklistScreenProps> = ({
  items,
  onUpdateItems,
  onRescan,
  onGoToLocationSetup,
  onGoToLeavingHome,
  onBack,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | ItemCategory>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  const [newRoomName, setNewRoomName] = useState('Kitchen');
  const [newCategory, setNewCategory] = useState<ItemCategory>('SAFETY');
  const [newRecommendedState, setNewRecommendedState] = useState('OFF');
  const [newImportance, setNewImportance] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectName.trim()) return;

    const newItem: ChecklistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      object: newObjectName.trim(),
      room: newRoomName.trim() || 'General',
      category: newCategory,
      recommended_state: newRecommendedState.trim().toUpperCase() || 'OFF',
      importance: newImportance,
      verification_method: 'CAMERA_AI',
      confidence: 0.95,
      enabled: true,
      reason: `Ensure ${newObjectName.trim()} is verified ${newRecommendedState.trim().toUpperCase()} before leaving.`,
    };

    const updated = [newItem, ...items];
    onUpdateItems(updated);
    storageService.saveChecklist(updated);

    setNewObjectName('');
    setShowAddModal(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter(i => i.id !== itemId);
    onUpdateItems(updated);
    storageService.saveChecklist(updated);
  };

  const handleToggleManualCheck = (itemId: string) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const willBeChecked = !item.isManuallyChecked;
        return {
          ...item,
          isManuallyChecked: willBeChecked,
          lastVerified: willBeChecked ? {
            object: item.object,
            detected_state: item.recommended_state,
            expected_state: item.recommended_state,
            verified: true,
            confidence: 1.0,
            engine: 'ON_DEVICE' as const,
            message: `Manually checked: ${item.recommended_state}`,
            timestamp: Date.now(),
          } : undefined,
        };
      }
      return item;
    });
    onUpdateItems(updated);
    storageService.saveChecklist(updated);
  };

  const handleVerifyAll = () => {
    const updated = items.map(item => ({
      ...item,
      isManuallyChecked: true,
      lastVerified: {
        object: item.object,
        detected_state: item.recommended_state,
        expected_state: item.recommended_state,
        verified: true,
        confidence: 1.0,
        engine: 'ON_DEVICE' as const,
        message: `Manually checked: ${item.recommended_state}`,
        timestamp: Date.now(),
      },
    }));
    onUpdateItems(updated);
    storageService.saveChecklist(updated);
  };

  const handleResetVerifications = () => {
    const updated = items.map(item => ({
      ...item,
      lastVerified: undefined,
      isManuallyChecked: false,
    }));
    onUpdateItems(updated);
    storageService.saveChecklist(updated);
  };

  const verifiedCount = items.filter(
    i => (i.lastVerified && i.lastVerified.verified) || i.isManuallyChecked
  ).length;

  const filteredItems = activeCategoryFilter === 'ALL' 
    ? items 
    : items.filter(i => i.category === activeCategoryFilter);

  const isAllReadyToLeave = items.length > 0 && verifiedCount === items.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F0] text-[#2C2C24] overflow-hidden">
      {/* Top App Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-[#EBEBE0] flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-[#7A7A6A] hover:text-[#2C2C24] hover:bg-[#F9F9F4] rounded-full transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-serif font-bold tracking-tight text-[#2C2C24]">Checklist</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAuthModal && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="p-1 text-[#7A7A6A] hover:text-[#2C2C24] rounded-full hover:bg-[#F9F9F4] transition-colors flex items-center gap-1 text-xs"
                title={currentUser ? `Signed in as ${currentUser.displayName || currentUser.email}` : 'Sign in to sync with Cloud'}
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-5 h-5 rounded-full object-cover border border-[#D5D5C8]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] text-[10px] font-bold">
                    {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : '☁️'}
                  </div>
                )}
              </button>

              {currentUser && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-[#7A7A6A] hover:text-[#C85A48] rounded-full hover:bg-[#F9F9F4] transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1.5 rounded-full bg-[#5A5A40] text-white text-xs font-semibold hover:bg-[#4C4C36] transition-colors flex items-center gap-1 shadow-2xs"
            title="Add Appliance or Item"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>

          <button
            type="button"
            onClick={onRescan}
            className="p-1.5 text-[#7A7A6A] hover:text-[#2C2C24] rounded-full hover:bg-[#F9F9F4] transition-colors"
            title="Rescan Home"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress & Readiness Status Card */}
      <div className="p-4 bg-white border-b border-[#EBEBE0]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold text-[#2C2C24] flex items-center gap-2">
              <span>{verifiedCount} of {items.length} verified</span>
              {isAllReadyToLeave && (
                <span className="text-xs font-medium text-[#5A5A40] flex items-center gap-1 bg-[#5A5A40]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All Safe
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetVerifications}
            className="text-[11px] font-medium text-[#7A7A6A] hover:text-[#2C2C24] flex items-center gap-1"
            title="Reset verification statuses"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#EBEBE0] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 bg-[#5A5A40]"
            style={{ width: `${items.length > 0 ? (verifiedCount / items.length) * 100 : 0}%` }}
          />
        </div>

        {/* Departure Mode Link */}
        {onGoToLeavingHome && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#F9F9F4] border border-[#EBEBE0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs">📍</span>
              <p className="text-xs font-medium text-[#2C2C24]">Leaving home mode</p>
            </div>
            <button
              type="button"
              onClick={onGoToLeavingHome}
              className="px-3 py-1 rounded-full bg-[#5A5A40] text-white text-[11px] font-medium hover:bg-[#4C4C36] transition-colors"
            >
              Start
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
          {(['ALL', 'SAFETY', 'ENERGY', 'SECURITY', 'OTHER'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all ${
                activeCategoryFilter === cat
                  ? 'bg-[#5A5A40] text-white shadow-sm'
                  : 'bg-white border border-[#DCDCC8] text-[#7A7A6A] hover:bg-[#F9F9F4]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Checklist Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
        {filteredItems.map(item => {
          const icon = getItemIcon(item.object, item.category);
          const lastVer = item.lastVerified;
          const isVerified = (lastVer && lastVer.verified) || item.isManuallyChecked;
          const isFailed = lastVer && !lastVer.verified;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-[24px] border transition-all ${
                isVerified
                  ? 'bg-white border-[#5A5A40]/40 shadow-sm'
                  : isFailed
                  ? 'bg-[#FFF9F9] border-[#C85A48]/40 shadow-sm'
                  : 'bg-white border-[#EBEBE0] shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Checkbox & Item Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleManualCheck(item.id)}
                    className="mt-1 transition-transform active:scale-90"
                    title="Toggle checked"
                  >
                    {isVerified ? (
                      <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-xs shadow-sm">
                        ✓
                      </div>
                    ) : isFailed ? (
                      <div className="w-6 h-6 rounded-full bg-[#C85A48] text-white flex items-center justify-center text-xs shadow-sm">
                        ✕
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white border border-[#DCDCC8] hover:border-[#5A5A40] transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{icon}</span>
                      <span className={`text-sm font-bold tracking-tight ${isVerified ? 'text-[#2C2C24]' : 'text-[#2C2C24]'}`}>
                        {item.object}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F0] text-[#7A7A6A] border border-[#EBEBE0]">
                        {item.room}
                      </span>
                      {item.importance && (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            item.importance === 'CRITICAL'
                              ? 'bg-[#C85A48]/15 text-[#C85A48] border border-[#C85A48]/30'
                              : item.importance === 'HIGH'
                              ? 'bg-[#D4A373]/20 text-[#b45309] border border-[#D4A373]/40'
                              : 'bg-[#5A5A40]/10 text-[#5A5A40]'
                          }`}
                        >
                          {item.importance}
                        </span>
                      )}
                    </div>

                    {item.reason && (
                      <p className="text-[11px] text-[#7A7A6A] mt-1 line-clamp-2">
                        {item.reason}
                      </p>
                    )}

                    {/* Expected state pill */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-[#7A7A6A]">
                        Expected: <span className="font-mono font-bold text-[#5A5A40] uppercase">{item.recommended_state}</span>
                      </span>

                      {/* Verification status badge */}
                      {isVerified ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : isFailed ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C85A48]/10 text-[#C85A48] border border-[#C85A48]/20 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          NOT VERIFIED ({lastVer.detected_state})
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#7A7A6A]">
                          Pending Scan
                        </span>
                      )}
                    </div>

                    {/* AI Message if available */}
                    {lastVer && (
                      <p className={`text-[11px] mt-1.5 italic ${isVerified ? 'text-[#5A5A40]' : 'text-[#C85A48]'}`}>
                        &ldquo;{lastVer.message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Verify & Delete */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleManualCheck(item.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
                      isVerified
                        ? 'bg-[#5A5A40]/10 border border-[#5A5A40]/30 hover:bg-[#5A5A40]/20 text-[#5A5A40]'
                        : isFailed
                        ? 'bg-[#C85A48] hover:bg-red-700 text-white'
                        : 'bg-[#5A5A40] hover:bg-[#4C4C36] text-white'
                    }`}
                    title={isVerified ? 'Tap to unmark' : 'Tap to mark verified safe'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isVerified ? 'Verified' : 'Verify Safe'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-[#A0A090] hover:text-[#C85A48] hover:bg-red-50 rounded-full transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-[#7A7A6A] bg-white rounded-3xl border border-[#EBEBE0]">
            <p className="text-sm font-semibold mb-1 text-[#2C2C24]">No checklist items here yet.</p>
            <p className="text-xs text-[#7A7A6A] mb-4">
              Add your appliances or safety points to build your household checklist.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-full bg-[#5A5A40] text-white text-xs font-semibold hover:bg-[#4C4C36] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Safety Item
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Checklist Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-5 shadow-xl border border-[#EBEBE0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-bold text-[#2C2C24]">Add Safety Item</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#7A7A6A] hover:text-[#2C2C24] rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2C2C24] mb-1">
                  Item / Appliance Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gas Stove, Main Door, Iron, Bedroom AC"
                  value={newObjectName}
                  onChange={(e) => setNewObjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-xs focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C2C24] mb-1">
                    Room
                  </label>
                  <input
                    type="text"
                    placeholder="Kitchen, Bedroom, etc."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-xs focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C2C24] mb-1">
                    Safe State
                  </label>
                  <select
                    value={newRecommendedState}
                    onChange={(e) => setNewRecommendedState(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-xs focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="OFF">OFF</option>
                    <option value="LOCKED">LOCKED</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="UNPLUGGED">UNPLUGGED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C2C24] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ItemCategory)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-xs focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="SAFETY">SAFETY</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="ENERGY">ENERGY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C2C24] mb-1">
                    Importance
                  </label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-xs focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#7A7A6A] hover:bg-[#F9F9F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#4C4C36] text-white text-xs font-semibold shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
