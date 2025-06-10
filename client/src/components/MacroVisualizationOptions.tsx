import { useState } from "react";

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

interface MacroVisualizationOptionsProps {
  summary: MacroSummary;
}

export default function MacroVisualizationOptions({ summary }: MacroVisualizationOptionsProps) {
  const [selectedType, setSelectedType] = useState<'bars' | 'gauges' | 'stacked' | 'thermometer'>('bars');

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

  // Option 1: Segmented Progress Bars (current approach but improved)
  const SegmentedBars = () => (
    <div className="space-y-4">
      {['protein', 'carbs', 'fat'].map((macro) => {
        const percentage = summary.percentages[macro as keyof typeof summary.percentages];
        const consumed = summary.consumed[macro as keyof typeof summary.consumed];
        const target = summary.targets[macro as keyof typeof summary.targets];
        
        return (
          <div key={macro} className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300 capitalize">{macro}</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${getTextColor(percentage)}`}>
                  {Math.round(percentage)}%
                </span>
                <span className="text-xs text-gray-400">
                  {Math.round(consumed)}g / {Math.round(target)}g
                </span>
              </div>
            </div>
            
            <div className="relative w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              {/* Target section (0-100%) */}
              <div 
                className={`h-full rounded-l-full transition-all duration-1000 ${getBarColor(percentage)}`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
              
              {/* Overflow section (100%+) with different pattern */}
              {percentage > 100 && (
                <div 
                  className="absolute top-0 right-0 h-full bg-red-500 opacity-80"
                  style={{ 
                    width: `${Math.min(50, (percentage - 100) / 2)}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                  }}
                />
              )}
              
              {/* 100% marker */}
              {percentage < 150 && (
                <div className="absolute left-2/3 top-0 w-0.5 h-full bg-white opacity-60"></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Option 2: Circular Gauges
  const CircularGauges = () => (
    <div className="grid grid-cols-2 gap-4">
      {['protein', 'carbs', 'fat', 'calories'].map((macro) => {
        const percentage = summary.percentages[macro as keyof typeof summary.percentages];
        const consumed = summary.consumed[macro as keyof typeof summary.consumed];
        const target = summary.targets[macro as keyof typeof summary.targets];
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;
        
        return (
          <div key={macro} className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-gray-700"
                />
                
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={percentage > 100 ? "text-red-500" : percentage >= 90 ? "text-green-500" : percentage >= 70 ? "text-yellow-500" : "text-blue-500"}
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
                
                {/* Overflow indicator */}
                {percentage > 100 && (
                  <circle
                    cx="40"
                    cy="40"
                    r={radius + 3}
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray="4 4"
                    className="text-red-400 opacity-60"
                  />
                )}
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${getTextColor(percentage)}`}>
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
            
            <div className="text-center mt-2">
              <div className="text-xs font-medium text-gray-300 capitalize">{macro}</div>
              <div className="text-xs text-gray-400">
                {Math.round(consumed)}{macro === 'calories' ? '' : 'g'} / {Math.round(target)}{macro === 'calories' ? '' : 'g'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Option 3: Thermometer Style
  const ThermometerBars = () => (
    <div className="grid grid-cols-2 gap-6">
      {['protein', 'carbs', 'fat', 'calories'].map((macro) => {
        const percentage = summary.percentages[macro as keyof typeof summary.percentages];
        const consumed = summary.consumed[macro as keyof typeof summary.consumed];
        const target = summary.targets[macro as keyof typeof summary.targets];
        
        return (
          <div key={macro} className="flex flex-col items-center">
            <div className="text-xs font-medium text-gray-300 capitalize mb-2">{macro}</div>
            
            {/* Thermometer container */}
            <div className="relative w-6 h-32 bg-gray-700 rounded-full overflow-hidden">
              {/* Normal fill (0-100%) */}
              <div 
                className={`absolute bottom-0 w-full transition-all duration-1000 rounded-full ${getBarColor(percentage)}`}
                style={{ height: `${Math.min(100, percentage)}%` }}
              />
              
              {/* Overflow section with pulsing effect */}
              {percentage > 100 && (
                <div 
                  className="absolute top-0 w-full bg-red-500 rounded-full animate-pulse"
                  style={{ height: `${Math.min(50, (percentage - 100) / 2)}%` }}
                />
              )}
              
              {/* Target line */}
              <div className="absolute bottom-0 w-full h-0.5 bg-white opacity-60" style={{ bottom: '100%' }}></div>
            </div>
            
            <div className="text-center mt-2">
              <div className={`text-xs font-bold ${getTextColor(percentage)}`}>
                {Math.round(percentage)}%
              </div>
              <div className="text-xs text-gray-400">
                {Math.round(consumed)}{macro === 'calories' ? '' : 'g'} / {Math.round(target)}{macro === 'calories' ? '' : 'g'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Option 4: Stacked Target vs Actual
  const StackedBars = () => (
    <div className="space-y-4">
      {['protein', 'carbs', 'fat', 'calories'].map((macro) => {
        const percentage = summary.percentages[macro as keyof typeof summary.percentages];
        const consumed = summary.consumed[macro as keyof typeof summary.consumed];
        const target = summary.targets[macro as keyof typeof summary.targets];
        
        return (
          <div key={macro} className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300 capitalize">{macro}</span>
              <span className={`text-sm font-bold ${getTextColor(percentage)}`}>
                {Math.round(percentage)}%
              </span>
            </div>
            
            {/* Target bar (background) */}
            <div className="relative w-full bg-gray-600 rounded-full h-6 mb-1">
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white">
                Target: {Math.round(target)}{macro === 'calories' ? '' : 'g'}
              </div>
            </div>
            
            {/* Actual bar */}
            <div className="relative w-full bg-gray-700 rounded-full h-4">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${getBarColor(percentage)}`}
                style={{ width: `${Math.min(100, (consumed / target) * 100)}%` }}
              >
                {consumed > target && (
                  <div className="absolute right-0 top-0 h-full w-2 bg-red-500 rounded-r-full"></div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white">
                Actual: {Math.round(consumed)}{macro === 'calories' ? '' : 'g'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedType('bars')}
          className={`px-3 py-1 text-xs rounded ${selectedType === 'bars' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Segmented Bars
        </button>
        <button
          onClick={() => setSelectedType('gauges')}
          className={`px-3 py-1 text-xs rounded ${selectedType === 'gauges' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Circular Gauges
        </button>
        <button
          onClick={() => setSelectedType('thermometer')}
          className={`px-3 py-1 text-xs rounded ${selectedType === 'thermometer' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Thermometer
        </button>
        <button
          onClick={() => setSelectedType('stacked')}
          className={`px-3 py-1 text-xs rounded ${selectedType === 'stacked' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Target vs Actual
        </button>
      </div>

      {selectedType === 'bars' && <SegmentedBars />}
      {selectedType === 'gauges' && <CircularGauges />}
      {selectedType === 'thermometer' && <ThermometerBars />}
      {selectedType === 'stacked' && <StackedBars />}
    </div>
  );
}