/**
 * Utility functions for date handling in Argentina timezone
 */

/**
 * Gets the current date in Argentina timezone formatted as YYYY-MM-DD
 * This ensures the date is correct regardless of the device's timezone
 * Argentina is UTC-3 (no daylight saving time since 2009)
 */
export function getArgentinaDateString(date?: Date): string {
    const d = date || new Date();
    
    // Get UTC time in milliseconds
    const utcTime = d.getTime();
    
    // Argentina is UTC-3 (3 hours behind UTC)
    // To convert UTC to Argentina time, we need to subtract 3 hours
    const argentinaOffsetMs = -3 * 60 * 60 * 1000; // -3 hours in milliseconds
    const argentinaTimeMs = utcTime + argentinaOffsetMs;
    
    // Create a date object representing Argentina time
    const argentinaDate = new Date(argentinaTimeMs);
    
    // Get date components using UTC methods to get the correct date
    const year = argentinaDate.getUTCFullYear();
    const month = String(argentinaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(argentinaDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Gets yesterday's date in Argentina timezone formatted as YYYY-MM-DD
 */
export function getYesterdayArgentinaDateString(): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return getArgentinaDateString(yesterday);
}

/**
 * Formats a date string (YYYY-MM-DD) to a Date object in Argentina timezone
 */
export function parseArgentinaDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in Argentina timezone
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Use noon UTC to avoid timezone issues
}

/**
 * Gets the current date object adjusted for Argentina timezone
 */
export function getArgentinaDate(): Date {
    const now = new Date();
    const argentinaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    return argentinaDate;
}

