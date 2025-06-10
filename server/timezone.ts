/**
 * Server-side timezone utilities for consistent date handling
 */

/**
 * Get today's date in user's timezone as YYYY-MM-DD string
 * @param timezone - User's timezone (optional, defaults to UTC)
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone?: string): string {
  const today = new Date();
  if (timezone) {
    try {
      return today.toLocaleDateString("en-CA", { timeZone: timezone });
    } catch (error) {
      console.warn('Timezone conversion failed, using UTC:', error);
    }
  }
  return today.toISOString().split('T')[0];
}

/**
 * Get a specific date in user's timezone as YYYY-MM-DD string
 * @param date - The date to convert
 * @param timezone - User's timezone (optional, defaults to UTC)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateInTimezone(date: Date | string, timezone?: string): string {
  const dateObj = new Date(date);
  if (timezone) {
    try {
      return dateObj.toLocaleDateString("en-CA", { timeZone: timezone });
    } catch (error) {
      console.warn('Timezone conversion failed, using UTC:', error);
    }
  }
  return dateObj.toISOString().split('T')[0];
}

/**
 * Get the start and end of a month in user's timezone
 * @param year - Year
 * @param month - Month (1-12)
 * @param timezone - User's timezone (optional, defaults to UTC)
 * @returns Object with firstDay and lastDay as YYYY-MM-DD strings
 */
export function getMonthBoundsInTimezone(year: number, month: number, timezone?: string): { firstDay: string, lastDay: string } {
  if (timezone) {
    try {
      // Create dates in the user's timezone
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      return {
        firstDay: getDateInTimezone(firstDay, timezone),
        lastDay: getDateInTimezone(lastDay, timezone)
      };
    } catch (error) {
      console.warn('Timezone conversion failed, using UTC:', error);
    }
  }
  
  // Fallback to UTC
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  return {
    firstDay: firstDay.toISOString().split('T')[0],
    lastDay: lastDay.toISOString().split('T')[0]
  };
}