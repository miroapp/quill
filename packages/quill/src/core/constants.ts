// eslint-disable-next-line no-irregular-whitespace
export const ZERO_SPACE = String.fromCharCode(8203); // '&#8203;​'
// eslint-disable-next-line no-irregular-whitespace
export const WORD_JOINER = String.fromCodePoint(0x2060); // &#8288 U+2060 WORD JOINER
export const CHECK_KOREAN =
  /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3\uA960-\uA97F\uD7B0-\uD7FF\uFFA0-\uFFDC]/giu;
