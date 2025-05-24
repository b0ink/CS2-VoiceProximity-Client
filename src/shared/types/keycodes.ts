/* eslint-disable @typescript-eslint/naming-convention */

// Date originally sourced from:
// https://github.com/toptal/keycodes/blob/main/lib/keycodes/with-events.ts

// Modified to map against Electron Accelerator global shortcuts:
// https://www.electronjs.org/docs/latest/api/accelerator

export type KeyCodeEvent = {
  key: string;
  keyCode: number;
  code?: string;
  description?: string;
  unicode?: string;
  electronKey: string;
  prettyPrint?: string;
};

export const prettyPrintKey = (key: KeyCodeEvent): string => {
  if (key.prettyPrint) {
    return key.prettyPrint;
  } else if (key.code?.includes('Digit')) {
    return key.key;
  } else if (key.code?.includes('Key')) {
    return key.electronKey;
  } else if (key.code?.includes('Numpad')) {
    return `Numpad ${key.key}`;
  }
  return key.code || '<ERROR>';
};

export const keyCodes: Record<string, KeyCodeEvent> = {
  Backspace: {
    key: 'Backspace',
    keyCode: 8,
    code: 'Backspace',
    description: 'backspace / delete',
    unicode: '⌫',
    electronKey: 'Backspace',
  },

  Tab: {
    key: 'Tab',
    keyCode: 9,
    code: 'Tab',
    description: 'tab',
    unicode: '↹',
    electronKey: 'Tab',
  },

  Enter: {
    key: 'Enter',
    keyCode: 13,
    code: 'Enter',
    description: 'Enter / Return',
    unicode: '↵',
    electronKey: 'Return',
  },

  ShiftLeft: {
    key: 'Shift',
    keyCode: 16,
    code: 'ShiftLeft',
    description: 'shift',
    unicode: '⇧',
    electronKey: 'Shift',
    prettyPrint: 'Shift',
  },

  ControlLeft: {
    key: 'Control',
    keyCode: 17,
    code: 'ControlLeft',
    description: 'ctrl',
    unicode: '^',
    electronKey: 'Control',
    prettyPrint: 'Ctrl',
  },

  AltLeft: {
    key: 'Alt',
    keyCode: 18,
    code: 'AltLeft',
    description: 'Alt / Option',
    unicode: '⎇ / ⌥',
    electronKey: 'Alt',
    prettyPrint: 'Alt',
  },

  AltRight: {
    key: 'Alt',
    keyCode: 18,
    code: 'AltRight',
    description: 'Alt / Option',
    unicode: '⎇ / ⌥',
    electronKey: 'Alt',
    prettyPrint: 'Alt',
  },

  CapsLock: {
    key: 'CapsLock',
    keyCode: 20,
    code: 'CapsLock',
    description: 'caps lock',
    unicode: '⇪',
    electronKey: 'Capslock',
  },

  Escape: {
    key: 'Escape',
    keyCode: 27,
    code: 'Escape',
    description: 'escape',
    unicode: '⎋',
    electronKey: 'Escape',
    prettyPrint: 'ESC',
  },

  Space: {
    key: ' ',
    keyCode: 32,
    code: 'Space',
    description: 'spacebar',
    electronKey: 'Space',
  },

  ArrowLeft: {
    key: 'ArrowLeft',
    keyCode: 37,
    code: 'ArrowLeft',
    description: 'left arrow',
    unicode: '←',
    electronKey: 'Left',
    prettyPrint: 'Left',
  },

  ArrowUp: {
    key: 'ArrowUp',
    keyCode: 38,
    code: 'ArrowUp',
    description: 'up arrow',
    unicode: '↑',
    electronKey: 'Up',
    prettyPrint: 'Up',
  },

  ArrowRight: {
    key: 'ArrowRight',
    keyCode: 39,
    code: 'ArrowRight',
    description: 'right arrow',
    unicode: '→',
    electronKey: 'Right',
    prettyPrint: 'Right',
  },

  ArrowDown: {
    key: 'ArrowDown',
    keyCode: 40,
    code: 'ArrowDown',
    description: 'down arrow',
    unicode: '↓',
    electronKey: 'Down',
    prettyPrint: 'Down',
  },

  Digit0: {
    key: '0',
    keyCode: 48,
    code: 'Digit0',
    electronKey: '0',
    description: '0',
    unicode: '⓪',
  },

  Digit1: {
    key: '1',
    keyCode: 49,
    code: 'Digit1',
    electronKey: '1',
    description: '1 Key',
    unicode: '①',
  },

  Digit2: {
    key: '2',
    keyCode: 50,
    code: 'Digit2',
    electronKey: '2',
    description: '2 Key',
    unicode: '②',
  },

  Digit3: {
    key: '3',
    keyCode: 51,
    code: 'Digit3',
    electronKey: '3',
    description: '3 Key',
    unicode: '③',
  },

  Digit4: {
    key: '4',
    keyCode: 52,
    code: 'Digit4',
    electronKey: '4',
    description: '4 Key',
    unicode: '④',
  },

  Digit5: {
    key: '5',
    keyCode: 53,
    code: 'Digit5',
    electronKey: '5',
    description: '5 Key',
    unicode: '⑤',
  },

  Digit6: {
    key: '6',
    keyCode: 54,
    code: 'Digit6',
    electronKey: '6',
    description: '6 Key',
    unicode: '⑥',
  },

  Digit7: {
    key: '7',
    keyCode: 55,
    code: 'Digit7',
    electronKey: '7',
    description: '7 Key',
    unicode: '⑦',
  },

  Digit8: {
    key: '8',
    keyCode: 56,
    code: 'Digit8',
    electronKey: '8',
    description: '8 Key',
    unicode: '⑧',
  },

  Digit9: {
    key: '9',
    keyCode: 57,
    code: 'Digit9',
    electronKey: '9',
    description: '9 Key',
    unicode: '⑨',
  },

  KeyA: {
    key: 'a',
    keyCode: 65,
    code: 'KeyA',
    electronKey: 'A',
    description: 'a',
  },

  KeyB: {
    key: 'b',
    keyCode: 66,
    code: 'KeyB',
    electronKey: 'B',
    description: 'b',
  },

  KeyC: {
    key: 'c',
    keyCode: 67,
    code: 'KeyC',
    electronKey: 'C',
    description: 'c',
  },

  KeyD: {
    key: 'd',
    keyCode: 68,
    code: 'KeyD',
    electronKey: 'D',
    description: 'd',
  },

  KeyE: {
    key: 'e',
    keyCode: 69,
    code: 'KeyE',
    electronKey: 'E',
    description: 'e',
  },

  KeyF: {
    key: 'f',
    keyCode: 70,
    code: 'KeyF',
    electronKey: 'F',
    description: 'f',
  },

  KeyG: {
    key: 'g',
    keyCode: 71,
    code: 'KeyG',
    electronKey: 'G',
    description: 'g',
  },

  KeyH: {
    key: 'h',
    keyCode: 72,
    code: 'KeyH',
    electronKey: 'H',
    description: 'h',
  },

  KeyI: {
    key: 'i',
    keyCode: 73,
    code: 'KeyI',
    electronKey: 'I',
    description: 'i',
  },

  KeyJ: {
    key: 'j',
    keyCode: 74,
    code: 'KeyJ',
    electronKey: 'J',
    description: 'j',
  },

  KeyK: {
    key: 'k',
    keyCode: 75,
    code: 'KeyK',
    electronKey: 'K',
    description: 'k',
  },

  KeyL: {
    key: 'l',
    keyCode: 76,
    code: 'KeyL',
    electronKey: 'L',
    description: 'l',
  },

  KeyM: {
    key: 'm',
    keyCode: 77,
    code: 'KeyM',
    electronKey: 'M',
    description: 'm',
  },

  KeyN: {
    key: 'n',
    keyCode: 78,
    code: 'KeyN',
    electronKey: 'N',
    description: 'n',
  },

  KeyO: {
    key: 'o',
    keyCode: 79,
    code: 'KeyO',
    electronKey: 'O',
    description: 'o',
  },

  KeyP: {
    key: 'p',
    keyCode: 80,
    code: 'KeyP',
    electronKey: 'P',
    description: 'p',
  },

  KeyQ: {
    key: 'q',
    keyCode: 81,
    code: 'KeyQ',
    electronKey: 'Q',
    description: 'q',
  },

  KeyR: {
    key: 'r',
    keyCode: 82,
    code: 'KeyR',
    electronKey: 'R',
    description: 'r',
  },

  KeyS: {
    key: 's',
    keyCode: 83,
    code: 'KeyS',
    electronKey: 'S',
    description: 's',
  },

  KeyT: {
    key: 't',
    keyCode: 84,
    code: 'KeyT',
    electronKey: 'T',
    description: 't',
  },

  KeyU: {
    key: 'u',
    keyCode: 85,
    code: 'KeyU',
    electronKey: 'U',
    description: 'u',
  },

  KeyV: {
    key: 'v',
    keyCode: 86,
    code: 'KeyV',
    electronKey: 'V',
    description: 'v',
  },

  KeyW: {
    key: 'w',
    keyCode: 87,
    code: 'KeyW',
    electronKey: 'W',
    description: 'w',
  },

  KeyX: {
    key: 'x',
    keyCode: 88,
    code: 'KeyX',
    electronKey: 'X',
    description: 'x',
  },

  KeyY: {
    key: 'y',
    keyCode: 89,
    code: 'KeyY',
    electronKey: 'Y',
    description: 'y',
  },

  KeyZ: {
    key: 'z',
    keyCode: 90,
    code: 'KeyZ',
    electronKey: 'Z',
    description: 'z',
    unicode: '',
  },

  MetaLeft: {
    key: 'Meta',
    keyCode: 91,
    code: 'MetaLeft',
    description: 'Windows Key / Left ⌘ / Chromebook Search key',
    unicode: '⌘ ⊞',
    electronKey: 'Meta',
  },

  MetaRight: {
    key: 'Meta',
    keyCode: 92,
    code: 'MetaRight',
    description: 'Right Windows',
    unicode: '⌘ ⊞',
    electronKey: 'Meta',
  },

  Numpad0: {
    key: '0',
    keyCode: 96,
    code: 'Numpad0',
    description: 'Number Pad 0',
    unicode: '⓪',
    electronKey: 'num0',
  },

  Numpad1: {
    key: '1',
    keyCode: 97,
    code: 'Numpad1',
    description: 'Number Pad 1',
    unicode: '①',
    electronKey: 'num1',
  },

  Numpad2: {
    key: '2',
    keyCode: 98,
    code: 'Numpad2',
    description: 'Number Pad 2',
    unicode: '②',
    electronKey: 'num2',
  },

  Numpad3: {
    key: '3',
    keyCode: 99,
    code: 'Numpad3',
    description: 'Number Pad 3',
    unicode: '③',
    electronKey: 'num3',
  },

  Numpad4: {
    key: '4',
    keyCode: 100,
    code: 'Numpad4',
    description: 'Number Pad 4',
    unicode: '④',
    electronKey: 'num4',
  },

  Numpad5: {
    key: '5',
    keyCode: 101,
    code: 'Numpad5',
    description: 'Number Pad 5',
    unicode: '⑤',
    electronKey: 'num5',
  },

  Numpad6: {
    key: '6',
    keyCode: 102,
    code: 'Numpad6',
    description: 'Number Pad 6',
    unicode: '⑥',
    electronKey: 'num6',
  },

  Numpad7: {
    key: '7',
    keyCode: 103,
    code: 'Numpad7',
    description: 'Number Pad 7',
    unicode: '⑦',
    electronKey: 'num7',
  },

  Numpad8: {
    key: '8',
    keyCode: 104,
    code: 'Numpad8',
    description: 'Number Pad 8',
    unicode: '⑧',
    electronKey: 'num8',
  },

  Numpad9: {
    key: '9',
    keyCode: 105,
    code: 'Numpad9',
    description: 'Number Pad 9',
    unicode: '⑨',
    electronKey: 'num9',
  },

  NumpadMultiply: {
    key: '*',
    keyCode: 106,
    code: 'NumpadMultiply',
    description: 'multiply',
    unicode: '×',
    electronKey: 'nummult',
  },

  NumpadAdd: {
    key: '+',
    keyCode: 107,
    code: 'NumpadAdd',
    description: 'add',
    electronKey: 'numadd',
  },

  NumpadSubtract: {
    key: '-',
    keyCode: 109,
    code: 'NumpadSubtract',
    description: 'subtract',
    electronKey: 'numsub',
  },

  NumpadDecimal: {
    key: '.',
    keyCode: 110,
    code: 'NumpadDecimal',
    description: 'decimal point',
    electronKey: 'numdec',
  },

  NumpadDivide: {
    key: '/',
    keyCode: 111,
    code: 'NumpadDivide',
    description: 'divide',
    unicode: '÷',
    electronKey: 'numdiv',
  },

  F1: {
    key: 'F1',
    keyCode: 112,
    code: 'F1',
    electronKey: 'F1',
    description: 'f1',
  },

  F2: {
    key: 'F2',
    keyCode: 113,
    code: 'F2',
    electronKey: 'F2',
    description: 'f2',
  },

  F3: {
    key: 'F3',
    keyCode: 114,
    code: 'F3',
    electronKey: 'F3',
    description: 'f3',
  },

  F4: {
    key: 'F4',
    keyCode: 115,
    code: 'F4',
    electronKey: 'F4',
    description: 'f4',
  },

  F5: {
    key: 'F5',
    keyCode: 116,
    code: 'F5',
    electronKey: 'F5',
    description: 'f5',
  },

  F6: {
    key: 'F6',
    keyCode: 117,
    code: 'F6',
    electronKey: 'F6',
    description: 'f6',
  },

  F7: {
    key: 'F7',
    keyCode: 118,
    code: 'F7',
    electronKey: 'F7',
    description: 'f7',
  },

  F8: {
    key: 'F8',
    keyCode: 119,
    code: 'F8',
    electronKey: 'F8',
    description: 'f8',
  },

  F9: {
    key: 'F9',
    keyCode: 120,
    code: 'F9',
    electronKey: 'F9',
    description: 'f9',
  },

  F10: {
    key: 'F10',
    keyCode: 121,
    code: 'F10',
    electronKey: '10',
    description: 'f10',
  },

  F11: {
    key: 'F11',
    keyCode: 122,
    code: 'F11',
    electronKey: '11',
    description: 'f11',
  },

  F12: {
    key: 'F12',
    keyCode: 123,
    code: 'F12',
    electronKey: '12',
    description: 'f12',
  },

  F13: {
    key: 'F13',
    keyCode: 124,
    code: 'F13',
    electronKey: '13',
    description: 'f13',
  },

  F14: {
    key: 'F14',
    keyCode: 125,
    code: 'F14',
    electronKey: '14',
    description: 'f14',
  },

  F15: {
    key: 'F15',
    keyCode: 126,
    code: 'F15',
    electronKey: '15',
    description: 'f15',
  },

  F16: {
    key: 'F16',
    keyCode: 127,
    code: 'F16',
    electronKey: '16',
    description: 'f16',
  },

  F17: {
    key: 'F17',
    keyCode: 128,
    code: 'F17',
    electronKey: '17',
    description: 'f17',
  },

  F18: {
    key: 'F18',
    keyCode: 129,
    code: 'F18',
    electronKey: '18',
    description: 'f18',
  },

  F19: {
    key: 'F19',
    keyCode: 130,
    code: 'F19',
    electronKey: '19',
    description: 'f19',
  },

  F20: {
    key: 'F20',
    code: 'F20',
    electronKey: '20',
    description: 'F20',
    keyCode: 131,
  },

  F21: {
    key: 'F21',
    code: 'F21',
    electronKey: '21',
    description: 'F21',
    keyCode: 132,
  },

  F22: {
    key: 'F22',
    code: 'F22',
    electronKey: '22',
    description: 'F22',
    keyCode: 133,
  },

  F23: {
    key: 'F23',
    code: 'F23',
    electronKey: '23',
    description: 'F23',
    keyCode: 134,
  },

  F24: {
    key: 'F24',
    code: 'F24',
    electronKey: '24',
    description: 'F24',
    keyCode: 135,
  },

  F25: {
    key: 'F25',
    code: 'F25',
    electronKey: '25',
    description: 'F25',
    keyCode: 136,
  },

  F26: {
    key: 'F26',
    code: 'F26',
    electronKey: '26',
    description: 'F26',
    keyCode: 137,
  },

  F27: {
    key: 'F27',
    code: 'F27',
    electronKey: '27',
    description: 'F27',
    keyCode: 138,
  },

  F28: {
    key: 'F28',
    code: 'F28',
    electronKey: '28',
    description: 'F28',
    keyCode: 139,
  },

  F29: {
    key: 'F29',
    code: 'F29',
    electronKey: '29',
    description: 'F29',
    keyCode: 140,
  },

  F30: {
    key: 'F30',
    code: 'F30',
    electronKey: '30',
    description: 'F30',
    keyCode: 141,
  },

  F31: {
    key: 'F31',
    code: 'F31',
    electronKey: '31',
    description: 'F31',
    keyCode: 142,
  },

  F32: {
    key: 'F32',
    code: 'F32',
    electronKey: '32',
    description: 'F32',
    keyCode: 143,
  },

  NumLock: {
    key: 'NumLock',
    keyCode: 144,
    code: 'NumLock',
    description: 'num lock',
    unicode: '⇭',
    electronKey: 'Numlock',
  },

  ScrollLock: {
    key: 'ScrollLock',
    keyCode: 145,
    code: 'ScrollLock',
    description: 'scroll lock',
    unicode: '⤓',
    electronKey: 'Scrollock',
  },

  //   '': {
  //     key: '-',
  //     keyCode: 173,
  //     code: 'Minus',
  //     description: 'minus (firefox), mute/unmute',
  //     electronKey: 'VolumeMute',
  //   },

  //   '': {
  //     key: 'AudioVolumeDown',
  //     keyCode: 174,
  //     code: '',
  //     unicode: '',
  //     description: 'decrease volume level',
  //     electronKey: 'VolumeMute',
  //   },

  //   '': {
  //     key: 'AudioVolumeUp',
  //     keyCode: 175,
  //     code: '',
  //     unicode: '',
  //     description: 'increase volume level',
  //     electronKey: 'VolumeUp',
  //   },

  MediaTrackNext: {
    key: 'MediaTrackNext',
    keyCode: 176,
    code: 'MediaTrackNext',
    unicode: '',
    description: 'next',
    electronKey: 'MediaNextTrack',
  },

  MediaTrackPrevious: {
    key: 'MediaTrackPrevious',
    keyCode: 177,
    code: 'MediaTrackPrevious',
    unicode: '',
    description: 'previous',
    electronKey: 'MediaPreviousTrack',
  },

  MediaStop: {
    key: 'MediaStop',
    description: 'stop',
    keyCode: 178,
    code: 'MediaStop',
    unicode: '',
    electronKey: 'MediaStop',
  },

  //   '': {
  //     key: 'MediaPlayPause',
  //     keyCode: 179,
  //     code: '',
  //     unicode: '',
  //     description: 'play/pause',
  //     electronKey: 'MediaPlayPause',
  //   },

  Semicolon: {
    key: ';',
    keyCode: 186,
    code: 'Semicolon',
    description: 'semi-colon / ñ',
    electronKey: ';',
    prettyPrint: ';',
  },

  Equal: {
    key: '=',
    keyCode: 187,
    code: 'Equal',
    description: 'equal sign',
    electronKey: '=',
    prettyPrint: '=',
  },

  Comma: {
    key: ',',
    keyCode: 188,
    code: 'Comma',
    description: 'comma',
    electronKey: ',',
    prettyPrint: ',',
  },

  Minus: {
    key: '-',
    keyCode: 189,
    code: 'Minus',
    description: 'dash',
    electronKey: '-',
    prettyPrint: '-',
  },

  Period: {
    key: '.',
    keyCode: 190,
    code: 'Period',
    description: 'period',
    electronKey: '.',
    prettyPrint: '.',
  },

  Slash: {
    key: '/',
    keyCode: 191,
    code: 'Slash',
    description: 'forward slash / ç',
    electronKey: '/',
    prettyPrint: '/',
  },

  Backquote: {
    key: '`',
    keyCode: 192,
    code: 'Backquote',
    description: 'Backtick / grave accent / ñ / æ / ö / § / ±',
    electronKey: '`',
    prettyPrint: '`',
  },

  IntlRo: {
    key: '/',
    keyCode: 193,
    code: 'IntlRo',
    description: '?, / or °',
    electronKey: '/',
    prettyPrint: '/',
  },

  BracketLeft: {
    key: '[',
    keyCode: 219,
    code: 'BracketLeft',
    description: 'open bracket',
    electronKey: '[',
    prettyPrint: '[',
  },

  Backslash: {
    key: '\\',
    keyCode: 220,
    code: 'Backslash',
    description: 'back slash',
    electronKey: '\\',
    prettyPrint: '\\',
  },

  BracketRight: {
    key: ']',
    keyCode: 221,
    code: 'BracketRight',
    description: 'close bracket / å',
    electronKey: ']',
    prettyPrint: ']',
  },

  Quote: {
    key: "'",
    keyCode: 222,
    code: 'Quote',
    description: 'single quote / ø / ä',
    electronKey: "'",
    prettyPrint: "'",
  },

  //   OSLeft: {
  //     key: 'Meta',
  //     keyCode: 224,
  //     code: 'OSLeft',
  //     description: 'left or right ⌘ key (firefox)',
  //     unicode: '⌘',
  //     electronKey: 'Meta',
  //   },

  //   AltRight: {
  //     key: 'AltGraph',
  //     keyCode: 225,
  //     code: 'AltRight',
  //     description: 'altgr',
  //     unicode: '⎇ or ⌥',
  //     electronKey: 'AltGr',
  //     prettyPrint: 'Alt',
  //   },

  //   IntlBackslash: {
  //     key: '\\',
  //     keyCode: 226,
  //     code: 'IntlBackslash',
  //     description: '< /git >, left back slash',
  //     electronKey: '\\',
  //   },
};
