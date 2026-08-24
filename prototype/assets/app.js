/**
 * MDT prototype — store, router, views, main.
 *
 * State is persisted to localStorage under STORAGE_KEY. The prototype rehydrates
 * from window.MDT_FIXTURES on first load or after a research-mode reset.
 *
 * All significant mutations must go through mutate(), which:
 *   1. applies the change,
 *   2. writes an audit event,
 *   3. persists to localStorage,
 *   4. re-renders.
 */
(function () {
  'use strict';

  const D = window.MDT_DOMAIN;
  const F = window.MDT_FIXTURES;
  const STORAGE_KEY = 'mdt-prototype-state:v1';

  /* =====================================================================
   * State store
   * ===================================================================== */

  let state = load();
  const listeners = [];

  // Holds the attempted date between the two "record test" question pages,
  // keyed by selection id. Not persisted — a page refresh mid-flow loses it.
  const pendingTestDates = {};

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion === F.schemaVersion) {
          return parsed;
        }
      }
    } catch (e) { /* ignore */ }
    return clone(F);
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Could not persist prototype state', e); }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function resetToFixtures() {
    state = clone(F);
    persist();
    notify();
  }

  function subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  function notify() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }

  /**
   * Apply a mutation function and record an audit event describing it.
   * mutation: (draftState) => { entityType, entityId, action, previousState?, newState?, reason? }
   */
  function mutate(mutation) {
    const draft = clone(state);
    const audit = mutation(draft);
    if (audit) {
      draft.auditEvents.push({
        id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        occurredAt: new Date().toISOString(),
        performedBy: state.currentUser.id,
        ...audit
      });
    }
    state = draft;
    persist();
    notify();
  }

  /* =====================================================================
   * Rendering helpers
   * ===================================================================== */

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const escape = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // The MoJ date picker works with plain text d/m/yyyy values, not ISO dates —
  // these convert between that display format and the ISO dates stored in state.
  function isoToUkDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    return `${parseInt(m[3], 10)}/${parseInt(m[2], 10)}/${m[1]}`;
  }
  function ukDateToIso(str) {
    const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec((str || '').trim());
    if (!m) return null;
    const day = parseInt(m[1], 10), month = parseInt(m[2], 10), year = parseInt(m[3], 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escape(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escape(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function formatPercent(v) {
    if (v == null) return '—';
    return `${Math.round(v * 100)}%`;
  }

  const tag = (text, modifier) =>
    `<strong class="govuk-tag govuk-tag--${modifier || 'blue'}">${escape(text)}</strong>`;

  /**
   * Plain-text version of a "could not test" reason, for use in confirmation
   * copy (rather than quoting the raw policy-list value).
   */
  function reasonToPlainText(reason) {
    const map = {
      'Adjudication': 'the prisoner is subject to an adjudication',
      'Discharged': 'the prisoner had been discharged',
      'Fatal flaw in chain of custody': 'there was a fatal flaw in the chain of custody',
      'Internal medical appointment': 'the prisoner was at an internal medical appointment',
      'Medically unfit': 'the prisoner was medically unfit',
      'Offending behavior programme': 'the prisoner was at an offending behaviour programme',
      'Abandoned due to operational reasons': 'the test was abandoned due to operational reasons',
      'Out of establishment': 'the prisoner was out of the establishment',
      'Refused': 'the prisoner refused the test',
      'Scheduled discharge': 'the prisoner had a scheduled discharge',
      'Transferred': 'the prisoner had transferred out',
      'Visit': 'the prisoner was on a visit'
    };
    return map[reason] || 'the test could not be completed';
  }

  /**
   * Short "due to X" phrase for a "could not test" reason, for use in list
   * Action column text (e.g. "Replaced by a reserve due to X").
   */
  function reasonToActionPhrase(reason) {
    const map = {
      'Adjudication': 'an adjudication',
      'Discharged': 'being discharged',
      'Fatal flaw in chain of custody': 'a fatal flaw in the chain of custody',
      'Internal medical appointment': 'an internal medical appointment',
      'Medically unfit': 'being medically unfit',
      'Offending behavior programme': 'attending an offending behaviour programme',
      'Abandoned due to operational reasons': 'operational reasons',
      'Out of establishment': 'being out of the establishment',
      'Refused': 'refusing the test',
      'Scheduled discharge': 'a scheduled discharge',
      'Transferred': 'being transferred',
      'Visit': 'being on a visit',
      'Released': 'being released',
      'At court': 'being at court'
    };
    return map[reason] || 'the reason recorded';
  }

  /**
   * Action for a selection — shared logic for the main/reserve list's Action
   * column and the prisoner profile's drug test history Action column. The
   * adjudication link only shows when the selection's own reporting month is
   * the current month.
   */
  function actionForSelection(state, sel, month) {
    const isActivatedReserve = sel.listType === 'reserve' && !!sel.originalSelectionId;
    if (sel.listType === 'reserve' && !isActivatedReserve) return null;
    const isCurrentMonth = !!(D.currentMonth(state) && month && D.currentMonth(state).id === month.id);
    const reserveActionOutstanding = (s) => s && (s.status === 'not-started' || s.status === 'attempt-required' || s.status === 'priority');
    const activatedReserves = month ? D.reserves(state, month.id).filter(r => r.originalSelectionId) : [];
    const activatedReserveIndex = activatedReserves.findIndex(r => r.id === sel.id);
    const firstOutstandingActivatedIndex = activatedReserves.findIndex(reserveActionOutstanding);
    const blockedByEarlierActivatedReserve =
      isActivatedReserve &&
      activatedReserveIndex >= 0 &&
      firstOutstandingActivatedIndex >= 0 &&
      activatedReserveIndex > firstOutstandingActivatedIndex &&
      reserveActionOutstanding(sel);
    const canRecord = sel.status === 'not-started' || sel.status === 'attempt-required' || sel.status === 'sample-collected';
    const alreadyTested = sel.status === 'completed' || (sel.status === 'exception' && (sel.exceptionReason || '').toLowerCase() === 'refused');

    if (sel.replacementSelectionId) {
      const isRefusal = (sel.exceptionReason || '').toLowerCase() === 'refused';
      return { type: 'text', html: isRefusal
        ? `Replaced by a reserve due to refusing the test.${isCurrentMonth ? ' <a class="govuk-link" href="#/adjudications" data-mdt-dummy="adjudication">Continue to adjudication service</a>' : ''}`
        : `Replaced by a reserve due to ${escape(reasonToActionPhrase(sel.exceptionReason))}` };
    }
    if (blockedByEarlierActivatedReserve) return { type: 'text', html: 'Test previous reserve first' };
    if (alreadyTested) return { type: 'text', html: 'Sample taken' };
    if (!month) return null;
    if (sel.status === 'exception') return { type: 'link', href: `#/mdt/${month.id}/selection/${sel.id}/use-reserve`, label: 'Use a reserve' };
    if (canRecord) return { type: 'link', href: `#/mdt/${month.id}/selection/${sel.id}/test`, label: 'Record test' };
    return null;
  }

  function renderActionCell(action) {
    if (!action) return '';
    return action.type === 'link'
      ? `<a class="govuk-link" href="${escape(action.href)}">${escape(action.label)}</a>`
      : `<span class="govuk-body-m govuk-!-margin-0">${action.html}</span>`;
  }

  function priorityBadge(sel, prisoner) {
    const p = D.priorityFor(sel, prisoner, state.now || new Date().toISOString());
    return `<span class="mdt-priority mdt-priority--${p.code}" title="${escape(p.reason)}">${escape(p.label)}</span>`;
  }

  // Breadcrumb text for a month workspace link — the current month is always
  // labelled "Random lists for current month" rather than its date label.
  function monthCrumbText(m) {
    const current = D.currentMonth(state);
    return (current && m && m.id === current.id) ? 'Random lists for current month' : m.label;
  }

  function breadcrumbs(items) {
    const html = items.map((it, i) => {
      const isLast = i === items.length - 1;
      if (isLast || !it.href) {
        return `<li class="govuk-breadcrumbs__list-item"${isLast ? ' aria-current="page"' : ''}>${escape(it.text)}</li>`;
      }
      return `<li class="govuk-breadcrumbs__list-item"><a class="govuk-breadcrumbs__link" href="${escape(it.href)}">${escape(it.text)}</a></li>`;
    }).join('');
    return `<ol class="govuk-breadcrumbs__list">${html}</ol>`;
  }

  // DPS mini profile header — compact prisoner identity/location strip shown under a page heading.
  function dummyPhotoDataUri() {
    const svg = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-hidden="true">'
      + '<rect width="80" height="80" fill="#dde5ee"/>'
      + '<circle cx="40" cy="29" r="14" fill="#8b98a8"/>'
      + '<path d="M16 72c2-16 14-24 24-24s22 8 24 24" fill="#8b98a8"/>'
      + '</svg>'
    );
    return `data:image/svg+xml,${svg}`;
  }

  function profilePhoto(extraClass) {
    return `
      <div class="dps-mini-profile-header__photo-wrap${extraClass ? ` ${extraClass}` : ''}" aria-hidden="true">
        <img class="dps-mini-profile-header__photo" src="${dummyPhotoDataUri()}" alt="">
      </div>`;
  }

  function miniProfileHeader(p) {
    return `
      <div class="dps-mini-profile-header">
        ${profilePhoto()}
        <dl>
          <dt class="govuk-visually-hidden">Prisoner</dt>
          <dd>
            <a class="govuk-link" href="#" target="_blank" rel="noopener noreferrer"><strong>${escape(p.displayName)}</strong></a>
            <br>
            ${escape(p.prisonNumber)}
          </dd>
        </dl>
        <dl>
          <dt>Location</dt>
          <dd>${escape(p.location)}</dd>
        </dl>
      </div>`;
  }

  function errorSummary(errors) {
    if (!errors || !errors.length) return '';
    const items = errors.map(e =>
      `<li><a href="#field-${escape(e.field)}">${escape(e.message)}</a></li>`
    ).join('');
    return `
      <div class="govuk-error-summary" data-module="govuk-error-summary" tabindex="-1">
        <div role="alert">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">${items}</ul>
          </div>
        </div>
      </div>`;
  }

  function fieldErrorMsg(errors, field) {
    const e = (errors || []).find(x => x.field === field);
    if (!e) return '';
    return `<p class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escape(e.message)}</p>`;
  }

  function fieldErrorText(errors, field) {
    const e = (errors || []).find(x => x.field === field);
    return e ? e.message : '';
  }

  /* =====================================================================
   * Router — hash-based, tiny path matcher.
   * ===================================================================== */

  const routes = [];
  function route(pattern, handler) { routes.push({ pattern, handler }); }

  function matchRoute(path) {
    for (const r of routes) {
      const paramNames = [];
      const rx = new RegExp('^' + r.pattern.replace(/:[^/]+/g, (m) => {
        paramNames.push(m.slice(1));
        return '([^/]+)';
      }) + '$');
      const m = path.match(rx);
      if (m) {
        const params = {};
        paramNames.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
        return { handler: r.handler, params };
      }
    }
    return null;
  }

  function currentHashValue() {
    const hash = window.location.hash || '#/';
    return hash.slice(1) || '/';
  }

  function currentPath() {
    const hashValue = currentHashValue();
    const q = hashValue.indexOf('?');
    return q >= 0 ? (hashValue.slice(0, q) || '/') : hashValue;
  }

  function currentQueryParams() {
    const hashValue = currentHashValue();
    const q = hashValue.indexOf('?');
    if (q < 0) return {};
    const query = hashValue.slice(q + 1);
    if (!query) return {};
    return query.split('&').reduce((acc, pair) => {
      if (!pair) return acc;
      const [rawK, rawV = ''] = pair.split('=');
      if (!rawK) return acc;
      const key = decodeURIComponent(rawK);
      const value = decodeURIComponent(rawV);
      acc[key] = value;
      return acc;
    }, {});
  }

  function navigate(path) { window.location.hash = path; }

  /**
   * "Start over" is deliberately subtle — a plain link inside the prototype
   * phase banner — so participants don't ask about it during research sessions.
   * Only shown while viewing a month's editable workspace (renderTabView).
   */
  function updatePhaseBannerStartOver(monthId) {
    const container = $('.govuk-phase-banner__content');
    if (!container) return;
    let link = container.querySelector('#phase-banner-start-over');
    const month = monthId ? D.monthFor(state, monthId) : null;
    if (!month) {
      if (link) link.remove();
      return;
    }
    if (!link) {
      link = document.createElement('a');
      link.id = 'phase-banner-start-over';
      link.href = '#';
      link.className = 'govuk-link govuk-!-margin-left-3 mdt-phase-banner__start-over';
      container.appendChild(link);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const m = D.monthFor(state, link.dataset.monthId);
        if (!m) return;
        if (window.confirm(`Start this month over? This clears all lists and any recorded activity for ${m.label}. Fictional data only.`)) {
          actionResetCurrentMonth({ monthId: link.dataset.monthId }, {});
        }
      });
    }
    link.dataset.monthId = monthId;
    link.textContent = 'Start over';
  }

  /**
   * Subtle link in the black top nav bar that switches between the stripped-down
   * "simple view" (no ordering-details dropdown, no metrics) and the regular view
   * of the current month's workspace. Flips its label/target depending on which
   * of those two views is currently showing.
   */
  function updateHeaderSimpleViewLink(monthId) {
    const link = $('#header-simple-view-link');
    if (!link) return;
    const month = monthId ? D.monthFor(state, monthId) : null;
    if (!month) {
      link.hidden = true;
      return;
    }
    link.hidden = false;
    const onSimpleView = currentPath() === `/mdt/${month.id}/simple-view`;
    link.href = onSimpleView ? `#/mdt/${month.id}` : `#/mdt/${month.id}/simple-view`;
    link.textContent = onSimpleView ? 'Complex view' : 'Simple view';
  }

  function render() {
    const path = currentPath();
    const queryParams = currentQueryParams();
    const match = matchRoute(path);
    const root = $('#view-root');
    const bc = $('#breadcrumbs');
    const serviceNameLink = $('#header-service-name');
    if (serviceNameLink) serviceNameLink.hidden = (path === '/');
    if (!match) {
      document.title = 'Page not found — MDT prototype';
      bc.innerHTML = breadcrumbs([{ href: '#/', text: 'Home' }, { text: 'Page not found' }]);
      root.innerHTML = `
        <h1 class="govuk-heading-xl">Page not found</h1>
        <p class="govuk-body">The path <code>${escape(path)}</code> is not a valid route.</p>
        <p class="govuk-body"><a class="govuk-link" href="#/">Return to the Digital Prison Services homepage</a>.</p>`;
      updatePhaseBannerStartOver(D.currentMonth(state) ? D.currentMonth(state).id : null);
      updateHeaderSimpleViewLink(D.currentMonth(state) ? D.currentMonth(state).id : null);
      return;
    }
    try {
      const routeParams = { ...match.params, ...queryParams };
      const { title, breadcrumbs: crumbs, html } = match.handler(routeParams, state);
      document.title = title + ' — MDT prototype';
      bc.innerHTML = crumbs ? breadcrumbs(crumbs) : '';
      root.innerHTML = html;
      updatePhaseBannerStartOver(D.currentMonth(state) ? D.currentMonth(state).id : null);
      updateHeaderSimpleViewLink(D.currentMonth(state) ? D.currentMonth(state).id : null);
      // move focus to h1 or error summary after navigation
      const errSummary = root.querySelector('.govuk-error-summary');
      if (errSummary) errSummary.focus();
      else $('#main-content').focus();
      // wire up any data-action handlers
      root.querySelectorAll('form[data-form-action]').forEach(f => {
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const submitter = e.submitter;
          const confirmMsg = submitter && submitter.dataset ? submitter.dataset.mdtConfirm : null;
          if (confirmMsg && !window.confirm(confirmMsg)) return;
          const formData = Object.fromEntries(new FormData(f).entries());
          handleFormAction(f.dataset.formAction, formData, routeParams);
        });
      });
      // interactive list features (search + sort)
      wireListInteractions(root);
      // toggle GOV.UK conditional radio reveals (no govuk-frontend initAll() is run,
      // so this is done by hand rather than relying on the built-in component JS)
      root.querySelectorAll('.govuk-radios[data-module="govuk-radios"]').forEach((group) => {
        const inputs = Array.from(group.querySelectorAll('.govuk-radios__input[data-aria-controls], .govuk-radios__input'));
        const controlled = inputs.filter((i) => i.dataset.ariaControls);
        if (!controlled.length) return;
        const update = () => {
          controlled.forEach((input) => {
            const target = document.getElementById(input.dataset.ariaControls);
            if (target) target.classList.toggle('govuk-radios__conditional--hidden', !input.checked);
          });
        };
        inputs.forEach((input) => input.addEventListener('change', update));
      });
      // initialise the real MoJ Frontend date picker component on any date fields
      if (window.MOJFrontend && window.MOJFrontend.DatePicker) {
        root.querySelectorAll('[data-module="moj-date-picker"]').forEach(($el) => {
          try { new window.MOJFrontend.DatePicker($el); } catch (e) { console.error(e); }
        });
      }
    } catch (err) {
      console.error(err);
      root.innerHTML = `<h1 class="govuk-heading-xl">Something went wrong</h1><pre class="govuk-body">${escape(err.stack || err.message)}</pre>`;
    }
  }

  window.addEventListener('hashchange', render);

  /* =====================================================================
   * Form action dispatch
   * ===================================================================== */

  function handleFormAction(action, data, params) {
    switch (action) {
      case 'generate-lists':      return actionGenerateLists(data, params);
      case 'reset-current-month': return actionResetCurrentMonth(data, params);
      case 'record-test-details': return actionRecordTestDetails(data, params);
      case 'record-test-reason':  return actionRecordTestNotCompleted(data, params);
      case 'record-test-comments': return actionRecordTestComments(data, params);
      case 'record-attempt':      return actionRecordAttempt(data, params);
      case 'record-sample':       return actionRecordSample(data, params);
      case 'use-reserve':         return actionUseReserve(data, params);
      case 'record-result':       return actionRecordResult(data, params);
      case 'complete-followup':   return actionCompleteFollowUp(data, params);
      case 'close-month':         return actionCloseMonth(data, params);
      default: console.warn('Unknown form action', action);
    }
  }

  /* =====================================================================
   * Actions (mutations)
   * ===================================================================== */

  // Resolves a radio value ('15', '10', '5', '100', '50' or 'other') plus its
  // conditional "other" text input into a validated percentage, or null.
  function resolveSizePercent(radioValue, otherValue) {
    const raw = radioValue === 'other' ? otherValue : radioValue;
    const n = parseInt(raw, 10);
    return (Number.isFinite(n) && n > 0) ? n : null;
  }

  function actionGenerateLists(data, params) {
    const monthId = params.monthId || data.monthId;
    const month = D.monthFor(state, monthId);
    if (!month) return;
    if (D.isListGenerated(state, monthId)) {
      navigate(`/mdt/${monthId}/random-list`);
      return;
    }
    const est = state.establishment;
    const requestedRandomPercent = resolveSizePercent(data.randomSize, data.randomSizeOther);
    const requestedReservePercent = resolveSizePercent(data.reserveSize, data.reserveSizeOther);
    const errors = [];
    if (requestedRandomPercent === null) errors.push({ field: 'randomSize', message: 'Select the size of the main list' });
    if (requestedReservePercent === null) errors.push({ field: 'reserveSize', message: 'Select the size of the reserve list' });
    if (errors.length) {
      window.__mdtLastErrors = { form: 'generate-lists', errors, values: data };
      render();
      return;
    }
    window.__mdtLastErrors = null;
    const desiredRandomSize = Math.ceil((est.avgPopulation30Days * requestedRandomPercent) / 100);
    const desiredReserveSize = D.calculateReserveSize(desiredRandomSize, requestedReservePercent);
    // The prototype only has a fixed pool of named prisoners to draw from. If the requested
    // random + reserve counts (based on the real establishment population) exceed that pool,
    // scale both down proportionally rather than letting the random list swallow every prisoner
    // and leave nothing for the reserve list.
    const availablePool = state.prisoners.length;
    const desiredTotal = desiredRandomSize + desiredReserveSize;
    let randomSize = desiredRandomSize;
    let reserveSize = desiredReserveSize;
    if (desiredTotal > availablePool) {
      randomSize = Math.max(1, Math.min(desiredRandomSize, Math.round((availablePool * desiredRandomSize) / desiredTotal)));
      reserveSize = Math.max(desiredReserveSize > 0 ? 1 : 0, availablePool - randomSize);
    }
    randomSize = Math.min(randomSize, availablePool);
    reserveSize = Math.min(reserveSize, availablePool - randomSize);
    const shuffled = D.shuffle(state.prisoners.map(p => p.id));
    const randomIds = shuffled.slice(0, randomSize);
    const reserveIds = shuffled.slice(randomSize, randomSize + reserveSize);
    const ts = new Date().toISOString();
    const percentageRequested = Math.round((randomSize / (est.avgPopulation30Days || state.prisoners.length)) * 100);
    const selectionReference = `SEED-${monthId.replace('m-', '').toUpperCase()}-LH-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    mutate((draft) => {
      randomIds.forEach((pid, i) => {
        draft.selections.push({
          id: `s-${monthId}-r-${i + 1}-${Date.now()}`,
          reportingMonthId: monthId, prisonerId: pid,
          listType: 'random', listPosition: i + 1, status: 'not-started'
        });
      });
      reserveIds.forEach((pid, i) => {
        draft.selections.push({
          id: `s-${monthId}-x-${i + 1}-${Date.now()}`,
          reportingMonthId: monthId, prisonerId: pid,
          listType: 'reserve', listPosition: i + 1, status: 'not-started'
        });
      });
      const m = draft.reportingMonths.find(m => m.id === monthId);
      if (m) {
        m.randomListGeneratedAt = ts;
        m.reserveListGeneratedAt = ts;
        m.generatedBy = draft.currentUser.displayName;
        m.populationAtGeneration = est.avgPopulation30Days;
        m.percentageRequested = percentageRequested;
        m.reserveListSize = reserveIds.length;
        m.selectionReference = selectionReference;
        if (m.status === 'not-started') m.status = 'in-progress';
      }
      return {
        entityType: 'reportingMonth', entityId: monthId,
        action: `Random and reserve lists generated (${randomIds.length} + ${reserveIds.length})`,
        newState: { randomSize: randomIds.length, reserveSize: reserveIds.length, selectionReference }
      };
    });
    navigate(`/mdt/${monthId}/random-list`);
  }

  function actionResetCurrentMonth(data, params) {
    const monthId = params.monthId || data.monthId;
    const month = D.monthFor(state, monthId);
    if (!month) return;
    mutate((draft) => {
      const selIds = new Set(draft.selections.filter(s => s.reportingMonthId === monthId).map(s => s.id));
      draft.selections = draft.selections.filter(s => s.reportingMonthId !== monthId);
      draft.testAttempts = draft.testAttempts.filter(a => !selIds.has(a.selectionId));
      const smIds = new Set(draft.samples.filter(sm => selIds.has(sm.selectionId)).map(sm => sm.id));
      draft.samples = draft.samples.filter(sm => !selIds.has(sm.selectionId));
      draft.testResults = draft.testResults.filter(r => !smIds.has(r.sampleId));
      draft.followUpActions = draft.followUpActions.filter(f => !selIds.has(f.selectionId));
      const m = draft.reportingMonths.find(m => m.id === monthId);
      if (m) {
        m.randomListGeneratedAt = null;
        m.reserveListGeneratedAt = null;
        m.status = 'not-started';
      }
      return {
        entityType: 'reportingMonth', entityId: monthId,
        action: 'Month reset — random and reserve lists cleared',
        reason: 'Facilitator/officer restarted the month'
      };
    });
    navigate(`/mdt/${monthId}`);
  }

  /**
   * Record details of the test — combines the attempted date and the
   * completed? question on one page. Yes records the test as done and
   * asks for optional comments before confirmation. No goes to the reason page.
   */
  function actionRecordTestDetails(data, params) {
    const errors = [];
    let attemptedDateIso = null;
    if (!data.attemptedDate || !data.attemptedDate.trim()) {
      errors.push({ field: 'attemptedDate', message: 'Enter the date the test was attempted' });
    } else {
      attemptedDateIso = ukDateToIso(data.attemptedDate);
      if (!attemptedDateIso) {
        errors.push({ field: 'attemptedDate', message: 'Enter the date the test was attempted' });
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parsed = new Date(`${attemptedDateIso}T00:00:00`);
        if (parsed.getTime() > today.getTime()) {
          errors.push({ field: 'attemptedDate', message: 'Date that test was completed must be today or in the past' });
        }
      }
    }
    if (data.completed !== 'yes' && data.completed !== 'no') {
      errors.push({ field: 'completed', message: 'Select yes if the sample was collected' });
    }
    if (errors.length) {
      window.__mdtLastErrors = { form: 'test-details', errors, values: data };
      render();
      return;
    }
    window.__mdtLastErrors = null;
    const attemptedDate = attemptedDateIso;
    if (data.completed === 'no') {
      pendingTestDates[params.selectionId] = attemptedDate;
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/reason`);
      return;
    }
    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      if (!s) return null;
      const prev = { status: s.status };
      const nowIso = new Date().toISOString();
      draft.testAttempts.push({
        id: `ta-${Date.now()}`, selectionId: s.id, outcome: 'Sample collected',
        attemptedAt: attemptedDate, recordedAt: nowIso, recordedBy: draft.currentUser.id
      });
      s.status = 'completed';
      return {
        entityType: 'selection', entityId: s.id,
        action: 'Test recorded as completed — awaiting laboratory result by email',
        previousState: prev,
        newState: { status: 'completed', attemptedAt: attemptedDate }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/comments`);
  }

  /**
  * Record test — not-completed path. Records reason + auto-activates the
  * next available reserve (top of reserve list), then asks for optional
  * comments before confirmation.
   */
  function actionRecordTestNotCompleted(data, params) {
    const reason = (data.reason || '').trim();
    if (!reason) {
      window.__mdtLastErrors = { form: 'test-reason', errors: [{ field: 'reason', message: 'Choose a reason' }], values: data };
      render();
      return;
    }

    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      if (!s) return null;
      const prev = { status: s.status };
      const nowIso = new Date().toISOString();
      draft.testAttempts.push({
        id: `ta-${Date.now()}`, selectionId: s.id, outcome: reason,
        recordedAt: nowIso, recordedBy: draft.currentUser.id
      });
      s.status = 'exception';
      s.exceptionReason = reason;

      // Auto-activate the next reserve (top of list, first unused).
      const nextReserve = draft.selections
        .filter(x => x.reportingMonthId === s.reportingMonthId && x.listType === 'reserve' && !x.originalSelectionId)
        .sort((a, b) => a.listPosition - b.listPosition)[0];
      let reserveInfo = null;
      if (nextReserve) {
        nextReserve.originalSelectionId = s.id;
        nextReserve.status = 'not-started';
        s.replacementSelectionId = nextReserve.id;
        reserveInfo = { reserveId: nextReserve.id };
      }
      return {
        entityType: 'selection', entityId: s.id,
        action: `Test not completed — ${reason}${nextReserve ? '; reserve activated' : '; no reserve available'}`,
        previousState: prev,
        newState: { status: 'exception', exceptionReason: reason, ...(reserveInfo || {}) }
      };
    });
    window.__mdtLastErrors = null;
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/comments`);
  }

  function actionRecordTestComments(data, params) {
    const comment = (data.comments || '').trim();
    if (comment.length > 500) {
      window.__mdtLastErrors = { form: 'test-comments', errors: [{ field: 'comments', message: 'Comment must be 500 characters or less' }], values: data };
      render();
      return;
    }
    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      if (!s) return null;
      const previousComment = s.testComment || '';
      if (previousComment === comment) return null;
      s.testComment = comment;
      return {
        entityType: 'selection', entityId: s.id,
        action: comment ? 'Test comment recorded' : 'Test comment removed',
        previousState: { testComment: previousComment || null },
        newState: { testComment: comment || null }
      };
    });
    window.__mdtLastErrors = null;
    delete pendingTestDates[params.selectionId];
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/test/confirmation`);
  }

  function actionRecordAttempt(data, params) {
    const sel = D.selectionFor(state, params.selectionId);
    if (!sel) return;
    const outcome = data.outcome;
    const notes = data.notes || '';
    if (!outcome) return; // handled by view-side validation

    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      const prev = { status: s.status, exceptionReason: s.exceptionReason };
      draft.testAttempts.push({
        id: `ta-${Date.now()}`,
        selectionId: s.id,
        outcome,
        notes,
        recordedAt: new Date().toISOString(),
        recordedBy: draft.currentUser.id
      });
      if (outcome === 'Sample collected') {
        // continue to sample recording — status set on sample step
      } else if (D.OUTCOMES_ALLOW_RESERVE.has(outcome)) {
        s.status = 'exception';
        s.exceptionReason = outcome;
      } else {
        s.status = 'attempt-required';
      }
      return {
        entityType: 'selection', entityId: s.id,
        action: `Test attempt recorded — ${outcome}`,
        reason: notes || undefined,
        previousState: prev,
        newState: { status: s.status, exceptionReason: s.exceptionReason }
      };
    });

    if (outcome === 'Sample collected') {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/sample`);
    } else if (D.OUTCOMES_ALLOW_RESERVE.has(outcome)) {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}/use-reserve`);
    } else {
      navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
    }
  }

  function actionRecordSample(data, params) {
    const existingSamples = state.samples;
    const errors = D.validateSampleForm(data, existingSamples);
    if (errors.length) {
      window.__mdtLastErrors = { form: 'sample', errors, values: data };
      render();
      return;
    }

    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      const prev = { status: s.status };
      const sample = {
        id: `sm-${Date.now()}`,
        selectionId: s.id,
        reference: data.reference.trim(),
        collectedAt: new Date(data.collectedAt).toISOString(),
        collectedBy: draft.currentUser.id,
        testType: data.testType,
        status: 'awaiting-result'
      };
      draft.samples.push(sample);
      s.status = 'sample-collected';
      return {
        entityType: 'selection', entityId: s.id,
        action: 'Sample collected',
        previousState: prev,
        newState: { status: 'sample-collected', sampleReference: sample.reference }
      };
    });
    window.__mdtLastErrors = null;
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionUseReserve(data, params) {
    const reserveId = data.reserveId;
    const reason = data.reason || '';
    if (!reserveId) {
      window.__mdtLastErrors = { form: 'reserve', errors: [{ field: 'reserveId', message: 'Choose a reserve to activate' }], values: data };
      render();
      return;
    }
    if (!reason.trim()) {
      window.__mdtLastErrors = { form: 'reserve', errors: [{ field: 'reason', message: 'Enter a reason for using a reserve' }], values: data };
      render();
      return;
    }

    mutate((draft) => {
      const original = draft.selections.find(x => x.id === params.selectionId);
      const reserve  = draft.selections.find(x => x.id === reserveId);
      const prevOriginal = { replacementSelectionId: original.replacementSelectionId, status: original.status };
      const prevReserve  = { originalSelectionId: reserve.originalSelectionId, status: reserve.status };
      original.replacementSelectionId = reserve.id;
      if (!original.exceptionReason) original.exceptionReason = 'Reserve used';
      original.status = 'exception';
      reserve.originalSelectionId = original.id;
      reserve.status = 'attempt-required';
      return {
        entityType: 'selection', entityId: original.id,
        action: `Reserve activated — ${reserve.id}`,
        reason: reason,
        previousState: prevOriginal,
        newState: { replacementSelectionId: reserve.id, status: original.status, reserveId: reserve.id, reservePreviousState: prevReserve }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionRecordResult(data, params) {
    const outcome = data.outcome;
    if (!outcome) {
      window.__mdtLastErrors = { form: 'result', errors: [{ field: 'outcome', message: 'Choose a result' }], values: data };
      render();
      return;
    }
    mutate((draft) => {
      const s = draft.selections.find(x => x.id === params.selectionId);
      const sample = draft.samples.find(sm => sm.selectionId === s.id && sm.status === 'awaiting-result');
      if (!sample) return null;
      const prev = { sampleStatus: sample.status, selectionStatus: s.status };
      sample.status = 'result-received';
      draft.testResults.push({
        id: `tr-${Date.now()}`,
        sampleId: sample.id,
        outcome,
        receivedAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        recordedBy: draft.currentUser.id
      });
      // Auto-create follow-up tasks for a positive result — mandatory / recommended / local
      if (outcome === 'positive') {
        draft.followUpTemplate.forEach((t, i) => {
          draft.followUpActions.push({
            id: `fu-${Date.now()}-${i}`,
            selectionId: s.id,
            actionType: t.actionType,
            requirement: t.requirement,
            status: 'not-started'
          });
        });
        s.status = 'sample-collected'; // stays until follow-up completed
      } else if (outcome === 'negative') {
        s.status = 'completed';
      } else {
        s.status = 'sample-collected'; // inconclusive / rejected — officer decides next step
      }
      return {
        entityType: 'selection', entityId: s.id,
        action: `Result recorded — ${outcome}`,
        previousState: prev,
        newState: { selectionStatus: s.status, sampleId: sample.id, result: outcome }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionCompleteFollowUp(data, params) {
    const followUpId = data.followUpId;
    mutate((draft) => {
      const f = draft.followUpActions.find(x => x.id === followUpId);
      if (!f) return null;
      const prev = { status: f.status };
      f.status = 'completed';
      f.completedAt = new Date().toISOString();
      f.completedBy = draft.currentUser.id;
      // Check if the selection is now complete
      const outstanding = draft.followUpActions.filter(x =>
        x.selectionId === f.selectionId && x.requirement === 'mandatory' && x.status !== 'completed'
      );
      if (outstanding.length === 0) {
        const s = draft.selections.find(x => x.id === f.selectionId);
        if (s) s.status = 'completed';
      }
      return {
        entityType: 'selection', entityId: f.selectionId,
        action: `Follow-up completed — ${f.actionType}`,
        previousState: prev,
        newState: { status: 'completed', requirement: f.requirement }
      };
    });
    navigate(`/mdt/${params.monthId}/selection/${params.selectionId}`);
  }

  function actionCloseMonth(data, params) {
    mutate((draft) => {
      const m = draft.reportingMonths.find(x => x.id === params.monthId);
      if (!m) return null;
      const prev = { status: m.status };
      m.status = 'closed';
      return {
        entityType: 'reportingMonth', entityId: m.id,
        action: 'Month closed',
        reason: data.reason || 'Marked complete by officer',
        previousState: prev,
        newState: { status: 'closed' }
      };
    });
    navigate(`/mdt/${params.monthId}`);
  }

  /* =====================================================================
   * VIEWS
   * ===================================================================== */

  // ---- Home ---------------------------------------------------------------
  // '/' is the Digital Prison Services homepage (the "front door" every
  // service is reached through). '/mdt' is the MDT landing page, which IS
  // the current month's workspace — no separate hub.
  route('/', () => renderDpsHome());

  route('/mdt', () => {
    const cm = state.reportingMonths
      .filter(m => m.status === 'in-progress' || m.status === 'ready-to-close')
      .sort((a, b) => b.month.localeCompare(a.month))[0]
      || D.currentMonth(state);
    if (D.isListGenerated(state, cm.id)) return renderTabView(cm, 'random', { isHome: true });
    return renderGenerateView(cm, { isHome: true });
  });

  const DPS_SERVICES = [
    { name: 'Accredited Programmes', href: '#', description: 'Search for Accredited Programmes, make referrals and view their progress.' },
    { name: 'Activities, unlock and attendance', href: '#', description: 'Create and edit activities. Allocate people and edit allocations. Log applications and manage waitlists. Print unlock lists and record activity attendance.' },
    { name: 'Adjudications', href: '#/adjudications', description: 'Place a prisoner on report after an incident, view reports and manage adjudications.' },
    { name: 'Applications', href: '#', description: 'Log, action and reply to prisoner applications.' },
    { name: 'Appointments', href: '#', description: 'Create, manage and edit appointments. Print movement slips. Record appointment attendance.' },
    { name: 'Check my diary', href: '#', description: 'View your prison staff detail (staff rota) from home.' },
    { name: 'CSIP', href: '#', description: 'View and manage the Challenge, Support and Intervention Plan (CSIP) caseload.' },
    { name: 'Establishment roll check', href: '#', description: 'View the roll broken down by residential unit and see who is arriving and leaving.' },
    { name: 'Mandatory drug testing', href: '#/mdt', description: 'Generate random testing lists, record test outcomes and manage follow-up actions.' }
  ];

  function renderDpsHome() {
    const services = DPS_SERVICES.map(s => `
      <div class="mdt-service-card">
        <hr class="govuk-section-break govuk-section-break--visible govuk-!-margin-bottom-4" />
        <h3 class="govuk-heading-s govuk-!-margin-bottom-2">
          <a class="govuk-link" href="${escape(s.href)}">${escape(s.name)} <span aria-hidden="true">&rsaquo;</span></a>
        </h3>
        <p class="govuk-body">${escape(s.description)}</p>
      </div>`).join('');

    return {
      title: 'Digital Prison Services',
      breadcrumbs: null,
      html: `
        <div class="mdt-dps-welcome">
          <h1 class="govuk-heading-l govuk-!-margin-bottom-2">Welcome to Digital Prison Services</h1>
          <p class="govuk-body">The modern replacement for NOMIS.</p>
          <p class="govuk-body govuk-!-margin-bottom-0"><a class="govuk-link" href="#">Find out more about DPS</a></p>
        </div>

        <div class="mdt-dps-search">
          <form>
            <div class="govuk-grid-row">
              <div class="govuk-grid-column-one-half">
                <div class="govuk-form-group">
                  <label class="govuk-label" for="dps-search-term">Name or prison number</label>
                  <input class="govuk-input" id="dps-search-term" name="dps-search-term" type="text" />
                </div>
              </div>
              <div class="govuk-grid-column-one-quarter">
                <div class="govuk-form-group">
                  <label class="govuk-label" for="dps-search-location">Residential location</label>
                  <select class="govuk-select" id="dps-search-location" name="dps-search-location">
                    <option>All</option>
                  </select>
                </div>
              </div>
              <div class="govuk-grid-column-one-quarter mdt-dps-search__button">
                <button type="submit" class="govuk-button" data-module="govuk-button">Search</button>
              </div>
            </div>
          </form>
          <p class="govuk-body"><a class="govuk-link" href="#">All prisoners in Moorland (HMP &amp; YOI)</a></p>
        </div>

        <h2 class="govuk-heading-l">Services</h2>
        <div class="mdt-service-grid">${services}</div>
      `
    };
  }

  // ---- Adjudications (dummy landing page linked to from the MDT confirmation
  // screen when a refusal needs a chargeable offence recorded) --------------
  route('/adjudications', () => renderAdjudicationsHome());

  function renderAdjudicationsHome() {
    const cards = [
      { name: 'Start a new report', description: 'Start creating a new report.' },
      { name: 'Continue a report', description: 'Continue a report that you have already started.' },
      { name: 'Your completed reports', description: 'View your completed reports. You can also make changes to a report for up to 48 hours, unless the report has been accepted by the reviewer.' },
      { name: 'Print notice of being placed on report', description: 'Print the notice of being placed on report and adjudications process guidance (DIS 1 and 2) for a prisoner.' },
      { name: 'Confirm notice of being placed on report was issued', description: 'Enter when a prisoner was given the notice of being placed on report (DIS 1).' },
      { name: 'View hearing outcomes', description: 'View the outcomes of adjudication hearings. Where a charge was proved, check details of punishments given and money owed for damages.' },
      { name: 'Adjudications data', description: 'Charts and data for adjudications in this establishment, including by location and different prisoner characteristics.' }
    ];
    const cardsHtml = cards.map(c => `
      <div class="mdt-adjudications-card">
        <h3 class="govuk-heading-s govuk-!-margin-bottom-2"><a class="govuk-link" href="#/adjudications">${escape(c.name)}</a></h3>
        <p class="govuk-body">${escape(c.description)}</p>
      </div>`).join('');

    return {
      title: 'Adjudications',
      breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { text: 'Adjudications' }],
      html: `
        <h1 class="govuk-heading-l">Adjudications</h1>
        <div class="mdt-adjudications-wrap">
          <div class="mdt-adjudications-grid">${cardsHtml}</div>
        </div>
      `
    };
  }

  // ---- Dedicated static routes before the generic month route -------------
  route('/mdt/previous-months', () => {
    const current = D.currentMonth(state);
    const months = state.reportingMonths.filter(m => m.id !== current.id);
    return {
      title: 'Previous months',
      breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { href: `#/mdt/${current.id}`, text: monthCrumbText(current) }, { text: 'Previous months' }],
      html: `
        <h1 class="govuk-heading-xl">Previous months</h1>
        ${renderMonthHistorySection(months, { hideHeading: true })}
      `
    };
  });


  // ---- Monthly workspace (current or previous month) ---------------------
  route('/mdt/:monthId', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'random', { isHome: false });
  });

  route('/mdt/:monthId/random-list', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'random', { isHome: false });
  });
  route('/mdt/:monthId/reserve-list', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'reserve', { isHome: false });
  });
  route('/mdt/:monthId/awaiting-results', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'awaiting', { isHome: false });
  });

  // ---- Subtle "B version" of the current month workspace, linked from the top nav ----
  route('/mdt/:monthId/simple-view', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderTabView(m, 'random', { isHome: false, hideExtras: true });
  });

  route('/mdt/:monthId/contained', (params) => {
    const m = D.monthFor(state, params.monthId);
    if (!m) return notFound(params.monthId);
    if (!D.isListGenerated(state, m.id)) return renderGenerateView(m, { isHome: false });
    return renderContainedMonthView(m);
  });

  /* ---- Generate-list view (start of the journey) -------------------- */

  function previousMonthFor(month) {
    if (!month || !month.month) return null;
    const [yearStr, monthStr] = month.month.split('-');
    if (!yearStr || !monthStr) return null;
    const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    d.setMonth(d.getMonth() - 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return state.reportingMonths.find(m => m.month === key) || null;
  }

  function renderOutstandingIssueAlert(month) {
    const previousMonth = previousMonthFor(month);
    if (!previousMonth) return '';

    const report = D.buildMonthlyReport(state, previousMonth.id);
    const outstanding = (report.figures.awaitingResults || 0) + (report.figures.positive || 0);
    if (!outstanding) return '';

    const heading = `Outstanding tests from ${escape(previousMonth.label)} need attention`;

    return `
      <div class="govuk-notification-banner" role="region" aria-labelledby="mdt-notification-banner-title" data-module="govuk-notification-banner">
        <div class="govuk-notification-banner__header">
          <h2 class="govuk-notification-banner__title" id="mdt-notification-banner-title">Important</h2>
        </div>
        <div class="govuk-notification-banner__content">
          <p class="govuk-notification-banner__heading">${heading}</p>
          <p class="govuk-body">
            There are ${outstanding} outstanding tests from ${escape(previousMonth.label)} that still need review before you continue.
            <a class="govuk-notification-banner__link" href="#/mdt/${escape(previousMonth.id)}">Review the ${escape(previousMonth.label)} list</a>.
          </p>
        </div>
      </div>`;
  }

  function renderMonthHistorySection(months, opts) {
    const showHeading = !(opts && opts.hideHeading);
    const sortedMonths = months.slice().sort((a, b) => b.month.localeCompare(a.month));
    const items = sortedMonths.map(m => {
      const report = D.buildMonthlyReport(state, m.id);
      return `
        <li class="mdt-month-history-item">
          <div class="mdt-month-history-item__header">
            <h3 class="govuk-heading-s govuk-!-margin-bottom-2">${escape(m.label)}</h3>
          </div>
          <p class="govuk-body govuk-!-margin-bottom-2">Tested from main list: ${report.figures.completed} of ${m.allocatedTests}</p>
          <p class="govuk-body govuk-!-margin-bottom-2">Tested from reserve list: ${report.figures.completedReserve}</p>
          <p class="govuk-body govuk-!-margin-top-2 govuk-!-margin-bottom-0">
            <a class="govuk-link" href="#/mdt/${escape(m.id)}/contained">View ${escape(m.label)}</a>
          </p>
        </li>`;
    }).join('');

    return `
      <div class="govuk-!-margin-top-8">
        ${showHeading ? `<h2 class="govuk-heading-m">Previous months</h2>
        <p class="govuk-body">Review earlier months and their outstanding work before you continue.</p>` : ''}
        <ul class="govuk-list govuk-list--spaced mdt-month-history-list">${items}</ul>
      </div>`;
  }

  // GOV.UK-style radios-with-conditional-reveal for a percentage field. `options`
  // is an array of preset percentages; "Other" always added last.
  function renderSizeRadios({ name, legend, hint, options, otherLabel, selectedValue, otherValue, error }) {
    const isOtherSelected = selectedValue === 'other';
    const items = options.map((opt, i) => `
      <div class="govuk-radios__item">
        <input class="govuk-radios__input" id="field-${escape(name)}${i === 0 ? '' : '-' + i}" name="${escape(name)}" type="radio" value="${opt}"${selectedValue === String(opt) ? ' checked' : ''}>
        <label class="govuk-label govuk-radios__label" for="field-${escape(name)}${i === 0 ? '' : '-' + i}">${opt}%</label>
      </div>`).join('');

    return `
      <div class="govuk-form-group ${error ? 'govuk-form-group--error' : ''}">
        <fieldset class="govuk-fieldset" aria-describedby="${escape(name)}-hint">
          <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">${legend}</legend>
          <div class="govuk-hint" id="${escape(name)}-hint">${hint}</div>
          ${error ? `<p class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escape(error)}</p>` : ''}
          <div class="govuk-radios" data-module="govuk-radios">
            ${items}
            <div class="govuk-radios__item">
              <input class="govuk-radios__input" id="field-${escape(name)}-other" name="${escape(name)}" type="radio" value="other" data-aria-controls="conditional-${escape(name)}-other"${isOtherSelected ? ' checked' : ''}>
              <label class="govuk-label govuk-radios__label" for="field-${escape(name)}-other">${otherLabel}</label>
            </div>
            <div class="govuk-radios__conditional ${isOtherSelected ? '' : 'govuk-radios__conditional--hidden'}" id="conditional-${escape(name)}-other">
              <div class="govuk-form-group">
                <label class="govuk-label" for="field-${escape(name)}-other-amount">Enter percentage</label>
                <div class="govuk-input__wrapper">
                  <input class="govuk-input govuk-input--width-5" id="field-${escape(name)}-other-amount" name="${escape(name)}Other" type="text" inputmode="numeric" spellcheck="false" value="${escape(otherValue || '')}">
                  <div class="govuk-input__suffix" aria-hidden="true">%</div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      </div>`;
  }

  function renderGenerateView(month, opts) {
    const est = state.establishment;
    const percent = est.avgPopulation30Days >= 400 ? 5 : 10;
    const [monthName, year] = month.label.split(' ');
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'generate-lists') ? window.__mdtLastErrors : { errors: [], values: {} };
    const values = errs.values || {};
    const randomSelected = values.randomSize !== undefined ? values.randomSize : String(percent);
    const reserveSelected = values.reserveSize !== undefined ? values.reserveSize : String(est.reservePercentDefault);

    return {
      title: `Generate random testing lists for ${month.label}`,
      breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { text: 'Generate main list' }],
      html: `
        <span class="govuk-caption-xl">${escape(est.name)}</span>
        <h1 class="govuk-heading-xl">Generate random testing lists for ${escape(monthName)} ${escape(year)}</h1>

        ${errorSummary(errs.errors)}

        ${renderOutstandingIssueAlert(month)}

        <h3 class="govuk-heading-s govuk-!-margin-bottom-1">Average population of ${escape(est.name)} over the last 30 days</h3>
        <p class="mdt-big-number">${est.avgPopulation30Days}</p>

        <form data-form-action="generate-lists" data-month-id="${escape(month.id)}" class="govuk-!-margin-top-4" novalidate>
          <input type="hidden" name="monthId" value="${escape(month.id)}" />

          ${renderSizeRadios({
            name: 'randomSize',
            legend: 'Select main list size',
            hint: `The policy rule for a prison this size is to select ${percent}% of the prison population.`,
            options: [15, 10, 5],
            otherLabel: 'Other main list size',
            selectedValue: randomSelected,
            otherValue: values.randomSizeOther,
            error: fieldErrorText(errs.errors, 'randomSize')
          })}

          ${renderSizeRadios({
            name: 'reserveSize',
            legend: 'Select reserve list size',
            hint: `The reserve list is typically ${est.reservePercentDefault}% of the size of the main list.`,
            options: [100, 50],
            otherLabel: 'Other reserve list size',
            selectedValue: reserveSelected,
            otherValue: values.reserveSizeOther,
            error: fieldErrorText(errs.errors, 'reserveSize')
          })}

          <div class="govuk-button-group govuk-!-margin-top-2">
            <button type="submit" class="govuk-button" data-module="govuk-button">Generate list</button>
          </div>
        </form>
      `
    };
  }

  /* ---- Month shell (secondary nav + metric strip + tabs + content) --- */

  function renderTabView(month, activeTab, opts) {
    const rand = D.random(state, month.id);
    const rsv = D.reserves(state, month.id);
    const awaitingList = D.awaitingResults(state, month.id);
    const positiveList = D.positiveResultsAwaitingFollowUp(state, month.id);
    const content = activeTab === 'awaiting' ? contentAwaitingResults(month, awaitingList, positiveList) : '';
    const hideExtras = !!(opts && opts.hideExtras);

    return {
      title: opts.isHome ? 'Mandatory drug testing' : `${month.label} — ${tabLabelFor(activeTab)}`,
      breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { text: monthCrumbText(month) }],
      html: `
        <div class="mdt-workspace-header">
          <div>
            <span class="govuk-caption-xl">${escape(state.establishment.name)}</span>
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">${escape(month.label)}</h1>
          </div>
          <div class="mdt-workspace-header__actions">
            <a class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" href="#/mdt/previous-months" role="button" draggable="false" data-module="govuk-button">
              View previous months
            </a>
            <button type="button" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" data-mdt-print="${escape(month.id)}">
              Print testing lists
            </button>
          </div>
        </div>

        ${hideExtras ? '' : renderOrderingDetails(month, rand, rsv)}

        ${renderTabsSection(month, activeTab, rand, rsv, hideExtras)}

        ${activeTab === 'awaiting' ? `<div class="govuk-!-margin-top-6">${content}</div>` : ''}

        ${renderPrintableLists(month, rand, rsv)}
      `
    };
  }

  function tabLabelFor(tab) {
    return { random: 'Main list', reserve: 'Reserve list', awaiting: 'Awaiting results' }[tab] || '';
  }

  /**
   * Random list / Reserve list tabs, using the actual GOV.UK Design System
   * tabs component (https://design-system.service.gov.uk/components/tabs/).
   * Both panels are rendered; the govuk-tabs JS behaviour (wired up in
   * wireListInteractions) shows/hides them without a page navigation.
   */
  function renderTabsSection(month, activeTab, rand, rsv, hideMetrics, hideReleasingMetric) {
    const initialTab = activeTab === 'reserve' ? 'reserve' : 'random';
    const tabs = [
      { id: 'random',  label: 'Main list',  panelId: 'mdt-tab-panel-random',  count: rand.length, content: contentRandomList(month, rand, { hideMetrics, hideExtras: hideMetrics, hideReleasingMetric }) },
      { id: 'reserve', label: 'Reserve list', panelId: 'mdt-tab-panel-reserve', count: rsv.length,  content: contentReserveList(month, rsv, { hideMetrics, hideExtras: hideMetrics, hideReleasingMetric }) }
    ];
    return `
      <div class="govuk-tabs" data-module="govuk-tabs">
        <h2 class="govuk-tabs__title">Contents</h2>
        <ul class="govuk-tabs__list">
          ${tabs.map(t => `
            <li class="govuk-tabs__list-item ${t.id === initialTab ? 'govuk-tabs__list-item--selected' : ''}">
              <a class="govuk-tabs__tab" aria-selected="${t.id === initialTab ? 'true' : 'false'}" href="#${escape(t.panelId)}">
                ${escape(t.label)}
              </a>
            </li>`).join('')}
        </ul>
        ${tabs.map(t => `
          <div class="govuk-tabs__panel ${t.id === initialTab ? '' : 'govuk-tabs__panel--hidden'}" id="${escape(t.panelId)}">
            <h2 class="govuk-heading-l">${escape(t.label)}</h2>
            ${t.content}
          </div>`).join('')}
      </div>`;
  }

  /**
   * "How is the random list ordered?" details, now placed above the tabs so it
   * applies to the whole monthly workspace. Includes the generation record —
   * the traceable evidence behind this month's random selection.
   */
  function renderOrderingDetails(month, rand, rsv) {
    const generatedAt = month.randomListGeneratedAt ? formatDateTime(month.randomListGeneratedAt) : 'Not yet generated';
    const randomCount = rand ? rand.length : null;
    const reserveCount = rsv ? rsv.length : null;
    const reservePercent = month.percentageRequested != null ? state.establishment.reservePercentDefault : null;
    return `
      <details class="govuk-details govuk-!-margin-bottom-6" data-module="govuk-details">
        <summary class="govuk-details__summary"><span class="govuk-details__summary-text">How are the testing lists ordered?</span></summary>
        <div class="govuk-details__text">
          <table class="govuk-table">
            <caption class="govuk-visually-hidden">Generation record for ${escape(month.label)}</caption>
            <tbody class="govuk-table__body">
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">List reference</th>
                <td class="govuk-table__cell">${escape(month.id)}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Generated time and date</th>
                <td class="govuk-table__cell">${escape(generatedAt)}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Generated by</th>
                <td class="govuk-table__cell">${escape(month.generatedBy || 'Not yet generated')}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Population at generation</th>
                <td class="govuk-table__cell">${month.populationAtGeneration != null ? month.populationAtGeneration : '—'}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Percentage requested</th>
                <td class="govuk-table__cell">${month.percentageRequested != null ? `${month.percentageRequested}%${randomCount != null ? ` (${randomCount} prisoners)` : ''}` : '—'}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Reserve list size</th>
                <td class="govuk-table__cell">${reservePercent != null ? `${reservePercent}%${reserveCount != null ? ` (${reserveCount} prisoners)` : ''}` : '—'}</td>
              </tr>
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header">Selection reference (random seed evidence)</th>
                <td class="govuk-table__cell">${escape(month.selectionReference || 'Not yet generated')}</td>
              </tr>
            </tbody>
          </table>

          <p class="govuk-body"><strong>List generation</strong><br>
          A main list and a reserve list are generated at the start of each month. After generation, the lists are no longer editable. The size of the main list is calculated as a percentage of the establishment's average population over the last 30 days.</p>

          <p class="govuk-body"><strong>Reserves</strong><br>
          A reserve may be used when a main list selection cannot be tested. You must test reserves in the order that they appear in in the reserve list.</p>

          <p class="govuk-body"><strong>Other testing methods</strong><br>
          This service handles random mandatory drug testing only. Suspicion-based testing is not managed through this service.</p>
        </div>
      </details>`;
  }

  /**
   * Printable random + reserve lists, in original generated (list position) order.
   * Hidden on screen; shown (landscape) only when printed via the "Print testing
   * list" button. See the @media print rules in styles.css.
   */
  function renderPrintableLists(month, rand, rsv) {
    const rowsFor = (items, showPosition) => items.map(s => {
      const p = D.prisonerFor(state, s.prisonerId);
      return `
        <tr>
          <td class="mdt-print-tick-cell"><span class="mdt-print-tick-box" aria-hidden="true"></span></td>
          ${showPosition ? `<td>${s.listPosition}</td>` : ''}
          <td>${escape(p.displayName)}<br>${escape(p.prisonNumber)}</td>
          <td>${escape(p.location)}</td>
          <td class="mdt-print-comments-cell"></td>
        </tr>`;
    }).join('');
    const table = (title, items, opts) => `
      <h2>${escape(title)}</h2>
      <table>
        <thead>
          <tr>
            <th>Tick</th>
            ${opts.showPosition ? '<th>Position</th>' : ''}
            <th>Prisoner</th>
            <th>Location</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>${rowsFor(items, opts.showPosition)}</tbody>
      </table>`;
    return `
      <div class="mdt-print-only">
        <div class="mdt-print-header">
          <p class="mdt-print-header__tag">Official</p>
          <h1>${escape(state.establishment.name)} — ${escape(month.label)} testing list</h1>
          <p class="mdt-print-meta">List reference: ${escape(month.id)}. Generated ${month.randomListGeneratedAt ? escape(formatDateTime(month.randomListGeneratedAt)) : 'not yet generated'}.</p>
        </div>
        ${table('Main list', rand, { showPosition: false })}
        <div class="mdt-print-pagebreak"></div>
        ${table('Reserve list', rsv, { showPosition: true })}
      </div>`;
  }

  /* ---- Tab content: random list ------------------------------------- */

  function contentRandomList(month, items, opts) {
    if (!items.length) return '<p class="govuk-body">The main list has not been generated for this month.</p>';
    const simplified = !!(opts && opts.simplified);
    const hideMetrics = !!(opts && opts.hideMetrics);
    const hideExtras = !!(opts && opts.hideExtras);
    const hideReleasingMetric = !!(opts && opts.hideReleasingMetric);
    const activatedReserves = D.reserves(state, month.id).filter(r => r.originalSelectionId);
    const rowsForCounts = [...items, ...activatedReserves];
    const isDone = (s) => s.status === 'completed' || (simplified && s.status === 'sample-collected');
    const completed = rowsForCounts.filter(isDone).length;
    const releasing = rowsForCounts.filter(s => {
      const p = D.prisonerFor(state, s.prisonerId);
      return p && D.isReleasingInMonth(p.releaseDate, month.month);
    }).length;
    const weekend = D.testedOnWeekendStats(state, month.id);
    const weekendValue = weekend.total === 0
      ? '0 (0%)'
      : `${weekend.weekend} (${weekend.percent}%)`;
    return `
      ${hideMetrics ? '' : `
      <ul class="mdt-stat-strip mdt-stat-strip--tight" role="list">
        ${statTile('Completed', `${completed}`, `of ${month.allocatedTests}`, null, 'mdt-stat-tile--plain')}
        ${hideReleasingMetric ? '' : statTile('Releasing this month', releasing, null, releasing > 0 ? 'warning' : null, 'mdt-stat-tile--plain')}
        ${statTile('Tested on weekend', weekendValue, 'target 14%', (weekend.total > 0 && weekend.percent > 14) ? 'warning' : null, 'mdt-stat-tile--plain')}
      </ul>`}
      ${renderSelectionTable(items, month, 'random', { activatedReserves, simplified, hideExtras })}`;
  }

  function contentReserveList(month, items, opts) {
    if (!items.length) return '<p class="govuk-body">The reserve list has not been generated for this month.</p>';
    const hideMetrics = !!(opts && opts.hideMetrics);
    const hideExtras = !!(opts && opts.hideExtras);
    const hideReleasingMetric = !!(opts && opts.hideReleasingMetric);
    const used = items.filter(r => r.originalSelectionId).length;
    const releasing = items.filter(s => {
      const p = D.prisonerFor(state, s.prisonerId);
      return p && D.isReleasingInMonth(p.releaseDate, month.month);
    }).length;
    return `
      ${hideMetrics ? '' : `
      <ul class="mdt-stat-strip mdt-stat-strip--tight" role="list">
        ${statTile('Reserves used', `${used}`, `of ${items.length}`, null, 'mdt-stat-tile--plain')}
        ${hideReleasingMetric ? '' : statTile('Releasing this month', releasing, null, releasing > 0 ? 'warning' : null, 'mdt-stat-tile--plain')}
      </ul>`}
      <p class="govuk-body">Reserves are used when a main-list prisoner cannot be tested. They need to be tested in list order if used.</p>
      ${renderSelectionTable(items, month, 'reserve', { hideExtras })}`;
  }

  function contentAwaitingResults(month, samples, positives) {
    const awaitingRows = samples.map(sm => {
      const sel = D.selectionFor(state, sm.selectionId);
      const p = D.prisonerFor(state, sel.prisonerId);
      return `
        <tr class="govuk-table__row">
          <td class="govuk-table__cell"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">${escape(sm.reference)}</a></td>
          <td class="govuk-table__cell">${escape(p.displayName)}<br><span class="govuk-hint govuk-!-font-size-16">${escape(p.prisonNumber)}</span></td>
          <td class="govuk-table__cell">${formatDate(sm.collectedAt)}</td>
          <td class="govuk-table__cell"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/result">Record result</a></td>
        </tr>`;
    }).join('');

    return `
      <h2 class="govuk-heading-m">Samples awaiting a laboratory result</h2>
      ${samples.length === 0 ? '<p class="govuk-body">No samples are currently awaiting a result.</p>' : `
        <table class="govuk-table">
          <thead class="govuk-table__head">
            <tr class="govuk-table__row">
              <th class="govuk-table__header" scope="col">Sample reference</th>
              <th class="govuk-table__header" scope="col">Prisoner</th>
              <th class="govuk-table__header" scope="col">Collected</th>
              <th class="govuk-table__header" scope="col">Action</th>
            </tr>
          </thead>
          <tbody class="govuk-table__body">${awaitingRows}</tbody>
        </table>`}

      <h2 class="govuk-heading-m govuk-!-margin-top-6">Positive results — follow-up required</h2>
      <p class="govuk-body-s">Follow-up tasks after a positive laboratory result are split into <strong>mandatory</strong>, <strong>recommended</strong> and <strong>local</strong>. Mandatory tasks must be complete before the month can be closed.</p>
      ${positives.length === 0 ? '<p class="govuk-body">No positive results are awaiting follow-up.</p>' : `
        <ul class="govuk-list">
          ${positives.map(sm => {
            const sel = D.selectionFor(state, sm.selectionId);
            const p = D.prisonerFor(state, sel.prisonerId);
            const fu = D.followUpFor(state, sel.id);
            const outstandingMandatory = fu.filter(f => f.requirement === 'mandatory' && f.status !== 'completed').length;
            return `
              <li class="govuk-!-margin-bottom-2">
                <a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">${escape(p.displayName)}</a>
               , ${escape(p.prisonNumber)}
               , sample ${escape(sm.reference)}
               , ${outstandingMandatory > 0 ? `<strong class="govuk-tag govuk-tag--red">${outstandingMandatory} mandatory outstanding</strong>` : '<strong class="govuk-tag govuk-tag--green">All mandatory complete</strong>'}
              </li>`;
          }).join('')}
        </ul>`}`;
  }

  /* ---- Shared selection table --------------------------------------- */

  function renderSelectionTable(items, month, listType, opts) {
    if (!items.length) return '<p class="govuk-body">There are no selections in this list.</p>';
    const monthYYYYMM = month.month;
    const sourceList = listType === 'reserve' ? 'reserve-list' : 'random-list';
    const sortable = listType !== 'reserve';
    const simplified = !!(opts && opts.simplified);
    const hideExtras = !!(opts && opts.hideExtras);
    const hideNewColumns = simplified || hideExtras;
    const activatedReserves = (opts && opts.activatedReserves) || [];

    const reserveActionOutstanding = (s) =>
      s && (s.status === 'not-started' || s.status === 'attempt-required' || s.status === 'priority');
    const firstOutstandingActivatedIndex = activatedReserves.findIndex(reserveActionOutstanding);
    const activatedReserveIndexById = new Map(activatedReserves.map((s, i) => [s.id, i]));

    const renderRow = (sel, isActivatedReserve) => {
      const p = D.prisonerFor(state, sel.prisonerId);
      const status = D.statusLabel(sel);
      const lastTested = lastTestedFor(sel.id);
      const searchKey = `${p.displayName} ${p.prisonNumber} ${p.location}`.toLowerCase();
      const canRecord = sel.status === 'not-started' || sel.status === 'attempt-required' || sel.status === 'sample-collected';
      const alreadyTested = sel.status === 'completed' || (sel.status === 'exception' && (sel.exceptionReason || '').toLowerCase() === 'refused');
      const activatedReserveIndex = activatedReserveIndexById.get(sel.id);
      const blockedByEarlierActivatedReserve =
        listType === 'random' &&
        isActivatedReserve &&
        typeof activatedReserveIndex === 'number' &&
        firstOutstandingActivatedIndex >= 0 &&
        activatedReserveIndex > firstOutstandingActivatedIndex &&
        reserveActionOutstanding(sel);
      let actionCell;
      if (listType === 'reserve') {
        actionCell = '';
      } else if (sel.replacementSelectionId) {
        // Exception with a reserve already covering it — nothing further to open.
        actionCell = ((sel.exceptionReason || '').toLowerCase() === 'refused')
          ? `<span class="govuk-body-m govuk-!-margin-0">Replaced by a reserve due to refusing the test. <a class="govuk-link" href="#/adjudications" data-mdt-dummy="adjudication">Continue to adjudication service</a></span>`
          : `<span class="govuk-body-m govuk-!-margin-0">Replaced by a reserve due to ${escape(reasonToActionPhrase(sel.exceptionReason))}</span>`;
      } else if (blockedByEarlierActivatedReserve) {
        actionCell = '<span class="govuk-body-m govuk-!-margin-0">Test previous reserve first</span>';
      } else if (alreadyTested) {
        actionCell = '<span class="govuk-body-m govuk-!-margin-0">Sample taken</span>';
      } else if (canRecord) {
        actionCell = `<a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/test">Record test</a>`;
      } else {
        actionCell = `<a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Open</a>`;
      }

      let statusForRow = (listType === 'reserve')
        ? (sel.originalSelectionId
            ? { text: 'Called from reserve', modifier: 'green' }
            : { text: 'Available as reserve', modifier: 'grey' })
        : status;

      if (!simplified && (sel.status === 'attempt-required' || sel.status === 'sample-collected')) {
        statusForRow = { text: 'Not started', modifier: 'grey' };
      }

      if (simplified && listType === 'random') {
        // Previous months are closed: a collected sample is effectively a
        // completed test, so only ever show "Sample taken" or "Exception: X".
        statusForRow = (sel.status === 'completed' || sel.status === 'sample-collected')
          ? { text: 'Sample taken', modifier: 'green' }
          : statusForRow;
      }

      return `
        <tr class="govuk-table__row" data-search="${escape(searchKey)}">
          ${listType === 'reserve' ? `<td class="govuk-table__cell" data-sort-value="${sel.listPosition}">${sel.listPosition}</td>` : ''}
          <td class="govuk-table__cell" data-sort-value="${escape(p.displayName)}">
            <a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}?from=${escape(sourceList)}">${escape(p.displayName)}</a><br><span class="govuk-hint govuk-!-font-size-16">${escape(p.prisonNumber)}</span>
          </td>
          ${listType === 'random' ? `<td class="govuk-table__cell" data-sort-value="${escape(isActivatedReserve ? 'Reserve' : 'Main')}">${isActivatedReserve ? 'Reserve' : 'Main'}</td>` : ''}
          ${hideNewColumns ? '' : `<td class="govuk-table__cell" data-sort-value="${escape(p.arrivalDate || '')}">${p.arrivalDate ? formatDate(p.arrivalDate) : ''}</td>`}
          ${hideNewColumns ? '' : `<td class="govuk-table__cell" data-sort-value="${escape(p.releaseDate || '')}">${p.releaseDate ? formatDate(p.releaseDate) : ''}</td>`}
          ${simplified ? '' : `<td class="govuk-table__cell" data-sort-value="${escape(lastTested || '')}">${lastTested ? formatDate(lastTested) : 'Not tested before'}</td>`}
          <td class="govuk-table__cell" data-sort-value="${escape(statusForRow.text)}">${tag(statusForRow.text, statusForRow.modifier)}</td>
          ${(listType === 'reserve' || simplified) ? '' : `<td class="govuk-table__cell">${actionCell}</td>`}
        </tr>`;
    };

    const primaryRows = items.map(sel => renderRow(sel, false)).join('');
    const reserveRows = activatedReserves.map(sel => renderRow(sel, true)).join('');

    const headers = [
      ...(listType === 'reserve' ? [{ key: 'order', label: 'Order' }] : []),
      { key: 'name',      label: 'Prisoner' },
      ...(listType === 'random' ? [{ key: 'originalList', label: 'Original list' }] : []),
      ...(hideNewColumns ? [] : [{ key: 'custodySince', label: 'In custody since' }]),
      ...(hideNewColumns ? [] : [{ key: 'releaseDate', label: 'Release date (CRD)' }]),
      ...(simplified ? [] : [{ key: 'tested', label: 'Last tested' }]),
      { key: 'status',    label: 'Status' }
    ].map((h, i) => sortable ? `
      <th scope="col" class="govuk-table__header">
        <button type="button" class="mdt-sort-btn" data-mdt-sort="${escape(h.key)}" data-mdt-sort-col="${i}" aria-label="Sort by ${escape(h.label)}">
          ${escape(h.label)} <span class="mdt-sort-btn__indicator" aria-hidden="true"></span>
        </button>
      </th>` : `
      <th scope="col" class="govuk-table__header">${escape(h.label)}</th>`).join('');

    return `
      <table class="govuk-table mdt-selection-table" data-mdt-table>
        <caption class="govuk-visually-hidden">${escape(listType === 'random' ? 'Main list' : 'Reserve list')} for ${escape(month.label)}</caption>
        <thead class="govuk-table__head">
          <tr class="govuk-table__row">
            ${headers}
            ${(listType === 'reserve' || simplified) ? '' : '<th scope="col" class="govuk-table__header">Action</th>'}
          </tr>
        </thead>
        <tbody class="govuk-table__body" data-mdt-tbody="${listType === 'random' ? 'random-tbody' : 'reserve-tbody'}">${primaryRows}${reserveRows}</tbody>
      </table>`;
  }

  function statTile(label, value, sub, modifier, extraClass) {
    return `
      <li class="mdt-stat-tile ${modifier ? 'mdt-stat-tile--' + modifier : ''} ${extraClass || ''}">
        <p class="mdt-stat-tile__label">${escape(label)}</p>
        <p class="mdt-stat-tile__value">${escape(value)}${sub ? `<span class="mdt-stat-tile__value--sub">${escape(sub)}</span>` : ''}</p>
      </li>`;
  }

  function statCard(label, value, modifier) {
    return `
      <div class="mdt-stat-card ${modifier ? 'mdt-stat-card--' + modifier : ''}" role="listitem">
        <p class="mdt-stat-card__label">${escape(label)}</p>
        <p class="mdt-stat-card__value">${escape(value)}</p>
      </div>`;
  }

  /**
   * Look up the most recent selection audit event that represents a test outcome.
   * Used for the "Last tested" column — falls back to the latest audit for the row.
   */
  function lastTestedFor(selectionId) {
    const events = state.auditEvents
      .filter(a => a.entityType === 'selection' && a.entityId === selectionId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return events.length ? events[0].occurredAt : null;
  }


  function lastActionFor(selectionId) {
    const audit = state.auditEvents
      .filter(a => a.entityType === 'selection' && a.entityId === selectionId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return audit.length ? audit[0].occurredAt : null;
  }

  // ---- Awaiting results list (now handled by the tabbed workspace shell) ----
  // The tab route above (`/mdt/:monthId/awaiting-results`) renders both awaiting
  // samples and outstanding follow-up work in one place.

  // ---- Follow-up list -----------------------------------------------------
  route('/mdt/:monthId/follow-up', (params) => {
    // Backwards-compatible redirect — awaiting results tab now includes follow-up.
    navigate(`/mdt/${params.monthId}/awaiting-results`);
    return { title: 'Redirecting…', html: '' };
  });

  // ---- Monthly report -----------------------------------------------------
  route('/mdt/:monthId/report', (params) => {
    const month = D.monthFor(state, params.monthId);
    if (!month) return notFound(params.monthId);
    const report = D.buildMonthlyReport(state, month.id);
    const f = report.figures;
    const def = report.definitions;

    const rowLink = (key, label, value, defText) => `
      <div class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">${escape(label)}</dt>
        <dd class="govuk-summary-list__value">${escape(String(value))}</dd>
        <dd class="govuk-summary-list__actions">
          <a class="govuk-link" href="#/mdt/${escape(month.id)}/report/breakdown/${escape(key)}">View records</a>
        </dd>
      </div>
      <div class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key" style="font-weight:normal;font-size:14px;color:#505a5f;">How is this calculated?</dt>
        <dd class="govuk-summary-list__value" colspan="2" style="font-size:14px;color:#505a5f;">${escape(defText || '')}</dd>
      </div>`;

    const exceptionsList = Object.entries(f.exceptionsByReason)
      .map(([r, n]) => `<li>${escape(r)}: <strong>${n}</strong></li>`).join('');

    return {
      title: `Monthly report — ${month.label}`,
      breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { href: `#/mdt/${month.id}`, text: monthCrumbText(month) }, { text: 'Monthly report' }],
      html: `
        <h1 class="govuk-heading-xl">Monthly report</h1>
        <p class="govuk-body-l">${escape(month.label)}, every figure is derived from the underlying records.</p>

        <dl class="govuk-summary-list">
          ${rowLink('allocation',     'Monthly allocation',       f.allocation,     def.allocation)}
          ${rowLink('random',         'On the main list',         f.randomListSize, 'Selections created when the main list was generated.')}
          ${rowLink('reservesUsed',   'Reserves used',            f.reservesUsed,   'Reserve-list selections that were activated to replace a main-list selection.')}
          ${rowLink('attempted',      'Attempted',                f.attempted,      def.attempted)}
          ${rowLink('completed',      'Completed',                f.completed,      def.completed)}
          ${rowLink('notCompleted',   'Not completed (exception)',f.notCompleted,   'Main-list selections with status = exception.')}
          ${rowLink('awaiting',       'Awaiting results',         f.awaitingResults, def.awaitingResults)}
          ${rowLink('positive',       'Positive',                 f.positive,       'Samples with a positive laboratory result.')}
          ${rowLink('negative',       'Negative',                 f.negative,       'Samples with a negative laboratory result.')}
          ${rowLink('inconclusive',   'Inconclusive',             f.inconclusive,   'Samples returned as inconclusive by the laboratory.')}
          ${rowLink('rejected',       'Rejected',                 f.rejected,       'Samples rejected by the laboratory.')}
        </dl>

        <div class="govuk-grid-row">
          <div class="govuk-grid-column-one-half">
            <div class="mdt-stat-card">
              <p class="mdt-stat-card__label">Completion rate</p>
              <p class="mdt-stat-card__value">${formatPercent(f.completionRate)}</p>
              <p class="govuk-body-s govuk-!-margin-bottom-0">${escape(def.completionRate)}</p>
            </div>
          </div>
          <div class="govuk-grid-column-one-half">
            <div class="mdt-stat-card">
              <p class="mdt-stat-card__label">Positive rate</p>
              <p class="mdt-stat-card__value">${formatPercent(f.positiveRate)}</p>
              <p class="govuk-body-s govuk-!-margin-bottom-0">${escape(def.positiveRate)}</p>
            </div>
          </div>
        </div>

        <h2 class="govuk-heading-m govuk-!-margin-top-6">Exceptions by reason</h2>
        ${exceptionsList ? `<ul class="govuk-list">${exceptionsList}</ul>` : '<p class="govuk-body">No exceptions recorded.</p>'}

        <p class="govuk-body govuk-!-margin-top-6">
          <a class="govuk-link" href="javascript:window.print()">Print this report</a>
        </p>
      `
    };
  });

  // Report drill-down
  route('/mdt/:monthId/report/breakdown/:key', (params) => {
    const month = D.monthFor(state, params.monthId);
    if (!month) return notFound(params.monthId);
    const report = D.buildMonthlyReport(state, month.id);
    const keyMap = {
      allocation:  null,
      random:      report.breakdown.randomIds,
      reservesUsed: report.breakdown.reservesUsedIds,
      attempted:   report.breakdown.attemptedIds,
      completed:   report.breakdown.completedIds,
      notCompleted: report.breakdown.notCompletedIds,
      awaiting:    report.breakdown.awaitingResultIds,
      positive:    report.breakdown.positiveIds,
      negative:    report.breakdown.negativeIds,
      inconclusive: report.breakdown.inconclusiveIds,
      rejected:    report.breakdown.rejectedIds
    };
    const ids = keyMap[params.key];
    const items = (ids || []).map(id => D.selectionFor(state, id)).filter(Boolean);
    return {
      title: `${params.key} — records`,
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        { href: `#/mdt/${month.id}`, text: monthCrumbText(month) },
        { href: `#/mdt/${month.id}/report`, text: 'Monthly report' },
        { text: params.key }
      ],
      html: `
        <h1 class="govuk-heading-xl">Records — ${escape(params.key)}</h1>
        ${ids == null ? '<p class="govuk-body">This figure is supplied by an upstream source and does not have a drill-down.</p>' :
          items.length === 0 ? '<p class="govuk-body">No records.</p>' : `
          <ul class="mdt-drilldown-list">
            ${items.map(s => {
              const p = D.prisonerFor(state, s.prisonerId);
              return `<li><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(s.id)}">${escape(p.displayName)}</a>, ${escape(p.prisonNumber)}, list pos ${s.listPosition}</li>`;
            }).join('')}
          </ul>`}
      `
    };
  });

  // ---- Selection detail ---------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const sourceList = (params.from === 'random-list' || params.from === 'reserve-list')
      ? params.from
      : (sel.listType === 'reserve' ? 'reserve-list' : 'random-list');
    const backToListHref = `#/mdt/${month.id}/${sourceList}`;
    const backToListLabel = `Back to ${sourceList === 'reserve-list' ? 'reserve list' : 'main list'}`;
    const samples = D.samplesFor(state, sel.id);
    const fu = D.followUpFor(state, sel.id);
    const history = testHistoryFor(state, p.id);

    return {
      title: `${p.displayName} — MDT record`,
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        { href: backToListHref, text: monthCrumbText(month) },
        { text: p.displayName }
      ],
      html: `
        <span class="govuk-caption-xl">${escape(sel.listType === 'random' ? 'Main list' : 'Reserve list')}, position ${sel.listPosition}</span>
        <h1 class="govuk-heading-xl govuk-!-margin-bottom-1">${escape(p.displayName)}</h1>
        <p class="govuk-body"><a class="govuk-link" href="#" target="_blank" rel="noopener noreferrer">View prisoner profile (Opens in a new tab)</a></p>

        ${profilePhoto('govuk-!-margin-bottom-4')}
        <h2 class="govuk-heading-l">Prisoner details</h2>
        <table class="govuk-table">
          <caption class="govuk-visually-hidden">Prisoner details for ${escape(p.displayName)}</caption>
          <tbody class="govuk-table__body">
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">Prison number</th>
              <td class="govuk-table__cell">${escape(p.prisonNumber)}</td>
            </tr>
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">Location</th>
              <td class="govuk-table__cell">${escape(p.location)}</td>
            </tr>
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">Ethnicity code</th>
              <td class="govuk-table__cell">${escape(p.ethnicityCode || '')}</td>
            </tr>
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">In custody since</th>
              <td class="govuk-table__cell">${p.arrivalDate ? formatDate(p.arrivalDate) : ''}</td>
            </tr>
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">In this prison since</th>
              <td class="govuk-table__cell">${p.arrivalDate ? formatDate(p.arrivalDate) : ''}</td>
            </tr>
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">Release date</th>
              <td class="govuk-table__cell">${formatDate(p.releaseDate)}</td>
            </tr>
            <tr class="govuk-table__row">
              <th scope="row" class="govuk-table__header">Current activity today</th>
              <td class="govuk-table__cell">${p.currentActivity ? `${escape(p.currentActivity)} at 2:00pm` : 'No activity scheduled'}</td>
            </tr>
          </tbody>
        </table>

        ${renderSamples(samples)}
        ${renderFollowUps(fu, month.id, sel.id)}

        <h2 class="govuk-heading-l govuk-!-margin-top-6">Drug test history</h2>
        <p class="govuk-body">This history covers drug testing activity only. It does not include laboratory results and only includes records captured while the prisoner has been managed on DPS.</p>
        ${history.length === 0 ? '<p class="govuk-body">No previous test history recorded.</p>' : `
          <table class="govuk-table">
            <caption class="govuk-visually-hidden">Drug test history for ${escape(p.displayName)}</caption>
            <thead class="govuk-table__head">
              <tr class="govuk-table__row">
                <th scope="col" class="govuk-table__header">Date</th>
                <th scope="col" class="govuk-table__header">Reporting month</th>
                <th scope="col" class="govuk-table__header">Status</th>
                <th scope="col" class="govuk-table__header">Comments</th>
                <th scope="col" class="govuk-table__header" style="width: 23%">Action</th>
              </tr>
            </thead>
            <tbody class="govuk-table__body">
              ${history.map(h => `
                <tr class="govuk-table__row">
                  <td class="govuk-table__cell">${h.date ? formatDate(h.date) : 'Not tested yet'}</td>
                  <td class="govuk-table__cell">${escape(h.monthLabel)}</td>
                  <td class="govuk-table__cell">${tag(h.label, h.modifier)}</td>
                  <td class="govuk-table__cell">${h.comment ? escape(h.comment) : 'No comment recorded'}</td>
                  <td class="govuk-table__cell">${renderActionCell(h.action)}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}

        <p class="govuk-body"><a class="govuk-button govuk-button--secondary" data-module="govuk-button" href="${escape(backToListHref)}">${escape(backToListLabel)}</a></p>
      `
    };
  });

  /**
   * A prisoner's previous test outcomes across all reporting months, for the
   * "Drug test history" tab. Tags echo the ones used in the main list tables.
   */
  function testHistoryFor(state, prisonerId) {
    const cm = D.currentMonth(state);
    return state.selections
      .filter(s => s.prisonerId === prisonerId)
      .map(s => {
        const month = D.monthFor(state, s.reportingMonthId);
        const sortKey = month ? month.month : '';
        // Fixture-seeded (pre-audit) selections have no audit trail, so fall back
        // to the month's list-generation date rather than showing "Not tested yet".
        const fallbackDate = month ? (month.randomListGeneratedAt || `${month.month}-15T09:00:00Z`) : null;
        if (s.status === 'completed' || s.status === 'exception') {
          const label = D.statusLabel(s);
          return { date: lastTestedFor(s.id) || fallbackDate, label: label.text, modifier: label.modifier, monthLabel: month ? month.label : '', sortKey, comment: s.testComment || '', action: actionForSelection(state, s, month) };
        }
        if (cm && s.reportingMonthId === cm.id) {
          return { date: null, label: 'Not started', modifier: 'grey', monthLabel: 'Current month', sortKey, comment: '', action: actionForSelection(state, s, month) };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey) || (b.date || '').localeCompare(a.date || ''));
  }

  function renderSamples(samples) {
    if (!samples.length) return '';
    return `
      <h2 class="govuk-heading-m govuk-!-margin-top-6">Samples</h2>
      <ul class="govuk-list">
        ${samples.map(sm => {
          const result = state.testResults.find(r => r.sampleId === sm.id);
          return `
            <li>
              <strong>${escape(sm.reference)}</strong>, ${escape(sm.testType)}, collected ${formatDateTime(sm.collectedAt)}
              <br>
              Status: ${tag(sm.status.replace('-', ' '), sm.status === 'awaiting-result' ? 'yellow' : 'blue')}
              ${result ? `, Result: ${tag(result.outcome, result.outcome === 'positive' ? 'red' : (result.outcome === 'negative' ? 'green' : 'grey'))} (recorded ${formatDateTime(result.recordedAt)})` : ''}
            </li>`;
        }).join('')}
      </ul>`;
  }
  function renderFollowUps(fu, monthId, selectionId) {
    if (!fu.length) return '';
    const groups = ['mandatory', 'recommended', 'local'];
    return `
      <h2 class="govuk-heading-m govuk-!-margin-top-6">Follow-up actions</h2>
      ${groups.map(g => {
        const items = fu.filter(x => x.requirement === g);
        if (!items.length) return '';
        const label = g[0].toUpperCase() + g.slice(1);
        return `
          <div class="mdt-followup-group mdt-followup-group--${g}">
            <span class="mdt-followup-group__label">${escape(label)}</span>
            <ul class="govuk-list">
              ${items.map(i => `
                <li>
                  ${escape(i.actionType)}
                  ${i.status === 'completed'
                    ? `<br>${tag('Completed', 'green')} ${i.completedAt ? ', ' + formatDateTime(i.completedAt) : ''}`
                    : `<br>${tag('Not started', 'grey')}
                        <form data-form-action="complete-followup" style="display:inline-block;margin-left:10px;">
                          <input type="hidden" name="followUpId" value="${escape(i.id)}">
                          <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0">Mark done</button>
                        </form>`}
                </li>`).join('')}
            </ul>
          </div>`;
      }).join('')}
    `;
  }

  // ---- Record details of the test (attempted date + was it completed?) --
  route('/mdt/:monthId/selection/:selectionId/test', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-details') ? window.__mdtLastErrors.errors : [];
    const values = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-details') ? window.__mdtLastErrors.values : {};
    const attemptedDate = values.attemptedDate || isoToUkDate(pendingTestDates[sel.id]) || isoToUkDate(defaultDatetime().slice(0, 10));
    const maxDate = isoToUkDate(defaultDatetime().slice(0, 10));
    return {
      title: 'Record details of the test',
      breadcrumbs: null,
      html: `
        ${miniProfileHeader(p)}

        <a href="#" class="govuk-back-link mdt-back-link--tight" onclick="window.history.back(); return false;">Back</a>

        ${errorSummary(errors)}

        <h1 class="govuk-heading-xl govuk-!-margin-bottom-3">Record details of the test</h1>

        <form data-form-action="record-test-details" novalidate>
          <div class="govuk-form-group ${errors.some(e => e.field === 'attemptedDate') ? 'govuk-form-group--error' : ''}">
            <p class="govuk-body govuk-!-font-weight-bold" id="field-attempted-date-heading">When was the test attempted?</p>
            <div class="govuk-hint" id="attempted-date-hint">For example, 27 7 2026</div>
            ${fieldErrorMsg(errors, 'attemptedDate')}
            <div class="moj-datepicker" data-module="moj-date-picker" data-max-date="${escape(maxDate)}" data-leading-zeros="true">
              <div class="govuk-form-group">
                <input class="govuk-input govuk-input--width-10 moj-js-datepicker-input" id="field-attempted-date" name="attemptedDate" type="text" inputmode="numeric" autocomplete="off" aria-labelledby="field-attempted-date-heading" aria-describedby="attempted-date-hint" value="${escape(attemptedDate)}">
              </div>
            </div>
          </div>

          <div class="govuk-form-group ${errors.some(e => e.field === 'completed') ? 'govuk-form-group--error' : ''}">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">
                <p class="govuk-body govuk-!-font-weight-bold mdt-legend-heading">Was the sample collected?</p>
              </legend>
              ${fieldErrorMsg(errors, 'completed')}
              <div class="govuk-radios" data-module="govuk-radios">
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="completed-yes" name="completed" type="radio" value="yes"${values.completed === 'yes' ? ' checked' : ''}>
                  <label class="govuk-label govuk-radios__label" for="completed-yes">Yes, sample collected</label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="completed-no" name="completed" type="radio" value="no"${values.completed === 'no' ? ' checked' : ''}>
                  <label class="govuk-label govuk-radios__label" for="completed-no">No, sample not collected</label>
                </div>
              </div>
            </fieldset>
          </div>

          <button class="govuk-button" data-module="govuk-button">Continue</button>
        </form>
      `
    };
  });

  // ---- Record test — reason (not completed) -------------------------------
  route('/mdt/:monthId/selection/:selectionId/test/reason', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-reason') ? window.__mdtLastErrors.errors : [];
    const values = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-reason') ? window.__mdtLastErrors.values : {};
    const reasons = ['Adjudication', 'Discharged', 'Fatal flaw in chain of custody', 'Internal medical appointment', 'Medically unfit', 'Offending behavior programme', 'Abandoned due to operational reasons', 'Out of establishment', 'Refused', 'Scheduled discharge', 'Transferred', 'Visit'];
    return {
      title: 'Why could the sample not be collected?',
      breadcrumbs: null,
      html: `
        ${miniProfileHeader(p)}

        <a href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/test" class="govuk-back-link mdt-back-link--tight">Back</a>

        ${errorSummary(errors)}

        <form data-form-action="record-test-reason" novalidate>
          <div class="govuk-form-group ${errors.some(e => e.field === 'reason') ? 'govuk-form-group--error' : ''}">
            <h1 class="govuk-label-wrapper govuk-!-margin-bottom-1">
              <label class="govuk-label govuk-label--xl" for="reason">Why could the sample not be collected?</label>
            </h1>
            <p class="govuk-hint">The next available reserve will be added to this month's list automatically. If the prisoner refused a test, they will also need adjudication.</p>
            ${fieldErrorMsg(errors, 'reason')}
            <select class="govuk-select" id="reason" name="reason">
              <option value="">Choose a reason</option>
              ${reasons.map(r => `<option value="${escape(r)}"${values.reason === r ? ' selected' : ''}>${escape(r)}</option>`).join('')}
            </select>
          </div>

          <button class="govuk-button" data-module="govuk-button">Continue</button>
        </form>
      `
    };
  });

  // ---- Record test — optional comments before confirmation ---------------
  route('/mdt/:monthId/selection/:selectionId/test/comments', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-comments') ? window.__mdtLastErrors.errors : [];
    const values = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'test-comments') ? window.__mdtLastErrors.values : {};
    const comments = 'comments' in values ? values.comments : (sel.testComment || '');
    return {
      title: 'Add comments',
      breadcrumbs: null,
      html: `
        ${miniProfileHeader(p)}

        <a href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}/test" class="govuk-back-link mdt-back-link--tight">Back</a>

        ${errorSummary(errors)}

        <h1 class="govuk-heading-xl mdt-comments-heading">Add comments (optional)</h1>
        <p class="govuk-body">You can add any notes about this test. Leave blank if there is nothing to record.</p>

        <form data-form-action="record-test-comments" novalidate>
          <div class="govuk-form-group ${errors.some(e => e.field === 'comments') ? 'govuk-form-group--error' : ''}">
            <div class="govuk-hint" id="field-comments-hint">Do not enter more than 500 characters.</div>
            ${fieldErrorMsg(errors, 'comments')}
            <textarea class="govuk-textarea" id="field-comments" name="comments" rows="5" maxlength="500" aria-describedby="field-comments-hint">${escape(comments)}</textarea>
          </div>

          <button class="govuk-button" data-module="govuk-button">Continue</button>
        </form>
      `
    };
  });

  // ---- Record test — step 3: confirmation --------------------------------
  route('/mdt/:monthId/selection/:selectionId/test/confirmation', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const reserveSel = sel.replacementSelectionId ? D.selectionFor(state, sel.replacementSelectionId) : null;
    const reserveP = reserveSel ? D.prisonerFor(state, reserveSel.prisonerId) : null;
    const isRefusal = sel.status === 'exception' && (sel.exceptionReason || '').toLowerCase() === 'refused';
    const needsAdjudication = isRefusal;

    let panel;
    let feedback = '';
    if (sel.status === 'completed') {
      panel = `
        <div class="govuk-panel govuk-panel--confirmation">
          <h1 class="govuk-panel__title">Test recorded</h1>
          <div class="govuk-panel__body">You have collected ${escape(p.displayName)}'s sample</div>
        </div>`;
      feedback = `
        <p class="govuk-body">You have collected ${escape(p.displayName)}'s test sample for ${escape(month.label)}.</p>`;
    } else if (sel.status === 'exception') {
      panel = `
        <div class="govuk-panel govuk-panel--confirmation">
          <h1 class="govuk-panel__title">Reason recorded</h1>
          <div class="govuk-panel__body">${escape(p.displayName)}</div>
        </div>`;
      const reserveLine = reserveSel
        ? `<p class="govuk-body">The service has added <strong>${escape(reserveP.displayName)}</strong> (${escape(reserveP.prisonNumber)}, ${escape(reserveP.location)}) to this month's main list to replace ${escape(p.displayName)}.</p>`
        : `<p class="govuk-body">No reserves are available to replace ${escape(p.displayName)} this month.</p>`;
      const refusalLine = isRefusal
        ? `<p class="govuk-body">${escape(p.displayName)} refused the test — refusal is a chargeable offence and requires adjudication.</p>`
        : '';
      feedback = `
        <p class="govuk-body">You have recorded that ${escape(p.displayName)} could not test this month because ${escape(reasonToPlainText(sel.exceptionReason))}.</p>
        ${reserveLine}
        ${refusalLine}`;
    } else {
      panel = `<p class="govuk-body">Nothing to confirm.</p>`;
    }

    const adjudicationLink = needsAdjudication
      ? `<a class="govuk-link" href="#/adjudications" data-mdt-dummy="adjudication">Continue to adjudication service</a>`
      : '';

    return {
      title: 'Confirmation',
      breadcrumbs: null,
      html: `
        ${panel}

        ${feedback}

        <div class="govuk-button-group govuk-!-margin-top-4">
          <a class="govuk-button" data-module="govuk-button" href="#/mdt/${escape(month.id)}/random-list">Return to the main list</a>
          ${adjudicationLink}
        </div>
      `
    };
  });

  // ---- Record test attempt ------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/attempt', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errors = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'attempt') ? window.__mdtLastErrors.errors : [];
    return {
      title: 'Record test attempt',
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        { href: `#/mdt/${month.id}`, text: monthCrumbText(month) },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Record attempt' }
      ],
      html: `
        ${errorSummary(errors)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}</span>
        <h1 class="govuk-heading-xl">Record test attempt</h1>

        <form data-form-action="record-attempt" novalidate>
          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">What happened?</legend>
              <p class="govuk-hint">Choose one outcome. Reasons come from a prototype policy list (see <a class="govuk-link" href="../ASSUMPTIONS.md">assumptions</a>).</p>
              <div class="govuk-radios" data-module="govuk-radios">
                ${D.OUTCOMES.map((o, i) => `
                  <div class="govuk-radios__item">
                    <input class="govuk-radios__input" id="field-outcome${i === 0 ? '' : '-' + i}" name="outcome" type="radio" value="${escape(o)}" required>
                    <label class="govuk-label govuk-radios__label" for="field-outcome${i === 0 ? '' : '-' + i}">${escape(o)}</label>
                  </div>`).join('')}
              </div>
            </fieldset>
          </div>

          <div class="govuk-form-group">
            <label class="govuk-label" for="field-notes">Reason or notes (optional)</label>
            <div class="govuk-hint">Required when the outcome is "Other" or when policy requires a specific reason.</div>
            <textarea class="govuk-textarea" id="field-notes" name="notes" rows="3"></textarea>
          </div>

          <button class="govuk-button" data-module="govuk-button">Continue</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  // ---- Record sample ------------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/sample', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'sample') ? window.__mdtLastErrors : { errors: [], values: {} };
    const v = errs.values || {};
    const fieldError = (name) => (errs.errors || []).find(e => e.field === name);
    const err = (name) => fieldError(name) ? `<p class="govuk-error-message" id="err-${name}"><span class="govuk-visually-hidden">Error:</span> ${escape(fieldError(name).message)}</p>` : '';
    const grp = (name) => fieldError(name) ? 'govuk-form-group govuk-form-group--error' : 'govuk-form-group';

    return {
      title: 'Record sample information',
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        { href: `#/mdt/${month.id}`, text: monthCrumbText(month) },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Sample information' }
      ],
      html: `
        ${errorSummary(errs.errors)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}</span>
        <h1 class="govuk-heading-xl">Sample information</h1>

        <form data-form-action="record-sample" novalidate autocomplete="off">
          <div class="${grp('reference')}">
            <label class="govuk-label" for="field-reference">Sample reference number <span class="mdt-required-hint">*</span></label>
            <div class="govuk-hint">Enter the reference exactly as it appears on the sample. References must be unique.</div>
            ${err('reference')}
            <input class="govuk-input govuk-input--width-20" id="field-reference" name="reference" type="text" value="${escape(v.reference || '')}" required>
          </div>

          <div class="${grp('collectedAt')}">
            <label class="govuk-label" for="field-collectedAt">Collection date and time <span class="mdt-required-hint">*</span></label>
            ${err('collectedAt')}
            <input class="govuk-input" id="field-collectedAt" name="collectedAt" type="datetime-local" value="${escape(v.collectedAt || defaultDatetime())}" required>
          </div>

          <div class="${grp('testType')}">
            <label class="govuk-label" for="field-testType">Test type <span class="mdt-required-hint">*</span></label>
            ${err('testType')}
            <select class="govuk-select" id="field-testType" name="testType" required>
              <option value="">Choose</option>
              <option value="Random MDT (urine)" ${v.testType === 'Random MDT (urine)' ? 'selected' : ''}>Random MDT (urine)</option>
              <option value="Random MDT (oral fluid)" ${v.testType === 'Random MDT (oral fluid)' ? 'selected' : ''}>Random MDT (oral fluid)</option>
            </select>
          </div>

          <div class="${grp('confirm')}">
            <div class="govuk-checkboxes__item">
              <input class="govuk-checkboxes__input" id="field-confirm" name="confirm" type="checkbox" value="yes" required ${v.confirm ? 'checked' : ''}>
              <label class="govuk-label govuk-checkboxes__label" for="field-confirm">
                I confirm the sample details above match the physical sample
              </label>
            </div>
            ${err('confirm')}
          </div>

          <button class="govuk-button" data-module="govuk-button">Save sample</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  function defaultDatetime() {
    // "YYYY-MM-DDTHH:MM"
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // ---- Use a reserve ------------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/use-reserve', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const available = D.reserves(state, month.id).filter(r => !r.originalSelectionId);
    const next = available[0];
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'reserve') ? window.__mdtLastErrors : { errors: [], values: {} };
    const v = errs.values || {};

    if (!available.length) {
      return {
        title: 'No reserves available',
        breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { href: `#/mdt/${month.id}`, text: monthCrumbText(month) }, { text: 'Use a reserve' }],
        html: `
          <h1 class="govuk-heading-xl">No reserves available</h1>
          <p class="govuk-body">All reserves for ${escape(month.label)} have already been used.</p>
          <p class="govuk-body"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Return to record</a></p>`
      };
    }

    return {
      title: 'Use a reserve',
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        { href: `#/mdt/${month.id}`, text: monthCrumbText(month) },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Use a reserve' }
      ],
      html: `
        ${errorSummary(errs.errors)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}</span>
        <h1 class="govuk-heading-xl">Use a reserve</h1>

        <p class="govuk-body">
          Reserves are used when a main-list selection cannot be tested. The reserve is proposed
          in list order (top of list first). You must record a reason on the original record and
          confirm the reserve before the substitution is saved.
        </p>

        <form data-form-action="use-reserve" novalidate>
          <div class="govuk-form-group">
            <label class="govuk-label govuk-label--m" for="field-reason">Reason for using a reserve <span class="mdt-required-hint">*</span></label>
            <div class="govuk-hint">This is written to the audit history on both records and cannot be edited later.</div>
            <textarea class="govuk-textarea" id="field-reason" name="reason" rows="3" required>${escape(v.reason || (sel.exceptionReason || ''))}</textarea>
          </div>

          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">Confirm the next reserve</legend>
              <p class="govuk-hint">Reserves are proposed in list order. Selecting a lower reserve requires a policy override (not shown in this prototype).</p>
              <div class="govuk-radios">
                ${available.map((r, i) => {
                  const rp = D.prisonerFor(state, r.prisonerId);
                  return `
                    <div class="govuk-radios__item">
                      <input class="govuk-radios__input" id="field-reserveId${i === 0 ? '' : '-' + i}" name="reserveId" type="radio" value="${escape(r.id)}" ${i === 0 && !v.reserveId ? 'checked' : ''} ${v.reserveId === r.id ? 'checked' : ''}>
                      <label class="govuk-label govuk-radios__label" for="field-reserveId${i === 0 ? '' : '-' + i}">
                        Reserve ${r.listPosition} — ${escape(rp.displayName)} <span class="govuk-hint govuk-!-font-size-16">${escape(rp.prisonNumber)}</span>
                      </label>
                    </div>`;
                }).join('')}
              </div>
            </fieldset>
          </div>

          <button class="govuk-button" data-module="govuk-button">Confirm reserve</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  // ---- Record result ------------------------------------------------------
  route('/mdt/:monthId/selection/:selectionId/result', (params) => {
    const month = D.monthFor(state, params.monthId);
    const sel = D.selectionFor(state, params.selectionId);
    if (!month || !sel) return notFound(params.selectionId);
    const p = D.prisonerFor(state, sel.prisonerId);
    const sample = D.samplesFor(state, sel.id).find(sm => sm.status === 'awaiting-result');
    if (!sample) {
      return {
        title: 'No sample awaiting result',
        breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { href: `#/mdt/${month.id}`, text: monthCrumbText(month) }, { text: 'Result' }],
        html: `
          <h1 class="govuk-heading-xl">No sample is awaiting a result</h1>
          <p class="govuk-body">This record does not have a sample currently awaiting a laboratory result.</p>
          <p class="govuk-body"><a class="govuk-link" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Return to record</a></p>`
      };
    }
    const errs = (window.__mdtLastErrors && window.__mdtLastErrors.form === 'result') ? window.__mdtLastErrors.errors : [];
    return {
      title: 'Record laboratory result',
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        { href: `#/mdt/${month.id}`, text: monthCrumbText(month) },
        { href: `#/mdt/${month.id}/selection/${sel.id}`, text: p.displayName },
        { text: 'Record result' }
      ],
      html: `
        ${errorSummary(errs)}
        <span class="govuk-caption-xl">${escape(p.displayName)}, ${escape(p.prisonNumber)}, sample ${escape(sample.reference)}</span>
        <h1 class="govuk-heading-xl">Record laboratory result</h1>

        <form data-form-action="record-result" novalidate>
          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">Result</legend>
              <div class="govuk-radios" data-module="govuk-radios">
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome" name="outcome" type="radio" value="negative" required>
                  <label class="govuk-label govuk-radios__label" for="field-outcome">Negative</label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome-1" name="outcome" type="radio" value="positive">
                  <label class="govuk-label govuk-radios__label" for="field-outcome-1">Positive</label>
                  <div class="govuk-hint govuk-radios__hint">Recording a positive result will create the required follow-up task list. It will not automatically place the prisoner on report.</div>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome-2" name="outcome" type="radio" value="inconclusive">
                  <label class="govuk-label govuk-radios__label" for="field-outcome-2">Inconclusive</label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="field-outcome-3" name="outcome" type="radio" value="rejected">
                  <label class="govuk-label govuk-radios__label" for="field-outcome-3">Sample rejected by laboratory</label>
                </div>
              </div>
            </fieldset>
          </div>
          <button class="govuk-button" data-module="govuk-button">Save result</button>
          <a class="govuk-link govuk-!-margin-left-3" href="#/mdt/${escape(month.id)}/selection/${escape(sel.id)}">Cancel</a>
        </form>
      `
    };
  });

  function renderContainedMonthView(month) {
    const rand = D.random(state, month.id);
    const rsv = D.reserves(state, month.id);
    const current = D.currentMonth(state);
    return {
      title: `${month.label} — main list`,
      breadcrumbs: [
        { href: '#/', text: 'Digital Prison Services' },
        ...(current ? [{ href: `#/mdt/${current.id}`, text: monthCrumbText(current) }] : []),
        { href: '#/mdt/previous-months', text: 'Previous months' },
        { text: month.label }
      ],
      html: `
        <div class="mdt-workspace-header">
          <div>
            <span class="govuk-caption-xl">${escape(state.establishment.name)}</span>
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">${escape(month.label)}</h1>
          </div>
          <div class="mdt-workspace-header__actions">
            <a class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" href="#/mdt/previous-months" role="button" draggable="false" data-module="govuk-button">
              View previous months
            </a>
            <button type="button" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" data-mdt-print="${escape(month.id)}">
              Print testing lists
            </button>
          </div>
        </div>

        ${renderOrderingDetails(month, rand, rsv)}

        ${renderTabsSection(month, 'random', rand, rsv, false, true)}

        ${renderPrintableLists(month, rand, rsv)}
      `
    };
  }


  function notFound(id) {
    return {
      title: 'Record not found',
      breadcrumbs: [{ href: '#/', text: 'Digital Prison Services' }, { text: 'Not found' }],
      html: `<h1 class="govuk-heading-xl">Record not found</h1><p class="govuk-body">No record could be found for <code>${escape(id)}</code>.</p>`
    };
  }

  /* =====================================================================
   * Research mode (Phase 9)
   * ===================================================================== */

  function renderResearchControls() {
    const container = $('#research-controls');
    container.innerHTML = `
      <div class="govuk-form-group">
        <label class="govuk-label" for="research-month">Prototype "current month"</label>
        <select class="govuk-select" id="research-month">
          ${state.reportingMonths.map(m => `<option value="${escape(m.id)}" ${m.status === 'in-progress' ? 'selected' : ''}>${escape(m.label)} (${escape(m.status)})</option>`).join('')}
        </select>
      </div>

      <button class="govuk-button" id="research-set-month">Make selected month current</button>

      <hr class="govuk-section-break govuk-section-break--visible">

      <p class="govuk-body-s">Scenario shortcuts</p>
      <ul class="govuk-list">
        <li><a class="govuk-link" href="#/mdt/m-2026-07/selection/s-07-r-1/attempt">Scenario 2 — imminent release (Alfie Solomons)</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-07/selection/s-07-r-8/attempt">Scenario 3 — unavailable prisoner (Isaiah Jesus)</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-07/awaiting-results">Scenario 4 — record a laboratory result</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-07/report">Scenario 5 — complete monthly reporting</a></li>
        <li><a class="govuk-link" href="#/mdt/m-2026-06">Scenario 6 — resolve a previous-month item</a></li>
      </ul>

      <hr class="govuk-section-break govuk-section-break--visible">

      <button class="govuk-button govuk-button--warning" id="research-reset">Reset all fictional data</button>
      <p class="govuk-body-s">Clears every change made in this session and restores the seed dataset.</p>

      <hr class="govuk-section-break govuk-section-break--visible">

      <details class="govuk-details" data-module="govuk-details">
        <summary class="govuk-details__summary"><span class="govuk-details__summary-text">Simulate a delayed laboratory result</span></summary>
        <div class="govuk-details__text">
          <p class="govuk-body-s">Choose an awaiting sample and record its result to simulate the lab response.</p>
          ${(function () {
            const awaiting = state.samples.filter(s => s.status === 'awaiting-result');
            if (!awaiting.length) return '<p class="govuk-body-s">No samples currently awaiting a result.</p>';
            return `<ul class="govuk-list">${awaiting.map(sm => {
              const sel = D.selectionFor(state, sm.selectionId);
              return `<li><a class="govuk-link" href="#/mdt/${escape(sel.reportingMonthId)}/selection/${escape(sel.id)}/result">${escape(sm.reference)}</a></li>`;
            }).join('')}</ul>`;
          })()}
        </div>
      </details>
    `;
    $('#research-reset').addEventListener('click', () => {
      if (window.confirm('Reset all prototype data? This cannot be undone.')) {
        resetToFixtures();
        navigate('/');
      }
    });
    $('#research-set-month').addEventListener('click', () => {
      const newCurrentId = $('#research-month').value;
      mutate((draft) => {
        draft.reportingMonths.forEach(m => {
          if (m.id === newCurrentId) m.status = 'in-progress';
          else if (m.status === 'in-progress') m.status = 'ready-to-close';
        });
        return {
          entityType: 'reportingMonth', entityId: newCurrentId,
          action: 'Facilitator set current month',
          previousState: null,
          newState: { status: 'in-progress' }
        };
      });
      navigate(`/mdt/${newCurrentId}`);
    });
  }

  function wireResearchToggle() {
    const toggle = $('#research-toggle');
    const panel = $('#research-panel');
    toggle.addEventListener('click', () => {
      const open = !panel.hidden;
      panel.hidden = open;
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!open) renderResearchControls();
    });
  }

  /* =====================================================================
   * Interactive list features (search, sort, conditional reveal)
   * ===================================================================== */

  function wireListInteractions(root) {
    // Print testing list — shows the hidden .mdt-print-only lists via @media print.
    root.querySelectorAll('[data-mdt-print]').forEach(btn => {
      btn.addEventListener('click', () => window.print());
    });

    // Tabs (prisoner MDT history page) — minimal GOV.UK-style tab behaviour.
    root.querySelectorAll('.govuk-tabs').forEach(tabsEl => {
      const tabLinks = Array.from(tabsEl.querySelectorAll('.govuk-tabs__tab'));
      tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').slice(1);
          tabLinks.forEach(l => {
            l.setAttribute('aria-selected', 'false');
            l.closest('.govuk-tabs__list-item').classList.remove('govuk-tabs__list-item--selected');
          });
          tabsEl.querySelectorAll('.govuk-tabs__panel').forEach(p => p.classList.add('govuk-tabs__panel--hidden'));
          link.setAttribute('aria-selected', 'true');
          link.closest('.govuk-tabs__list-item').classList.add('govuk-tabs__list-item--selected');
          const panel = tabsEl.querySelector(`#${targetId}`);
          if (panel) panel.classList.remove('govuk-tabs__panel--hidden');
        });
      });
    });

    // Search: filter tbody rows by `data-search` attribute
    root.querySelectorAll('input[data-mdt-search]').forEach(input => {
      const tbodyKey = input.getAttribute('data-mdt-search');
      const tbody = root.querySelector(`tbody[data-mdt-tbody="${tbodyKey}"]`);
      if (!tbody) return;
      const countEl = root.querySelector(`[data-mdt-count-for="${tbodyKey}"]`);
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        let visible = 0;
        tbody.querySelectorAll('tr').forEach(tr => {
          const key = tr.getAttribute('data-search') || '';
          const show = !q || key.includes(q);
          tr.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        if (countEl) countEl.textContent = `${visible} prisoner${visible === 1 ? '' : 's'}`;
      });
    });

    // Column sort
    root.querySelectorAll('[data-mdt-table]').forEach(table => {
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const originalOrder = Array.from(tbody.querySelectorAll('tr'));
      let currentKey = null;
      let currentDir = 1;
      table.querySelectorAll('.mdt-sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-mdt-sort');
          const colIdx = parseInt(btn.getAttribute('data-mdt-sort-col'), 10);
          if (currentKey === key) {
            currentDir = currentDir === 1 ? -1 : (currentDir === -1 ? 0 : 1);
          } else {
            currentKey = key;
            currentDir = 1;
          }
          // clear indicators
          table.querySelectorAll('.mdt-sort-btn__indicator').forEach(el => el.textContent = '');
          const indicator = btn.querySelector('.mdt-sort-btn__indicator');
          if (currentDir === 0) {
            currentKey = null;
            // restore original order
            originalOrder.forEach(tr => tbody.appendChild(tr));
            return;
          }
          if (indicator) indicator.textContent = currentDir === 1 ? '▲' : '▼';
          const rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort((a, b) => {
            const av = a.children[colIdx] ? a.children[colIdx].getAttribute('data-sort-value') || '' : '';
            const bv = b.children[colIdx] ? b.children[colIdx].getAttribute('data-sort-value') || '' : '';
            if (av < bv) return -1 * currentDir;
            if (av > bv) return 1 * currentDir;
            return 0;
          });
          rows.forEach(tr => tbody.appendChild(tr));
        });
      });
    });

    // Conditional reveal on the record-result form (show drug dropdown only
    // when "positive" is chosen).
    const posRadio = root.querySelector('#outcome-positive');
    const posWrap = root.querySelector('#ct-pos');
    if (posRadio && posWrap) {
      const toggle = () => posWrap.classList.toggle('govuk-radios__conditional--hidden', !posRadio.checked);
      root.querySelectorAll('input[name="outcome"]').forEach(r => r.addEventListener('change', toggle));
      toggle();
    }
  }

  /* =====================================================================
   * Boot
   * ===================================================================== */

  subscribe(renderResearchControls);
  subscribe(render);
  wireResearchToggle();
  render();
})();
