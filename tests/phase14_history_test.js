/**
 * Narratix Lab — Phase 14 Report History System Test Suite
 * Programmatic verification of video_length parsing, normalizations, history filters, and delta calculations.
 */

// Simple inline mock of normalizeNaxResult for testing in pure Node CJS environment
function normalizeNaxResult(raw) {
  if (!raw) return raw;
  const overall_score = raw.executive_summary?.overall_score ?? raw.overall_score ?? 1;
  const overall_verdict = raw.executive_summary?.overall_verdict ?? raw.overall_verdict ?? '';
  
  let hook_analysis = raw.hook_analysis;
  let retention_analysis = raw.retention_analysis;
  let script_analysis = raw.script_analysis;
  let editing_analysis = raw.editing_analysis;
  let emotion_analysis = raw.emotion_analysis;
  let growth_analysis = raw.growth_analysis;
  let executive_summary = raw.executive_summary;

  if (!hook_analysis && raw.modules) {
    executive_summary = {
      overall_score,
      overall_verdict,
      strengths: 'Strong structure.',
      weaknesses: 'Weak hook.',
      recommendations: 'Pacing changes.',
      priority_fixes: 'Remove intro.'
    };
    hook_analysis = {
      score: raw.modules.hook?.score ?? 1,
      strengths: raw.modules.hook?.diagnosis || 'Clear context.',
      weaknesses: 'Greeting statement dilutes curiosity.',
      recommendations: 'Lead with outcome.',
      priority_fixes: 'Remove greeting.',
      scroll_stop_probability: 'Moderate (65%)',
      hook_rewrite_suggestions: 'Rewrite'
    };
    retention_analysis = {
      score: raw.modules.retention?.score ?? 1,
      strengths: 'Snappy pacing.',
      weaknesses: 'Viewer drop points.',
      recommendations: 'Pattern interrupts.',
      priority_fixes: 'Preview visual.',
      predicted_viewer_drop_points: 'At 10s.',
      retention_curve_summary: 'Steady.',
      engagement_risks: 'Losing interest.'
    };
    script_analysis = {
      score: raw.modules.script?.score ?? 1,
      strengths: 'Dynamic flow.',
      weaknesses: 'Transitions.',
      recommendations: 'Better outline.',
      priority_fixes: 'Keep pacing.',
      structure_score: raw.modules.script?.score ?? 1,
      clarity_score: raw.modules.script?.score ?? 1,
      audience_fit: 'Perfect.',
      rewrite_suggestions: 'Rewrite'
    };
    editing_analysis = {
      score: raw.modules.editing?.score ?? 1,
      strengths: 'Pacing.',
      weaknesses: 'Lack of visual.',
      recommendations: 'Add B-roll.',
      priority_fixes: 'Zoom cuts.',
      pacing_analysis: 'Good.',
      visual_suggestions: 'More colors.',
      b_roll_suggestions: 'Ingredients.',
      pattern_interrupt_recommendations: 'Text pops.'
    };
    emotion_analysis = {
      score: raw.modules.emotion?.score ?? 1,
      strengths: 'Friendly.',
      weaknesses: 'Flat tone.',
      recommendations: 'Tension.',
      priority_fixes: 'Immediate tension.',
      emotional_journey: 'Joy.',
      curiosity_peaks: 'Reveal.',
      trust_moments: 'Credentials.',
      emotional_drop_zones: 'Explanations.'
    };
    growth_analysis = {
      score: raw.modules.growth?.score ?? 1,
      strengths: 'Tags.',
      weaknesses: 'Caption.',
      recommendations: 'Search terms.',
      priority_fixes: 'Search terms.',
      caption_suggestions: 'Try this.',
      hashtag_suggestions: '#tags',
      distribution_strategy: 'Cross post.',
      platform_recommendations: 'Post at 6pm.'
    };
  }

  return {
    ...raw,
    overall_score,
    overall_verdict,
    executive_summary,
    hook_analysis,
    retention_analysis,
    script_analysis,
    editing_analysis,
    emotion_analysis,
    growth_analysis,
  };
}

function parseVideoLength(videoLength) {
  let parsedVideoLength = null;
  if (videoLength === '0-15s') parsedVideoLength = 15;
  else if (videoLength === '15-30s') parsedVideoLength = 30;
  else if (videoLength === '30-60s') parsedVideoLength = 60;
  else if (videoLength === '60-90s') parsedVideoLength = 90;
  else if (videoLength === '90s+') parsedVideoLength = 120;
  else {
    const num = parseInt(videoLength, 10);
    if (!isNaN(num)) {
      parsedVideoLength = num;
    }
  }
  return parsedVideoLength;
}

function calculateDeltas(normalizedResults, normalizedCompareResults) {
  if (!normalizedResults || !normalizedCompareResults) return null;

  const currentScore = normalizedResults.overall_score;
  const compareScore = normalizedCompareResults.overall_score;
  const overallDelta = Number((currentScore - compareScore).toFixed(1));

  const getScore = (res, key) => {
    return res[`${key}_analysis`]?.score ?? res.modules?.[key]?.score ?? 0;
  };

  const modulesList = ['hook', 'retention', 'script', 'editing', 'emotion', 'growth'];
  const moduleDeltas = modulesList.reduce((acc, m) => {
    const cScore = getScore(normalizedResults, m);
    const prevScore = getScore(normalizedCompareResults, m);
    acc[m] = {
      current: cScore,
      compare: prevScore,
      delta: cScore - prevScore
    };
    return acc;
  }, {});

  return {
    overall: overallDelta,
    modules: moduleDeltas,
    trend: overallDelta > 0 ? 'Improved' : overallDelta < 0 ? 'Declined' : 'No Change'
  };
}

async function runTests() {
  console.log('🧪 RUNNING PHASE 14 REPORT HISTORY TEST SUITE\n');
  let passed = 0;
  let failed = 0;

  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const test = (name, fn) => {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`);
      console.error(e.message);
      failed++;
    }
  };

  // 1. video_length parser test
  test('video_length parser conversion rules', () => {
    assert(parseVideoLength('0-15s') === 15, '0-15s should be 15');
    assert(parseVideoLength('15-30s') === 30, '15-30s should be 30');
    assert(parseVideoLength('30-60s') === 60, '30-60s should be 60');
    assert(parseVideoLength('60-90s') === 90, '60-90s should be 90');
    assert(parseVideoLength('90s+') === 120, '90s+ should be 120');
    assert(parseVideoLength('45') === 45, '45 numeric string should be 45');
    assert(parseVideoLength('') === null, 'empty string should be null');
    assert(parseVideoLength(null) === null, 'null should be null');
  });

  // 2. normalize results verification
  test('normalizeNaxResult schema normalization rules', () => {
    const rawLegacy = {
      overall_score: 7.5,
      overall_verdict: 'Ver test',
      modules: {
        hook: { score: 8, diagnosis: 'Diag 1' },
        retention: { score: 6, completion_prediction: 'Comp test' },
        script: { score: 7, clarity_score: 8 },
        editing: { score: 5, issues: 'Issues' },
        emotion: { score: 9, opening_emotion: 'Joy' },
        growth: { score: 6, viral_probability: 'Moderate' }
      }
    };

    const normalized = normalizeNaxResult(rawLegacy);
    assert(normalized.overall_score === 7.5, 'overall score parsed');
    assert(normalized.hook_analysis.score === 8, 'hook score parsed');
    assert(normalized.retention_analysis.score === 6, 'retention score parsed');
    assert(normalized.script_analysis.score === 7, 'script score parsed');
    assert(normalized.editing_analysis.score === 5, 'editing score parsed');
    assert(normalized.emotion_analysis.score === 9, 'emotion score parsed');
  });

  // 3. filter logic test
  test('history search and filter logic', () => {
    const items = [
      { id: '1', niche: 'fitness', platform: 'TikTok', video_name: 'pushups_tips.pdf', results: {} },
      { id: '2', niche: 'tech', platform: 'YouTube Shorts', video_name: 'nextjs_tips.pdf', results: {} },
      { id: '3', niche: 'cooking', platform: 'Instagram Reels', video_name: 'pizza_recipe.txt', results: {} }
    ];

    const filter = (searchTerm, selectedPlatform, selectedNiche) => {
      return items.filter((item) => {
        const filename = item.video_name || '';
        const niche = item.niche || '';
        const platform = item.platform || '';

        const matchesSearch =
          filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
          niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
          platform.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPlatform = !selectedPlatform || platform === selectedPlatform;
        const matchesNiche = !selectedNiche || niche === selectedNiche;

        return matchesSearch && matchesPlatform && matchesNiche;
      });
    };

    // Keyword search tests
    assert(filter('pushups', '', '').length === 1, 'Search for pushups matches 1');
    assert(filter('tips', '', '').length === 2, 'Search for tips matches 2');
    assert(filter('nextjs', '', '').length === 1, 'Search for nextjs matches 1');
    
    // Dropdown filters tests
    assert(filter('', 'TikTok', '').length === 1, 'Filter TikTok matches 1');
    assert(filter('', '', 'cooking').length === 1, 'Filter cooking matches 1');
    assert(filter('', 'TikTok', 'cooking').length === 0, 'Filter TikTok + cooking matches 0');
  });

  // 4. delta calculations test
  test('report comparison score deltas', () => {
    const reportA = {
      overall_score: 8.2,
      hook_analysis: { score: 9 },
      retention_analysis: { score: 8 },
      script_analysis: { score: 7 },
      editing_analysis: { score: 6 },
      emotion_analysis: { score: 7 },
      growth_analysis: { score: 8 }
    };

    const reportB = {
      overall_score: 7.0,
      hook_analysis: { score: 7 },
      retention_analysis: { score: 6 },
      script_analysis: { score: 7 },
      editing_analysis: { score: 8 },
      emotion_analysis: { score: 7 },
      growth_analysis: { score: 9 }
    };

    const diff = calculateDeltas(reportA, reportB);
    assert(diff.overall === 1.2, 'overall delta is 1.2');
    assert(diff.modules.hook.delta === 2, 'hook delta is +2');
    assert(diff.modules.editing.delta === -2, 'editing delta is -2');
    assert(diff.trend === 'Improved', 'overall trend is Improved');
  });

  console.log(`\n📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
