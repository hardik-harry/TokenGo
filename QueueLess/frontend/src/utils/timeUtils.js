export const formatWaitDuration = (minutes) => {
  if (minutes == null || isNaN(minutes)) return '-';
  
  const m = Number(minutes);
  const totalSeconds = Math.round(m * 60);
  
  const h = Math.floor(totalSeconds / 3600);
  const reMins = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h === 0) {
    if (s > 0) {
      return `${reMins} min ${s} sec`;
    }
    return `${reMins} min`;
  }
  
  let result = `${h} hr`;
  if (reMins > 0) {
    result += ` ${reMins} min`;
  }
  if (s > 0) {
    result += ` ${s} sec`;
  }
  
  return result;
};

export const calculateAverageWait = (min, max) => {
  if (min == null || max == null) return 0;
  return Math.round((Number(min) + Number(max)) / 2);
};
