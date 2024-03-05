import dayjs from 'dayjs';

const today = dayjs();

export const presetDateRange = [
  {
    label: 'This month',
    value: [
      today.startOf('month').format('YYYY-MM-DD'),
      today.endOf('month').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'This year',
    value: [
      today.startOf('year').format('YYYY-MM-DD'),
      today.endOf('year').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past month',
    value: [
      today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past year',
    value: [
      today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
      today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past 30 days',
    value: [
      today.subtract(30, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },

  {
    label: 'Past 60 days',
    value: [
      today.subtract(60, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },

  {
    label: 'Past 90 days',
    value: [
      today.subtract(90, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },

  {
    label: 'Past 365 days',
    value: [
      today.subtract(365, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },
] as const;
