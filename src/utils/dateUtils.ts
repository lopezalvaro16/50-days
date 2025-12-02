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

/**
 * Calculates the number of calendar days between two dates in Argentina timezone
 * This ensures that the day count is based on calendar days, not 24-hour periods
 * @param startDate The start date
 * @param endDate Optional end date (defaults to today)
 * @returns The number of calendar days (inclusive, so day 1 is the start date)
 */
export function getCalendarDaysSince(startDate: Date, endDate?: Date): number {
    console.log('🗓️ [DATEUTILS] getCalendarDaysSince - Iniciando cálculo:');
    console.log('  - startDate recibido:', startDate);
    console.log('  - startDate tipo:', typeof startDate);
    console.log('  - startDate es Date?', startDate instanceof Date);
    console.log('  - startDate ISO:', startDate?.toISOString?.());
    console.log('  - endDate recibido:', endDate || 'undefined (usará hoy)');
    
    const start = getArgentinaDateString(startDate);
    const end = getArgentinaDateString(endDate);
    
    console.log('  - Fecha Argentina de inicio (string):', start);
    console.log('  - Fecha Argentina de fin (string):', end);
    
    // Parse dates to compare year, month, day
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);
    
    console.log('  - startYear:', startYear, 'startMonth:', startMonth, 'startDay:', startDay);
    console.log('  - endYear:', endYear, 'endMonth:', endMonth, 'endDay:', endDay);
    
    // Create dates at noon to avoid timezone issues
    const startDateObj = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
    const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));
    
    console.log('  - startDateObj UTC (ISO):', startDateObj.toISOString());
    console.log('  - endDateObj UTC (ISO):', endDateObj.toISOString());
    console.log('  - startDateObj timestamp:', startDateObj.getTime());
    console.log('  - endDateObj timestamp:', endDateObj.getTime());
    
    // Calculate difference in milliseconds
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    
    console.log('  - Diferencia en milisegundos:', diffTime);
    console.log('  - Diferencia en días (sin redondeo):', diffTime / (1000 * 60 * 60 * 24));
    
    // Convert to days and add 1 to make it inclusive (day 1 is the start date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    console.log('  - Días calculados (con +1 inclusivo):', diffDays);
    
    const result = Math.max(1, diffDays); // Always return at least 1
    console.log('  - Resultado final (mínimo 1):', result);
    
    return result;
}

