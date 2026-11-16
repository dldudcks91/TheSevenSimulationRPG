/** Resource minigames, redrawn 2026-10-16. Native vector sprites over generated painted scenes. */
export const MG_SCENES = Object.fromEntries(['mine', 'gather', 'log'].map(id => [id, `./assets/art/minigames/${id}_scene.webp`]));
const svg = (body, box = '0 0 160 160') => `<svg viewBox="${box}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
const crystal = (rare = false) => {
    const c = rare ? ['#ffce72', '#c78338', '#fff0b6', '#794d31'] : ['#70ded5', '#248f9a', '#c5fff1', '#245063'];
    return svg(`<ellipse cx="80" cy="139" rx="62" ry="12" fill="#111e26" opacity=".65"/>
    <path d="M18 126L31 100 56 91 101 97 136 115 144 135 108 146 43 144Z" fill="#344953" stroke="#172833" stroke-width="4"/>
    <path d="M29 122L56 106 88 113 109 104 132 123 109 136 62 130 43 138Z" fill="#49606a"/>
    <path d="M66 119L56 47 77 15 96 44 91 120Z" fill="${c[0]}" stroke="#18343e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M77 15L78 111 91 120 96 44Z" fill="${c[1]}"/><path d="M61 48L77 25 73 103Z" fill="${c[2]}"/>
    <path d="M48 126L26 79 32 51 55 67 65 124Z" fill="${c[0]}" stroke="#18343e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M32 51L49 115 65 124 55 67Z" fill="${c[1]}"/>
    <path d="M94 126L104 72 126 48 134 78 116 130Z" fill="${c[0]}" stroke="#18343e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M126 48L111 119 116 130 134 78Z" fill="${c[1]}"/>
    <path d="M20 41V57M12 49H28M123 16V32M115 24H131" stroke="${c[2]}" stroke-width="3" stroke-linecap="round"/>`);
};
const herb = (kind = 'good') => {
    const bad = kind === 'bad', rare = kind === 'rare';
    const leaf = bad ? '#7b648f' : '#6da78a', light = bad ? '#b19bc3' : '#b7d29b', petal = bad ? '#e38b91' : rare ? '#8dd9ea' : '#fff1cb';
    return svg(`<ellipse cx="80" cy="144" rx="48" ry="8" fill="#122b29" opacity=".4"/>
    <path d="M80 137C70 106 84 76 78 37M78 111L43 81M79 96L112 65M76 80L50 52" stroke="#314e42" stroke-width="6" stroke-linecap="round"/>
    <path d="M75 121C38 131 23 108 21 88 48 83 70 96 75 121Z" fill="${leaf}" stroke="#284339" stroke-width="3"/>
    <path d="M82 119C111 127 137 107 139 87 113 83 88 95 82 119Z" fill="${light}" stroke="#284339" stroke-width="3"/>
    <path d="M72 91C44 90 30 72 34 55 57 57 70 70 72 91Z" fill="${light}" stroke="#284339" stroke-width="3"/>
    <path d="M84 85C111 90 126 69 125 49 103 49 86 66 84 85Z" fill="${leaf}" stroke="#284339" stroke-width="3"/>
    <path d="M75 122L33 98M86 117L127 97M69 85L43 63M88 79L118 57" stroke="#35594b" stroke-width="2"/>
    <g fill="${petal}" stroke="${bad ? '#64404e' : '#6e7661'}" stroke-width="2"><ellipse cx="78" cy="26" rx="11" ry="18"/>
    <ellipse cx="62" cy="37" rx="17" ry="10" transform="rotate(28 62 37)"/><ellipse cx="94" cy="37" rx="17" ry="10" transform="rotate(-28 94 37)"/>
    <ellipse cx="68" cy="51" rx="10" ry="15" transform="rotate(25 68 51)"/><ellipse cx="89" cy="51" rx="10" ry="15" transform="rotate(-25 89 51)"/></g>
    <circle cx="78" cy="39" r="9" fill="${bad ? '#492c42' : '#dfa94c'}"/>
    <path d="M75 138L66 150M80 138L80 154M85 138L94 148" stroke="#ba9b68" stroke-width="3" stroke-linecap="round"/>
    ${bad ? '<path d="M119 120L140 151H98Z" fill="#b45362" stroke="#f0b9b7" stroke-width="2"/><path d="M119 130V139M119 144V145" stroke="#fff0df" stroke-width="3" stroke-linecap="round"/>' : ''}`);
};
export const MG_SPRITES = {
    ore: crystal(), rare: crystal(true),
    hazard: svg('<ellipse cx="80" cy="139" rx="60" ry="10" fill="#121d25" opacity=".7"/><path d="M18 125L29 71 61 30 110 35 138 83 144 126 114 143 49 142Z" fill="#663e48" stroke="#241f2b" stroke-width="5" stroke-linejoin="round"/><path d="M61 30L72 80 29 71M110 35L93 85 138 83M72 80L55 122 93 115 114 143" stroke="#b76b71" stroke-width="4"/><path d="M80 58L115 116H45Z" fill="#ef9a8c" stroke="#34252e" stroke-width="4" stroke-linejoin="round"/><path d="M80 77V94M80 103V104" stroke="#4e2935" stroke-width="6" stroke-linecap="round"/>'),
    herb: herb(), herb_rare: herb('rare'), poison: herb('bad'),
    trunk: svg('<path d="M14-4H106L111 94H9Z" fill="#74543a" stroke="#352d27" stroke-width="5"/><path d="M27-4L23 94M48-4L54 31 44 64 48 94M83-4L77 49 86 94" stroke="#463728" stroke-width="5"/><path d="M33 0L36 35M66 17L63 68M96 48L96 90" stroke="#a58052" stroke-width="4" stroke-linecap="round"/><path d="M15 87H106" stroke="#b5905f" stroke-width="3"/>', '0 0 120 90'),
    branch: svg('<path d="M-5 30L65 29 98 7 112 11 85 35 151 29 157 42 87 50 53 44-5 49Z" fill="#77573b" stroke="#392f28" stroke-width="4" stroke-linejoin="round"/><path d="M17 36L65 35 100 15M87 41L141 35" stroke="#b08a58" stroke-width="3" stroke-linecap="round"/>', '0 0 160 60'),
    jack: svg('<ellipse cx="75" cy="148" rx="44" ry="7" fill="#172622" opacity=".5"/><path d="M49 100L45 141H64L74 113 86 141H105L94 97Z" fill="#30434b" stroke="#242d2c" stroke-width="4"/><path d="M41 139H65V149H34V145ZM85 139H106L115 149H85Z" fill="#322c29" stroke="#242d2c" stroke-width="3"/><path d="M44 59L88 57 100 105 43 106 34 81Z" fill="#b06b50" stroke="#382f2a" stroke-width="4"/><path d="M61 61V104M46 82H91" stroke="#d39a69" stroke-width="5"/><path d="M60 33L90 30 94 57 79 69 61 58Z" fill="#d9ad7f" stroke="#3e332c" stroke-width="3"/><path d="M45 32L58 13 84 12 95 28 103 32Z" fill="#506b59" stroke="#2b3a32" stroke-width="4"/><path d="M51 34H99" stroke="#c3b488" stroke-width="5"/><path d="M81 49L94 44 96 65 80 73 69 58Z" fill="#664631"/><path d="M79 73L108 84 129 66" stroke="#3c332b" stroke-width="15" stroke-linecap="round"/><path d="M79 71L108 81 128 63" stroke="#d5ad7e" stroke-width="10" stroke-linecap="round"/><path d="M107 103L142 33" stroke="#392e27" stroke-width="9" stroke-linecap="round"/><path d="M107 102L142 33" stroke="#b58a53" stroke-width="5" stroke-linecap="round"/><path d="M136 39L121 29 132 12 156 17 154 45Z" fill="#9db6b7" stroke="#303c3d" stroke-width="4"/><path d="M151 19L150 39" stroke="#e1e7d9" stroke-width="4"/>'),
};
