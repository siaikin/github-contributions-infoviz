type Duration = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
};

type Options = {
  leading?: boolean;
  ms?: boolean;
};

function parseMs(ms: number): Duration {
  return {
    days: Math.trunc(ms / 86400000),
    hours: Math.trunc(ms / 3600000) % 24,
    minutes: Math.trunc(ms / 60000) % 60,
    seconds: Math.trunc(ms / 1000) % 60,
    ms: Math.trunc(ms) % 1000,
  };
}

function addZero(value: number, digits = 2): string {
  let str = value.toString();
  let size = 0;

  size = digits - str.length + 1;
  str = new Array(size).join('0').concat(str);

  return str;
}

function getSign(duration: number, showMs: boolean): string {
  if (showMs) return duration < 0 ? '-' : '';
  return duration <= -1000 ? '-' : '';
}

function formatDuration(ms: number, options?: Options): string {
  const leading = options?.leading ?? false;
  const showMs = options?.ms ?? false;
  const unsignedMs = ms < 0 ? -ms : ms;
  const sign = getSign(ms, showMs);
  const t = parseMs(unsignedMs);
  const seconds = addZero(t.seconds);
  let output = '';

  if (t.days && !output)
    output =
      sign +
      t.days +
      ':' +
      addZero(t.hours) +
      ':' +
      addZero(t.minutes) +
      ':' +
      seconds;
  if (t.hours && !output)
    output =
      sign +
      (leading ? addZero(t.hours) : t.hours) +
      ':' +
      addZero(t.minutes) +
      ':' +
      seconds;
  if (!output)
    output = sign + (leading ? addZero(t.minutes) : t.minutes) + ':' + seconds;

  if (showMs) output += '.' + addZero(t.ms, 3);
  return output;
}

export { formatDuration };
