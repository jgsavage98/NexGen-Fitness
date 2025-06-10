/**
 * Get today's date in user's timezone as YYYY-MM-DD string
 * @param timezone - User's timezone (optional, defaults to system timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone?: string): string {
  const today = new Date();
  if (timezone) {
    try {
      return today.toLocaleDateString("en-CA", { timeZone: timezone });
    } catch (error) {
      console.warn('Timezone conversion failed, using local time:', error);
    }
  }
  return today.toLocaleDateString("en-CA");
}

/**
 * Get a specific date in user's timezone as YYYY-MM-DD string
 * @param date - The date to convert
 * @param timezone - User's timezone (optional, defaults to system timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateInTimezone(date: Date | string, timezone?: string): string {
  const dateObj = new Date(date);
  if (timezone) {
    try {
      return dateObj.toLocaleDateString("en-CA", { timeZone: timezone });
    } catch (error) {
      console.warn('Timezone conversion failed, using local time:', error);
    }
  }
  return dateObj.toLocaleDateString("en-CA");
}

/**
 * Calculate the number of days since the user started their program
 * @param programStartDate - The date the user started their program
 * @param timezone - User's timezone (optional, defaults to local timezone)
 * @returns The day number of their journey (1-based)
 */
export function calculateJourneyDay(programStartDate: string | Date, timezone?: string): number {
  if (!programStartDate) return 1;

  const todayString = getTodayInTimezone(timezone);
  const startString = getDateInTimezone(programStartDate, timezone);
  
  console.log('Journey day calculation:', {
    programStartDate,
    timezone,
    todayString,
    startString
  });
  
  const today = new Date(todayString);
  const startDate = new Date(startString);
  
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Start date is Day 1, so we add 1 to the difference
  // But if diffDays is 0 (same day), it should be Day 1
  // If diffDays is 1 (next day), it should be Day 2
  const journeyDay = Math.max(1, diffDays + 1);
  
  console.log('Journey day result:', {
    diffTime,
    diffDays,
    journeyDay
  });
  
  return journeyDay;
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