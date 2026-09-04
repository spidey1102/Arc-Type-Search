// Smart Instant Evaluator for Math, Equations, Conversions, and Quick Answers

export interface EvaluationResult {
  type: 'math' | 'equation' | 'conversion' | 'quick_fact';
  query: string;
  result: string;
  explanation?: string;
  badge: string;
}

export function evaluateSmartQuery(rawQuery: string): EvaluationResult | null {
  const query = rawQuery.trim();
  if (!query || query.length < 2) return null;

  // 1. Check for linear algebraic equations (e.g. "x+5=0", "x + 5 = 0 x is what", "2x - 10 = 0", "3x = 15")
  const equationResult = solveLinearEquation(query);
  if (equationResult) return equationResult;

  // 2. Check for percentage expressions (e.g. "15% of 240", "20 percent of 80", "15% off 100")
  const percentResult = evaluatePercentage(query);
  if (percentResult) return percentResult;

  // 3. Check for unit / currency / time conversions
  const conversionResult = evaluateConversion(query);
  if (conversionResult) return conversionResult;

  // 4. Check for standard arithmetic expressions (e.g. "140 * 12", "sqrt(144)", "2^8", "45 / 3 + 7")
  const arithmeticResult = evaluateArithmetic(query);
  if (arithmeticResult) return arithmeticResult;

  return null;
}

// Solve linear equations of form ax + b = c, x + 5 = 0, 2x = 10, etc.
function solveLinearEquation(text: string): EvaluationResult | null {
  // Strip trailing "x is what", "what is x", "solve for x", "?", etc.
  const cleaned = text
    .toLowerCase()
    .replace(/what is x\??/gi, '')
    .replace(/x is what\??/gi, '')
    .replace(/solve for x\??/gi, '')
    .replace(/solve\s+/gi, '')
    .replace(/\?/g, '')
    .trim();

  // Look for an equation containing 'x' and '='
  if (!cleaned.includes('=') || !/[xX]/.test(cleaned)) return null;

  const parts = cleaned.split('=');
  if (parts.length !== 2) return null;

  const leftStr = parts[0].trim();
  const rightStr = parts[1].trim();

  // Simple parser for standard linear forms: a*x + b = c or a*x - b = c
  // Match terms on left side: e.g. "x + 5", "2x - 10", "-3x + 12", "x"
  const leftMatch = leftStr.match(/^([+-]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d+\.?\d*)?$/i);
  const leftConstantOnly = leftStr.match(/^([+-]?\s*\d+\.?\d*)\s*([+-]\s*\d*\.?\d*)\s*x$/i);
  const rightNum = parseFloat(rightStr.replace(/\s+/g, ''));

  if (isNaN(rightNum)) return null;

  let a = 1;
  let b = 0;

  if (leftMatch) {
    let coeffStr = leftMatch[1].replace(/\s+/g, '');
    if (coeffStr === '' || coeffStr === '+') a = 1;
    else if (coeffStr === '-') a = -1;
    else a = parseFloat(coeffStr);

    if (leftMatch[2]) {
      b = parseFloat(leftMatch[2].replace(/\s+/g, ''));
    }
  } else if (leftConstantOnly) {
    b = parseFloat(leftConstantOnly[1].replace(/\s+/g, ''));
    let coeffStr = leftConstantOnly[2].replace(/\s+/g, '');
    if (coeffStr === '' || coeffStr === '+') a = 1;
    else if (coeffStr === '-') a = -1;
    else a = parseFloat(coeffStr);
  } else {
    // Check if right side has x and left side is constant (e.g. 0 = x + 5)
    const rightMatch = rightStr.match(/^([+-]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d+\.?\d*)?$/i);
    const leftNum = parseFloat(leftStr.replace(/\s+/g, ''));
    if (rightMatch && !isNaN(leftNum)) {
      let coeffStr = rightMatch[1].replace(/\s+/g, '');
      if (coeffStr === '' || coeffStr === '+') a = 1;
      else if (coeffStr === '-') a = -1;
      else a = parseFloat(coeffStr);

      if (rightMatch[2]) {
        b = parseFloat(rightMatch[2].replace(/\s+/g, ''));
      }
      // leftNum = a*x + b => a*x = leftNum - b => x = (leftNum - b) / a
      const xVal = (leftNum - b) / a;
      const roundedX = Math.round(xVal * 1000000) / 1000000;
      return {
        type: 'equation',
        query: text,
        result: `x = ${roundedX}`,
        explanation: `Subtract ${b >= 0 ? b : `(${b})`} from both sides: ${a !== 1 ? `${a}x = ${leftNum - b} → ` : ''}x = ${roundedX}`,
        badge: 'Equation Solved'
      };
    }
    return null;
  }

  if (isNaN(a) || isNaN(b) || a === 0) return null;

  // a*x + b = rightNum => a*x = rightNum - b => x = (rightNum - b) / a
  const xVal = (rightNum - b) / a;
  const roundedX = Math.round(xVal * 1000000) / 1000000;

  const stepDesc = b !== 0 
    ? `${b > 0 ? `Subtract ${b}` : `Add ${Math.abs(b)}`} on both sides: ${a !== 1 ? `${a}x = ${rightNum - b} → ` : ''}x = ${roundedX}`
    : `Divide both sides by ${a}: x = ${roundedX}`;

  return {
    type: 'equation',
    query: text,
    result: `x = ${roundedX}`,
    explanation: stepDesc,
    badge: 'Equation Solved'
  };
}

// Percentage calculations: "15% of 240", "20 percent of 80", "15% off 100"
function evaluatePercentage(text: string): EvaluationResult | null {
  const percentMatch = text.match(/^(\d+\.?\d*)\s*(%|percent)\s*(of|off)\s*(\d+\.?\d*)$/i);
  if (!percentMatch) return null;

  const percent = parseFloat(percentMatch[1]);
  const isOff = percentMatch[3].toLowerCase() === 'off';
  const total = parseFloat(percentMatch[4]);

  if (isNaN(percent) || isNaN(total)) return null;

  if (isOff) {
    const discount = (percent / 100) * total;
    const finalPrice = total - discount;
    const rounded = Math.round(finalPrice * 100) / 100;
    return {
      type: 'math',
      query: text,
      result: `${rounded}`,
      explanation: `${percent}% off ${total} (Save ${Math.round(discount * 100) / 100}) = ${rounded}`,
      badge: 'Discount'
    };
  }

  const result = (percent / 100) * total;
  const rounded = Math.round(result * 100000) / 100000;
  return {
    type: 'math',
    query: text,
    result: `${rounded}`,
    explanation: `(${percent} / 100) × ${total} = ${rounded}`,
    badge: 'Percentage'
  };
}

// Unit & measurement conversions
function evaluateConversion(text: string): EvaluationResult | null {
  const match = text.match(/^(\d+\.?\d*)\s*([a-zA-Z°]+)\s*(?:to|in|into)\s*([a-zA-Z°]+)$/i);
  if (!match) return null;

  const val = parseFloat(match[1]);
  const from = match[2].toLowerCase().replace('°', '');
  const to = match[3].toLowerCase().replace('°', '');

  if (isNaN(val)) return null;

  // Temperature
  if ((from === 'f' || from === 'fahrenheit') && (to === 'c' || to === 'celsius')) {
    const c = ((val - 32) * 5) / 9;
    const rounded = Math.round(c * 100) / 100;
    return {
      type: 'conversion',
      query: text,
      result: `${rounded} °C`,
      explanation: `(${val}°F - 32) × 5/9 = ${rounded}°C`,
      badge: 'Temperature'
    };
  }
  if ((from === 'c' || from === 'celsius') && (to === 'f' || to === 'fahrenheit')) {
    const f = (val * 9) / 5 + 32;
    const rounded = Math.round(f * 100) / 100;
    return {
      type: 'conversion',
      query: text,
      result: `${rounded} °F`,
      explanation: `(${val}°C × 9/5) + 32 = ${rounded}°F`,
      badge: 'Temperature'
    };
  }

  // Length / Distance
  const lengthToMeters: Record<string, number> = {
    m: 1, meter: 1, meters: 1,
    km: 1000, kilometer: 1000, kilometers: 1000,
    cm: 0.01, centimeter: 0.01, centimeters: 0.01,
    mm: 0.001, millimeter: 0.001,
    mile: 1609.344, miles: 1609.344, mi: 1609.344,
    yard: 0.9144, yards: 0.9144, yd: 0.9144,
    foot: 0.3048, feet: 0.3048, ft: 0.3048,
    inch: 0.0254, inches: 0.0254, in: 0.0254
  };

  if (lengthToMeters[from] && lengthToMeters[to]) {
    const inMeters = val * lengthToMeters[from];
    const converted = inMeters / lengthToMeters[to];
    const rounded = Math.round(converted * 10000) / 10000;
    return {
      type: 'conversion',
      query: text,
      result: `${rounded} ${to}`,
      explanation: `${val} ${from} = ${rounded} ${to}`,
      badge: 'Unit Conversion'
    };
  }

  // Weight / Mass
  const weightToGrams: Record<string, number> = {
    g: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000, kilograms: 1000,
    mg: 0.001, milligram: 0.001,
    lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237,
    oz: 28.34952, ounce: 28.34952, ounces: 28.34952
  };

  if (weightToGrams[from] && weightToGrams[to]) {
    const inGrams = val * weightToGrams[from];
    const converted = inGrams / weightToGrams[to];
    const rounded = Math.round(converted * 10000) / 10000;
    return {
      type: 'conversion',
      query: text,
      result: `${rounded} ${to}`,
      explanation: `${val} ${from} = ${rounded} ${to}`,
      badge: 'Weight'
    };
  }

  // Digital Storage
  const storageToBytes: Record<string, number> = {
    b: 1, byte: 1, bytes: 1,
    kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4
  };

  if (storageToBytes[from] && storageToBytes[to]) {
    const inBytes = val * storageToBytes[from];
    const converted = inBytes / storageToBytes[to];
    const rounded = Math.round(converted * 10000) / 10000;
    return {
      type: 'conversion',
      query: text,
      result: `${rounded} ${to.toUpperCase()}`,
      explanation: `${val} ${from.toUpperCase()} = ${rounded} ${to.toUpperCase()}`,
      badge: 'Data Storage'
    };
  }

  return null;
}

// Standard arithmetic: "+", "-", "*", "/", "^", "sqrt", "pi", "e"
function evaluateArithmetic(text: string): EvaluationResult | null {
  let sanitized = text
    .replace(/times/gi, '*')
    .replace(/multiplied by/gi, '*')
    .replace(/divided by/gi, '/')
    .replace(/plus/gi, '+')
    .replace(/minus/gi, '-')
    .replace(/\^/g, '**')
    .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
    .replace(/sqrt\s+(\d+\.?\d*)/gi, 'Math.sqrt($1)')
    .replace(/pi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E')
    .trim();

  // If text contains 'x' as multiplication between numbers e.g. "12 x 12" or "12x12"
  sanitized = sanitized.replace(/(\d)\s*[xX]\s*(\d)/g, '$1 * $2');

  // Verify safe characters only
  if (!/^[0-9+\-*/().\s,*MathPIE*]+$/.test(sanitized) || !/\d/.test(sanitized)) {
    return null;
  }

  try {
    const result = new Function(`'use strict'; return (${sanitized})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      const rounded = Math.round(result * 1000000) / 1000000;
      return {
        type: 'math',
        query: text,
        result: `${rounded}`,
        explanation: `${text} = ${rounded}`,
        badge: 'Calculated'
      };
    }
  } catch {
    return null;
  }

  return null;
}
