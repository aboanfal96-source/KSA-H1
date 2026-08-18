// ════════════════════════════════════════════════════════════════════════════
// ✅ اختبارات شاملة للنظام الاحترافي
// ════════════════════════════════════════════════════════════════════════════

class TimingSystemTests {
  static runAllTests() {
    console.log('🧪 بدء اختبارات شاملة للنظام الاحترافي...\n');
    
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };

    // مجموعة 1: اختبارات Snapshot
    results.tests.push(...this.testDataSnapshot());
    
    // مجموعة 2: اختبارات قاعدة البيانات التاريخية
    results.tests.push(...this.testHistoricalDatabase());
    
    // مجموعة 3: اختبارات Backtester
    results.tests.push(...this.testBacktestEngine());
    
    // مجموعة 4: اختبارات الدخول المشروط
    results.tests.push(...this.testConditionalEntry());
    
    // مجموعة 5: اختبارات سجل الإشارات
    results.tests.push(...this.testSignalRegistry());

    // تحديث الإجمالي
    results.total = results.tests.length;
    results.passed = results.tests.filter(t => t.passed).length;
    results.failed = results.total - results.passed;

    return this.formatResults(results);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 مجموعة 1: اختبارات Snapshot
  // ═══════════════════════════════════════════════════════════════════════════

  static testDataSnapshot() {
    const tests = [];

    // اختبار 1.1: إنشاء snapshot
    try {
      const candles = [
        { time: 1000, open: 100, high: 102, low: 99, close: 101, volume: 1000 },
        { time: 2000, open: 101, high: 103, low: 100, close: 102, volume: 1100 }
      ];
      const prices = { '4144': 102 };
      const snapshot = new DataSnapshot('4144', 3000, candles, prices, {});
      
      tests.push({
        name: 'إنشاء Snapshot',
        passed: snapshot.id !== undefined && snapshot.checksum !== undefined,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'إنشاء Snapshot',
        passed: false,
        error: e.message
      });
    }

    // اختبار 1.2: تجميد البيانات
    try {
      const candles = [
        { time: 1000, open: 100, high: 102, low: 99, close: 101, volume: 1000 }
      ];
      const snapshot = new DataSnapshot('4144', 2000, candles, {}, {}).freeze();
      
      let canModified = false;
      try {
        snapshot.latestCandle.close = 200;
      } catch {
        canModified = true;
      }

      tests.push({
        name: 'حماية البيانات (Immutability)',
        passed: canModified,  // إذا لم نستطع التعديل = نجح
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'حماية البيانات (Immutability)',
        passed: false,
        error: e.message
      });
    }

    // اختبار 1.3: التحقق من البيانات
    try {
      const candles = [
        { time: 1000, open: 100, high: 102, low: 99, close: 101, volume: 1000 }
      ];
      const snapshot = new DataSnapshot('4144', 2000, candles, {}, {}).freeze();
      const verification = snapshot.verify();
      
      tests.push({
        name: 'التحقق من سلامة البيانات',
        passed: verification.valid === true,
        error: verification.valid ? null : verification.error
      });
    } catch (e) {
      tests.push({
        name: 'التحقق من سلامة البيانات',
        passed: false,
        error: e.message
      });
    }

    return tests;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 مجموعة 2: اختبارات قاعدة البيانات التاريخية
  // ═══════════════════════════════════════════════════════════════════════════

  static testHistoricalDatabase() {
    const tests = [];

    // اختبار 2.1: تسجيل النتائج
    try {
      const db = new HistoricalProbabilityDatabase();
      
      // تسجيل 10 نتائج
      for (let i = 0; i < 10; i++) {
        db.recordCycleOutcome('GANN', '90', i < 7, Math.random() * 5 - 1);
      }

      const rate = db.getCycleSuccessRate('GANN', '90');
      
      tests.push({
        name: 'تسجيل النتائج التاريخية',
        passed: rate.samples === 10 && rate.reliable === true,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'تسجيل النتائج التاريخية',
        passed: false,
        error: e.message
      });
    }

    // اختبار 2.2: حساب نسبة النجاح
    try {
      const db = new HistoricalProbabilityDatabase();
      
      db.recordCycleOutcome('GANN', '45', true, 2);
      db.recordCycleOutcome('GANN', '45', true, 1.5);
      db.recordCycleOutcome('GANN', '45', false, -0.5);

      const rate = db.getCycleSuccessRate('GANN', '45');
      const expectedRate = 2 / 3;  // 66%
      
      tests.push({
        name: 'حساب نسبة النجاح',
        passed: Math.abs(rate.rate - expectedRate) < 0.01,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'حساب نسبة النجاح',
        passed: false,
        error: e.message
      });
    }

    // اختبار 2.3: فاصل الثقة الإحصائي
    try {
      const db = new HistoricalProbabilityDatabase();
      
      for (let i = 0; i < 15; i++) {
        db.recordCycleOutcome('FFT', 'period', i < 10);
      }

      const rate = db.getCycleSuccessRate('FFT', 'period');
      
      tests.push({
        name: 'فاصل الثقة الإحصائي',
        passed: rate.lowerBound < rate.rate && rate.rate < rate.upperBound,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'فاصل الثقة الإحصائي',
        passed: false,
        error: e.message
      });
    }

    return tests;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 مجموعة 3: اختبارات Backtester
  // ═══════════════════════════════════════════════════════════════════════════

  static testBacktestEngine() {
    const tests = [];

    // إنشاء بيانات تجريبية
    const historicalData = {
      '4144': [
        { time: 1000, open: 100, high: 102, low: 99, close: 101, volume: 1000 },
        { time: 2000, open: 101, high: 105, low: 100, close: 104, volume: 1100 },
        { time: 3000, open: 104, high: 106, low: 103, close: 105, volume: 1200 },
        { time: 4000, open: 105, high: 103, low: 98, close: 100, volume: 900 },
        { time: 5000, open: 100, high: 102, low: 99, close: 101, volume: 1000 }
      ]
    };

    // اختبار 3.1: تشغيل backtester
    try {
      const engine = new BacktestEngine(historicalData);
      
      const signals = [
        {
          id: 'SIG1',
          issueTime: 1500,
          direction: 'bullish',
          entryCondition: 'close > 100',
          cancelCondition: null,
          validityDays: 10,
          stopLoss: 98,
          takeProfit: 107,
          validityDays: 3
        }
      ];

      const results = engine.runBacktest(signals, '4144', 1000, 5000);
      
      tests.push({
        name: 'تشغيل محرك Backtest',
        passed: results.error === undefined && results.tradedSignals >= 0,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'تشغيل محرك Backtest',
        passed: false,
        error: e.message
      });
    }

    // اختبار 3.2: حساب Sharpe Ratio
    try {
      const engine = new BacktestEngine(historicalData);
      
      const returns = [0.02, 0.01, -0.01, 0.03, 0.02];
      const sharpe = engine._calculateSharpe(returns);
      
      tests.push({
        name: 'حساب Sharpe Ratio',
        passed: typeof sharpe === 'number' && !isNaN(sharpe),
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'حساب Sharpe Ratio',
        passed: false,
        error: e.message
      });
    }

    return tests;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 مجموعة 4: اختبارات الدخول المشروط
  // ═══════════════════════════════════════════════════════════════════════════

  static testConditionalEntry() {
    const tests = [];

    // إنشاء snapshot تجريبي
    const mockSnapshot = {
      allCandles: [
        { time: 1000, open: 100, high: 102, low: 99, close: 101, volume: 1000 },
        { time: 2000, open: 101, high: 103, low: 100, close: 102, volume: 1100 },
        { time: 3000, open: 102, high: 104, low: 101, close: 103, volume: 1200 }
      ],
      latestCandle: { time: 3000, open: 102, high: 104, low: 101, close: 103, volume: 1200 },
      indicators: { atr: 2 }
    };

    // اختبار 4.1: توليد شروط الدخول
    try {
      const mockSignal = { direction: 'bullish' };
      const conditions = ConditionalEntrySystem.generateEntryConditions(mockSignal, mockSnapshot);
      
      tests.push({
        name: 'توليد شروط الدخول',
        passed: Array.isArray(conditions) && conditions.length > 0,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'توليد شروط الدخول',
        passed: false,
        error: e.message
      });
    }

    // اختبار 4.2: تقييم الشروط
    try {
      const conditions = [
        { name: 'Test 1', met: true, weight: 0.5 },
        { name: 'Test 2', met: false, weight: 0.5 }
      ];

      const evaluation = ConditionalEntrySystem.evaluateConditions(conditions);
      
      tests.push({
        name: 'تقييم شروط الدخول',
        passed: evaluation.score === 50 && evaluation.metCount === 1,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'تقييم شروط الدخول',
        passed: false,
        error: e.message
      });
    }

    // اختبار 4.3: توليد التوصيات
    try {
      const evaluation = {
        allMet: true,
        metCount: 5,
        totalCount: 5,
        score: 100
      };

      const recommendation = ConditionalEntrySystem.generateRecommendation(evaluation);
      
      tests.push({
        name: 'توليد توصيات الدخول',
        passed: recommendation.actionCode === 'ENTER_NOW',
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'توليد توصيات الدخول',
        passed: false,
        error: e.message
      });
    }

    return tests;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 مجموعة 5: اختبارات سجل الإشارات
  // ═══════════════════════════════════════════════════════════════════════════

  static testSignalRegistry() {
    const tests = [];

    // اختبار 5.1: تسجيل الإشارات
    try {
      const registry = new AuditedSignalRegistry();
      
      const signal = registry.createAndRegisterSignal({
        symbol: '4144',
        issueTime: Date.now(),
        priceAtIssue: 73.25,
        cycleType: 'GANN',
        cycleDetails: '90 degrees',
        direction: 'bullish',
        timeWindow: { start: Date.now(), end: Date.now() + 86400000 },
        timeDays: 5,
        probability: 0.72,
        probabilityCI: { lower: 0.6, upper: 0.84 },
        confidenceScore: 72,
        entryCondition: 'close > 73.5',
        cancelCondition: null,
        validityDays: 3,
        entryPrice: 73.25,
        stopLoss: 71,
        takeProfit1: 76,
        takeProfit2: 79,
        riskRewardRatio: 1.5,
        modelVersion: '1.0',
        snapshotChecksum: 'abc123'
      });

      tests.push({
        name: 'تسجيل الإشارات',
        passed: signal.id !== undefined && registry.getSignal(signal.id) !== undefined,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'تسجيل الإشارات',
        passed: false,
        error: e.message
      });
    }

    // اختبار 5.2: منع تعديل الإشارات
    try {
      const registry = new AuditedSignalRegistry();
      
      const signal = registry.createAndRegisterSignal({
        symbol: '4144',
        issueTime: Date.now(),
        priceAtIssue: 73.25,
        cycleType: 'GANN',
        cycleDetails: '90 degrees',
        direction: 'bullish',
        timeWindow: { start: Date.now(), end: Date.now() + 86400000 },
        timeDays: 5,
        probability: 0.72,
        probabilityCI: { lower: 0.6, upper: 0.84 },
        confidenceScore: 72,
        entryCondition: null,
        cancelCondition: null,
        validityDays: 3,
        entryPrice: 73.25,
        stopLoss: 71,
        takeProfit1: 76,
        takeProfit2: 79,
        riskRewardRatio: 1.5,
        modelVersion: '1.0',
        snapshotChecksum: 'abc123'
      });

      let canModify = false;
      try {
        signal.direction = 'bearish';
      } catch {
        canModify = true;
      }

      tests.push({
        name: 'حماية الإشارات من التعديل',
        passed: canModify,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'حماية الإشارات من التعديل',
        passed: false,
        error: e.message
      });
    }

    // اختبار 5.3: تسجيل النتائج
    try {
      const registry = new AuditedSignalRegistry();
      
      const signal = registry.createAndRegisterSignal({
        symbol: '4144',
        issueTime: Date.now(),
        priceAtIssue: 73.25,
        cycleType: 'GANN',
        cycleDetails: '90 degrees',
        direction: 'bullish',
        timeWindow: { start: Date.now(), end: Date.now() + 86400000 },
        timeDays: 5,
        probability: 0.72,
        probabilityCI: { lower: 0.6, upper: 0.84 },
        confidenceScore: 72,
        entryCondition: null,
        cancelCondition: null,
        validityDays: 3,
        entryPrice: 73.25,
        stopLoss: 71,
        takeProfit1: 76,
        takeProfit2: 79,
        riskRewardRatio: 1.5,
        modelVersion: '1.0',
        snapshotChecksum: 'abc123'
      });

      registry.recordOutcome(signal.id, {
        reason: 'TAKE_PROFIT',
        price: 76,
        profit: 2.75,
        profitPercent: 3.75
      });

      const outcome = registry.getOutcome(signal.id);
      
      tests.push({
        name: 'تسجيل نتائج الصفقات',
        passed: outcome !== undefined && outcome.profit === 2.75,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'تسجيل نتائج الصفقات',
        passed: false,
        error: e.message
      });
    }

    // اختبار 5.4: حساب الإحصائيات
    try {
      const registry = new AuditedSignalRegistry();
      
      const signal = registry.createAndRegisterSignal({
        symbol: '4144',
        issueTime: Date.now(),
        priceAtIssue: 73.25,
        cycleType: 'GANN',
        cycleDetails: '90 degrees',
        direction: 'bullish',
        timeWindow: { start: Date.now(), end: Date.now() + 86400000 },
        timeDays: 5,
        probability: 0.72,
        probabilityCI: { lower: 0.6, upper: 0.84 },
        confidenceScore: 72,
        entryCondition: null,
        cancelCondition: null,
        validityDays: 3,
        entryPrice: 73.25,
        stopLoss: 71,
        takeProfit1: 76,
        takeProfit2: 79,
        riskRewardRatio: 1.5,
        modelVersion: '1.0',
        snapshotChecksum: 'abc123'
      });

      registry.recordOutcome(signal.id, {
        reason: 'TAKE_PROFIT',
        price: 76,
        profit: 2.75,
        profitPercent: 3.75
      });

      const stats = registry.getStatistics('4144');
      
      tests.push({
        name: 'حساب إحصائيات الأداء',
        passed: stats.totalSignals === 1 && stats.closedSignals === 1 && stats.winRate === 100,
        error: null
      });
    } catch (e) {
      tests.push({
        name: 'حساب إحصائيات الأداء',
        passed: false,
        error: e.message
      });
    }

    return tests;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📋 تنسيق النتائج
  // ═══════════════════════════════════════════════════════════════════════════

  static formatResults(results) {
    let report = '\n╔════════════════════════════════════════════════════╗\n';
    report += '║              نتائج الاختبارات الشاملة               ║\n';
    report += '╠════════════════════════════════════════════════════╣\n\n';

    report += `📊 الملخص:\n`;
    report += `   إجمالي الاختبارات: ${results.total}\n`;
    report += `   ✅ نجح: ${results.passed}\n`;
    report += `   ❌ فشل: ${results.failed}\n`;
    report += `   نسبة النجاح: ${((results.passed / results.total) * 100).toFixed(1)}%\n\n`;

    report += '📝 التفاصيل:\n';
    
    for (const test of results.tests) {
      const icon = test.passed ? '✅' : '❌';
      report += `   ${icon} ${test.name}`;
      if (test.error) {
        report += ` - الخطأ: ${test.error}`;
      }
      report += '\n';
    }

    report += '\n╚════════════════════════════════════════════════════╝\n';

    return report;
  }
}

// تشغيل الاختبارات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimingSystemTests;
}
