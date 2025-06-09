interface ExerciseThumbnailProps {
  exerciseName: string;
  className?: string;
}

// Exercise thumbnail mapping with SVG icons
const exerciseThumbnails: Record<string, JSX.Element> = {
  "Push-ups": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="10" y="40" width="80" height="20" fill="currentColor" rx="10"/>
      <circle cx="25" cy="25" r="8" fill="currentColor"/>
      <rect x="20" y="33" width="10" height="15" fill="currentColor" rx="5"/>
      <rect x="15" y="60" width="20" height="8" fill="currentColor" rx="4"/>
      <rect x="65" y="60" width="20" height="8" fill="currentColor" rx="4"/>
    </svg>
  ),
  "Squats": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="20" r="10" fill="currentColor"/>
      <rect x="45" y="30" width="10" height="25" fill="currentColor" rx="5"/>
      <rect x="35" y="55" width="30" height="8" fill="currentColor" rx="4"/>
      <rect x="40" y="63" width="8" height="20" fill="currentColor" rx="4"/>
      <rect x="52" y="63" width="8" height="20" fill="currentColor" rx="4"/>
      <rect x="35" y="83" width="15" height="5" fill="currentColor" rx="2"/>
      <rect x="50" y="83" width="15" height="5" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Deadlifts": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="15" r="8" fill="currentColor"/>
      <rect x="47" y="23" width="6" height="35" fill="currentColor" rx="3"/>
      <rect x="20" y="50" width="60" height="6" fill="currentColor" rx="3"/>
      <circle cx="25" r="8" cy="53" fill="currentColor"/>
      <circle cx="75" r="8" cy="53" fill="currentColor"/>
      <rect x="42" y="58" width="7" height="25" fill="currentColor" rx="3"/>
      <rect x="51" y="58" width="7" height="25" fill="currentColor" rx="3"/>
    </svg>
  ),
  "Bench Press": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="15" y="45" width="70" height="10" fill="currentColor" rx="5"/>
      <rect x="25" y="35" width="50" height="6" fill="currentColor" rx="3"/>
      <circle cx="20" cy="48" r="6" fill="currentColor"/>
      <circle cx="80" cy="48" r="6" fill="currentColor"/>
      <rect x="40" y="55" width="20" height="8" fill="currentColor" rx="4"/>
      <rect x="44" y="63" width="5" height="15" fill="currentColor" rx="2"/>
      <rect x="51" y="63" width="5" height="15" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Rows": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="30" cy="25" r="8" fill="currentColor"/>
      <rect x="25" y="33" width="10" height="20" fill="currentColor" rx="5"/>
      <rect x="35" y="38" width="25" height="6" fill="currentColor" rx="3"/>
      <circle cx="65" cy="41" r="5" fill="currentColor"/>
      <rect x="20" y="53" width="8" height="20" fill="currentColor" rx="4"/>
      <rect x="32" y="53" width="8" height="20" fill="currentColor" rx="4"/>
      <rect x="15" y="73" width="13" height="5" fill="currentColor" rx="2"/>
      <rect x="32" y="73" width="13" height="5" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Lunges": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="45" cy="15" r="8" fill="currentColor"/>
      <rect x="42" y="23" width="6" height="25" fill="currentColor" rx="3"/>
      <rect x="35" y="48" width="8" height="25" fill="currentColor" rx="4"/>
      <rect x="52" y="55" width="8" height="18" fill="currentColor" rx="4"/>
      <rect x="30" y="73" width="15" height="5" fill="currentColor" rx="2"/>
      <rect x="50" y="73" width="15" height="5" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Plank": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="20" cy="25" r="7" fill="currentColor"/>
      <rect x="15" y="32" width="70" height="8" fill="currentColor" rx="4"/>
      <rect x="10" y="40" width="8" height="15" fill="currentColor" rx="4"/>
      <rect x="82" y="40" width="8" height="15" fill="currentColor" rx="4"/>
      <rect x="5" y="55" width="13" height="5" fill="currentColor" rx="2"/>
      <rect x="82" y="55" width="13" height="5" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Pull-ups": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="20" y="10" width="60" height="6" fill="currentColor" rx="3"/>
      <circle cx="50" cy="25" r="8" fill="currentColor"/>
      <rect x="47" y="33" width="6" height="20" fill="currentColor" rx="3"/>
      <rect x="35" y="38" width="12" height="6" fill="currentColor" rx="3"/>
      <rect x="53" y="38" width="12" height="6" fill="currentColor" rx="3"/>
      <rect x="44" y="53" width="5" height="20" fill="currentColor" rx="2"/>
      <rect x="51" y="53" width="5" height="20" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Burpees": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="15" r="7" fill="currentColor"/>
      <rect x="47" y="22" width="6" height="15" fill="currentColor" rx="3"/>
      <rect x="30" y="32" width="40" height="6" fill="currentColor" rx="3"/>
      <rect x="44" y="38" width="5" height="15" fill="currentColor" rx="2"/>
      <rect x="51" y="38" width="5" height="15" fill="currentColor" rx="2"/>
      <circle cx="35" cy="60" r="4" fill="currentColor"/>
      <circle cx="65" cy="60" r="4" fill="currentColor"/>
      <rect x="30" y="64" width="10" height="4" fill="currentColor" rx="2"/>
      <rect x="60" y="64" width="10" height="4" fill="currentColor" rx="2"/>
    </svg>
  ),
  "Mountain Climbers": (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="25" cy="20" r="7" fill="currentColor"/>
      <rect x="22" y="27" width="6" height="15" fill="currentColor" rx="3"/>
      <rect x="15" y="42" width="8" height="3" fill="currentColor" rx="1"/>
      <rect x="32" y="42" width="8" height="3" fill="currentColor" rx="1"/>
      <rect x="28" y="45" width="25" height="6" fill="currentColor" rx="3"/>
      <rect x="20" y="51" width="8" height="15" fill="currentColor" rx="4"/>
      <rect x="45" y="60" width="8" height="15" fill="currentColor" rx="4"/>
    </svg>
  )
};

const getExerciseThumbnail = (exerciseName: string): JSX.Element => {
  // For core/ab exercises, use the animated GIF directly
  const lowercaseName = exerciseName.toLowerCase();
  const coreExercises = ['crunch', 'plank', 'abs', 'core', 'sit-up', 'twist'];
  const isCore = coreExercises.some(exercise => lowercaseName.includes(exercise));
  
  if (isCore) {
    return (
      <img
        src="/attached_assets/twisting-crunch_1749432251767.gif"
        alt={exerciseName}
        className="w-full h-full object-cover rounded"
      />
    );
  }
  
  // Try exact match first
  if (exerciseThumbnails[exerciseName]) {
    return exerciseThumbnails[exerciseName];
  }
  
  // Try partial matching for variations
  for (const [key, thumbnail] of Object.entries(exerciseThumbnails)) {
    if (lowercaseName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowercaseName)) {
      return thumbnail;
    }
  }
  
  // Default dumbbell icon fallback
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="20" y="40" width="60" height="20" fill="currentColor" rx="10"/>
      <circle cx="15" cy="50" r="12" fill="currentColor"/>
      <circle cx="85" cy="50" r="12" fill="currentColor"/>
      <rect x="35" y="45" width="30" height="10" fill="currentColor" rx="5"/>
    </svg>
  );
};

export default function ExerciseThumbnail({ exerciseName, className = "w-12 h-12" }: ExerciseThumbnailProps) {
  const lowercaseName = exerciseName.toLowerCase();
  const coreExercises = ['crunch', 'plank', 'abs', 'core', 'sit-up', 'twist'];
  const isCore = coreExercises.some(exercise => lowercaseName.includes(exercise));
  
  // For core exercises, show the GIF prominently
  if (isCore) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 overflow-hidden`}>
        <img
          src="/attached_assets/twisting-crunch_1749432251767.gif?v=2"
          alt={exerciseName}
          className="w-full h-full object-cover rounded"
        />
      </div>
    );
  }
  
  return (
    <div className={`${className} rounded-lg flex items-center justify-center text-white flex-shrink-0 relative overflow-hidden`}>
      {/* Animated GIF as main background */}
      <img
        src="/attached_assets/twisting-crunch_1749432251767.gif?v=3"
        alt="Exercise motion"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Exercise-specific icon overlay */}
      <div className="relative z-10 w-8 h-8">
        {getExerciseThumbnail(exerciseName)}
      </div>
    </div>
  );
}