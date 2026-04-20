const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

window.addEventListener('pageshow', () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
});

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

const insightToggles = Array.from(document.querySelectorAll('[data-insight-toggle]'));
if (insightToggles.length) {
  const setInsightToggleState = (toggle, isOpen) => {
    const button = toggle.querySelector(':scope > .insight-toggle-btn');
    const content = toggle.querySelector(':scope > .insight-content');
    const icon = toggle.querySelector(':scope > .insight-toggle-btn .insight-toggle-icon');
    if (!button || !content || !icon) return;

    button.setAttribute('aria-expanded', String(isOpen));
    content.hidden = !isOpen;
    toggle.classList.toggle('is-open', isOpen);
    icon.textContent = isOpen ? '−' : '+';
  };

  insightToggles.forEach((toggle) => {
    const button = toggle.querySelector(':scope > .insight-toggle-btn');
    if (!button) return;

    setInsightToggleState(toggle, false);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      setInsightToggleState(toggle, !isOpen);
    });
  });
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
      const revenue_low = parseNumber(cols[headers.indexOf('revenue_low')]);
      const revenue_high = parseNumber(cols[headers.indexOf('revenue_high')]);

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
        revenue_low,
        revenue_high,
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

const formatCompactNumber = (value) => {
  const n = parseNumber(value);
  if (n === null) return String(value).trim();
  return new Intl.NumberFormat('en-GB', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
};

const formatPercent = (value, digits = 1) => {
  const n = parseNumber(value);
  if (n === null) return String(value).trim();
  return `${(n * 100).toFixed(digits)}%`;
};

const chartInstances = {};

const buildLineChart = (canvasId, title, labels, datasets) => {
  const canvas = document.querySelector(`#${canvasId}`);
  if (!canvas || !window.Chart) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets,
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
          grid: { color: 'rgba(16, 28, 21, 0.06)', drawBorder: false },
          border: { display: false },
          ticks: {
            color: '#4d5951',
            maxTicksLimit: 5,
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

  const exampleProjectTitle = document.querySelector('#example-project-title');
  const exampleProjectContext = document.querySelector('#example-project-context');
  const insightStrip = document.querySelector('#example-insights');
  const insightClassification = document.querySelector('#insight-classification');
  const insightList = document.querySelector('#insight-list');
  const nextStepsList = document.querySelector('#next-steps-list');
  const scenarioSelect = document.querySelector('#scenario-select');

  const setInsights = ({ classification, indicates, nextSteps }) => {
    if (!insightStrip || !insightList || !nextStepsList || !indicates?.length || !nextSteps?.length) return;
    if (insightClassification) {
      insightClassification.textContent = classification || '';
    }

    insightList.innerHTML = '';
    indicates.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      insightList.appendChild(li);
    });

    nextStepsList.innerHTML = '';
    nextSteps.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      nextStepsList.appendChild(li);
    });

    insightStrip.hidden = false;
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
        const dataRows = outputLines.slice(1).map((line) => parseCsvRow(line));
        const projectIdIdx = outputHeaders.indexOf('project_id');
        const outputRow = dataRows.find((row) => {
          if (!row?.length) return false;
          if (projectIdIdx < 0) return row.some((cell) => String(cell || '').trim() !== '');
          return String(row[projectIdIdx] || '').trim() !== '';
        });

        if (outputRow) {
          outputHeaders.forEach((header, i) => map.set(header, outputRow[i]));
        }
      }
    }

    const projectName = map.get('project_name');
    const country = map.get('country');
    const scenario = map.get('scenario_selected');
    if (exampleProjectTitle && projectName && String(projectName).trim()) {
      exampleProjectTitle.textContent = `Concept project: ${String(projectName).trim()}`;
    }
    if (exampleProjectContext) {
      const contextParts = [
        country && String(country).trim(),
      ].filter(Boolean);
      if (contextParts.length) {
        exampleProjectContext.textContent = `Illustrative pre-feasibility output, ${contextParts.join(' • ')}.`;
      }
    }

    const updateKpiMetaLabels = (selectedScenario) => {
      const label = selectedScenario === 'low' ? 'Low scenario' : selectedScenario === 'high' ? 'High scenario' : 'Mid scenario';
      document.querySelectorAll('#example-kpis .kpi-card .kpi-meta').forEach((metaNode) => {
        if (!metaNode) return;
        if (metaNode.textContent?.toLowerCase().includes('estimate')) return;
        metaNode.textContent = label;
      });
    };

    const kpis = [
      {
        id: 'NPV',
        byScenario: {
          low: ['npv_low', 'npv_p90'],
          mid: ['npv_mid', 'npv_base', 'npv', 'project_npv'],
          high: ['npv_high', 'npv_p50'],
        },
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
        },
      },
      {
        id: 'IRR',
        byScenario: {
          low: ['irr_low', 'irr_p90'],
          mid: ['irr_mid', 'irr_base', 'irr', 'project_irr'],
          high: ['irr_high', 'irr_p50'],
        },
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${(n * 100).toFixed(1)}%`;
        },
      },
      {
        id: 'Total Credits',
        byScenario: {
          low: ['total_credits_base', 'total_credits', 'credits_total'],
          mid: ['total_credits_base', 'total_credits', 'credits_total'],
          high: ['total_credits_base', 'total_credits', 'credits_total'],
        },
        format: (v) => {
          return formatCompactNumber(v);
        },
      },
      {
        id: 'Break-even Price',
        byScenario: {
          low: ['break_even_price_low', 'breakeven_price_low', 'break_even_price', 'breakeven_price'],
          mid: ['break_even_price_mid', 'breakeven_price_mid', 'break_even_price', 'breakeven_price'],
          high: ['break_even_price_high', 'breakeven_price_high', 'break_even_price', 'breakeven_price'],
        },
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)}/tCO2e`;
        },
      },
      {
        id: 'Payback Period',
        byScenario: {
          low: ['payback_low', 'payback_year_low', 'payback_period_low', 'payback_year', 'payback_period', 'payback_years'],
          mid: ['payback_mid', 'payback_year_mid', 'payback_period_mid', 'payback_year', 'payback_period', 'payback_years'],
          high: ['payback_high', 'payback_year_high', 'payback_period_high', 'payback_year', 'payback_period', 'payback_years'],
        },
        format: (v) => {
          const n = parseNumber(v);
          if (n === null) return String(v).trim();
          return `${Math.round(n)}`;
        },
      },
    ];

    const renderScenario = (scenario) => {
      const cards = document.querySelectorAll('#example-kpis .kpi-card');
      cards.forEach((card) => {
        const title = card.querySelector('h3')?.textContent?.trim();
        const body = card.querySelector('.kpi-value');
        if (!title || !body) return;
        const cfg = kpis.find((k) => k.id === title);
        if (!cfg) return;

        const keys = cfg.byScenario?.[scenario] || cfg.byScenario?.mid || [];
        const rawValue = keys.map((k) => map.get(k)).find((v) => v !== undefined && String(v).trim() !== '');
        if (!rawValue) return;
        body.textContent = cfg.format ? cfg.format(rawValue, map) : String(rawValue).trim();
      });

      const baseRevenue = rows.map((r) => r.revenue_base);
      const p50Revenue = rows.map((r) => r.revenue_p50);
      const p90Revenue = rows.map((r) => r.revenue_p90);

      let revBase = baseRevenue;
      let revP50 = p50Revenue;
      let revP90 = p90Revenue;

      if (scenario === 'low' || scenario === 'high') {
        const scenarioBase = rows.map((r) => (scenario === 'low' ? r.revenue_low : r.revenue_high));
        revBase = scenarioBase.map((v, i) => (v !== null && v !== undefined ? v : baseRevenue[i]));
        revP50 = revBase.map((v, i) => {
          if (!baseRevenue[i]) return p50Revenue[i];
          return p50Revenue[i] * (v / baseRevenue[i]);
        });
        revP90 = revBase.map((v, i) => {
          if (!baseRevenue[i]) return p90Revenue[i];
          return p90Revenue[i] * (v / baseRevenue[i]);
        });
      }

      buildLineChart('revenue-chart', 'Projected revenue', labels, [
        {
          label: 'Base',
          data: revBase,
          borderColor: '#1F3D2B',
          backgroundColor: '#1F3D2B',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'P50',
          data: revP50,
          borderColor: '#4F7C5A',
          backgroundColor: '#4F7C5A',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'P90',
          data: revP90,
          borderColor: '#A7BFA9',
          backgroundColor: '#A7BFA9',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
      ]);

      buildLineChart('credits-chart', 'Projected credit issuance', labels, [
        {
          label: 'Base',
          data: rows.map((r) => r.credits_base),
          borderColor: '#1F3D2B',
          backgroundColor: '#1F3D2B',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'P50',
          data: rows.map((r) => r.credits_p50),
          borderColor: '#4F7C5A',
          backgroundColor: '#4F7C5A',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'P90',
          data: rows.map((r) => r.credits_p90),
          borderColor: '#A7BFA9',
          backgroundColor: '#A7BFA9',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
      ]);
    };

    const buildScenarioInsights = () => {
      const pickValue = (keys) => parseNumber(keys.map((k) => map.get(k)).find((v) => v !== undefined && String(v).trim() !== ''));
      const compactUsd = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
      const fullUsd = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
      const signedPct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

      const revenueLow = rows.reduce((sum, r) => sum + (parseNumber(r.revenue_low) || 0), 0);
      const revenueMid = rows.reduce((sum, r) => sum + (parseNumber(r.revenue_base) || 0), 0);
      const revenueHigh = rows.reduce((sum, r) => sum + (parseNumber(r.revenue_high) || 0), 0);

      const npvLow = pickValue(['npv_low', 'npv_p90']);
      const npvMid = pickValue(['npv_mid', 'npv_base']);
      const npvHigh = pickValue(['npv_high', 'npv_p50']);
      const irrLow = pickValue(['irr_low', 'irr_p90']);
      const irrMid = pickValue(['irr_mid', 'irr_base']);
      const irrHigh = pickValue(['irr_high', 'irr_p50']);
      const paybackLow = pickValue(['payback_low', 'payback_year']);
      const paybackMid = pickValue(['payback_mid', 'payback_year']);
      const paybackHigh = pickValue(['payback_high', 'payback_year']);
      const breakEven = parseNumber(map.get('break_even_price'));

      const downsideVsMid = revenueMid > 0 ? (revenueLow - revenueMid) / revenueMid : null;
      const upsideVsMid = revenueMid > 0 ? (revenueHigh - revenueMid) / revenueMid : null;

      let classification = 'Conditionally investable';
      if (npvLow !== null && npvMid !== null && npvHigh !== null && npvLow < 0 && npvMid < 0 && npvHigh < 0) {
        classification = 'Not viable';
      } else if (npvLow !== null && npvMid !== null && npvLow < 0 && npvMid <= 0) {
        classification = 'Marginal';
      } else if (npvLow !== null && npvMid !== null && npvHigh !== null && npvLow > 0 && npvMid > 0 && npvHigh > 0) {
        classification = 'Investable';
      }
      if (classification === 'Investable' && irrLow !== null && irrMid !== null && irrHigh !== null && irrLow >= 0.1 && irrMid >= 0.12 && irrHigh >= 0.15) {
        classification = 'Highly attractive';
      }

      const indicates = [
        breakEven !== null
          ? `The project starts to work at about ${fullUsd(breakEven)}/tCO2e. It becomes attractive when carbon prices stay above that level, not just for a short period.`
          : 'The project works only if carbon prices stay clearly above break-even for a sustained period.',
        downsideVsMid !== null && upsideVsMid !== null
          ? `Results are very sensitive to price: compared with Mid, total revenue is ${signedPct(downsideVsMid)} in Low and ${signedPct(upsideVsMid)} in High.`
          : 'Results are highly price-sensitive across Low, Mid, and High scenarios.',
        npvLow !== null && irrLow !== null
          ? `In the Low scenario, risk is ${npvLow > 0 ? 'still present' : 'high'}: NPV is ${compactUsd(npvLow)} and IRR is ${formatPercent(irrLow)}. This means weak prices can quickly make the project hard to fund.`
          : 'The Low scenario should be treated as the main risk test before committing capital.',
        npvHigh !== null && irrHigh !== null
          ? `In the High scenario, returns are much stronger (NPV ${compactUsd(npvHigh)}, IRR ${formatPercent(irrHigh)}), showing good upside when stronger prices are achieved.`
          : 'There is meaningful upside if stronger prices can be secured.',
        `This project is best suited to investors and buyers who can agree price protection (for example, a floor-price offtake), not buyers relying on open-market prices.`
      ];

      const nextSteps = [
        `Secure downside protection first: agree a minimum contracted carbon price above break-even before investing further.`,
        `Lead with a pricing strategy, not a volume story. Focus on buyers willing to pay for quality and long-term delivery confidence.`,
        `Reduce execution risk with phased spending, tighter assumptions, and clear go/no-go checkpoints tied to contracted price and returns.`,
        `Keep upside optional: structure contracts so you can benefit from higher prices, but do not rely on them in the base case.`
      ];

      if (paybackLow !== null || paybackMid !== null || paybackHigh !== null) {
        nextSteps[2] = `${nextSteps[2]} Use payback gates (${paybackLow !== null ? Math.round(paybackLow) : 'n/a'}/${paybackMid !== null ? Math.round(paybackMid) : 'n/a'}/${paybackHigh !== null ? Math.round(paybackHigh) : 'n/a'}) to set pace of capital deployment.`;
      }

      setInsights({ classification, indicates, nextSteps });
    };

    const scenarioFromOutput = String(scenario || '').trim().toLowerCase();
    const normalizeScenario = (value) => {
      if (value === 'low' || value === 'low price' || value === 'p90') return 'low';
      if (value === 'high' || value === 'high price' || value === 'p50') return 'high';
      return 'mid';
    };

    const initialScenario = normalizeScenario(scenarioFromOutput || scenarioSelect?.value || 'mid');
    if (scenarioSelect) scenarioSelect.value = initialScenario;
    updateKpiMetaLabels(initialScenario);
    renderScenario(initialScenario);
    buildScenarioInsights();

    if (scenarioSelect) {
      scenarioSelect.addEventListener('change', () => {
        const selected = scenarioSelect.value || 'mid';
        updateKpiMetaLabels(selected);
        renderScenario(selected);
        buildScenarioInsights();
      });
    }
  } catch (error) {
    showEmpty();
  }
};

initExampleOutputCharts();


const COUNTRY_LIST = [
  ['AF','Afghanistan'],['AL','Albania'],['DZ','Algeria'],['AD','Andorra'],['AO','Angola'],['AG','Antigua and Barbuda'],['AR','Argentina'],['AM','Armenia'],['AU','Australia'],['AT','Austria'],['AZ','Azerbaijan'],['BS','Bahamas'],['BH','Bahrain'],['BD','Bangladesh'],['BB','Barbados'],['BY','Belarus'],['BE','Belgium'],['BZ','Belize'],['BJ','Benin'],['BT','Bhutan'],['BO','Bolivia'],['BA','Bosnia and Herzegovina'],['BW','Botswana'],['BR','Brazil'],['BN','Brunei'],['BG','Bulgaria'],['BF','Burkina Faso'],['BI','Burundi'],['CV','Cabo Verde'],['KH','Cambodia'],['CM','Cameroon'],['CA','Canada'],['CF','Central African Republic'],['TD','Chad'],['CL','Chile'],['CN','China'],['CO','Colombia'],['KM','Comoros'],['CG','Congo'],['CR','Costa Rica'],['CI','Côte d’Ivoire'],['HR','Croatia'],['CU','Cuba'],['CY','Cyprus'],['CZ','Czechia'],['CD','DR Congo'],['DK','Denmark'],['DJ','Djibouti'],['DM','Dominica'],['DO','Dominican Republic'],['EC','Ecuador'],['EG','Egypt'],['SV','El Salvador'],['GQ','Equatorial Guinea'],['ER','Eritrea'],['EE','Estonia'],['SZ','Eswatini'],['ET','Ethiopia'],['FJ','Fiji'],['FI','Finland'],['FR','France'],['GA','Gabon'],['GM','Gambia'],['GE','Georgia'],['DE','Germany'],['GH','Ghana'],['GR','Greece'],['GD','Grenada'],['GT','Guatemala'],['GN','Guinea'],['GW','Guinea-Bissau'],['GY','Guyana'],['HT','Haiti'],['HN','Honduras'],['HU','Hungary'],['IS','Iceland'],['IN','India'],['ID','Indonesia'],['IR','Iran'],['IQ','Iraq'],['IE','Ireland'],['IL','Israel'],['IT','Italy'],['JM','Jamaica'],['JP','Japan'],['JO','Jordan'],['KZ','Kazakhstan'],['KE','Kenya'],['KI','Kiribati'],['KW','Kuwait'],['KG','Kyrgyzstan'],['LA','Laos'],['LV','Latvia'],['LB','Lebanon'],['LS','Lesotho'],['LR','Liberia'],['LY','Libya'],['LI','Liechtenstein'],['LT','Lithuania'],['LU','Luxembourg'],['MG','Madagascar'],['MW','Malawi'],['MY','Malaysia'],['MV','Maldives'],['ML','Mali'],['MT','Malta'],['MH','Marshall Islands'],['MR','Mauritania'],['MU','Mauritius'],['MX','Mexico'],['FM','Micronesia'],['MD','Moldova'],['MC','Monaco'],['MN','Mongolia'],['ME','Montenegro'],['MA','Morocco'],['MZ','Mozambique'],['MM','Myanmar'],['NA','Namibia'],['NR','Nauru'],['NP','Nepal'],['NL','Netherlands'],['NZ','New Zealand'],['NI','Nicaragua'],['NE','Niger'],['NG','Nigeria'],['KP','North Korea'],['MK','North Macedonia'],['NO','Norway'],['OM','Oman'],['PK','Pakistan'],['PW','Palau'],['PA','Panama'],['PG','Papua New Guinea'],['PY','Paraguay'],['PE','Peru'],['PH','Philippines'],['PL','Poland'],['PT','Portugal'],['QA','Qatar'],['RO','Romania'],['RU','Russia'],['RW','Rwanda'],['KN','Saint Kitts and Nevis'],['LC','Saint Lucia'],['VC','Saint Vincent and the Grenadines'],['WS','Samoa'],['SM','San Marino'],['ST','Sao Tome and Principe'],['SA','Saudi Arabia'],['SN','Senegal'],['RS','Serbia'],['SC','Seychelles'],['SL','Sierra Leone'],['SG','Singapore'],['SK','Slovakia'],['SI','Slovenia'],['SB','Solomon Islands'],['SO','Somalia'],['ZA','South Africa'],['KR','South Korea'],['SS','South Sudan'],['ES','Spain'],['LK','Sri Lanka'],['SD','Sudan'],['SR','Suriname'],['SE','Sweden'],['CH','Switzerland'],['SY','Syria'],['TJ','Tajikistan'],['TZ','Tanzania'],['TH','Thailand'],['TL','Timor-Leste'],['TG','Togo'],['TO','Tonga'],['TT','Trinidad and Tobago'],['TN','Tunisia'],['TR','Turkey'],['TM','Turkmenistan'],['TV','Tuvalu'],['UG','Uganda'],['UA','Ukraine'],['AE','United Arab Emirates'],['GB','United Kingdom'],['US','United States'],['UY','Uruguay'],['UZ','Uzbekistan'],['VU','Vanuatu'],['VE','Venezuela'],['VN','Vietnam'],['YE','Yemen'],['ZM','Zambia'],['ZW','Zimbabwe']
];

const initCountrySelects = () => {
  document.querySelectorAll('[data-country-select]').forEach((select) => {
    select.innerHTML = '<option value="" selected disabled>Select a country</option>';
    COUNTRY_LIST.forEach(([code, name]) => {
      const o = document.createElement('option');
      o.value = code;
      o.textContent = name;
      select.appendChild(o);
    });
    const unsure = document.createElement('option');
    unsure.value = 'UNSURE';
    unsure.textContent = 'Unsure';
    select.appendChild(unsure);
  });
};

const isEmailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const getCurrentYear = () => new Date().getFullYear();

const initFormWizard = (form, totalSteps) => {
  if (!form) return;
  const steps = Array.from(form.querySelectorAll('.form-step'));
  const backBtn = form.querySelector('[data-step-back]');
  const nextBtn = form.querySelector('[data-step-next]');
  const submitBtn = form.querySelector('[data-step-submit]');
  const currentNode = form.querySelector('[data-step-current]');
  const fillNode = form.querySelector('[data-progress-fill]');
  let current = 0;

  const validateStep = () => {
    const fields = steps[current].querySelectorAll('input,select,textarea');
    for (const f of fields) {
      if (!f.checkValidity()) { f.reportValidity(); return false; }
    }
    return true;
  };

  const render = () => {
    steps.forEach((s, i) => (s.hidden = i !== current));
    if (currentNode) currentNode.textContent = String(current + 1);
    if (fillNode) fillNode.style.width = `${((current + 1) / totalSteps) * 100}%`;
    if (backBtn) backBtn.hidden = current === 0;
    if (nextBtn) nextBtn.hidden = current === totalSteps - 1;
    if (submitBtn) submitBtn.hidden = current !== totalSteps - 1;
  };

  backBtn?.addEventListener('click', () => { current = Math.max(0, current - 1); render(); });
  nextBtn?.addEventListener('click', () => { if (!validateStep()) return; current = Math.min(totalSteps - 1, current + 1); render(); });
  render();
};

const collectPayload = (form) => {
  const payload = {};
  const gaps = [];
  const fields = form.querySelectorAll('input[name],select[name],textarea[name]');
  fields.forEach((f) => {
    const { name, type } = f;
    if (!name || name === 'payload_json' || name === 'flagged_gaps') return;
    if (type === 'file') {
      const file = f.files?.[0];
      payload[name] = file ? `upload://${file.name}` : '';
      return;
    }
    if (type === 'checkbox') return;
    let v = String(f.value || '').trim();
    if (v === 'Unsure' || v === 'UNSURE' || v === 'Unknown') gaps.push(name);
    payload[name] = v;
  });
  form.querySelectorAll('[data-array-name]').forEach((wrap) => {
    const key = wrap.getAttribute('data-array-name');
    payload[key] = Array.from(wrap.querySelectorAll('input[type="checkbox"]:checked')).map((c) => c.value);
  });
  return { payload, gaps };
};

const attachOtherToggle = () => {
  document.querySelectorAll('[data-other-toggle]').forEach((select) => {
    const target = document.getElementById(select.getAttribute('data-other-toggle'));
    const input = target?.querySelector('input');
    const update = () => {
      const on = select.value === 'Other (specify)';
      if (target) target.hidden = !on;
      if (input) input.required = on;
    };
    select.addEventListener('change', update);
    update();
  });
};

const attachFullReviewLogic = () => {
  const form = document.querySelector('#full-review-form');
  if (!form) return;

  const tenure = form.querySelector('#full-tenure');

  const startYearInput = form.querySelector('[name="start_year_of_activities"]');
  if (startYearInput) startYearInput.max = String(getCurrentYear() + 10);

  const startYearUnsure = form.querySelector('[name="start_year_unsure"]');
  const syncStartYearRequired = () => {
    if (!startYearInput) return;
    const unsure = !!startYearUnsure?.checked;
    startYearInput.required = !unsure;
    if (unsure) startYearInput.value = '';
  };
  startYearUnsure?.addEventListener('change', syncStartYearRequired);
  syncStartYearRequired();


  const fpicWrap = form.querySelector('#fpic-wrap');
  const fpicSelect = fpicWrap?.querySelector('select');
  const updateFpic = () => {
    const show = tenure?.value === 'Community or customary';
    if (fpicWrap) fpicWrap.hidden = !show;
    if (fpicSelect) fpicSelect.required = !!show;
  };
  tenure?.addEventListener('change', updateFpic);
  updateFpic();

  const countrySelect = form.querySelector('select[name="country"]');
  const defaultButtons = form.querySelectorAll('[data-default-trigger]');
  const updateDefaultButtons = () => {
    const enabled = !!countrySelect?.value;
    const countryLabel = countrySelect?.selectedOptions?.[0]?.textContent || 'country';
    defaultButtons.forEach((btn) => {
      btn.disabled = !enabled;
      btn.title = enabled ? '' : 'Select a country first.';
      btn.textContent = `Use our default for ${enabled ? countryLabel : 'Country'}`;
    });
  };
  countrySelect?.addEventListener('change', updateDefaultButtons);
  updateDefaultButtons();

  defaultButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const field = btn.getAttribute('data-default-trigger');
      const country = countrySelect?.value;
      if (!country) return;
      try {
        const res = await fetch(`/api/defaults?country=${encodeURIComponent(country)}&field=${encodeURIComponent(field)}`);
        const data = await res.json().catch(() => ({}));
        const target = form.querySelector(`[name="${field}"]`);
        if (target) {
          target.value = data.value || 'Default applied';
          target.classList.add('using-default');
        }
      } catch {
        const target = form.querySelector(`[name="${field}"]`);
        if (target) {
          target.value = 'Default applied';
          target.classList.add('using-default');
        }
      }
    });
  });

  const optionalKeys = ['species_or_system','expected_survival_rate','establishment_cost_per_ha','annual_maintenance_per_ha','smallholder_involvement','jurisdictional_scale','permanence_risk_notes','co_benefit_emphasis','geolocation_lat','geolocation_lng','geolocation_estimated_hectares','geolocation_file'];
  const meter = form.querySelector('#review-confidence');
  const refreshConfidence = () => {
    let done = 0;
    optionalKeys.forEach((k) => {
      const node = form.querySelector(`[name="${k}"]`);
      if (!node) return;
      if (node.type === 'file' ? node.files?.length : String(node.value || '').trim()) done += 1;
    });
    const pct = Math.round((done / optionalKeys.length) * 100);
    if (meter) meter.textContent = `${pct}%`;
  };
  form.addEventListener('input', refreshConfidence);
  form.addEventListener('change', refreshConfidence);
  refreshConfidence();

  const saveLink = document.querySelector('#save-resume-link');
  saveLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]')?.value?.trim();
    if (!isEmailValid(email)) {
      alert('Enter a valid email first.');
      return;
    }
    localStorage.setItem('full-review-draft', JSON.stringify({ ts: Date.now(), email, values: Object.fromEntries(new FormData(form).entries()) }));
    alert('Draft saved. Resume link email is stubbed and should be wired server-side.');
  });
};

const validateFiles = (form) => {
  const checks = [
    ['land_rights_supporting_document', 10 * 1024 * 1024, ['pdf','jpg','jpeg','png','doc','docx']],
    ['geolocation_file', 25 * 1024 * 1024, ['kml','kmz','geojson','shp']]
  ];
  for (const [name, max, exts] of checks) {
    const node = form.querySelector(`[name="${name}"]`);
    const f = node?.files?.[0];
    if (!f) continue;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!exts.includes(ext) || f.size > max) {
      alert(`Invalid file for ${name}.`);
      return false;
    }
  }
  return true;
};

const bindSubmissions = () => {
  ['#snapshot-form', '#full-review-form'].forEach((sel) => {
    const form = document.querySelector(sel);
    if (!form) return;
    form.addEventListener('submit', (event) => {
      const email = form.querySelector('[name="email"]')?.value;
      const land = Number(form.querySelector('[name="land_area_ha"]')?.value || 0);
      const startYear = Number(form.querySelector('[name="start_year_of_activities"]')?.value || 0);
      if (!isEmailValid(email)) { event.preventDefault(); alert('Please provide a valid email.'); return; }
      if (!(land > 0 && land <= 1000000)) { event.preventDefault(); alert('Land area must be > 0 and <= 1,000,000.'); return; }
      if (startYear && (startYear < 2020 || startYear > getCurrentYear() + 10)) { event.preventDefault(); alert('Start year is out of range.'); return; }
      if (!validateFiles(form)) { event.preventDefault(); return; }
      const { payload, gaps } = collectPayload(form);
      const p = form.querySelector('[name="payload_json"]');
      const g = form.querySelector('[name="flagged_gaps"]');
      if (p) p.value = JSON.stringify(payload);
      if (g) g.value = JSON.stringify(gaps);
    });
  });
};

initCountrySelects();
attachOtherToggle();
initFormWizard(document.querySelector('#snapshot-form'), 3);
initFormWizard(document.querySelector('#full-review-form'), 5);
attachFullReviewLogic();
bindSubmissions();
