/**
 * MDT prototype — pure domain functions: policy rules, selectors and calculations.
 * These are intentionally free of DOM code so they can be unit tested independently.
 *
 * Exposes: window.MDT_DOMAIN
 */
(function () {
  'use strict';

  const OUTCOMES = [
    'Sample collected',
    'Refused',
    'Unable to provide a sample',
    'Temporarily unavailable',
    'Transferred out',
    'Released',
    'At court',
    'In healthcare',
    'Segregated',
    'Other'
  ];

  const OUTCOMES_REQUIRE_RESERVE = new Set([
    'Refused',
    'Unable to provide a sample',
    'Transferred out',
    'Released'
    // "At court", "In healthcare", "Segregated", "Temporarily unavailable" → officer may retry OR use a reserve.
  ]);

  const OUTCOMES_ALLOW_RESERVE = new Set([
    ...OUTCOMES_REQUIRE_RESERVE,
    'Temporarily unavailable',
    'At court',
    'In healthcare',
    'Segregated',
    'Other'
  ]);

  /**
   * Policy rule from README.md: 5% if avg population >= 400 else 10%.
   * Returns an integer.
   * @param {number} avgPopulation
   */
  function calculateAllocation(avgPopulation) {
    if (typeof avgPopulation !== 'number' || avgPopulation <= 0) return 0;
    const percent = avgPopulation >= 400 ? 5 : 10;
    return Math.ceil((avgPopulation * percent) / 100);
  }

  /**
   * Reserve list size given the random list size and configured percentage.
   */
  function calculateReserveSize(randomListSize, reservePercent) {
    if (!randomListSize) return 0;
    return Math.ceil((randomListSize * (reservePercent || 0)) / 100);
  }

  /**
   * Priority classification. Automation must not silently exclude anyone.
   * Returns { code, label, reason }.
   */
  function priorityFor(selection, prisoner, nowIso) {
    const now = new Date(nowIso);
    const release = prisoner && prisoner.releaseDate ? new Date(prisoner.releaseDate) : null;
    const rolled = selection.rolledOverFromMonthId ? true : false;

    if (release) {
      const diffMs = release.getTime() - now.getTime();
      const day = 24 * 60 * 60 * 1000;
      if (diffMs <= 0) {
        return { code: 'release-today', label: 'Releasing today', reason: `Release date ${prisoner.releaseDate}` };
      }
      if (diffMs <= day) {
        return { code: 'release-24h', label: 'Releasing within 24 hours', reason: `Release date ${prisoner.releaseDate}` };
      }
      if (diffMs <= 7 * day) {
        return { code: 'release-7d', label: 'Releasing within 7 days', reason: `Release date ${prisoner.releaseDate}` };
      }
    }
    if (rolled) {
      return { code: 'rolled-over', label: 'Rolled over from a previous month', reason: 'Outstanding action from an earlier reporting month' };
    }
    return { code: 'standard', label: 'Standard priority', reason: 'No urgent factors' };
  }

  /**
   * Convert a selection's current state into a user-facing status label + tag colour.
   */
  function statusLabel(selection) {
    switch (selection.status) {
      case 'not-started':       return { text: 'Not started',       modifier: 'grey' };
      case 'attempt-required':  return { text: 'Attempt required',  modifier: 'blue' };
      case 'sample-collected':  return { text: 'Sample collected',  modifier: 'purple' };
      case 'awaiting-result':   return { text: 'Awaiting result',   modifier: 'yellow' };
      case 'completed':         return { text: 'Sample taken',      modifier: 'green' };
      case 'exception':         return { text: 'Not completed',      modifier: 'red' };
      case 'priority':          return { text: 'Priority',          modifier: 'orange' };
      default:                  return { text: selection.status || 'Unknown', modifier: 'grey' };
    }
  }

  /* ---- Selectors ------------------------------------------------------- */

  const byMonth   = (state, monthId) => state.selections.filter(s => s.reportingMonthId === monthId);
  const random    = (state, monthId) => byMonth(state, monthId).filter(s => s.listType === 'random').sort((a, b) => a.listPosition - b.listPosition);
  const reserves  = (state, monthId) => byMonth(state, monthId).filter(s => s.listType === 'reserve').sort((a, b) => a.listPosition - b.listPosition);

  const attemptsFor = (state, selectionId) =>
    state.testAttempts.filter(a => a.selectionId === selectionId).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const samplesFor  = (state, selectionId) =>
    state.samples.filter(s => s.selectionId === selectionId).sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));

  const resultsFor  = (state, sampleId) =>
    state.testResults.filter(r => r.sampleId === sampleId);

  const followUpFor = (state, selectionId) =>
    state.followUpActions.filter(f => f.selectionId === selectionId);

  const auditFor = (state, entityId) =>
    state.auditEvents.filter(a => a.entityId === entityId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const prisonerFor = (state, prisonerId) => state.prisoners.find(p => p.id === prisonerId);

  const selectionFor = (state, selectionId) => state.selections.find(s => s.id === selectionId);

  const monthFor = (state, monthId) => state.reportingMonths.find(m => m.id === monthId);

  const currentMonth = (state) => {
    return state.reportingMonths.find(m => m.status === 'in-progress')
        || state.reportingMonths.find(m => m.status === 'ready-to-close')
        || state.reportingMonths[state.reportingMonths.length - 1];
  };

  const isListGenerated = (state, monthId) => byMonth(state, monthId).length > 0;

  /**
   * True when a release date falls within the given reporting month (YYYY-MM).
   */
  function isReleasingInMonth(releaseDateIso, monthYYYYMM) {
    if (!releaseDateIso || !monthYYYYMM) return false;
    return releaseDateIso.slice(0, 7) === monthYYYYMM;
  }

  /**
   * Fisher-Yates shuffle (returns a new array).
   */
  function shuffle(arr, rnd) {
    const random = rnd || Math.random;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const awaitingResults = (state, monthId) => {
    const monthSelections = byMonth(state, monthId).map(s => s.id);
    return state.samples.filter(sm => monthSelections.includes(sm.selectionId) && sm.status === 'awaiting-result');
  };

  const positiveResultsAwaitingFollowUp = (state, monthId) => {
    const monthSelections = new Set(byMonth(state, monthId).map(s => s.id));
    const positive = state.samples.filter(sm => {
      if (!monthSelections.has(sm.selectionId)) return false;
      const result = state.testResults.find(r => r.sampleId === sm.id);
      return result && result.outcome === 'positive';
    });
    return positive.filter(sm => {
      const outstanding = state.followUpActions.filter(f => f.selectionId === sm.selectionId && f.requirement === 'mandatory' && f.status !== 'completed');
      return outstanding.length > 0;
    });
  };

  /**
   * Proportion of completed tests (this month, random + reserve) that were
   * attempted on a Saturday or Sunday. Target is 14% (roughly 2/7).
   * Numerator: completed attempts whose attempted date falls on a weekend.
   * Denominator: all completed attempts recorded this month.
   */
  function testedOnWeekendStats(state, monthId) {
    const monthSelectionIds = new Set(byMonth(state, monthId).map(s => s.id));
    const attempts = state.testAttempts.filter(a =>
      monthSelectionIds.has(a.selectionId) && a.outcome === 'Sample collected');
    const total = attempts.length;
    const weekend = attempts.filter(a => {
      const d = new Date(a.attemptedAt || a.recordedAt);
      const day = d.getDay();
      return day === 0 || day === 6;
    }).length;
    return { weekend, total, percent: total === 0 ? null : Math.round((weekend / total) * 100) };
  }

  const unresolvedFromPreviousMonths = (state) => {
    // Records with awaiting result or with an unresolved mandatory follow-up on an earlier month.
    const currentId = currentMonth(state).id;
    return state.selections.filter(s => {
      if (s.reportingMonthId === currentId) return false;
      if (s.status === 'awaiting-result' || s.status === 'sample-collected') {
        const sm = samplesFor(state, s.id).find(x => x.status === 'awaiting-result');
        if (sm) return true;
      }
      const mand = state.followUpActions.filter(f => f.selectionId === s.id && f.requirement === 'mandatory' && f.status !== 'completed');
      return mand.length > 0;
    });
  };

  /* ---- Report calculations ------------------------------------------ */

  /**
   * Monthly report figures. Every value is traceable back to the underlying selection IDs.
   * Definitions returned alongside the numbers.
   */
  function buildMonthlyReport(state, monthId) {
    const month = monthFor(state, monthId);
    const rand  = random(state, monthId);
    const rsv   = reserves(state, monthId);
    const reservesUsed = rsv.filter(r => r.originalSelectionId);
    const attempted    = rand.filter(r => r.status !== 'not-started');
    const completed    = rand.filter(r => r.status === 'completed');
    const completedReserve = rsv.filter(r => r.status === 'completed');
    const notCompleted = rand.filter(r => r.status === 'exception');
    const collectedSelections = [...rand, ...rsv].filter(s => s.status === 'sample-collected' || s.status === 'completed');
    const awaiting = collectedSelections.filter(s => {
      const sm = samplesFor(state, s.id)[0];
      return sm && sm.status === 'awaiting-result';
    });
    const withResult = collectedSelections
      .map(s => ({ sel: s, sample: samplesFor(state, s.id)[0] }))
      .filter(x => x.sample)
      .map(x => ({ sel: x.sel, sample: x.sample, result: resultsFor(state, x.sample.id)[0] }))
      .filter(x => x.result);
    const positive     = withResult.filter(x => x.result.outcome === 'positive');
    const negative     = withResult.filter(x => x.result.outcome === 'negative');
    const inconclusive = withResult.filter(x => x.result.outcome === 'inconclusive');
    const rejected     = withResult.filter(x => x.result.outcome === 'rejected');

    const exceptionsByReason = notCompleted.reduce((acc, s) => {
      const key = s.exceptionReason || 'Not specified';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const completionRateNumerator = completed.length;
    const completionRateDenominator = month ? month.allocatedTests : rand.length;
    const positiveRateDenominator = negative.length + positive.length; // inconclusive/rejected excluded — see docs
    const positiveRate = positiveRateDenominator === 0 ? null : positive.length / positiveRateDenominator;

    return {
      month,
      figures: {
        allocation: month ? month.allocatedTests : 0,
        randomListSize: rand.length,
        reservesUsed: reservesUsed.length,
        attempted: attempted.length,
        completed: completed.length,
        completedReserve: completedReserve.length,
        notCompleted: notCompleted.length,
        awaitingResults: awaiting.length,
        positive: positive.length,
        negative: negative.length,
        inconclusive: inconclusive.length,
        rejected: rejected.length,
        completionRate: completionRateDenominator === 0 ? 0 : completed.length / completionRateDenominator,
        positiveRate: positiveRate,
        exceptionsByReason
      },
      breakdown: {
        randomIds: rand.map(s => s.id),
        reservesUsedIds: reservesUsed.map(s => s.id),
        attemptedIds: attempted.map(s => s.id),
        completedIds: completed.map(s => s.id),
        notCompletedIds: notCompleted.map(s => s.id),
        awaitingResultIds: awaiting.map(s => s.id),
        positiveIds: positive.map(x => x.sel.id),
        negativeIds: negative.map(x => x.sel.id),
        inconclusiveIds: inconclusive.map(x => x.sel.id),
        rejectedIds: rejected.map(x => x.sel.id)
      },
      definitions: {
        allocation: 'Monthly test allocation supplied by the upstream policy source. Not calculated locally.',
        completionRate: 'Completed random tests ÷ allocated tests. Reserves are counted only against their linked original selection.',
        positiveRate: 'Positive results ÷ (positive + negative). Inconclusive and rejected samples are excluded from the denominator — see OPEN_QUESTIONS.md #8.',
        attempted: 'Random-list selections whose status is anything other than not-started.',
        completed: 'Random-list selections with status = completed. Reserves that substitute for a completed random selection are not double-counted.',
        awaitingResults: 'Selections with a sample whose status is awaiting-result.',
        exceptionsByReason: 'Random-list selections with status = exception, grouped by recorded exceptionReason.'
      }
    };
  }

  /**
   * The next reserve proposed when the officer needs to replace a random selection.
   * Reserves are strictly in listPosition order and consumed once.
   */
  function nextAvailableReserve(state, monthId) {
    return reserves(state, monthId).find(r => !r.originalSelectionId);
  }

  /**
   * Basic validation used before persisting a new sample.
   */
  function validateSampleForm(input, existingSamples) {
    const errors = [];
    if (!input.reference || !input.reference.trim()) {
      errors.push({ field: 'reference', message: 'Enter the sample reference number' });
    } else if (existingSamples.some(s => s.reference.toLowerCase() === input.reference.trim().toLowerCase())) {
      errors.push({ field: 'reference', message: 'This reference has already been used. Sample references must be unique.' });
    }
    if (!input.collectedAt) errors.push({ field: 'collectedAt', message: 'Enter the collection date and time' });
    if (!input.testType)    errors.push({ field: 'testType',    message: 'Choose a test type' });
    if (!input.confirm)     errors.push({ field: 'confirm',     message: 'Confirm the sample details are correct' });
    return errors;
  }

  window.MDT_DOMAIN = {
    OUTCOMES,
    OUTCOMES_REQUIRE_RESERVE,
    OUTCOMES_ALLOW_RESERVE,
    calculateAllocation,
    calculateReserveSize,
    priorityFor,
    statusLabel,
    isReleasingInMonth,
    shuffle,
    // selectors
    random,
    reserves,
    attemptsFor,
    samplesFor,
    resultsFor,
    followUpFor,
    auditFor,
    prisonerFor,
    selectionFor,
    monthFor,
    currentMonth,
    isListGenerated,
    awaitingResults,
    positiveResultsAwaitingFollowUp,
    unresolvedFromPreviousMonths,
    testedOnWeekendStats,
    // reporting
    buildMonthlyReport,
    nextAvailableReserve,
    // validation
    validateSampleForm
  };
})();
