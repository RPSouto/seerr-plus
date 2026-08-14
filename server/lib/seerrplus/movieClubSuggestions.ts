export const getMovieClubWeekKey = (date = new Date()) => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - (day === 0 ? 6 : day - 1));
  return start.toISOString().slice(0, 10);
};
