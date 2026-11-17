// Themes: a library of ready-made color schemes, and everything a person can change about how the app looks.
// A theme is eight colors: the page (ground), the cards, the menu (rail), the accent, the text (ink), and three inks
// for charts and badges. Every other color is worked out from those and checked for contrast, as Shuffle does.
// Separate from color: the type, the corners, the paper, the notebook cover, the text size and how pages turn.
/* exported THEME_PRESETS, UI_DEFAULTS, UI_OPTIONS */
const THEME_PRESETS = [
  // Light and calm
  ['Paper', 'Light', '#FBF9EC', '#FFFDF8', '#2A2A2E', '#E22622', '#1C1B19', '#2656D9', '#E22622', '#FAC800'],
  ['Linen', 'Light', '#F4EFE6', '#FBF8F2', '#5B4A3A', '#B4532A', '#2A211A', '#3E6A8A', '#B4532A', '#D9A33A'],
  ['Ivory', 'Light', '#FAF7F0', '#FFFFFF', '#1F2A44', '#C8962E', '#1A1D24', '#1F2A44', '#A23B3B', '#C8962E'],
  ['Cloud', 'Light', '#F3F5F9', '#FFFFFF', '#2B3445', '#3B6FE0', '#151B26', '#3B6FE0', '#E0533B', '#F2B705'],
  ['Mint', 'Light', '#EAF6F0', '#F8FDFA', '#1E4D3A', '#1E9E6A', '#11261D', '#1E6FA0', '#E0553B', '#E8B321'],
  ['Sky', 'Light', '#EAF3FC', '#F9FCFF', '#123A6B', '#1E7BE0', '#0E1C2E', '#1E7BE0', '#E5484D', '#F5B400'],
  ['Blush', 'Light', '#FBEEF0', '#FFF9FA', '#5A2238', '#D93A6A', '#2A1420', '#6A4BD6', '#D93A6A', '#F2A93B'],
  ['Lavender', 'Light', '#F2EEFB', '#FCFAFF', '#3A2A6B', '#7A4DE0', '#1E1633', '#7A4DE0', '#E0457B', '#F0B429'],
  ['Lemon', 'Light', '#FFFBE6', '#FFFEF6', '#3D3510', '#D9A400', '#24200A', '#2E64C9', '#D9472B', '#D9A400'],
  ['Sage', 'Light', '#EEF2EA', '#FAFCF8', '#3B4A36', '#5E8A4A', '#1E261C', '#3F6E8C', '#B5523B', '#C9A227'],
  ['Peach', 'Light', '#FFF1E8', '#FFFAF6', '#6B2F1A', '#F06A3A', '#2B160E', '#2F6BD8', '#F06A3A', '#F2B33D'],
  ['Sand', 'Light', '#F5EBDD', '#FCF7F0', '#5C4024', '#C0702E', '#2A1E12', '#2F5F8A', '#B8432E', '#D9A13A'],
  // Dark
  ['Midnight', 'Dark', '#0B1020', '#121A30', '#060A16', '#F7C400', '#EEF1F8', '#5B8CFF', '#FF5A5F', '#F7C400'],
  ['Charcoal', 'Dark', '#16171A', '#1F2024', '#0E0F11', '#FF7A1A', '#F2F2F3', '#5AA9FF', '#FF5C5C', '#FFC53D'],
  ['Espresso', 'Dark', '#1C1410', '#261B15', '#120C09', '#D9A05B', '#F5ECE3', '#7FB2E5', '#E06C5A', '#D9A05B'],
  ['Forest night', 'Dark', '#0E1A14', '#14241C', '#08110D', '#5BD39A', '#E9F5EE', '#6FB7FF', '#FF7A6B', '#F2C14E'],
  ['Deep sea', 'Dark', '#071A24', '#0C2431', '#041219', '#2FD3C5', '#E5F5F8', '#4DA3FF', '#FF6B6B', '#FFD166'],
  ['Plum night', 'Dark', '#1A0F1F', '#24152B', '#110914', '#E76BD0', '#F7ECF6', '#8C7BFF', '#FF6B8A', '#FFC857'],
  ['Graphite', 'Dark', '#1B1D21', '#24272C', '#121316', '#9AA4B2', '#F1F3F5', '#7AA2F7', '#F7768E', '#E0AF68'],
  ['Ember', 'Dark', '#1A0E0A', '#26140E', '#100806', '#FF6A2B', '#FBEDE6', '#5FA8FF', '#FF6A2B', '#FFC247'],
  ['Aurora night', 'Dark', '#0A1023', '#111A35', '#060A18', '#7CF5C7', '#EAF0FF', '#8AA8FF', '#FF7EB6', '#FFD86B'],
  ['Ink', 'Dark', '#0D0D0F', '#17171A', '#000000', '#FFFFFF', '#F5F5F5', '#6EA8FE', '#FF6B6B', '#FFD43B'],
  ['Neon', 'Dark', '#07060E', '#110F1E', '#030207', '#39FF14', '#F0F0FF', '#00E5FF', '#FF2E88', '#FFE600'],
  ['Synthwave', 'Dark', '#1B0B2E', '#26113F', '#12061F', '#FF4FD8', '#FBEFFF', '#43C6FF', '#FF4FD8', '#FFD23F'],
  // Bold
  ['Fire truck', 'Bold', '#FFF4F2', '#FFFFFF', '#C8102E', '#C8102E', '#1E0B0D', '#1D4ED8', '#C8102E', '#F7C400'],
  ['Taxi', 'Bold', '#FFFBEA', '#FFFFFF', '#1A1A1A', '#F7C400', '#141414', '#1D4ED8', '#E02424', '#F7C400'],
  ['Cobalt', 'Bold', '#EEF3FF', '#FFFFFF', '#0B3FD9', '#0B3FD9', '#0A1636', '#0B3FD9', '#E5484D', '#FFB800'],
  ['Emerald', 'Bold', '#ECFAF3', '#FFFFFF', '#04714A', '#06A66C', '#0A2219', '#1F6FD1', '#E5484D', '#F5B400'],
  ['Tangerine', 'Bold', '#FFF3E8', '#FFFFFF', '#E8590C', '#E8590C', '#2A1306', '#1F6FD1', '#D9342B', '#F5B400'],
  ['Magenta', 'Bold', '#FFEFF8', '#FFFFFF', '#B5146E', '#D61F84', '#2A0A1D', '#5B3FD6', '#D61F84', '#F2B33D'],
  ['Teal pop', 'Bold', '#E8FAF8', '#FFFFFF', '#00706B', '#00A39A', '#08221F', '#2F64D8', '#E5484D', '#F5B400'],
  ['Royal', 'Bold', '#F2EEFF', '#FFFFFF', '#3B1E9E', '#5B2EE0', '#140B33', '#5B2EE0', '#E0457B', '#F5B400'],
  // Made for a kind of business
  ['Showroom chrome', 'Business', '#EEF0F3', '#FFFFFF', '#1A1D22', '#D0021B', '#14161A', '#2C6BED', '#D0021B', '#F2B705'],
  ['Stage lights', 'Business', '#120D0B', '#1D1512', '#0A0706', '#F2A93B', '#FBF2E8', '#6FA8FF', '#E5484D', '#F2A93B'],
  ['Start-up violet', 'Business', '#F6F4FF', '#FFFFFF', '#1D1640', '#6D4AFF', '#141026', '#6D4AFF', '#FF5C7A', '#FFB020'],
  ['Newsroom', 'Business', '#F7F7F5', '#FFFFFF', '#111111', '#C8102E', '#111111', '#1F4E9C', '#C8102E', '#E6A700'],
  ['Studio', 'Business', '#F2F1EF', '#FFFFFF', '#2B2B2B', '#2B2B2B', '#1A1A1A', '#3A6EA5', '#C44536', '#E0A100'],
  ['Florist', 'Business', '#FBF1F3', '#FFFDFD', '#2F4A35', '#D3557A', '#24161A', '#4A7B5A', '#D3557A', '#E8B04A'],
  ['Coffee house', 'Business', '#F3ECE4', '#FBF7F2', '#3B2A20', '#9C5B2E', '#22170F', '#3D6B8C', '#A6402C', '#D69E3A'],
  ['Gym', 'Business', '#141414', '#1E1E1E', '#000000', '#C6FF00', '#F4F4F4', '#38BDF8', '#FF4D4D', '#C6FF00'],
  ['Law office', 'Business', '#F4F2EE', '#FFFFFF', '#1D2B3A', '#8C6A2E', '#151C24', '#1D4E89', '#8E2C2C', '#B8892E'],
  ['Clinic', 'Business', '#F1F8FA', '#FFFFFF', '#0E4D64', '#0E8FB0', '#0B2530', '#0E8FB0', '#E15554', '#F2B134'],
  ['Bakery', 'Business', '#FFF6EC', '#FFFCF8', '#7A3E1D', '#E07A3F', '#2B1A0E', '#4C7FB8', '#D24E3C', '#F0B43C'],
  ['Surf shop', 'Business', '#EAF8FA', '#FFFFFF', '#04495E', '#FF7A59', '#08232B', '#0B8FB3', '#FF7A59', '#FFC145'],
  ['Church', 'Business', '#F6F3EC', '#FFFDF8', '#2E2A4A', '#7A5C1E', '#1D1A2B', '#3C4F9E', '#9B2C2C', '#C9A227'],
  ['Real estate', 'Business', '#F2F4F3', '#FFFFFF', '#163B36', '#2E8B6E', '#10221F', '#2E6BB0', '#C2483D', '#D9A63A'],
  ['Kids and play', 'Business', '#FFF8E6', '#FFFFFF', '#2A2F7A', '#FF4F79', '#1C1E45', '#2F80ED', '#FF4F79', '#FFC93C'],
  ['Farm market', 'Business', '#F4F1E2', '#FFFDF4', '#2F4A1E', '#D9831F', '#1E2614', '#2F6E8C', '#C2412D', '#E0A82E']
].map(([name, group, ground, card, rail, accent, ink, blue, red, yellow]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, group, ground, card, rail, accent, ink, blue, red, yellow }));

const UI_DEFAULTS = { head: 'jakarta', body: 'jakarta', corners: 'soft', paper: 'dots', cover: 'marble', coverColor: '#121218', size: 'normal', turn: 'curl' };
const UI_OPTIONS = {
  fonts: [['jakarta', 'Jakarta', "'Plus Jakarta Sans'"], ['outfit', 'Outfit', "'Outfit'"], ['grotesk', 'Space Grotesk', "'Space Grotesk'"], ['fraunces', 'Fraunces (serif)', "'Fraunces'"], ['dmserif', 'DM Serif (display)', "'DM Serif Display'"], ['segoe', 'Segoe UI', "'Segoe UI'"], ['georgia', 'Georgia', "Georgia"], ['mono', 'Typewriter', "'Cascadia Mono', Consolas, 'Courier New'"]],
  corners: [['sharp', 'Sharp', 4, 3], ['soft', 'Soft', 12, 8], ['round', 'Round', 18, 12], ['pill', 'Extra round', 26, 16]],
  paper: [['dots', 'Dot grid'], ['lines', 'Lined'], ['grid', 'Graph'], ['plain', 'Plain']],
  cover: [['marble', 'Marble'], ['solid', 'Solid'], ['linen', 'Linen'], ['kraft', 'Kraft paper'], ['leather', 'Leather'], ['denim', 'Denim'], ['carbon', 'Carbon']],
  size: [['small', 'Smaller', 0.92], ['normal', 'Normal', 1], ['large', 'Larger', 1.1], ['xl', 'Largest', 1.2]],
  turn: [['curl', 'Page curl'], ['slide', 'Slide'], ['fade', 'Fade'], ['none', 'None']]
};
