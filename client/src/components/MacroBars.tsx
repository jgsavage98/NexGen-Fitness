import { useState, useEffect } from "react";

interface MacroSummary {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  percentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MacroBarsProps {
  summary: MacroSummary;
}

export default function MacroBars({ summary }: MacroBarsProps) {
  const [animatedPercentages, setAnimatedPercentages] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentages({
        protein: summary.percentages.protein,
        carbs: summary.percentages.carbs,
        fat: summary.percentages.fat,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [summary.percentages]);

  const formatMacroValue = (value: number, unit: string = 'g') => {
    return `${Math.round(value)}${unit}`;
  };

  const getBarColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getTextColor = (percentage: number) => {
    if (percentage > 100) return "text-red-400";
    if (percentage >= 90) return "text-green-400";
    if (percentage >= 70) return "text-yellow-400";
    return "text-blue-400";
  };

  const MacroBar = ({ 
    name, 
    percentage, 
    animatedPercentage, 
    consumed, 
    target, 
    color 
  }: { 
    name: string; 
    percentage: number; 
    animatedPercentage: number; 
    consumed: number; 
    target: number; 
    color: string;
  }) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">{name}</span>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-bold ${getTextColor(percentage)}`}>
            {Math.round(percentage)}%
          </span>
          <span className="text-xs text-gray-400">
            {formatMacroValue(consumed)} / {formatMacroValue(target)}
          </span>
        </div>
      </div>
      
      <div className="relative w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        {/* Progress bar */}
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(percentage)}`}
          style={{ 
            width: `${Math.min(100, animatedPercentage)}%`,
            // Show gradient when over 100%
            ...(percentage > 100 && {
              width: '100%',
              background: `linear-gradient(90deg, ${getBarColor(percentage)} 0%, #ef4444 100%)`,
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
            })
          }}
        />
        
        {/* 100% marker line - only show if under 100% */}
        {percentage < 100 && (
          <div className="absolute right-0 top-0 w-0.5 h-full bg-gray-400 opacity-50"></div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mb-6">
      <MacroBar
        name="Protein"
        percentage={summary.percentages.protein}
        animatedPercentage={animatedPercentages.protein}
        consumed={summary.consumed.protein}
        target={summary.targets.protein}
        color="#10b981"
      />
      
      <MacroBar
        name="Carbs"
        percentage={summary.percentages.carbs}
        animatedPercentage={animatedPercentages.carbs}
        consumed={summary.consumed.carbs}
        target={summary.targets.carbs}
        color="#f59e0b"
      />
      
      <MacroBar
        name="Fat"
        percentage={summary.percentages.fat}
        animatedPercentage={animatedPercentages.fat}
        consumed={summary.consumed.fat}
        target={summary.targets.fat}
        color="#3b82f6"
      />
    </div>
  );
}