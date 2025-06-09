/**
 * Calculate the number of days since the user started their program
 * @param programStartDate - The date the user started their program
 * @param timezone - User's timezone (optional, defaults to local timezone)
 * @returns The day number of their journey (1-based)
 */
export function calculateJourneyDay(programStartDate: string | Date, timezone?: string): number {
  if (!programStartDate) return 1;

  const startDate = new Date(programStartDate);
  const now = new Date();
  
  // If timezone is provided, adjust for user's timezone
  if (timezone) {
    try {
      const userNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const userStart = new Date(startDate.toLocaleString("en-US", { timeZone: timezone }));
      
      // Calculate days difference
      const diffTime = userNow.getTime() - userStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return Math.max(1, diffDays + 1); // +1 because day 1 is the start date
    } catch (error) {
      console.warn('Timezone calculation failed, using local time:', error);
    }
  }
  
  // Fallback to local timezone calculation
  const diffTime = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays + 1);
}

/**
 * Format the journey day for display
 * @param programStartDate - The date the user started their program
 * @param timezone - User's timezone (optional)
 * @returns Formatted string like "Day 5 of Your Journey"
 */
export function formatJourneyDay(programStartDate: string | Date, timezone?: string): string {
  const dayNumber = calculateJourneyDay(programStartDate, timezone);
  return `Day ${dayNumber} of Your Journey`;
}

/**
 * Check if the user's program has started
 * @param programStartDate - The date the user started their program
 * @returns True if program has started, false otherwise
 */
export function hasProgramStarted(programStartDate: string | Date | null): boolean {
  return programStartDate !== null && programStartDate !== undefined;
}