export function getCurrentPeriod(): { month: number; year: number } {
  const d = new Date();
  return {
    month: d.getMonth() + 1, // 1-12
    year: d.getFullYear(),
  };
}

export function formatPeriod(month: number, year: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[month - 1]} ${year}`;
}

export function getPreviousPeriods(n: number): { month: number; year: number }[] {
  const periods: { month: number; year: number }[] = [];
  const d = new Date();
  let currentMonth = d.getMonth() + 1;
  let currentYear = d.getFullYear();

  for (let i = 0; i < n; i++) {
    periods.push({ month: currentMonth, year: currentYear });
    currentMonth--;
    if (currentMonth === 0) {
      currentMonth = 12;
      currentYear--;
    }
  }
  return periods;
}

export function isCurrentMonth(month: number, year: number): boolean {
  const current = getCurrentPeriod();
  return current.month === month && current.year === year;
}
