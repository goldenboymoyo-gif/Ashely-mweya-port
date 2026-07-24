const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const HTML_FILE = path.join(__dirname, 'ashley-mwiya-portfolio (1).html');
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = 'ashley2024';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const sessions = {};

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && sessions[token]) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions[token] = { created: Date.now() };
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

app.get('/api/portfolio', requireAuth, (req, res) => {
  try {
    const html = fs.readFileSync(HTML_FILE, 'utf-8');
    const data = extractContent(html);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/portfolio', requireAuth, (req, res) => {
  try {
    let html = fs.readFileSync(HTML_FILE, 'utf-8');
    html = applyContent(html, req.body);
    fs.writeFileSync(HTML_FILE, html, 'utf-8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/preview', requireAuth, (req, res) => {
  res.sendFile(HTML_FILE);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(HTML_FILE);
});

function extractContent(html) {
  const grab = (regex) => {
    const m = html.match(regex);
    return m ? m[1].trim() : '';
  };

  const eyebrow = grab(/<span class="eyebrow">(.*?)<\/span>/s);
  const heroName = grab(/<h1>(.*?)<\/h1>/s);
  const heroSub = grab(/<p class="hero-sub">(.*?)<\/p>/s);
  const heroScribble = grab(/<span class="scribble hero-scribble">(.*?)<\/span>/s);
  const hireTag = grab(/class="hero-photo-tag">(.*?)<\/a>|class="hero-photo-tag">(.*?)<\/div>/s);

  const aboutHeadline = grab(/<section class="section" id="about">[\s\S]*?<h2>(.*?)<\/h2>/);
  const aboutNote = grab(/<section class="section" id="about">[\s\S]*?<p class="scribble section-note">(.*?)<\/p>/);
  const bioParas = [];
  const bioRegex = /<div class="bio-text">([\s\S]*?)<div class="facts">/g;
  const bioMatch = bioRegex.exec(html);
  if (bioMatch) {
    const pRegex = /<p>(.*?)<\/p>/g;
    let pm;
    while ((pm = pRegex.exec(bioMatch[1])) !== null) {
      bioParas.push(pm[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
    }
  }

  const focus = grab(/<span class="fact-label">Focus<\/span>\s*<span class="fact-value">(.*?)<\/span>/s);
  const industries = grab(/<span class="fact-label">Industries<\/span>\s*<span class="fact-value">(.*?)<\/span>/s);
  const toolkit = grab(/<span class="fact-label">Toolkit<\/span>\s*<span class="fact-value">(.*?)<\/span>/s);

  const certsHeadline = grab(/<section class="section" id="credentials">[\s\S]*?<h2>(.*?)<\/h2>/);
  const certs = [];
  const certRegex = /<div class="cert-card">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let cm;
  while ((cm = certRegex.exec(html)) !== null) {
    const issuer = cm[1].match(/<span class="mono">(.*?)<\/span>/);
    const name = cm[1].match(/<h3>(.*?)<\/h3>/);
    if (issuer && name) {
      certs.push({ issuer: issuer[1], name: name[1] });
    }
  }

  const workHeadline = grab(/<section class="section" id="work">[\s\S]*?<h2>(.*?)<\/h2>/);
  const workNote = grab(/<section class="section" id="work">[\s\S]*?<p class="scribble section-note">(.*?)<\/p>/);
  const works = [];
  const workCards = html.split('<div class="work-card">').slice(1);
  for (const card of workCards) {
    const type = card.match(/<span class="mono">(.*?)<\/span>/);
    const title = card.match(/<h3>(.*?)<\/h3>/);
    const desc = card.match(/<p>(.*?)<\/p>/);
    if (type && title && desc) {
      works.push({ type: type[1], title: title[1].replace(/&amp;/g, '&'), description: desc[1] });
    }
  }

  const servicesHeadline = grab(/<section class="section" id="services">[\s\S]*?<h2>(.*?)<\/h2>/);
  const servicesNote = grab(/<section class="section" id="services">[\s\S]*?<p class="scribble section-note">(.*?)<\/p>/);
  const services = [];
  const serviceRows = html.split('<div class="service-row">').slice(1);
  for (const row of serviceRows) {
    const name = row.match(/<h3>(.*?)<\/h3>/);
    const tag = row.match(/<span class="mono">(.*?)<\/span>/);
    if (name && tag) {
      services.push({ name: name[1], tag: tag[1] });
    }
  }

  const canvaHeadline = grab(/<section class="section" id="canva">[\s\S]*?<h2>(.*?)<\/h2>/);
  const canvaNote = grab(/<section class="section" id="canva">[\s\S]*?<p class="scribble section-note">(.*?)<\/p>/);
  const canvaLinks = [];
  const canvaCards = html.split('class="canva-card"').slice(1);
  for (const card of canvaCards) {
    const title = card.match(/<h3>(.*?)<\/h3>/);
    const desc = card.match(/<p>(.*?)<\/p>/);
    const href = card.match(/href="(.*?)"/);
    if (title && href) {
      canvaLinks.push({ title: title[1], description: desc ? desc[1] : '', url: href[1] });
    }
  }

  const contactHeadline = grab(/<section class="contact" id="contact">[\s\S]*?<h2>(.*?)<\/h2>/);
  const contactLead = grab(/<section class="contact" id="contact">[\s\S]*?<p class="contact-lead">(.*?)<\/p>/);

  const phone = grab(/<div>Phone — <a href="tel:(.*?)">(.*?)<\/a><\/div>/s);
  const email = grab(/<div>Email — <a href="mailto:(.*?)">(.*?)<\/a><\/div>/s);
  const tiktok = grab(/<div>TikTok — <a href="(.*?)" target="_blank".*?>(.*?)<\/a><\/div>/s);
  const location = grab(/<div>Based in — (.*?)<\/div>/s);

  const footer = grab(/<footer>.*?<span class="scribble footer-note">(.*?)<\/span>/s);

  return {
    hero: { eyebrow, heroName, heroSub, heroScribble, hireTag },
    about: { headline: aboutHeadline, note: aboutNote, paragraphs: bioParas },
    facts: { focus, industries, toolkit },
    credentials: { headline: certsHeadline, certs },
    work: { headline: workHeadline, note: workNote, items: works },
    services: { headline: servicesHeadline, note: servicesNote, items: services },
    canva: { headline: canvaHeadline, note: canvaNote, links: canvaLinks },
    contact: { headline: contactHeadline, lead: contactLead },
    contactInfo: { phone, email, tiktok, location },
    footer
  };
}

function applyContent(html, data) {
  if (data.hero) {
    if (data.hero.eyebrow !== undefined) {
      html = html.replace(/(<span class="eyebrow">)(.*?)(<\/span>)/s, `$1${data.hero.eyebrow}$3`);
    }
    if (data.hero.heroSub !== undefined) {
      html = html.replace(/(<p class="hero-sub">)(.*?)(<\/p>)/s, `$1${data.hero.heroSub}$3`);
    }
    if (data.hero.heroScribble !== undefined) {
      html = html.replace(/(<span class="scribble hero-scribble">)(.*?)(<\/span>)/s, `$1${data.hero.heroScribble}$3`);
    }
  }

  if (data.about) {
    if (data.about.paragraphs) {
      const bioDiv = html.indexOf('<div class="bio-text">');
      const factsDiv = html.indexOf('<div class="facts">', bioDiv);
      if (bioDiv > 0 && factsDiv > 0) {
        const before = html.substring(0, bioDiv + '<div class="bio-text">'.length);
        const after = html.substring(factsDiv);
        const parasHtml = data.about.paragraphs.map(p => `        <p>${p}</p>`).join('\n');
        html = before + '\n' + parasHtml + '\n' + after;
      }
    }
  }

  if (data.facts) {
    if (data.facts.focus !== undefined) {
      html = html.replace(/(<span class="fact-label">Focus<\/span>\s*<span class="fact-value">)(.*?)(<\/span>)/s, `$1${data.facts.focus}$3`);
    }
    if (data.facts.industries !== undefined) {
      html = html.replace(/(<span class="fact-label">Industries<\/span>\s*<span class="fact-value">)(.*?)(<\/span>)/s, `$1${data.facts.industries}$3`);
    }
    if (data.facts.toolkit !== undefined) {
      html = html.replace(/(<span class="fact-label">Toolkit<\/span>\s*<span class="fact-value">)(.*?)(<\/span>)/s, `$1${data.facts.toolkit}$3`);
    }
  }

  if (data.work && data.work.items) {
    const workCards = html.split('<div class="work-card">');
    if (workCards.length > 1) {
      let newCards = workCards[0];
      for (let i = 1; i < workCards.length; i++) {
        let card = workCards[i];
        const item = data.work.items[i - 1];
        if (item) {
          if (item.type !== undefined) card = card.replace(/(<span class="mono">)(.*?)(<\/span>)/s, `$1${item.type}$3`);
          if (item.title !== undefined) card = card.replace(/(<h3>)(.*?)(<\/h3>)/s, `$1${item.title}$3`);
          if (item.description !== undefined) card = card.replace(/(<p>)(.*?)(<\/p>)/s, `$1${item.description}$3`);
        }
        newCards += '<div class="work-card">' + card;
      }
      html = newCards;
    }
  }

  if (data.services && data.services.items) {
    const serviceRows = html.split('<div class="service-row">');
    if (serviceRows.length > 1) {
      let newRows = serviceRows[0];
      for (let i = 1; i < serviceRows.length; i++) {
        let row = serviceRows[i];
        const item = data.services.items[i - 1];
        if (item) {
          if (item.name !== undefined) row = row.replace(/(<h3>)(.*?)(<\/h3>)/s, `$1${item.name}$3`);
          if (item.tag !== undefined) row = row.replace(/(<span class="mono">)(.*?)(<\/span>)/s, `$1${item.tag}$3`);
        }
        newRows += '<div class="service-row">' + row;
      }
      html = newRows;
    }
  }

  if (data.canva && data.canva.links) {
    const canvaCards = html.split('class="canva-card"');
    if (canvaCards.length > 1) {
      let newCards = canvaCards[0];
      for (let i = 1; i < canvaCards.length; i++) {
        let card = canvaCards[i];
        const link = data.canva.links[i - 1];
        if (link) {
          if (link.url !== undefined) card = card.replace(/href="(.*?)"/, `href="${link.url}"`);
          if (link.title !== undefined) card = card.replace(/(<h3>)(.*?)(<\/h3>)/s, `$1${link.title}$3`);
          if (link.description !== undefined) card = card.replace(/(<p>)(.*?)(<\/p>)/s, `$1${link.description}$3`);
        }
        newCards += 'class="canva-card"' + card;
      }
      html = newCards;
    }
  }

  if (data.contactInfo) {
    if (data.contactInfo.phone !== undefined) {
      html = html.replace(/(<div>Phone — <a href="tel:)(.*?)(">(.*?)<\/a><\/div>)/s, `$1${data.contactInfo.phone}$3${data.contactInfo.phone}$4</a></div>`);
    }
    if (data.contactInfo.email !== undefined) {
      html = html.replace(/(<div>Email — <a href="mailto:)(.*?)(">(.*?)<\/a><\/div>)/s, `$1${data.contactInfo.email}$3${data.contactInfo.email}$4</a></div>`);
    }
    if (data.contactInfo.location !== undefined) {
      html = html.replace(/(<div>Based in — )(.*?)(<\/div>)/s, `$1${data.contactInfo.location}$3`);
    }
  }

  if (data.footer !== undefined) {
    html = html.replace(/(<span class="scribble footer-note">)(.*?)(<\/span>)/s, `$1${data.footer}$3`);
  }

  return html;
}

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
  console.log(`Login password: ${ADMIN_PASSWORD}`);
});
