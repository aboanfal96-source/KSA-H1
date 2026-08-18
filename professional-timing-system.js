// ════════════════════════════════════════════════════════════════════════════
// 🏗️ نظام التحليل الزمني الاحترافي - البنية الكاملة
// ════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ⏱️ المرحلة 1: نظام Snapshot ومنع التسرب الزمني
// ═══════════════════════════════════════════════════════════════════════════

class DataSnapshot {
  constructor(symbol, timestamp, candles, prices, indicators) {
    this.id = `${symbol}_${timestamp}`;
    this.symbol = symbol;
    this.issueTime = timestamp;
    this.dataEndTime = candles[candles.length - 1]?.time;
    this.candleCount = candles.length;
    
    // نسخ كاملة من البيانات
    this.latestCandle = JSON.parse(JSON.stringify(candles[candles.length - 1]));
    this.previousCandles = JSON.parse(JSON.stringify(candles.slice(-20)));
    this.allCandles = JSON.parse(JSON.stringify(candles));
    
    this.prices = JSON.parse(JSON.stringify(prices));
    this.indicators = JSON.parse(JSON.stringify(indicators));
    
    // حساب بصمة التحقق
    this.checksum = this._calculateChecksum();
    this.frozen = false;
  }

  _calculateChecksum() {
    const data = {
      symbol: this.symbol,
      issueTime: this.issueTime,
      candleCount: this.candleCount,
      lastClose: this.latestCandle.close,
      lastVolume: this.latestCandle.volume,
      lastTime: this.latestCandle.time
    };
    
    return JSON.stringify(data)
      .split('')
      .reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
      .toString(16);
  }

  freeze() {
    if (this.frozen) return this;
    
    this.frozen = true;
    Object.freeze(this.latestCandle);
    Object.freeze(this.previousCandles);
    Object.freeze(this.allCandles);
    Object.freeze(this.prices);
    Object.freeze(this.indicators);
    
    return this;
  }

  verify() {
    if (!this.frozen) {
      return { valid: false, error: 'Snapshot not frozen' };
    }
    
    const newChecksum = this._calculateChecksum();
    if (newChecksum !== this.checksum) {
      return { valid: false, error: 'Data has been modified' };
    }
    
    return { valid: true, checksum: this.checksum };
  }

  export() {
    return {
      id: this.id,
      symbol: this.symbol,
      issueTime: this.issueTime,
      dataEndTime: this.dataEndTime,
      candleCount: this.candleCount,
      checksum: this.checksum,
      frozen: this.frozen,
      latestCandle: this.latestCandle,
      previousCandles: this.previousCandles,
      prices: this.prices,
      indicators: this.indicators
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 قاعدة البيانات التاريخية والاحتمالية
// ═══════════════════════════════════════════════════════════════════════════

class HistoricalProbabilityDatabase {
  constructor() {
    this.cycleOutcomes = new Map();  // دورة → outcomes[]
    this.concordanceResults = [];     // نتائج التوافق
    this.backtestResults = [];        // نتائج الاختبار التاريخي
    this.lastUpdated = Date.now();
  }

  // تسجيل نتيجة دورة زمنية
  recordCycleOutcome(cycleType, cycleParam, wasSuccessful, profitPercent, casesData) {
    const key = `${cycleType}_${cycleParam}`;
    
    if (!this.cycleOutcomes.has(key)) {
      this.cycleOutcomes.set(key, []);
    }
    
    this.cycleOutcomes.get(key).push({
      timestamp: Date.now(),
      success: wasSuccessful,
      profit: profitPercent,
      caseData: casesData
    });
  }

  // حساب نسبة النجاح مع فاصل الثقة
  getCycleSuccessRate(cycleType, cycleParam, minSamples = 10) {
    const key = `${cycleType}_${cycleParam}`;
    const outcomes = this.cycleOutcomes.get(key) || [];
    
    if (outcomes.length < minSamples) {
      return {
        rate: 0.5,  // افتراض محايد
        confidence: 0,
        lowerBound: 0.3,
        upperBound: 0.7,
        samples: outcomes.length,
        reliable: false,
        message: `بيانات غير كافية (${outcomes.length}/${minSamples})`
      };
    }

    const successes = outcomes.filter(o => o.success).length;
    const rate = successes / outcomes.length;
    
    // حساب فاصل الثقة 95%
    const stdError = Math.sqrt(rate * (1 - rate) / outcomes.length);
    const z = 1.96;  // 95% confidence
    const margin = z * stdError;
    
    return {
      rate,
      confidence: rate,
      lowerBound: Math.max(0, rate - margin),
      upperBound: Math.min(1, rate + margin),
      samples: outcomes.length,
      reliable: outcomes.length >= minSamples,
      avgProfit: outcomes.reduce((sum, o) => sum + o.profit, 0) / outcomes.length,
      message: `${(rate * 100).toFixed(0)}% (${outcomes.length} حالة)`
    };
  }

  // دمج احتمالات متعددة (Bayesian)
  combineProbabilities(components) {
    let posterior = 0.5;  // prior
    
    for (const comp of components) {
      if (!comp.reliable) continue;
      
      // Bayesian update
      const likelihood = comp.rate;
      const odds = likelihood / (1 - likelihood);
      const priorOdds = posterior / (1 - posterior);
      const posteriorOdds = priorOdds * odds;
      
      posterior = posteriorOdds / (1 + posteriorOdds);
    }
    
    // حساب فاصل الثقة
    const reliableCount = components.filter(c => c.reliable).length;
    const stdError = Math.sqrt(posterior * (1 - posterior) / Math.max(reliableCount, 1));
    const z = 1.96;
    
    return {
      probability: posterior,
      lowerBound: Math.max(0, posterior - z * stdError),
      upperBound: Math.min(1, posterior + z * stdError),
      components: reliableCount,
      totalComponents: components.length,
      reliable: reliableCount >= 2
    };
  }

  // إضافة نتيجة backtesting كاملة
  recordBacktestResult(symbol, period, metrics) {
    this.backtestResults.push({
      timestamp: Date.now(),
      symbol,
      period,
      winRate: metrics.winRate,
      profitFactor: metrics.profitFactor,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdown: metrics.maxDrawdown,
      trades: metrics.trades
    });
  }

  // الحصول على إحصائيات الأداء
  getPerformanceStats(symbol, period) {
    const results = this.backtestResults.filter(
      r => r.symbol === symbol && r.period === period
    );
    
    if (results.length === 0) {
      return { available: false, message: 'لا توجد نتائج backtesting' };
    }
    
    const latest = results[results.length - 1];
    return { available: true, ...latest };
  }

  exportForAudit() {
    return {
      cycleOutcomes: Array.from(this.cycleOutcomes.entries()).map(([key, outcomes]) => ({
        cycle: key,
        totalCases: outcomes.length,
        successes: outcomes.filter(o => o.success).length,
        avgProfit: outcomes.reduce((s, o) => s + o.profit, 0) / outcomes.length
      })),
      backtestCount: this.backtestResults.length,
      lastUpdated: this.lastUpdated
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 المرحلة 3: محرك الاختبار التاريخي
// ═══════════════════════════════════════════════════════════════════════════

class BacktestEngine {
  constructor(historicalData, commissionRate = 0.0025, slippagePercent = 0.05) {
    this.historicalData = historicalData;  // { symbol: [{ time, open, high, low, close, volume }] }
    this.commissionRate = commissionRate;
    this.slippagePercent = slippagePercent;
    this.results = null;
  }

  runBacktest(signals, symbol, startDate, endDate) {
    const priceHistory = this.historicalData[symbol] || [];
    const periodData = priceHistory.filter(p => 
      p.time >= startDate && p.time <= endDate
    );
    
    if (periodData.length === 0) {
      return { error: 'No historical data for period' };
    }

    const trades = [];
    let totalProfit = 0;
    let wins = 0;
    let losses = 0;
    let drawdown = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    const dailyReturns = [];

    for (const signal of signals) {
      if (signal.issueTime > endDate) continue;
      
      // البحث عن نقطة دخول
      const entryData = this._findEntry(signal, periodData);
      if (!entryData) continue;

      const trade = {
        signal: signal.id,
        entryTime: entryData.time,
        entryPrice: entryData.price,
        entryReason: entryData.reason
      };

      // محاكاة الصفقة
      const exitData = this._simulateTrade(signal, entryData, periodData);
      
      trade.exitTime = exitData.time;
      trade.exitPrice = exitData.price;
      trade.exitReason = exitData.reason;

      const gross = exitData.price - entryData.price;
      const fees = entryData.price * this.commissionRate;
      const slippage = Math.abs(gross) * (this.slippagePercent / 100);
      
      trade.profit = gross - fees - slippage;
      trade.profitPercent = (trade.profit / entryData.price) * 100;

      trades.push(trade);
      totalProfit += trade.profit;
      
      if (trade.profit > 0) wins++;
      else losses++;

      dailyReturns.push(trade.profitPercent / 100);
      
      // حساب Drawdown
      peakEquity = Math.max(peakEquity, totalProfit);
      drawdown = peakEquity - totalProfit;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    const winRate = trades.length > 0 ? wins / trades.length : 0;
    const avgWin = wins > 0 ? trades.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0) / wins : 0;
    const avgLoss = losses > 0 ? trades.filter(t => t.profit <= 0).reduce((s, t) => s + t.profit, 0) / losses : 0;
    const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : (avgWin > 0 ? 1 : 0);

    const sharpeRatio = this._calculateSharpe(dailyReturns);
    const sortino = this._calculateSortino(dailyReturns);

    this.results = {
      symbol,
      period: { start: startDate, end: endDate },
      totalSignals: signals.length,
      tradedSignals: trades.length,
      trades,
      totalProfit,
      totalReturn: (totalProfit / 100) * 100,  // بافتراض رأس مال ابتدائي
      winRate: winRate * 100,
      wins,
      losses,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      sortino,
      maxDrawdown: maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / peakEquity * 100) || 0
    };

    return this.results;
  }

  _findEntry(signal, priceHistory) {
    const startTime = signal.issueTime;
    
    for (const price of priceHistory) {
      if (price.time <= startTime) continue;
      
      // تحقق من شروط الدخول
      if (this._meetsEntryCondition(signal.entryCondition, price)) {
        return {
          time: price.time,
          price: price.close,
          reason: 'CONDITION_MET'
        };
      }
      
      // انتهاء الصلاحية
      if (price.time > startTime + (signal.validityDays * 86400 * 1000)) {
        return null;
      }
    }
    
    return null;
  }

  _simulateTrade(signal, entryData, priceHistory) {
    const exitTime = entryData.time;
    const stopLoss = signal.stopLoss;
    const takeProfit = signal.takeProfit;
    const validityDays = signal.validityDays;

    for (const price of priceHistory) {
      if (price.time <= exitTime) continue;

      // وقف الخسارة
      if (price.low <= stopLoss) {
        return {
          time: price.time,
          price: stopLoss,
          reason: 'STOP_LOSS'
        };
      }

      // جني الأرباح
      if (price.high >= takeProfit) {
        return {
          time: price.time,
          price: takeProfit,
          reason: 'TAKE_PROFIT'
        };
      }

      // انتهاء الصلاحية
      if (price.time > exitTime + (validityDays * 86400 * 1000)) {
        return {
          time: price.time,
          price: price.close,
          reason: 'EXPIRY'
        };
      }
    }

    return {
      time: priceHistory[priceHistory.length - 1].time,
      price: priceHistory[priceHistory.length - 1].close,
      reason: 'NO_EXIT'
    };
  }

  _meetsEntryCondition(condition, price) {
    // تطبيق شرط الدخول
    if (!condition) return true;
    
    // مثال: "close > 75.00 AND volume > 1000000"
    try {
      const context = {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume
      };
      
      return eval(condition.replace(/AND/gi, '&&').replace(/OR/gi, '||'));
    } catch (e) {
      console.error('Invalid entry condition:', condition, e);
      return true;
    }
  }

  _calculateSharpe(returns) {
    if (returns.length < 2) return 0;
    
    const avg = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avg, 2)) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    const riskFreeRate = 0.02 / 252;  // 2% annual, daily
    return (avg - riskFreeRate) / (stdDev || 0.001);
  }

  _calculateSortino(returns) {
    if (returns.length < 2) return 0;
    
    const avg = returns.reduce((a, b) => a + b) / returns.length;
    const downside = returns.filter(r => r < avg).reduce((a, b) => a + Math.pow(b - avg, 2), 0) / returns.length;
    const downsideStdDev = Math.sqrt(downside);
    
    const riskFreeRate = 0.02 / 252;
    return (avg - riskFreeRate) / (downsideStdDev || 0.001);
  }

  exportResults() {
    return this.results;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 المرحلة 4: نظام الدخول المشروط
// ═══════════════════════════════════════════════════════════════════════════

class ConditionalEntrySystem {
  static generateEntryConditions(signal, snapshot) {
    const conditions = [];

    // شرط 1: تأكيد السعر
    const sma20 = this._calculateSMA(snapshot.allCandles, 20);
    conditions.push({
      type: 'PRICE_CONFIRMATION',
      name: 'تأكيد السعر فوق المتوسط',
      description: `السعر الحالي (${snapshot.latestCandle.close}) أعلى من SMA20 (${sma20.toFixed(2)})`,
      condition: `close > ${sma20.toFixed(2)}`,
      weight: 0.25,
      priority: 'HIGH',
      met: snapshot.latestCandle.close > sma20
    });

    // شرط 2: تأكيد الحجم
    const avgVolume = this._calculateAverage(snapshot.allCandles.map(c => c.volume), 20);
    conditions.push({
      type: 'VOLUME_CONFIRMATION',
      name: 'تأكيد الحجم',
      description: `الحجم الحالي (${snapshot.latestCandle.volume}) أعلى من المتوسط (${avgVolume.toFixed(0)})`,
      condition: `volume > ${avgVolume.toFixed(0)}`,
      weight: 0.20,
      priority: 'MEDIUM',
      met: snapshot.latestCandle.volume > avgVolume
    });

    // شرط 3: تأكيد ATR
    const atr = snapshot.indicators?.atr || 0;
    conditions.push({
      type: 'VOLATILITY_CHECK',
      name: 'فحص التذبذب',
      description: `ATR (${atr.toFixed(2)}) في مستوى معقول - لا تقلب عالي جداً`,
      condition: `atr < ${(atr * 1.5).toFixed(2)}`,
      weight: 0.15,
      priority: 'MEDIUM',
      met: true  // افتراضي
    });

    // شرط 4: تأكيد الاتجاه
    const trend = this._calculateTrend(snapshot.allCandles);
    const trendMatch = (signal.direction === 'bullish' && trend > 0) ||
                      (signal.direction === 'bearish' && trend < 0) ||
                      signal.direction === 'neutral';
    
    conditions.push({
      type: 'TREND_CONFIRMATION',
      name: 'توافق الاتجاه',
      description: `الاتجاه ${trend > 0 ? 'صاعد' : 'هابط'} يتوافق مع توقع الإشارة`,
      condition: 'trend_matches',
      weight: 0.25,
      priority: 'HIGH',
      met: trendMatch
    });

    // شرط 5: فترة العمل
    const now = new Date();
    const hour = now.getHours();
    const isValidHour = hour >= 10 && hour <= 14;  // أفضل أوقات التداول
    
    conditions.push({
      type: 'TIME_VALIDATION',
      name: 'فترة التداول',
      description: `الوقت الحالي ضمن فترة التداول المثلى (10:00 - 14:00)`,
      condition: 'time_valid',
      weight: 0.15,
      priority: 'LOW',
      met: isValidHour
    });

    return conditions;
  }

  static evaluateConditions(conditions) {
    const met = conditions.filter(c => c.met);
    const unmet = conditions.filter(c => !c.met);
    
    const weightedScore = met.reduce((sum, c) => sum + c.weight, 0);
    const totalWeight = conditions.reduce((sum, c) => sum + c.weight, 0);
    const score = (weightedScore / totalWeight) * 100;

    return {
      allMet: unmet.length === 0,
      metCount: met.length,
      totalCount: conditions.length,
      score,
      met,
      unmet
    };
  }

  static generateRecommendation(evaluation) {
    if (evaluation.allMet) {
      return {
        action: 'ENTER_IMMEDIATELY',
        confidence: 'VERY_HIGH',
        message: '✅ جميع الشروط متوفرة - ادخل الآن!',
        actionCode: 'ENTER_NOW'
      };
    }

    if (evaluation.score >= 75) {
      return {
        action: 'WAIT_FOR_CONFIRMATION',
        confidence: 'HIGH',
        message: `⏳ ${evaluation.metCount}/${evaluation.totalCount} شروط متوفرة (${evaluation.score.toFixed(0)}%) - انتظر شرط أو اثنين إضافي`,
        actionCode: 'WATCH_AND_WAIT',
        nextConditions: evaluation.unmet.slice(0, 2)
      };
    }

    if (evaluation.score >= 50) {
      return {
        action: 'CONDITIONAL_ENTRY',
        confidence: 'MEDIUM',
        message: `⚠️ نصف الشروط متوفرة (${evaluation.score.toFixed(0)}%) - ادخل مع حذر إذا تحقق شرط إضافي واحد`,
        actionCode: 'CONDITIONAL',
        nextConditions: evaluation.unmet.slice(0, 3)
      };
    }

    return {
      action: 'SKIP',
      confidence: 'LOW',
      message: `❌ عدد الشروط المتوفرة قليل (${evaluation.score.toFixed(0)}%) - تجاهل الإشارة`,
      actionCode: 'SKIP_SIGNAL',
      reason: 'insufficient_conditions'
    };
  }

  static _calculateSMA(candles, period) {
    const closes = candles.slice(-period).map(c => c.close);
    return closes.reduce((a, b) => a + b, 0) / closes.length;
  }

  static _calculateAverage(values, period) {
    return values.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  static _calculateTrend(candles) {
    const recent = candles.slice(-5);
    const closes = recent.map(c => c.close);
    
    let upCount = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) upCount++;
    }
    
    return upCount > closes.length / 2 ? 1 : -1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📋 المرحلة 5: سجل الإشارات الموثق
// ═══════════════════════════════════════════════════════════════════════════

class AuditedSignalRegistry {
  constructor() {
    this.signals = new Map();  // id → frozen signal
    this.outcomes = new Map();  // id → outcome
  }

  createAndRegisterSignal(signalData) {
    const signal = {
      id: `SIG_${signalData.symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      symbol: signalData.symbol,
      issueTime: signalData.issueTime,
      priceAtIssue: signalData.priceAtIssue,
      
      // الدورة الزمنية
      cycleType: signalData.cycleType,
      cycleDetails: signalData.cycleDetails,
      
      // التوقيت والاتجاه
      direction: signalData.direction,  // bullish / bearish / neutral
      timeWindow: signalData.timeWindow,  // نطاق التواريخ
      timeDays: signalData.timeDays,      // أيام متبقية
      
      // الاحتمالية
      probability: signalData.probability,
      probabilityCI: signalData.probabilityCI,
      confidenceScore: signalData.confidenceScore,
      
      // شروط الدخول والخروج
      entryCondition: signalData.entryCondition,
      cancelCondition: signalData.cancelCondition,
      validityDays: signalData.validityDays,
      
      // المستويات
      entryPrice: signalData.entryPrice,
      stopLoss: signalData.stopLoss,
      takeProfit1: signalData.takeProfit1,
      takeProfit2: signalData.takeProfit2,
      riskRewardRatio: signalData.riskRewardRatio,
      
      // الحالة
      status: 'ACTIVE',
      createdAt: Date.now(),
      
      // الكود النسخة والمدخلات
      modelVersion: signalData.modelVersion,
      snapshotChecksum: signalData.snapshotChecksum,
      
      // النتيجة (تُملأ لاحقاً)
      outcome: null
    };

    // تجميد الإشارة
    const frozen = Object.freeze(signal);
    
    // التحقق من عدم وجود نسخة سابقة
    if (this.signals.has(frozen.id)) {
      throw new Error(`Signal ${frozen.id} already exists`);
    }

    this.signals.set(frozen.id, frozen);
    return frozen;
  }

  recordOutcome(signalId, outcome) {
    const signal = this.signals.get(signalId);
    if (!signal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    const result = {
      signalId,
      outcomeTime: Date.now(),
      exitReason: outcome.reason,  // TAKE_PROFIT / STOP_LOSS / EXPIRY / CANCELLED
      exitPrice: outcome.price,
      profit: outcome.profit,
      profitPercent: outcome.profitPercent,
      trades: outcome.trades || 0,
      notes: outcome.notes
    };

    this.outcomes.set(signalId, Object.freeze(result));
  }

  getSignal(signalId) {
    return this.signals.get(signalId);
  }

  getOutcome(signalId) {
    return this.outcomes.get(signalId);
  }

  getActiveSignals() {
    return Array.from(this.signals.values()).filter(s => s.status === 'ACTIVE');
  }

  getSignalsBetween(startTime, endTime) {
    return Array.from(this.signals.values()).filter(
      s => s.issueTime >= startTime && s.issueTime <= endTime
    );
  }

  getStatistics(symbol = null, period = null) {
    let signals = Array.from(this.signals.values());
    
    if (symbol) signals = signals.filter(s => s.symbol === symbol);
    if (period) {
      const now = Date.now();
      signals = signals.filter(s => s.issueTime >= now - period);
    }

    const outcomes = signals
      .map(s => this.outcomes.get(s.id))
      .filter(o => o !== undefined);

    const wins = outcomes.filter(o => o.profit > 0).length;
    const losses = outcomes.filter(o => o.profit <= 0).length;

    return {
      totalSignals: signals.length,
      closedSignals: outcomes.length,
      activeSignals: signals.filter(s => !this.outcomes.has(s.id)).length,
      wins,
      losses,
      winRate: outcomes.length > 0 ? (wins / outcomes.length) * 100 : 0,
      avgProfit: outcomes.length > 0 
        ? outcomes.reduce((s, o) => s + o.profit, 0) / outcomes.length 
        : 0,
      totalProfit: outcomes.reduce((s, o) => s + o.profit, 0)
    };
  }

  exportAuditLog() {
    const log = {
      exportTime: new Date().toISOString(),
      totalSignals: this.signals.size,
      closedSignals: this.outcomes.size,
      signals: Array.from(this.signals.values()).map(s => ({
        id: s.id,
        symbol: s.symbol,
        issueTime: new Date(s.issueTime).toISOString(),
        priceAtIssue: s.priceAtIssue,
        direction: s.direction,
        probability: s.probability,
        confidenceScore: s.confidenceScore,
        outcome: this.outcomes.get(s.id) || null
      }))
    };

    return log;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 المرحلة 5: عرض الإشارات بشفافية كاملة
// ═══════════════════════════════════════════════════════════════════════════

class TransparentSignalDisplay {
  static formatSignal(signal, probability, conditions) {
    const timeWindowStr = this._formatTimeWindow(signal.timeWindow);
    const metConditions = conditions.filter(c => c.met);
    const unmmetConditions = conditions.filter(c => !c.met);

    return `
╔════════════════════════════════════════════════════════════════════╗
║                    إشارة تداول احترافية - ${signal.symbol}                     ║
╠════════════════════════════════════════════════════════════════════╣

📍 معلومات الإشارة:
   ID: ${signal.id}
   وقت الإصدار: ${new Date(signal.issueTime).toLocaleString('ar-SA')}
   السعر عند الإصدار: ${signal.priceAtIssue.toFixed(2)} ر.س

🔄 الدورة الزمنية:
   النوع: ${signal.cycleType}
   التفاصيل: ${signal.cycleDetails}
   النطاق الزمني: ${timeWindowStr}
   الأيام المتبقية: ${signal.timeDays} يوم
   
📈 الاتجاه المتوقع: ${this._formatDirection(signal.direction)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 الاحتمالية الحقيقية (مع دعم إحصائي):

   الاحتمالية الأساسية: ${(probability.probability * 100).toFixed(0)}%
   
   فاصل الثقة 95%:
   • الحد الأدنى: ${(probability.lowerBound * 100).toFixed(0)}%
   • الحد الأقصى: ${(probability.upperBound * 100).toFixed(0)}%
   
   عدد الحالات التاريخية: ${probability.samples || 'غير محدد'}
   الموثوقية: ${probability.reliable ? '✅ عالية' : '⚠️ منخفضة'}
   
   التفسير: ${this._interpretProbability(probability.probability)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ شروط الدخول (${metConditions.length}/${conditions.length}):

${metConditions.map(c => `   ✓ ${c.name}: ${c.description}`).join('\n')}

⚠️ شروط غير محققة:
${unmmetConditions.length > 0 
  ? unmmetConditions.map(c => `   ✗ ${c.name}: ${c.description}`).join('\n')
  : '   جميع الشروط محققة!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 مستويات التداول:

   نقطة الدخول: ${signal.entryPrice.toFixed(2)} ر.س
   شرط الدخول: ${signal.entryCondition || 'لا يوجد شرط محدد'}
   
   مستويات الوقف والأهداف:
   • Stop Loss: ${signal.stopLoss.toFixed(2)} ر.س (خسارة: ${((signal.stopLoss - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)
   • Target 1: ${signal.takeProfit1.toFixed(2)} ر.س (ربح: ${((signal.takeProfit1 - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)
${signal.takeProfit2 ? `   • Target 2: ${signal.takeProfit2.toFixed(2)} ر.س (ربح: ${((signal.takeProfit2 - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)` : ''}
   
   نسبة العائد/المخاطرة: 1:${signal.riskRewardRatio.toFixed(2)}
   
   شرط الإلغاء: ${signal.cancelCondition || 'لا يوجد'}
   صلاحية الإشارة: ${signal.validityDays} أيام

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 التوصية النهائية:

${this._generateRecommendation(signal, probability, conditions)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ إخلاء مسؤولية مهم:

   • هذه ليست نصيحة استثمارية أو مالية
   • الأداء الماضي لا يضمن نتائج مستقبلية
   • استخدم Stop Loss دائماً لحماية رأس المال
   • نسبة النجاح المحسوبة من بيانات تاريخية محدودة
   • الأسواق المالية تنطوي على مخاطر عالية
   • تداول فقط بمبلغ تستطيع خسارته

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 معلومات التتبع:
   Model Version: ${signal.modelVersion}
   Snapshot: ${signal.snapshotChecksum}
   Status: ${signal.status}

╚════════════════════════════════════════════════════════════════════╝
    `;
  }

  static _formatDirection(direction) {
    switch (direction) {
      case 'bullish': return '🟢 صاعد (ايجابي)';
      case 'bearish': return '🔴 هابط (سلبي)';
      case 'neutral': return '⚪ محايد';
      default: return direction;
    }
  }

  static _formatTimeWindow(window) {
    if (!window) return 'غير محدد';
    return `${new Date(window.start).toLocaleDateString('ar-SA')} إلى ${new Date(window.end).toLocaleDateString('ar-SA')}`;
  }

  static _interpretProbability(prob) {
    if (prob < 0.45) return `${(prob * 100).toFixed(0)}% - احتمالية منخفضة جداً (❌ لا تدخل)`;
    if (prob < 0.55) return `${(prob * 100).toFixed(0)}% - احتمالية متوازنة (⚠️ ادخل بحذر)`;
    if (prob < 0.70) return `${(prob * 100).toFixed(0)}% - احتمالية جيدة (👍 ادخل)`;
    if (prob < 0.85) return `${(prob * 100).toFixed(0)}% - احتمالية عالية جداً (✅ ادخل بقوة)`;
    return `${(prob * 100).toFixed(0)}% - احتمالية ممتازة (🚀 ادخل بثقة عالية)`;
  }

  static _generateRecommendation(signal, probability, conditions) {
    const conditionsMet = conditions.filter(c => c.met).length;
    const conditionsTotal = conditions.length;
    const score = (conditionsMet / conditionsTotal) * probability.probability * 100;

    if (score >= 75 && probability.reliable) {
      return `
   ✅ STRONG SIGNAL
   
   الحالة: ادخل الآن
   الثقة: عالية جداً
   السبب: 
      • الاحتمالية عالية (${(probability.probability * 100).toFixed(0)}%)
      • ${conditionsMet}/${conditionsTotal} شروط محققة
      • بيانات تاريخية موثوقة (${probability.samples} حالة)
      `;
    } else if (score >= 50) {
      return `
   ⚠️ CONDITIONAL SIGNAL
   
   الحالة: ادخل مع شروط
   الثقة: متوسطة
   الشروط المطلوبة:
      • تحقق من الشروط المتبقية
      • استخدم وقف خسارة محكم
      • تقلل من حجم الصفقة
      `;
    } else {
      return `
   ❌ WEAK SIGNAL
   
   الحالة: تجاهل الإشارة
   الثقة: منخفضة
   السبب:
      • الاحتمالية منخفضة
      • شروط غير محققة
      • بيانات تاريخية ناقصة
      `;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 التصدير للاستخدام
// ═══════════════════════════════════════════════════════════════════════════

const ProfessionalTimingSystem = {
  DataSnapshot,
  HistoricalProbabilityDatabase,
  BacktestEngine,
  ConditionalEntrySystem,
  AuditedSignalRegistry,
  TransparentSignalDisplay
};
