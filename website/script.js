const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

if (menuButton && mainNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const yearNode = document.querySelector('#year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const engineTrack = document.querySelector('#engine-track');
const enginePrev = document.querySelector('#engine-prev');
const engineNext = document.querySelector('#engine-next');

if (engineTrack && enginePrev && engineNext) {
  const slideBy = () => engineTrack.clientWidth * 0.9;

  enginePrev.addEventListener('click', () => {
    engineTrack.scrollBy({ left: -slideBy(), behavior: 'smooth' });
  });

  engineNext.addEventListener('click', () => {
    engineTrack.scrollBy({ left: slideBy(), behavior: 'smooth' });
  });
}

const parseNumber = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const parseCsvRow = (line) => {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
};

const parseIssuanceCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    year: headers.indexOf('year'),
    revenue_base: headers.indexOf('revenue_base'),
    revenue_p50: headers.indexOf('revenue_p50'),
    revenue_p90: headers.indexOf('revenue_p90'),
    credits_base: headers.indexOf('credits_base'),
    credits_p50: headers.indexOf('credits_p50'),
    credits_p90: headers.indexOf('credits_p90'),
  };

  if (Object.values(idx).some((i) => i < 0)) return [];

  return lines
    .slice(1)
    .map((line) => {
      const cols = parseCsvRow(line);
      const year = parseNumber(cols[idx.year]);
      const revenue_base = parseNumber(cols[idx.revenue_base]);
      const revenue_p50 = parseNumber(cols[idx.revenue_p50]);
      const revenue_p90 = parseNumber(cols[idx.revenue_p90]);
      const credits_base = parseNumber(cols[idx.credits_base]);
      const credits_p50 = parseNumber(cols[idx.credits_p50]);
      const credits_p90 = parseNumber(cols[idx.credits_p90]);

      if (
        year === null ||
        revenue_base === null ||
        revenue_p50 === null ||
        revenue_p90 === null ||
        credits_base === null ||
        credits_p50 === null ||
        credits_p90 === null
      ) {
        return null;
      }

      return {
        year,
        revenue_base,
        revenue_p50,
        revenue_p90,
        credits_base,
        credits_p50,
        credits_p90,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);
};

const formatAxisNumber = (value) => {
  return new Intl.NumberFormat('en-GB', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const buildLineChart = (canvasId, title, labels, series) => {
  const canvas = document.querySelector(`#${canvasId}`);
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Base',
          data: series.base,
          borderColor: '#1F3D2B',
          backgroundColor: '#1F3D2B',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'P50',
          data: series.p50,
          borderColor: '#4F7C5A',
          backgroundColor: '#4F7C5A',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'P90',
          data: series.p90,
          borderColor: '#A7BFA9',
          backgroundColor: '#A7BFA9',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'line' },
        },
        title: { display: false, text: title },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#4d5951' },
        },
        y: {
          grid: { color: 'rgba(16, 28, 21, 0.08)', drawBorder: false },
          border: { display: false },
          ticks: {
            color: '#4d5951',
            callback: (value) => formatAxisNumber(value),
          },
        },
      },
    },
  });
};

const initExampleOutputCharts = async () => {
  const revenueCanvas = document.querySelector('#revenue-chart');
  const creditsCanvas = document.querySelector('#credits-chart');
  const revenueEmpty = document.querySelector('#revenue-empty');
  const creditsEmpty = document.querySelector('#credits-empty');
  if (!revenueCanvas || !creditsCanvas) return;

  const showEmpty = () => {
    if (revenueEmpty) revenueEmpty.hidden = false;
    if (creditsEmpty) creditsEmpty.hidden = false;
  };

  const hideEmpty = () => {
    if (revenueEmpty) revenueEmpty.hidden = true;
    if (creditsEmpty) creditsEmpty.hidden = true;
  };

  try {
    const response = await fetch('assets/data/LOOKR_ISSUANCE.csv', { cache: 'no-store' });
    if (!response.ok) {
      showEmpty();
      return;
    }

    const csvText = await response.text();
    const rows = parseIssuanceCsv(csvText);
    if (!rows.length) {
      showEmpty();
      return;
    }

    hideEmpty();

    const labels = rows.map((r) => String(r.year));

    buildLineChart('revenue-chart', 'Projected revenue', labels, {
      base: rows.map((r) => r.revenue_base),
      p50: rows.map((r) => r.revenue_p50),
      p90: rows.map((r) => r.revenue_p90),
    });

    buildLineChart('credits-chart', 'Projected credit issuance', labels, {
      base: rows.map((r) => r.credits_base),
      p50: rows.map((r) => r.credits_p50),
      p90: rows.map((r) => r.credits_p90),
    });

    const map = new Map();
    const outputResponse = await fetch('assets/data/LOOKR_OUTPUT.csv', { cache: 'no-store' });
    if (outputResponse.ok) {
      const outputText = await outputResponse.text();
      const outputLines = outputText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (outputLines.length > 1) {
        const outputHeaders = parseCsvRow(outputLines[0]).map((h) => h.trim().toLowerCase());
        const outputRow = parseCsvRow(outputLines[1]);
        outputHeaders.forEach((header, i) => map.set(header, outputRow[i]));
      }
    }

    const kpis = [
      {
        id: 'NPV',
        keys: ['npv_base', 'npv', 'project_npv'],
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
        },
      },
      {
        id: 'IRR',
        keys: ['irr_base', 'irr', 'project_irr'],
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${(n * 100).toFixed(1)}%`;
        },
      },
      {
        id: 'Total Credits',
        keys: ['total_credits_base', 'total_credits', 'credits_total'],
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
        },
      },
      {
        id: 'Break-even Price',
        keys: ['break_even_price', 'breakeven_price'],
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)}/tCO2e`;
        },
      },
      {
        id: 'Payback Period',
        keys: ['payback_year', 'payback_period', 'payback_years'],
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(n)} years`;
        },
      },
    ];

    const cards = document.querySelectorAll('#example-kpis .kpi-card');
    cards.forEach((card) => {
      const title = card.querySelector('h3')?.textContent?.trim();
      const body = card.querySelector('p');
      if (!title || !body) return;
      const cfg = kpis.find((k) => k.id === title);
      if (!cfg) return;

      const rawValue = cfg.keys.map((k) => map.get(k)).find((v) => v !== undefined && String(v).trim() !== '');
      if (!rawValue) return;
      body.textContent = cfg.format ? cfg.format(rawValue) : String(rawValue).trim();
    });
  } catch (error) {
    showEmpty();
  }
};

initExampleOutputCharts();
