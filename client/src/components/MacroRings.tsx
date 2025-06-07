import { useEffect, useState } from "react";
import { MacroSummary } from "@/lib/types";

interface MacroRingsProps {
  summary: MacroSummary;
}

export default function MacroRings({ summary }: MacroRingsProps) {
  const [animatedPercentages, setAnimatedPercentages] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useEffect(() => {
    // Animate the progress rings on mount
    const timer = setTimeout(() => {
      setAnimatedPercentages({
        protein: Math.min(100, summary.percentages.protein),
        carbs: Math.min(100, summary.percentages.carbs),
        fat: Math.min(100, summary.percentages.fat),
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [summary.percentages]);

  const createProgressRing = (percentage: number, color: string) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return {
      circumference,
      strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset,
      color,
    };
  };

  const proteinRing = createProgressRing(animatedPercentages.protein, "#4CAF50");
  const carbsRing = createProgressRing(animatedPercentages.carbs, "#FF9800");
  const fatRing = createProgressRing(animatedPercentages.fat, "#0F63FF");

  const formatMacroValue = (value: number, unit: string = 'g') => {
    return `${Math.round(value)}${unit}`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "text-success";
    if (percentage >= 70) return "text-warning";
    return "text-gray-400";
  };

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Protein Ring */}
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-2">
          <svg className="w-16 h-16 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#374151"
              strokeWidth="4"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={proteinRing.color}
              strokeWidth="4"
              fill="none"
              strokeDasharray={proteinRing.circumference}
              strokeDashoffset={proteinRing.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${getProgressColor(summary.percentages.protein)}`}>
              {Math.round(animatedPercentages.protein)}%
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mb-1">Protein</div>
        <div className="text-sm font-semibold text-white">
          {formatMacroValue(summary.consumed.protein)}
        </div>
        <div className="text-xs text-gray-500">
          / {formatMacroValue(summary.targets.protein)}
        </div>
      </div>

      {/* Carbs Ring */}
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-2">
          <svg className="w-16 h-16 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#374151"
              strokeWidth="4"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={carbsRing.color}
              strokeWidth="4"
              fill="none"
              strokeDasharray={carbsRing.circumference}
              strokeDashoffset={carbsRing.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ transitionDelay: "200ms" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${getProgressColor(summary.percentages.carbs)}`}>
              {Math.round(animatedPercentages.carbs)}%
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mb-1">Carbs</div>
        <div className="text-sm font-semibold text-white">
          {formatMacroValue(summary.consumed.carbs)}
        </div>
        <div className="text-xs text-gray-500">
          / {formatMacroValue(summary.targets.carbs)}
        </div>
      </div>

      {/* Fat Ring */}
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-2">
          <svg className="w-16 h-16 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#374151"
              strokeWidth="4"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={fatRing.color}
              strokeWidth="4"
              fill="none"
              strokeDasharray={fatRing.circumference}
              strokeDashoffset={fatRing.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ transitionDelay: "400ms" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${getProgressColor(summary.percentages.fat)}`}>
              {Math.round(animatedPercentages.fat)}%
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mb-1">Fat</div>
        <div className="text-sm font-semibold text-white">
          {formatMacroValue(summary.consumed.fat)}
        </div>
        <div className="text-xs text-gray-500">
          / {formatMacroValue(summary.targets.fat)}
        </div>
      </div>
    </div>
  );
}
