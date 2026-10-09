(function (root) {
  'use strict';
  const paths = {
    rail: '<path d="M7 3 4 21M17 3l3 18M6 7h12M5 12h14M4 17h16"/>',
    crate: '<path d="M4 6h16v14H4zM4 10h16M8 6v14M16 6v14M4 6l4-3h8l4 3"/>',
    grain: '<path d="M12 21V4M12 9C4 10 5 4 5 4s7 0 7 5Zm0 5c-8 1-7-5-7-5s7 0 7 5Zm0-7c7 1 7-5 7-5s-7 0-7 5Zm0 6c7 1 7-5 7-5s-7 0-7 5Z"/>',
    medicine: '<path d="M8 3h8v4H8zM6 7h12v14H6zM9 14h6M12 11v6"/>',
    parts: '<path d="m7 3 4 4-3 3-4-4a6 6 0 0 0 7 8l6 7 4-4-7-6a6 6 0 0 0-7-8Z"/>',
    gear: '<path d="m10 3-1 3-3 1-3-1-1 4 3 2 1 3-1 3 4 2 2-3h3l3 1 2-4-3-2V9l1-3-4-2-2 3h-3Z"/><circle cx="11" cy="12" r="3"/>',
    heart: '<path d="M12 20 4 12C-1 6 7 0 12 7c5-7 13-1 8 5Z"/>',
    star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
    shield: '<path d="m12 3 8 3v7c-1 4-4 6-8 8-4-2-7-4-8-8V6Z"/><path d="m8 12 3 3 5-6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 8-2 6-5 2 2-6Z"/>',
    coffee: '<path d="M5 8h12v9c0 4-12 4-12 0ZM17 9h2c4 0 4 5 0 5h-2M3 22h17M8 3v2M13 2v3"/>',
    cards: '<path d="m4 7 10-4 6 15-10 4Z"/><path d="M3 12 2 3l10-1M12 9l3 3-1 5-3-3Z"/>',
    letter: '<path d="M3 5h18v14H3zM3 5l9 8 9-8M3 19l6-6M21 19l-6-6"/>',
    bolt: '<path d="m14 2-9 12h6l-1 8 9-13h-6Z"/>',
    binoculars: '<path d="m4 7 3-4h3v12M20 7l-3-4h-3v12M10 9h4M10 13h4"/><circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M10 2h4M12 5V2M12 8v5l4 2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8c-5-3-8 4-3 4s3 7-3 4M12 6v12"/>',
    book: '<path d="M5 3h14v18H5a3 3 0 0 1 0-6h14M5 3v12M9 7h6M9 10h4"/>',
    flower: '<circle cx="12" cy="9" r="3"/><path d="M12 6c-4-6 4-6 0 0Zm3 3c6-4 6 4 0 0Zm-3 3c4 6-4 6 0 0ZM9 9C3 13 3 5 9 9ZM12 12v10M12 18c-6 0-5-5-5-5s5 0 5 5Z"/>',
    bell: '<path d="M5 18h14l-2-4V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2"/>',
    flag: '<path d="M5 22V3h14l-3 4 3 5H5"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6M18 13c3 0 4 2 4 5v3"/>',
    coal: '<path d="m3 18 2-9 6-5 8 3 3 11-6 4-8-1ZM5 9l8 5 6-7M13 14l3 8M8 21l5-7"/>',
    train: '<path d="M4 17V7h10v10h7l-3-4V9h-4M17 9V5h3v5M2 21h20"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    sound: '<path d="m11 4-5 5H2v6h4l5 5ZM15 8c3 2 3 6 0 8M18 4c6 4 6 12 0 16"/>',
    mute: '<path d="m11 4-5 5H2v6h4l5 5ZM16 8l6 8M22 8l-6 8"/>',
    settings: '<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    lock: '<path d="M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    journal: '<path d="M5 3h15v18H5ZM3 7h4M3 12h4M3 17h4M10 8h6M10 12h6M10 16h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
    moon: '<path d="M20 16A9 9 0 0 1 8 3 9 9 0 1 0 20 16Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
    reset: '<path d="M3 10a9 9 0 1 1 0 5M3 4v6h6"/>'
  };
  function icon(name, size = 22) { return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.train}</svg>`; }
  function figure(role, color = '#bf9b75') {
    return `<svg class="figure" viewBox="0 0 90 140" aria-hidden="true"><ellipse cx="45" cy="132" rx="26" ry="4" fill="#243139" opacity=".13"/>
      <path d="m34 77-5 48 12 2 5-37 4 37 13-2-8-48" fill="#435865"/><path d="M28 124v7h16v-7m7 0v7h16v-7" fill="#273740"/>
      <path d="m30 45-9 34 9 4 6-22v26h22V61l7 22 9-4-13-34-11-4-11 1Z" fill="${color}" stroke="#273740" stroke-width="2" stroke-linejoin="round"/>
      <path d="m40 42 6 18 7-18" fill="#e8d7b8"/><path d="m45 56 4 7 8-6-7-12" fill="#ae5e4e"/>
      <path d="M31 78h28" stroke="#273740" stroke-width="5"/><rect x="43" y="75" width="8" height="7" rx="1" fill="#d8b260"/>
      <path d="M31 28c0-16 28-16 28 0v10c-2 13-25 13-28 0Z" fill="#ddaf8b" stroke="#273740" stroke-width="2"/>
      <path d="M32 24h26v9l-6-10-17 6" fill="#493e38"/><path d="M35 35h3m12 0h3" stroke="#273740" stroke-width="2"/>
      ${role === 'engineer' ? '<path d="M29 24V13h29l5 12Z" fill="#657f8c" stroke="#273740" stroke-width="2"/><path d="M27 25h39" stroke="#273740" stroke-width="4"/>' : '<path d="m29 22 5-14 21 2 6 13" fill="#ab8863" stroke="#273740" stroke-width="2"/><path d="M19 25c14 7 40 7 53 0-11-5-42-5-53 0Z" fill="#bd9b71" stroke="#273740" stroke-width="2"/>'}
      ${role === 'cowboy' ? '<path d="m55 51 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" fill="#ead08c"/>' : ''}
    </svg>`;
  }
  function wagon(type, level = 1, width = 150) {
    const d = root.DustlineData.cars[type], color = d.color;
    return `<svg class="wagon-art" width="${width}" viewBox="0 0 160 105" aria-hidden="true"><ellipse cx="78" cy="99" rx="65" ry="3" fill="#21343b" opacity=".1"/>
      <path d="M8 83h145" stroke="#293940" stroke-width="4"/>
      ${Array.from({ length: level }, (_, i) => `<g transform="translate(0 ${-i * 17})"><rect x="17" y="${52}" width="124" height="30" rx="3" fill="${color}" stroke="#293940" stroke-width="2"/><path d="M24 53v28M135 53v28" stroke="#293940" stroke-width="2" opacity=".4"/><rect x="30" y="59" width="20" height="13" rx="2" fill="#e8d7ae" stroke="#293940" stroke-width="1.5"/><rect x="60" y="59" width="20" height="13" rx="2" fill="#e8d7ae" stroke="#293940" stroke-width="1.5"/><rect x="109" y="58" width="21" height="24" rx="2" fill="#e8d7ae" stroke="#293940" stroke-width="1.5"/></g>`).join('')}
      <path d="M13 ${51 - (level - 1) * 17}h132" stroke="#293940" stroke-width="5" stroke-linecap="round"/>
      <rect x="83" y="56" width="22" height="24" rx="2" fill="#f7edce" opacity=".85"/>
      <g transform="translate(85 59) scale(.75)" fill="none" stroke="#293940" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[d.icon]}</g>
      <circle cx="40" cy="88" r="9" fill="#34474e"/><circle cx="119" cy="88" r="9" fill="#34474e"/><circle cx="40" cy="88" r="4" fill="#c4b294"/><circle cx="119" cy="88" r="4" fill="#c4b294"/>
    </svg>`;
  }
  root.DustlineArt = { icon, figure, wagon };
})(globalThis);
