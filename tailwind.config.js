module.exports = {
  content: [
    './src/**/*.ts',
    './src/**/*.tsx',
  ],
  theme: {
    screens: {
      mb: {
        max: `${960 - 1}px`,
      },
      xs: {
        max: '375px',
      },
      pc: {
        min: '960px',
      },
      ...Object.fromEntries(
        [960, 1100, 1240].reverse().map(
          (v) => [`s${v}`, {
            max: `${v - 1}px`,
          }],
        ),
      ),
    },
    extend: {
      colors: {
        'rum-orange': '#ff931e',
        'link': '#0080ff',
        'link-soft': '#98bfff',
        'soft-blue': '#50a8ff',
        'dark-blue': '#576d91',
        'cyan-blue': '#5fc0e9',
        'blue-gray': '#adbaca',
        'gray': {
          'f9': '#f9f9f9',
          'f7': '#f7f7f7',
          'f2': '#f2f2f2',
          'ec': '#ececec',
          'e8': '#e8e8e8',
          'e2': '#e2e2e2',
          'e0': '#e0e0e0',
          'd8': '#d8d8d8',
          'd1': '#d1d1d1',
          'bf': '#bfbfbf',
          'bd': '#bdbdbd',
          'b0': '#b0b0b0',
          'af': '#afafaf',
          'a7': '#a7a7a7',
          '9c': '#9c9c9c',
          '9b': '#9b9b9b',
          '99': '#999999',
          '88': '#888888',
          '83': '#838383',
          '80': '#808080',
          '7b': '#7b7b7b',
          '70': '#707070',
          '6d': '#6d6d6d',
          '55': '#555555',
          '4a': '#4a4a4a',
          '3a': '#3a3a3a',
          '37': '#373737',
          '1e': '#1e1e1e',
          '1a': '#1a1a1a',
          '1b': '#1b1b1b',
          '0c': '#0c0c0c',
        },
      },
      boxShadow: {
        '0': '0px 0px 0px 0px rgba(0,0,0,.2),0px 0px 0px 0px rgba(0,0,0,.14),0px 0px 0px 0px rgba(0,0,0,.12)',
        '1': '0px 2px 1px -1px rgba(0,0,0,.2),0px 1px 1px 0px rgba(0,0,0,.14),0px 1px 3px 0px rgba(0,0,0,.12)',
        '2': '0px 3px 1px -2px rgba(0,0,0,.2),0px 2px 2px 0px rgba(0,0,0,.14),0px 1px 5px 0px rgba(0,0,0,.12)',
        '3': '0px 3px 3px -2px rgba(0,0,0,.2),0px 3px 4px 0px rgba(0,0,0,.14),0px 1px 8px 0px rgba(0,0,0,.12)',
        '4': '0px 2px 4px -1px rgba(0,0,0,.2),0px 4px 5px 0px rgba(0,0,0,.14),0px 1px 10px 0px rgba(0,0,0,.12)',
        '5': '0px 3px 5px -1px rgba(0,0,0,.2),0px 5px 8px 0px rgba(0,0,0,.14),0px 1px 14px 0px rgba(0,0,0,.12)',
        '6': '0px 3px 5px -1px rgba(0,0,0,.2),0px 6px 10px 0px rgba(0,0,0,.14),0px 1px 18px 0px rgba(0,0,0,.12)',
        '7': '0px 4px 5px -2px rgba(0,0,0,.2),0px 7px 10px 1px rgba(0,0,0,.14),0px 2px 16px 1px rgba(0,0,0,.12)',
        '8': '0px 5px 5px -3px rgba(0,0,0,.2),0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12)',
        '9': '0px 5px 6px -3px rgba(0,0,0,.2),0px 9px 12px 1px rgba(0,0,0,.14),0px 3px 16px 2px rgba(0,0,0,.12)',
        '10': '0px 6px 6px -3px rgba(0,0,0,.2),0px 10px 14px 1px rgba(0,0,0,.14),0px 4px 18px 3px rgba(0,0,0,.12)',
        '11': '0px 6px 7px -4px rgba(0,0,0,.2),0px 11px 15px 1px rgba(0,0,0,.14),0px 4px 20px 3px rgba(0,0,0,.12)',
        '12': '0px 7px 8px -4px rgba(0,0,0,.2),0px 12px 17px 2px rgba(0,0,0,.14),0px 5px 22px 4px rgba(0,0,0,.12)',
        '13': '0px 7px 8px -4px rgba(0,0,0,.2),0px 13px 19px 2px rgba(0,0,0,.14),0px 5px 24px 4px rgba(0,0,0,.12)',
        '14': '0px 7px 9px -4px rgba(0,0,0,.2),0px 14px 21px 2px rgba(0,0,0,.14),0px 5px 26px 4px rgba(0,0,0,.12)',
        '15': '0px 8px 9px -5px rgba(0,0,0,.2),0px 15px 22px 2px rgba(0,0,0,.14),0px 6px 28px 5px rgba(0,0,0,.12)',
        '16': '0px 8px 10px -5px rgba(0,0,0,.2),0px 16px 24px 2px rgba(0,0,0,.14),0px 6px 30px 5px rgba(0,0,0,.12)',
        '17': '0px 8px 11px -5px rgba(0,0,0,.2),0px 17px 26px 2px rgba(0,0,0,.14),0px 6px 32px 5px rgba(0,0,0,.12)',
        '18': '0px 9px 11px -5px rgba(0,0,0,.2),0px 18px 28px 2px rgba(0,0,0,.14),0px 7px 34px 6px rgba(0,0,0,.12)',
        '19': '0px 9px 12px -6px rgba(0,0,0,.2),0px 19px 29px 2px rgba(0,0,0,.14),0px 7px 36px 6px rgba(0,0,0,.12)',
        '20': '0px 10px 13px -6px rgba(0,0,0,.2),0px 20px 31px 3px rgba(0,0,0,.14),0px 8px 38px 7px rgba(0,0,0,.12)',
        '21': '0px 10px 13px -6px rgba(0,0,0,.2),0px 21px 33px 3px rgba(0,0,0,.14),0px 8px 40px 7px rgba(0,0,0,.12)',
        '22': '0px 10px 14px -6px rgba(0,0,0,.2),0px 22px 35px 3px rgba(0,0,0,.14),0px 8px 42px 7px rgba(0,0,0,.12)',
        '23': '0px 11px 14px -7px rgba(0,0,0,.2),0px 23px 36px 3px rgba(0,0,0,.14),0px 9px 44px 8px rgba(0,0,0,.12)',
        '24': '0px 11px 15px -7px rgba(0,0,0,.2),0px 24px 38px 3px rgba(0,0,0,.14),0px 9px 46px 8px rgba(0,0,0,.12)',
      },
      fontSize: {
        0: '0',
        ...Object.fromEntries(
          Array(60).fill(0).map(
            (_v, i) => [i + 1, `${i + 1}px`],
          ),
        ),
      },
      borderRadius: {
        ...Object.fromEntries(
          Array(12).fill(0).map(
            (_v, i) => [`${i + 1}px`, `${(i + 1)}px`],
          ),
        ),
      },
      lineHeight: {
        'more-relaxed': '1.75',
      },
      spacing: {
        '2px': '2px',
        ...Object.fromEntries(
          Array(120).fill(0).map(
            (_v, i) => [i + 1, `${4 * (i + 1)}px`],
          ),
        ),
      },
      width: {
        ...Object.fromEntries(
          [30, 35, 72, 80, 90, 100, 125].map(
            (v) => [v, `${v * 4}px`],
          ),
        ),
      },
      height: {
        ...Object.fromEntries(
          [30, 35, 72, 80, 90, 100, 125].map(
            (v) => [v, `${v * 4}px`],
          ),
        ),
      },
      opacity: {
        ...Object.fromEntries(
          Array(20).fill(0).map((_, i) => i + 1).map(
            (i) => [i * 5, (i * 5) / 100],
          ),
        ),
      },
    },
  },
};
