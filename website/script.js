const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

window.addEventListener('pageshow', () => {
  if (window.location.hash) {
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', cleanUrl);
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
  const insightList = document.querySelector('#insight-list');
  const scenarioSelect = document.querySelector('#scenario-select');

  const setInsights = (items) => {
    if (!insightStrip || !insightList || !items?.length) return;
    insightList.innerHTML = '';
    items.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      insightList.appendChild(li);
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
        const outputRow = parseCsvRow(outputLines[1]);
        outputHeaders.forEach((header, i) => map.set(header, outputRow[i]));
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
        scenario && String(scenario).trim() ? `${String(scenario).trim()} scenario` : null,
      ].filter(Boolean);
      if (contextParts.length) {
        exampleProjectContext.textContent = `Illustrative pre-feasibility output, ${contextParts.join(' • ')}.`;
      }
    }

    const kpis = [
      {
        id: 'NPV',
        byScenario: {
          low: ['npv_p90'],
          mid: ['npv_base', 'npv', 'project_npv'],
          high: ['npv_p50'],
        },
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
        },
      },
      {
        id: 'IRR',
        byScenario: {
          low: ['irr_p90'],
          mid: ['irr_base', 'irr', 'project_irr'],
          high: ['irr_p50'],
        },
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${(n * 100).toFixed(1)}%`;
        },
      },
      {
        id: 'Total Credits',
        byScenario: {
          low: ['total_credits_p90'],
          mid: ['total_credits_base', 'total_credits', 'credits_total'],
          high: ['total_credits_p50'],
        },
        format: (v) => {
          return formatCompactNumber(v);
        },
      },
      {
        id: 'Break-even Price',
        byScenario: {
          low: ['break_even_price', 'breakeven_price'],
          mid: ['break_even_price', 'breakeven_price'],
          high: ['break_even_price', 'breakeven_price'],
        },
        format: (v) => {
          const n = parseNumber(v);
          return n === null ? String(v).trim() : `${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)}/tCO2e`;
        },
      },
      {
        id: 'Payback Period',
        byScenario: {
          low: ['payback_year', 'payback_period', 'payback_years'],
          mid: ['payback_year', 'payback_period', 'payback_years'],
          high: ['payback_year', 'payback_period', 'payback_years'],
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

      const revenueSeries = scenario === 'low'
        ? rows.map((r) => r.revenue_low)
        : scenario === 'high'
          ? rows.map((r) => r.revenue_high)
          : rows.map((r) => r.revenue_base);

      const creditsSeries = scenario === 'low'
        ? rows.map((r) => r.credits_p90)
        : scenario === 'high'
          ? rows.map((r) => r.credits_p50)
          : rows.map((r) => r.credits_base);

      const label = scenario === 'low' ? 'Low price' : scenario === 'high' ? 'High price' : 'Mid price';

      buildLineChart('revenue-chart', 'Projected revenue', labels, [{
        label,
        data: revenueSeries,
        borderColor: '#1F3D2B',
        backgroundColor: '#1F3D2B',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.3,
      }]);

      buildLineChart('credits-chart', 'Projected credit issuance', labels, [{
        label,
        data: creditsSeries,
        borderColor: '#4F7C5A',
        backgroundColor: '#4F7C5A',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.3,
      }]);
    };

    const initialScenario = scenarioSelect?.value || 'mid';
    renderScenario(initialScenario);

    if (scenarioSelect) {
      scenarioSelect.addEventListener('change', () => {
        renderScenario(scenarioSelect.value || 'mid');
      });
    }

    const finalRow = rows[rows.length - 1];
    const finalRevenue = parseNumber(finalRow?.revenue_base);
    const finalCredits = parseNumber(finalRow?.credits_base);
    const finalRevenueP90 = parseNumber(finalRow?.revenue_p90);
    const finalCreditsP90 = parseNumber(finalRow?.credits_p90);
    if (rows.length && finalRevenue !== null && finalCredits !== null && finalRevenueP90 !== null && finalCreditsP90 !== null) {
      const totalRevenue = parseNumber(map.get('total_revenue'));
      const totalCreditsBase = parseNumber(map.get('total_credits_base'));
      const creditDropP50 = parseNumber(map.get('credit_drop_p50'));
      const creditDropP90 = parseNumber(map.get('credit_drop_p90'));
      const npvDetPct = parseNumber(map.get('npv_deterioration_pct'));
      const irrBase = parseNumber(map.get('irr_base'));
      const breakEven = parseNumber(map.get('break_even_price'));

      const insight1 = totalRevenue !== null && totalCreditsBase !== null
        ? `Base-case output indicates ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(totalRevenue)} potential revenue from ${formatCompactNumber(totalCreditsBase)} total credits across the model period.`
        : `Base-case revenue trajectory reaches ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(finalRevenue)} by ${finalRow.year}.`;

      const insight2 = creditDropP50 !== null && creditDropP90 !== null
        ? `Risk-adjusted issuance falls by ${formatPercent(creditDropP50)} at P50 and ${formatPercent(creditDropP90)} at P90 versus base, so the downside spread is material.`
        : `P90 trajectory remains more conservative at ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(finalRevenueP90)} revenue and ${formatCompactNumber(finalCreditsP90)} credits.`;

      const insight3Parts = [];
      if (irrBase !== null) insight3Parts.push(`base IRR is ${formatPercent(irrBase)}`);
      if (breakEven !== null) insight3Parts.push(`break-even price is ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(breakEven)}/tCO2e`);
      if (npvDetPct !== null) insight3Parts.push(`NPV deterioration under downside assumptions is ${formatPercent(npvDetPct)}`);
      const insight3 = insight3Parts.length
        ? `Commercial resilience check: ${insight3Parts.join(', ')}.`
        : `Base-case credit issuance reaches ${formatCompactNumber(finalCredits)} credits by ${finalRow.year}.`;

      setInsights([
        insight1,
        insight2,
        insight3,
      ]);
    }
  } catch (error) {
    showEmpty();
  }
};

initExampleOutputCharts();

const intakeForm = document.querySelector('#intake-form.intake-wizard');
if (intakeForm) {
  const steps = Array.from(intakeForm.querySelectorAll('.form-step'));
  const backBtn = intakeForm.querySelector('#wizard-back');
  const nextBtn = intakeForm.querySelector('#wizard-next');
  const submitBtn = intakeForm.querySelector('#wizard-submit');
  const progress = intakeForm.querySelector('#wizard-progress');
  const landTypeSelect = intakeForm.querySelector('#land-type');
  const landTypeOtherWrap = intakeForm.querySelector('#land-type-other-wrap');
  const landTypeOther = intakeForm.querySelector('#land-type-other');
  let landTypeTouched = false;
  let currentStep = 0;

  const updateLandTypeOther = () => {
    if (!landTypeSelect || !landTypeOtherWrap || !landTypeOther) return;
    const selectedText = landTypeSelect.options[landTypeSelect.selectedIndex]?.textContent?.trim() || '';
    const isOther = selectedText === 'Other (specify)';
    const shouldShow = landTypeTouched && isOther;
    landTypeOtherWrap.hidden = !shouldShow;
    landTypeOther.required = shouldShow;
    if (!shouldShow) {
      landTypeOther.value = '';
    }
  };

  const updateStep = () => {
    steps.forEach((step, i) => {
      const active = i === currentStep;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
    });

    if (progress) {
      progress.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    }

    if (backBtn) backBtn.hidden = currentStep === 0;
    if (nextBtn) nextBtn.hidden = currentStep === steps.length - 1;
    if (submitBtn) submitBtn.hidden = currentStep !== steps.length - 1;

    const activeField = steps[currentStep]?.querySelector('input, select, textarea');
    if (activeField) activeField.focus();
  };

  const validateCurrentStep = () => {
    const fields = Array.from(steps[currentStep].querySelectorAll('input, select, textarea'));
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  };

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!validateCurrentStep()) return;
      currentStep = Math.min(steps.length - 1, currentStep + 1);
      updateStep();
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentStep = Math.max(0, currentStep - 1);
      updateStep();
    });
  }

  if (landTypeSelect) {
    landTypeSelect.addEventListener('change', () => {
      landTypeTouched = true;
      updateLandTypeOther();
    });
  }

  intakeForm.addEventListener('submit', (event) => {
    if (!validateCurrentStep()) {
      event.preventDefault();
    }
  });

  updateLandTypeOther();
  updateStep();
}
