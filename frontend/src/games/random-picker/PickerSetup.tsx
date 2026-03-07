import { useState } from "react";
import { MIN_ITEMS, MAX_ITEMS, ROULETTE_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";

interface PickerSetupProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
  onStart: () => void;
}

export default function PickerSetup({
  items,
  onItemsChange,
  onStart,
}: PickerSetupProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [newItem, setNewItem] = useState("");

  const canAdd = items.length < MAX_ITEMS && newItem.trim() !== "";
  const isValid = items.length >= MIN_ITEMS;

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.length >= MAX_ITEMS) return;
    onItemsChange([...items, trimmed]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#00f0ff]/50 focus:ring-[#00f0ff]/20"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-200";

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4 w-full max-w-md mx-auto">
      <h1 className="font-display text-4xl font-bold tracking-wider">
        <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
          랜덤 뽑기
        </span>
      </h1>
      <p className="text-[#8892a4] text-center max-w-md">
        항목을 추가하고 룰렛을 돌려 결과를 뽑아보세요!
      </p>

      {/* Add item input */}
      <div className="flex gap-2 w-full">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="항목 입력 (Enter로 추가)"
          className={`flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
        />
        <button
          onClick={addItem}
          disabled={!canAdd}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 border
            ${
              canAdd
                ? isDark
                  ? "border-[#00f0ff]/40 bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30"
                  : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                : "opacity-30 cursor-not-allowed border-transparent"
            }`}
        >
          추가
        </button>
      </div>

      {/* Item list */}
      <div className="flex flex-col gap-2 w-full">
        {items.length === 0 && (
          <p className="text-center text-sm text-[#8892a4] py-4">
            항목을 2개 이상 추가해주세요
          </p>
        )}
        {items.map((item, i) => {
          const color = ROULETTE_COLORS[i % ROULETTE_COLORS.length];
          return (
            <div
              key={`${i}-${item}`}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all
                ${
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium">{item}</span>
              </div>
              <button
                onClick={() => removeItem(i)}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all
                  ${
                    isDark
                      ? "hover:bg-red-500/20 text-[#8892a4] hover:text-red-400"
                      : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                  }`}
              >
                x
              </button>
            </div>
          );
        })}
      </div>

      {/* Item count */}
      {items.length > 0 && (
        <p className="text-xs text-[#8892a4]">
          {items.length}개 항목 {items.length < MIN_ITEMS && `(최소 ${MIN_ITEMS}개 필요)`}
        </p>
      )}

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={!isValid}
        className={`px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
                   bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                   text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                   hover:shadow-cyan-500/50 hover:scale-105
                   transition-all duration-300 active:scale-95
                   ${!isValid ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        룰렛 시작
      </button>
    </div>
  );
}
