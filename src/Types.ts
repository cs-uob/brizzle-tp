type Formula = {
  operator : 'and' | 'or' | 'not' | 'impl' | 'false' | 'true' | 'var',
  operands : Formula[]
  var_name? : string;
}

function not(f : Formula) : Formula {
  return { operator: 'not', operands: [f] }
}

function printFormula(f : Formula) : string {
  switch (f.operator) {
    case 'false': return '⊥'
    case 'and': return '(' + printFormula(f.operands[0]) + ' ∧ ' + printFormula(f.operands[1]) + ')'
    case 'or': return '(' + printFormula(f.operands[0]) + ' ∨ ' + printFormula(f.operands[1]) + ')'
    case 'impl': return '(' + printFormula(f.operands[0]) + ' ⇨	' + printFormula(f.operands[1]) + ')'
    case 'not': return '¬' + printFormula(f.operands[0])
    case 'var' : {
      if (f.var_name === undefined) { throw new Error('Undefined variable name.') }
      return f.var_name;
    }
  }
  return '';
}

type Rule = {
  rulename : string,
  param? : number | Formula
  dash? : boolean
}

type ProofState = {
  assumptions: Formula[],
  current_goal: Formula | 'none',
  other_goals: [Formula[], Formula][]
}

type MiniBufferState = {
  text: string,
  state: 'ok' | 'error'
}

export type { Formula, Rule, ProofState, MiniBufferState };

export { not, printFormula };
