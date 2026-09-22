import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  selectedEmoji,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const emojiCategories = [
    {
      name: 'Comida',
      emojis: ['🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍝', '🍜', '🍱', '🍛', '🍲', '🥘', '🍳', '🥞', '🧇', '🥓'],
    },
    {
      name: 'Bebidas',
      emojis: ['☕', '🍺', '🍷', '🥤', '🧃', '🧋', '🍹', '🍸', '🥃', '🍾', '🧉', '🍶', '🫖', '🥛'],
    },
    {
      name: 'Postres',
      emojis: ['🍰', '🎂', '🧁', '🍪', '🍩', '🍨', '🍦', '🍫', '🍬', '🍭', '🍮', '🍯'],
    },
    {
      name: 'Frutas y Verduras',
      emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥝', '🍅', '🥒', '🥕', '🌽', '🥦', '🥬'],
    },
    {
      name: 'Tecnología',
      emojis: ['💻', '📱', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📀', '🎧', '🎮', '📷', '📹', '🎥'],
    },
    {
      name: 'Herramientas',
      emojis: ['🔧', '🔨', '⚙️', '🛠️', '⚡', '🔌', '💡', '🔦', '🪛', '🪚'],
    },
    {
      name: 'Hogar',
      emojis: ['🏠', '🪑', '🛋️', '🛏️', '🚪', '🪟', '🧺', '🧹', '🧽', '🪣', '🔑'],
    },
    {
      name: 'Ropa',
      emojis: ['👕', '👔', '👗', '👘', '👚', '👖', '🧥', '🧦', '👞', '👟', '👠', '👡', '🎒', '👜'],
    },
    {
      name: 'Otros',
      emojis: ['📦', '📁', '🗂️', '📋', '📊', '📈', '📉', '🎯', '⭐', '✨', '🔥', '💰', '💳', '🛒'],
    },
  ];

  const filteredCategories = searchTerm
    ? emojiCategories
        .map((cat) => ({
          ...cat,
          emojis: cat.emojis.filter((emoji) => emoji.includes(searchTerm)),
        }))
        .filter((cat) => cat.emojis.length > 0)
    : emojiCategories;

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
        />
      </div>

      {/* Emoji seleccionado */}
      <div className="flex items-center gap-3 p-3 bg-brand-500/10 rounded-lg border border-brand-500/20">
        <span className="text-3xl">{selectedEmoji || '❓'}</span>
        <div>
          <p className="text-sm font-medium text-white">Emoji seleccionado</p>
          <p className="text-xs text-gray-400">
            {selectedEmoji ? 'Click en otro para cambiar' : 'Selecciona un emoji'}
          </p>
        </div>
      </div>

      {/* Grid de emojis */}
      <div className="max-h-64 overflow-y-auto border border-white/10 rounded-lg p-3 space-y-3">
        {filteredCategories.map((category) => (
          <div key={category.name}>
            <p className="text-xs font-semibold text-gray-400 mb-2">
              {category.name}
            </p>
            <div className="grid grid-cols-8 gap-1">
              {category.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className={`
                    text-2xl p-2 rounded hover:bg-white/10 transition-colors
                    ${selectedEmoji === emoji ? 'bg-brand-500/20 ring-2 ring-brand-500' : ''}
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
