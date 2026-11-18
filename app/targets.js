// Prio Connect, Find targets: the kinds of businesses most worth calling, from a few answers about what you sell.
// A rules-of-thumb model, not market data: each kind of business carries a judgment of what it usually needs and how it
// usually buys. The list then bends toward the season, toward what is working in your own Clients, and away from kinds you
// dismissed or already have plenty of. No numbers or results are ever shown; the page says so. Pure and deterministic.
(function (root) {
  'use strict';
  const OFFERS = [
    { id: 'ads', label: 'Ads', noun: 'ads', re: /\b(ads?|advertis\w*|ppc|campaigns?|media buy\w*)\b/i, signs: ['Runs no ads, or ads that send people to the home page', 'Shows up in search only under their own name'] },
    { id: 'web', label: 'Websites', noun: 'their website', re: /\b(web ?sites?|web ?design|landing pages?|seo)\b/i, signs: ['A website that is slow or hard to use on a phone', 'No clear button to call, book or ask for a quote'] },
    { id: 'video', label: 'Video', noun: 'video', re: /\b(videos?|film\w*|commercials?)\b/i, signs: ['No video on their site or social pages', 'Photos only, with no look at the people or the work'] },
    { id: 'brand', label: 'Brand and logo', noun: 'their brand', re: /\b(brand\w*|logos?|identity)\b/i, signs: ['A logo or colors that change from page to page', 'A name and look that blend in with the shop next door'] },
    { id: 'social', label: 'Social media', noun: 'social media', re: /\b(social|facebook|instagram|tiktok|linkedin)\b/i, signs: ['A social page that has not posted this month', 'Posts that get no replies or shares'] },
    { id: 'local', label: 'Reviews and local listings', noun: 'reviews and listings', re: /\b(reviews?|listings?|google business|local seo|maps)\b/i, signs: ['Few reviews, or reviews with no reply', 'A map listing with old hours or a wrong phone number'] }
  ];
  const OFFER_IDS = OFFERS.map((o) => o.id);
  const GROUPS = { home: 'Home services', health: 'Health and care', pro: 'Professional services', food: 'Food and drink', retail: 'Shops and cars', kids: 'Kids and learning', fit: 'Fitness and beauty', church: 'Churches', school: 'Schools and camps', care: 'Outreach and care', events: 'Events' };
  const SOURCE = 'Finder: ';

  // [id, name, group, kind, needs (ads, web, video, brand, social, local), budget, speed, repeat, refer, density, busy months, map search, signs, opener]
  const rows = [
    ['hvac', 'Heating and air companies', 'home', 'business', [.9, .6, .5, .4, .3, .9], 4, 4, 3, 4, 4, [4, 5, 6, 7, 8], 'air conditioning repair', ['Few reviews, or none answered, on an emergency service', 'A phone number that is hard to find on the website'], 'When the air conditioning stops on a hot day, how do people find you?'],
    ['roofing', 'Roofers', 'home', 'business', [.8, .7, .6, .5, .4, .8], 4, 4, 1, 3, 3, [3, 4, 5, 9, 10], 'roofing contractor', ['No photos of finished roofs on the website', 'Reviews that mention a repair with no reply from the owner'], 'After a storm, who do homeowners call first, and how did they pick them?'],
    ['plumbing', 'Plumbers', 'home', 'business', [.9, .6, .3, .4, .2, .9], 3, 5, 3, 4, 4, [], 'plumber', ['A website with no after-hours number or booking button', 'A listing with only a few reviews'], 'When a pipe bursts at night, what does a homeowner see first when they search?'],
    ['electrical', 'Electricians', 'home', 'business', [.8, .6, .3, .4, .2, .9], 3, 4, 3, 4, 4, [], 'electrician', ['No page for each service they offer', 'A website that does not say which cities they serve'], 'If a homeowner searches for your service tonight, which page do they land on?'],
    ['landscaping', 'Lawn and landscape companies', 'home', 'business', [.7, .6, .6, .5, .7, .8], 3, 4, 5, 4, 5, [3, 4, 5, 6], 'landscaping company', ['Strong work with no before and after photos online', 'A social page that has not posted lately'], 'Which of your jobs would you want every homeowner on the street to see?'],
    ['pool', 'Pool service and builders', 'home', 'business', [.7, .6, .6, .5, .5, .8], 3, 4, 5, 4, 3, [3, 4, 5, 6], 'pool service', ['No page that explains weekly service', 'Few photos of pools they have built'], 'How do new neighbors in a pool area find a service they can trust?'],
    ['pest', 'Pest control companies', 'home', 'business', [.8, .6, .3, .4, .3, .9], 3, 4, 5, 4, 4, [3, 4, 5, 6, 7, 8], 'pest control', ['No simple way to book a visit online', 'Reviews with no reply from the owner'], 'When someone sees a pest in the house, what do they search for first?'],
    ['cleaning', 'House cleaning services', 'home', 'business', [.7, .6, .4, .5, .7, .8], 2, 5, 5, 4, 5, [], 'house cleaning service', ['No clear price range or booking button', 'A social page with no photos of finished rooms'], 'How do you keep a calendar full of regular customers?'],
    ['remodeling', 'Remodelers and kitchen and bath builders', 'home', 'business', [.7, .8, .7, .7, .6, .6], 5, 2, 1, 4, 3, [], 'kitchen remodeling contractor', ['A portfolio with few photos', 'No video or walk-through of a finished project'], 'Which finished project would you want a future customer to see first?'],
    ['moving', 'Moving companies', 'home', 'business', [.8, .6, .4, .4, .3, .8], 3, 5, 1, 3, 3, [4, 5, 6, 7, 8], 'moving company', ['No online way to request a quote', 'A listing with few reviews'], 'When someone needs movers this month, how do they pick one?'],
    ['painting', 'Painters', 'home', 'business', [.7, .6, .5, .4, .4, .8], 3, 4, 1, 4, 4, [3, 4, 5, 9, 10], 'house painter', ['No before and after photos online', 'No page for inside and outside work'], 'What does a homeowner see when they search for a painter in your town?'],

    ['dental', 'Dental offices', 'health', 'business', [.8, .7, .6, .6, .5, .8], 5, 2, 5, 5, 4, [11, 12, 1], 'dentist', ['A website that does not say which insurance they take', 'Few reviews, or reviews with no reply'], 'How do new families in the area find a dentist they trust?'],
    ['chiro', 'Chiropractors', 'health', 'business', [.8, .6, .5, .5, .5, .8], 3, 4, 4, 4, 4, [], 'chiropractor', ['No page about what a first visit is like', 'A listing with old hours'], 'What does a first-time patient want to know before they book?'],
    ['medspa', 'Med spas and skin care clinics', 'health', 'business', [.8, .7, .7, .7, .8, .7], 4, 3, 4, 4, 3, [], 'med spa', ['Social posts with no clear way to book', 'A look that changes from page to page'], 'What makes a new client choose your clinic over the one down the road?'],
    ['vet', 'Veterinary clinics', 'health', 'business', [.6, .7, .6, .6, .7, .8], 4, 2, 5, 5, 4, [], 'veterinarian', ['No online way to ask for an appointment', 'Few photos of the team and the clinic'], 'How do new pet owners in the area find a vet?'],
    ['eye', 'Eye doctors and optical shops', 'health', 'business', [.6, .6, .5, .6, .5, .8], 4, 2, 4, 3, 3, [11, 12, 1], 'optometrist', ['A website that does not show the frames they carry', 'No online booking'], 'How does someone new to town find an eye doctor?'],
    ['therapy', 'Counselors and therapists', 'health', 'business', [.4, .9, .5, .6, .5, .8], 2, 3, 4, 4, 4, [], 'counseling', ['A website that is hard to read on a phone', 'No page about who they help and how'], 'How does someone who is ready to ask for help find the right person?'],
    ['homecare', 'Home care and senior living', 'health', 'business', [.7, .8, .8, .7, .6, .7], 4, 2, 3, 4, 3, [], 'home care agency', ['No stories or video from families or staff', 'A website that is hard to read for older visitors'], 'How do families begin looking when a parent needs more help?'],
    ['pt', 'Physical therapy clinics', 'health', 'business', [.7, .7, .5, .5, .5, .8], 3, 3, 3, 4, 3, [1, 2], 'physical therapy', ['No page for each kind of injury they treat', 'A listing with few reviews'], 'How do people with an injury decide where to go?'],

    ['law', 'Local law firms', 'pro', 'business', [.8, .8, .6, .7, .4, .7], 5, 2, 2, 5, 4, [], 'law firm', ['A website that does not say which cases they take', 'No short video that introduces the attorneys'], 'What does someone in a hard moment look for before they call a firm?'],
    ['accounting', 'Accountants and tax preparers', 'pro', 'business', [.6, .8, .4, .5, .4, .7], 3, 3, 5, 5, 4, [12, 1, 2, 3], 'tax preparer', ['No online way to book or send documents', 'A website that does not say who they help'], 'How do new clients find you before tax season starts?'],
    ['realestate', 'Real estate agents', 'pro', 'business', [.7, .7, .9, .8, .8, .6], 3, 4, 2, 5, 5, [2, 3, 4, 5], 'real estate agent', ['Listings with photos only and no video', 'A personal brand that blends in with the office'], 'What would make a seller choose you in the first conversation?'],
    ['insurance', 'Independent insurance agents', 'pro', 'business', [.7, .8, .5, .6, .6, .7], 3, 3, 5, 5, 4, [10, 11, 12], 'insurance agency', ['A website that does not explain each kind of cover', 'Few reviews, or reviews with no reply'], 'When someone shops for a policy, how do they find an independent agent?'],
    ['financial', 'Financial advisors', 'pro', 'business', [.5, .8, .7, .8, .5, .5], 4, 1, 5, 5, 3, [], 'financial advisor', ['No short video that shows how they explain things', 'A website that is mostly general text'], 'How does a new client decide whom to trust with their savings?'],

    ['restaurant', 'Independent restaurants', 'food', 'business', [.6, .6, .8, .6, .9, .9], 2, 5, 5, 3, 5, [], 'restaurant', ['A menu that is only a photo or a PDF', 'Social posts with few photos of the food'], 'What is the dish people drive across town for, and who knows about it?'],
    ['cafe', 'Coffee shops and bakeries', 'food', 'business', [.4, .5, .7, .8, .9, .8], 1, 5, 5, 3, 4, [], 'coffee shop', ['Hours that differ between the website and the map', 'A social page with a logo and little else'], 'What do regulars say when they tell a friend about you?'],
    ['catering', 'Caterers and event venues', 'food', 'business', [.6, .8, .8, .7, .7, .7], 3, 3, 3, 5, 3, [2, 3, 4, 9, 10], 'event venue', ['No gallery of past events', 'No simple form to ask about a date'], 'How do people planning an event find you before they call anyone else?'],
    ['brewery', 'Breweries and bars', 'food', 'business', [.5, .5, .7, .8, .9, .8], 2, 4, 4, 3, 4, [], 'craft brewery', ['An events page that is out of date', 'A social page that does not show the room or the people'], 'What would make someone new pick your place for a Friday night?'],

    ['autorepair', 'Auto repair and tire shops', 'retail', 'business', [.7, .6, .4, .4, .4, .9], 3, 4, 5, 4, 4, [], 'auto repair', ['No online way to book a visit', 'Reviews with no reply from the shop'], 'When a warning light comes on, how do people choose a shop?'],
    ['cardealer', 'Independent car dealers', 'retail', 'business', [.8, .7, .8, .6, .6, .7], 4, 4, 2, 3, 3, [], 'used car dealer', ['Few or dark photos of each car', 'No video walk-around of the cars'], 'Which car on your lot would you show first if a buyer walked in today?'],
    ['detailing', 'Car detailing and car washes', 'retail', 'business', [.6, .6, .7, .6, .8, .8], 2, 5, 4, 4, 4, [4, 5, 6], 'car detailing', ['No before and after photos', 'No online booking'], 'How do people find you when they want the car to look new again?'],
    ['boutique', 'Boutiques and gift shops', 'retail', 'business', [.6, .6, .7, .7, .9, .7], 2, 4, 4, 3, 4, [10, 11, 12], 'boutique', ['An online shop that is hard to find', 'A social page that does not show new items'], 'How do shoppers hear about what just came in?'],
    ['florist', 'Florists', 'retail', 'business', [.6, .6, .5, .6, .8, .8], 2, 5, 4, 4, 4, [1, 2, 4, 5], 'florist', ['No simple way to order for a date', 'Photos of arrangements that look the same on every page'], 'How do people find you in the week before a big day?'],
    ['furniture', 'Furniture and home stores', 'retail', 'business', [.8, .7, .7, .6, .7, .6], 4, 3, 2, 3, 3, [], 'furniture store', ['Photos that do not show a finished room', 'No page for delivery and returns'], 'What would bring someone into the showroom instead of ordering online?'],

    ['daycare', 'Child care and preschools', 'kids', 'business', [.5, .8, .7, .7, .6, .8], 3, 3, 5, 5, 4, [4, 5, 6, 7], 'preschool', ['A website that does not show a classroom', 'No page for tours and enrollment'], 'What does a parent want to see before they book a tour?'],
    ['tutoring', 'Tutoring and test prep', 'kids', 'business', [.7, .8, .5, .6, .5, .8], 3, 4, 5, 5, 4, [7, 8, 1], 'tutoring', ['No page that says which subjects and grades', 'No stories from families'], 'How do parents find help when a grade starts to slip?'],
    ['dance', 'Dance, music and martial arts schools', 'kids', 'business', [.6, .7, .8, .6, .8, .8], 2, 4, 5, 5, 4, [7, 8, 9, 1], 'dance studio', ['No video of a class', 'No clear schedule on the website'], 'How does a parent decide which studio feels right for their child?'],
    ['camps', 'Camps and youth programs', 'kids', 'business', [.7, .8, .8, .6, .7, .6], 3, 3, 4, 5, 3, [1, 2, 3, 4], 'summer camp', ['No video of a day at camp', 'A registration page that is hard to find'], 'When do families start choosing a camp, and where do they look?'],
    ['privateschool', 'Private and charter schools', 'kids', 'business', [.6, .8, .9, .8, .6, .5], 5, 1, 5, 5, 2, [10, 11, 12, 1, 2], 'private school', ['A website that does not show a day in the life of a student', 'No simple page for the admissions steps'], 'How does a family decide which school is right for their child?'],

    ['gym', 'Gyms and fitness studios', 'fit', 'business', [.7, .6, .8, .6, .9, .8], 3, 4, 5, 4, 4, [12, 1, 4, 5], 'fitness studio', ['No intro offer or trial class on the front page', 'Social posts that do not show real members'], 'What brings a first-timer through the door, and what keeps them coming back?'],
    ['salon', 'Hair salons and barbershops', 'fit', 'business', [.5, .5, .6, .6, .9, .8], 2, 4, 5, 5, 5, [], 'hair salon', ['No online booking', 'Photos of their work that are not on the website'], 'How do new clients find the stylist who is right for them?'],
    ['wedding', 'Wedding venues and vendors', 'fit', 'business', [.5, .7, .8, .7, .8, .7], 3, 3, 1, 5, 3, [1, 2, 3], 'wedding venue', ['A gallery that shows only a few events', 'No video from a real wedding'], 'Where do couples look first when they start planning?'],

    ['church', 'Churches', 'church', 'ministry', [.3, .9, .8, .7, .8, .7], 2, 2, 4, 5, 4, [2, 3, 8, 10, 11], 'church', ['A website that does not list service times and where to park', 'No welcome video for first-time visitors'], 'What does a first-time visitor want to know before they walk in?'],
    ['churchplant', 'New churches and church plants', 'church', 'ministry', [.4, .9, .8, .8, .8, .7], 1, 3, 3, 5, 3, [], 'new church', ['No website, or only a basic page', 'No short video that tells the story of the church'], 'How will new neighbors hear about you in your first year?'],
    ['youth', 'Youth ministries and student groups', 'church', 'ministry', [.3, .6, .9, .8, .9, .4], 1, 3, 3, 5, 3, [8, 9, 1], 'youth ministry', ['A social page with few photos of events', 'No short video for parents'], 'What would you want a parent to see before they send their child?'],
    ['christianschool', 'Christian schools and homeschool groups', 'school', 'ministry', [.5, .8, .8, .7, .6, .6], 3, 1, 5, 5, 2, [10, 11, 12, 1, 2], 'christian school', ['No page that explains the admissions steps', 'No video of a normal day'], 'How does a family decide between your school and the one down the road?'],
    ['camp', 'Christian camps and retreat centers', 'school', 'ministry', [.6, .8, .9, .7, .7, .5], 3, 3, 4, 5, 2, [1, 2, 3, 4], 'christian camp', ['No video of a week at camp', 'A registration page that is hard to find'], 'How do churches and families hear about your dates?'],
    ['nonprofit', 'Nonprofits and charities', 'care', 'ministry', [.4, .8, .8, .7, .8, .6], 1, 2, 3, 4, 3, [10, 11, 12], 'nonprofit organization', ['A donate page that is hard to find', 'No stories from the people they serve'], 'When someone wants to help, how easy is it to give or volunteer?'],
    ['pantry', 'Food pantries and shelters', 'care', 'ministry', [.3, .7, .6, .5, .7, .7], 1, 2, 3, 3, 3, [10, 11, 12], 'food pantry', ['Hours that differ between the website and the map', 'No page that says how to volunteer'], 'How does a neighbor in need find out when you are open?'],
    ['counseling', 'Christian counseling centers', 'care', 'ministry', [.4, .9, .6, .6, .5, .8], 2, 3, 4, 4, 3, [], 'christian counseling', ['A website that is hard to read on a phone', 'No page about who they help and how'], 'How does someone find a counselor who shares their faith?'],
    ['conference', 'Conferences and ministry events', 'events', 'ministry', [.8, .9, .9, .8, .8, .4], 3, 3, 2, 5, 2, [], 'christian conference', ['An event page with no schedule or speakers', 'No short video for the date'], 'How do people hear about your event early enough to plan for it?']
  ];
  const SEGMENTS = rows.map(([id, name, group, kind, n, budget, speed, repeat, refer, density, peak, search, signs, hook]) => ({
    id, name, group: GROUPS[group], kind, needs: Object.fromEntries(OFFER_IDS.map((o, i) => [o, n[i]])), budget, speed, repeat, refer, density, peak, search, signs, hook
  }));

  const WEIGHTS = {
    steady: { need: .30, value: .25, repeat: .20, speed: .05, refer: .10, season: .10 },
    quick: { need: .30, value: .10, repeat: .05, speed: .35, refer: .05, season: .15 },
    referrals: { need: .30, value: .10, repeat: .10, speed: .05, refer: .35, season: .10 }
  };
  const SIZE_TARGET = { small: 2, medium: 3, large: 4.5 };
  const REACH_NEED = { town: 4, metro: 3, anywhere: 0 };
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MAX_PER_GROUP = 3;

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const nowOf = (ctx) => { const d = ctx && ctx.now instanceof Date && !isNaN(ctx.now) ? ctx.now : new Date(); return d; };
  const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  function isoWeek(date) {
    const day = utcDay(date), dow = new Date(day).getUTCDay() || 7, thu = new Date(day + (4 - dow) * 864e5), year = thu.getUTCFullYear();
    const week = Math.ceil(((thu - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
    return { year, week, key: year + '-W' + String(week).padStart(2, '0') };
  }
  // Weeks counted from a Monday, so a week index never repeats or skips across a new year.
  const weekIndex = (date) => Math.floor((utcDay(date) - Date.UTC(1970, 0, 5)) / (7 * 864e5));

  function clean(a) {
    a = a && typeof a === 'object' ? a : {};
    const one = (v, list, d) => (list.includes(v) ? v : d);
    return {
      offers: Array.isArray(a.offers) ? OFFER_IDS.filter((id) => a.offers.includes(id)) : [],
      kind: one(a.kind, ['business', 'ministry', 'both'], 'business'),
      goal: one(a.goal, Object.keys(WEIGHTS), 'steady'),
      size: one(a.size, Object.keys(SIZE_TARGET), 'medium'),
      city: typeof a.city === 'string' ? a.city.trim().slice(0, 80) : '',
      reach: one(a.reach, Object.keys(REACH_NEED), 'metro')
    };
  }
  const defaults = () => clean({ offers: [] });
  function offersFrom(text) { const t = String(text == null ? '' : text); return OFFERS.filter((o) => o.re.test(t)).map((o) => o.id); }

  const sourceFor = (s) => (SOURCE + s.name).slice(0, 80);
  function segmentOf(source) {
    const m = /^finder:\s*(.+)$/i.exec(String(source == null ? '' : source).trim()); if (!m) return null;
    const n = m[1].trim().toLowerCase(), s = SEGMENTS.find((x) => x.name.toLowerCase() === n || sourceFor(x).slice(SOURCE.length).toLowerCase() === n);
    return s ? s.id : null;
  }
  // What your own Clients say about each kind of business, from prospects the finder added.
  function learn(clients) {
    const out = {};
    for (const c of Array.isArray(clients) ? clients : []) {
      const id = c && typeof c === 'object' ? segmentOf(c.source) : null; if (!id) continue;
      const r = out[id] || (out[id] = { wins: 0, losses: 0, open: 0 });
      if (c.stage === 'client') r.wins += 1; else if (c.stage === 'pilot') r.wins += .7; else if (c.stage === 'lost') r.losses += 1; else r.open += 1;
    }
    return out;
  }

  // Every factor runs from 0 to 1. Returns the parts so the page can say why, in words.
  function parts(s, a, ctx) {
    const now = nowOf(ctx), month = now.getMonth() + 1, next = month % 12 + 1, w = WEIGHTS[a.goal];
    const chosen = a.offers.length ? a.offers : OFFER_IDS, nv = chosen.map((o) => s.needs[o]).sort((x, y) => y - x);
    const need = .6 * nv[0] + .4 * nv.reduce((t, x) => t + x, 0) / nv.length;
    const value = 1 - Math.min(1, Math.abs(s.budget - SIZE_TARGET[a.size]) / 3.5);
    const inSeason = s.peak.includes(month) || s.peak.includes(next);
    const season = s.peak.length ? (inSeason ? 1 : .4) : .7;
    const f = { need, value, repeat: (s.repeat - 1) / 4, speed: (s.speed - 1) / 4, refer: (s.refer - 1) / 4, season };
    const base = Object.keys(w).reduce((t, k) => t + w[k] * f[k], 0);
    const rn = REACH_NEED[a.reach], reach = rn ? clamp(.55 + .45 * s.density / rn, .55, 1) : 1;
    const l = learn(ctx && ctx.clients)[s.id] || { wins: 0, losses: 0, open: 0 };
    const rate = (l.wins + 1) / (l.wins + l.losses + 2);
    const crowd = l.open >= 8 ? .8 : l.open >= 4 ? .9 : 1;
    const jitter = (hash(isoWeek(now).key + '|' + s.id) - .5) * .03;
    return { f, w, inSeason, l, chosen, score: base * reach * (.8 + .4 * rate) * crowd + jitter };
  }
  function score(s, a, ctx) { return parts(s, clean(a), ctx).score; }

  function mapsUrl(query, city) {
    const q = city ? query + ' in ' + city : query;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  // This week's thing to look for, rotating through what this kind of business and what you sell usually leave undone.
  function plan(s, a, now) {
    a = clean(a); now = now instanceof Date && !isNaN(now) ? now : new Date();
    const signs = [...s.signs, ...(a.offers.length ? a.offers : OFFER_IDS.slice(0, 2)).flatMap((id) => OFFERS.find((o) => o.id === id).signs)];
    const sign = signs[(weekIndex(now) + Math.floor(hash(s.id) * signs.length)) % signs.length];
    return { sign, query: s.search, url: mapsUrl(s.search, a.city), week: isoWeek(now).key };
  }

  function why(s, p, a) {
    const L = [], offerNoun = (id) => OFFERS.find((o) => o.id === id).noun;
    const needs = p.chosen.filter((o) => s.needs[o] >= .65).sort((x, y) => s.needs[y] - s.needs[x]).slice(0, 2);
    if (p.l.wins >= 1) L.push([2, 'You have won clients like this before.']);
    if (p.l.open >= 4) L.push([2, 'You already have ' + p.l.open + ' open leads here, so try another group first.']);
    if (needs.length) L.push([p.w.need * p.f.need * 1.4, 'They usually need help with ' + needs.map(offerNoun).join(' and ') + '.']);
    if (p.f.value >= .6) L.push([p.w.value * p.f.value, 'They usually have room for a monthly budget of the size you want.']);
    if (p.f.speed >= .75) L.push([p.w.speed * p.f.speed, 'Owners tend to decide on their own, so a yes can come quickly.']);
    if (p.f.repeat >= .75) L.push([p.w.repeat * p.f.repeat, 'Customers keep coming back, so these clients tend to stay.']);
    if (p.f.refer >= .75) L.push([p.w.refer * p.f.refer, 'A happy client here tends to send others your way.']);
    if (s.peak.length && p.inSeason) L.push([p.w.season, 'Their busy season is close.']);
    if (p.l.losses >= 2 && p.l.wins === 0) L.push([.1, 'It has not worked out for you yet, so pick the people carefully.']);
    L.sort((x, y) => y[0] - x[0]);
    const out = L.slice(0, 3).map((x) => x[1]);
    return out.length ? out : ['It matches what you told me you sell.'];
  }

  const item = (s, p, a, now, extra) => Object.assign({
    id: s.id, name: s.name, group: s.group, kind: s.kind, hook: s.hook, search: s.search, score: p.score, reasons: why(s, p, a), plan: plan(s, a, now), source: sourceFor(s), isNew: false, stretch: false
  }, extra);

  // The list: eight picks with no group over its share, then up to two stretch picks from groups you have not seen yet.
  function rank(answers, ctx) {
    const a = clean(answers), now = nowOf(ctx), hidden = new Set(Array.isArray(ctx && ctx.hidden) ? ctx.hidden : []), limit = clamp(Number(ctx && ctx.limit) || 8, 3, 12);
    const scored = SEGMENTS.filter((s) => (a.kind === 'both' || s.kind === a.kind) && !hidden.has(s.id)).map((s) => ({ s, p: parts(s, a, ctx) })).sort((x, y) => y.p.score - x.p.score || x.s.id.localeCompare(y.s.id));
    const chosen = [], per = {};
    while (chosen.length < limit) {
      let best = null, bestV = -1;
      for (const c of scored) {
        if (chosen.includes(c) || (per[c.s.group] || 0) >= MAX_PER_GROUP) continue;
        const v = c.p.score * Math.pow(.88, per[c.s.group] || 0);
        if (v > bestV) { best = c; bestV = v; }
      }
      if (!best) break;
      chosen.push(best); per[best.s.group] = (per[best.s.group] || 0) + 1;
    }
    const top = chosen.length ? chosen[0].p.score : 1;
    const picks = chosen.map((c) => item(c.s, c.p, a, now, { fit: c.p.score >= top * .97 ? 'Strong fit' : c.p.score >= top * .9 ? 'Good fit' : 'Worth a look' }));
    const week = isoWeek(now).key, seen = new Set(chosen.map((c) => c.s.group)), stretch = [], used = new Set();
    const pool = scored.filter((c) => !chosen.includes(c) && c.p.score >= top * .55).sort((x, y) => hash(week + '~' + x.s.id) - hash(week + '~' + y.s.id));
    for (const c of [...pool.filter((x) => !seen.has(x.s.group)), ...pool]) {
      if (stretch.length >= 2) break;
      if (stretch.some((x) => x.id === c.s.id) || used.has(c.s.group)) continue;
      used.add(c.s.group); stretch.push(item(c.s, c.p, a, now, { fit: 'Worth a try', stretch: true }));
    }
    return { picks, stretch, week, month: MONTH[now.getMonth()] };
  }
  // Marks the kinds that were not on the last list you saw (nothing is new on a first list).
  function markNew(list, previous) {
    const prev = new Set(Array.isArray(previous) ? previous : []);
    return list.map((p) => Object.assign({}, p, { isNew: prev.size > 0 && !prev.has(p.id) }));
  }

  const api = { OFFERS, SEGMENTS, GROUPS, SOURCE, clean, defaults, offersFrom, sourceFor, segmentOf, learn, score, rank, plan, mapsUrl, isoWeek, weekIndex, markNew };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PrioTargets = api;
})(typeof window !== 'undefined' ? window : globalThis);
