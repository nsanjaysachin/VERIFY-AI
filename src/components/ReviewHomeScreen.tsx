import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Zap, 
  Lock, 
  MoreHorizontal, 
  Check, 
  Edit3, 
  Trash2, 
  Plus, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { DetectedHomeItem, ItemCategory } from '../types';

interface ReviewHomeScreenProps {
  items: DetectedHomeItem[];
  onConfirm: (confirmedItems: DetectedHomeItem[]) => void;
  onRescan: () => void;
}

const CATEGORY_META: Record<ItemCategory, { label: string; icon: any; badgeClass: string; emoji: string }> = {
  SAFETY: {
    label: 'SAFETY',
    icon: Flame,
    badgeClass: 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20',
    emoji: '🔥',
  },
  ENERGY: {
    label: 'ENERGY',
    icon: Zap,
    badgeClass: 'bg-[#8A7A40]/10 text-[#8A7A40] border-[#8A7A40]/20',
    emoji: '⚡',
  },
  SECURITY: {
    label: 'SECURITY',
    icon: Lock,
    badgeClass: 'bg-[#4A5A6A]/10 text-[#4A5A6A] border-[#4A5A6A]/20',
    emoji: '🔒',
  },
  OTHER: {
    label: 'OTHER',
    icon: MoreHorizontal,
    badgeClass: 'bg-[#7A7A6A]/10 text-[#7A7A6A] border-[#7A7A6A]/20',
    emoji: '📋',
  },
};

export const ReviewHomeScreen: React.FC<ReviewHomeScreenProps> = ({
  items: initialItems,
  onConfirm,
  onRescan,
}) => {
  const [items, setItems] = useState<DetectedHomeItem[]>(initialItems);
  const [editingItem, setEditingItem] = useState<DetectedHomeItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // Form states for add/edit
  const [formObject, setFormObject] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ItemCategory>('SAFETY');
  const [formRoom, setFormRoom] = useState<string>('Kitchen');
  const [formExpectedState, setFormExpectedState] = useState<string>('OFF');
  const [formReason, setFormReason] = useState<string>('');

  const toggleItemEnabled = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, enabled: item.enabled === false ? true : false } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const openEditModal = (item: DetectedHomeItem) => {
    setEditingItem(item);
    setFormObject(item.object);
    setFormCategory(item.category);
    setFormRoom(item.room);
    setFormExpectedState(item.recommended_state);
    setFormReason(item.reason);
    setIsAddingNew(false);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormObject('');
    setFormCategory('SAFETY');
    setFormRoom('Kitchen');
    setFormExpectedState('OFF');
    setFormReason('Verify safe state before leaving');
    setIsAddingNew(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formObject.trim()) return;

    if (isAddingNew) {
      const newItem: DetectedHomeItem = {
        id: `custom_${Date.now()}`,
        object: formObject.trim(),
        category: formCategory,
        room: formRoom.trim() || 'General',
        recommended_state: formExpectedState.trim().toUpperCase() || 'OFF',
        reason: formReason.trim() || 'Custom item verification',
        confidence: 1.0,
        enabled: true,
      };
      setItems(prev => [newItem, ...prev]);
    } else if (editingItem) {
      setItems(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                object: formObject.trim(),
                category: formCategory,
                room: formRoom.trim() || 'General',
                recommended_state: formExpectedState.trim().toUpperCase() || 'OFF',
                reason: formReason.trim() || item.reason,
              }
            : item
        )
      );
    }
    setEditingItem(null);
    setIsAddingNew(false);
  };

  // Group items by category
  const categories: ItemCategory[] = ['SAFETY', 'ENERGY', 'SECURITY', 'OTHER'];
  const groupedItems = categories.map(cat => ({
    category: cat,
    meta: CATEGORY_META[cat],
    items: items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0 || isAddingNew);

  const enabledCount = items.filter(i => i.enabled !== false).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F0] text-[#2C2C24] overflow-hidden">
      {/* Top App Bar */}
      <div className="px-5 py-3.5 bg-white border-b border-[#EBEBE0] flex items-center justify-between z-20">
        <div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-[#2C2C24]">Review Checklist</h1>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5A5A40] hover:bg-[#4C4C36] text-white text-xs font-medium rounded-full transition-all shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Scrollable Items List Grouped by Category */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-lg mx-auto w-full">
        {groupedItems.map(group => {
          const Icon = group.meta.icon;
          return (
            <div key={group.category} className="bg-white p-5 rounded-[28px] shadow-sm border border-[#EBEBE0] space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-xs uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full border ${group.meta.badgeClass} flex items-center gap-1.5`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{group.meta.label}</span>
                  </h2>
                </div>
                <span className="text-[11px] text-[#7A7A6A] font-medium">
                  {group.items.filter(i => i.enabled !== false).length} of {group.items.length} enabled
                </span>
              </div>

              {/* Items in this category */}
              <div className="space-y-2.5">
                {group.items.map(item => {
                  const isEnabled = item.enabled !== false;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center p-3.5 bg-[#F9F9F4] rounded-2xl border transition-all ${
                        isEnabled
                          ? 'border-transparent hover:border-[#5A5A40]/30'
                          : 'border-[#EBEBE0] opacity-50 bg-[#F5F5F0]'
                      }`}
                    >
                      {/* Emoji / Category badge icon */}
                      <div className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center text-lg flex-shrink-0 border border-[#EBEBE0]">
                        {group.meta.emoji}
                      </div>

                      {/* Info */}
                      <div className="ml-3.5 flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tracking-tight truncate ${isEnabled ? 'text-[#2C2C24]' : 'text-[#7A7A6A] line-through'}`}>
                            {item.object}
                          </span>
                        </div>
                        <div className="text-xs text-[#7A7A6A] truncate mt-0.5">
                          {item.room} • <span className="font-mono font-medium text-[#5A5A40]">Expected: {item.recommended_state}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1 bg-white border border-[#DCDCC8] text-[10px] uppercase font-bold rounded-full hover:bg-white/80 text-[#2C2C24] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-[#7A7A6A] hover:text-red-600 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleItemEnabled(item.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                            isEnabled
                              ? 'bg-[#5A5A40] text-white shadow-sm'
                              : 'bg-white border border-[#DCDCC8] text-transparent'
                          }`}
                          title={isEnabled ? 'Enabled' : 'Disabled'}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="p-8 text-center text-[#7A7A6A]">
            <p className="text-sm font-semibold mb-1 text-[#2C2C24]">No items found.</p>
            <p className="text-xs mb-4">You can add your home items manually or rescan your home photos.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-[#5A5A40] text-white rounded-full text-xs font-semibold"
            >
              Add Item
            </button>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-4 bg-white border-t border-[#EBEBE0] flex items-center justify-between gap-3 z-20">
        <button
          type="button"
          onClick={onRescan}
          className="px-3.5 py-2.5 text-xs font-medium text-[#7A7A6A] hover:text-[#2C2C24] transition-colors"
        >
          Rescan Home
        </button>

        <button
          type="button"
          disabled={enabledCount === 0}
          onClick={() => onConfirm(items.filter(i => i.enabled !== false))}
          className="flex-1 py-3 px-5 rounded-2xl bg-[#5A5A40] hover:bg-[#4C4C36] disabled:opacity-50 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <span>Confirm &amp; Create Checklist ({enabledCount})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Edit / Add Item Modal */}
      {(editingItem || isAddingNew) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCDCC8] rounded-[28px] max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-base font-serif font-bold text-[#2C2C24] mb-3">
              {isAddingNew ? 'Add Custom Home Item' : `Edit "${editingItem?.object}"`}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#7A7A6A] uppercase tracking-wider mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={formObject}
                  onChange={e => setFormObject(e.target.value)}
                  placeholder="e.g. Living Room AC, Gas Stove, Bedroom Window"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] focus:outline-none focus:border-[#5A5A40] text-[#2C2C24]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#7A7A6A] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as ItemCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-[#2C2C24]"
                  >
                    <option value="SAFETY">SAFETY</option>
                    <option value="ENERGY">ENERGY</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#7A7A6A] uppercase tracking-wider mb-1">
                    Room / Area
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={e => setFormRoom(e.target.value)}
                    placeholder="Kitchen, Bedroom, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-[#2C2C24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A7A6A] uppercase tracking-wider mb-1">
                  Expected State When Leaving
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                  {['OFF', 'CLOSED', 'LOCKED', 'UNPLUGGED'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormExpectedState(st)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        formExpectedState === st
                          ? 'bg-[#5A5A40] border-[#5A5A40] text-white'
                          : 'bg-white border-[#DCDCC8] text-[#2C2C24]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formExpectedState}
                  onChange={e => setFormExpectedState(e.target.value.toUpperCase())}
                  placeholder="Custom state (e.g. OFF)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#F9F9F4] border border-[#DCDCC8] text-[#2C2C24] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A7A6A] uppercase tracking-wider mb-1">
                  Reason / Concern
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  placeholder="e.g. Prevent accidental gas/fire hazards"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F9F4] border border-[#DCDCC8] text-[#2C2C24]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingNew(false);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-[#7A7A6A] hover:text-[#2C2C24]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4C4C36] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {isAddingNew ? 'Add to Home' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
