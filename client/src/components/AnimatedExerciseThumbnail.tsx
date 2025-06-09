interface AnimatedExerciseThumbnailProps {
  exerciseName: string;
  className?: string;
}

export default function AnimatedExerciseThumbnail({ exerciseName, className = "w-12 h-12" }: AnimatedExerciseThumbnailProps) {
  return (
    <div className={`${className} rounded-lg overflow-hidden relative border-2 border-primary-500/50`}>
      {/* Animated GIF background */}
      <img
        src="/attached_assets/twisting-crunch_1749432251767.gif"
        alt={`${exerciseName} animation`}
        className="w-full h-full object-cover"
      />
      
      {/* Exercise name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
        <div className="text-white text-xs font-semibold text-center truncate">
          {exerciseName.split(' ')[0]}
        </div>
      </div>
    </div>
  );
}