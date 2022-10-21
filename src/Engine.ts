import _ from "lodash";
import { getJSDocClassTag } from "typescript";
import { Formula, ProofState, Rule } from "./Types"

function updateState(ps : ProofState, r : Rule) : ProofState {
  if (r.dash) {
    const p = ps.other_goals.shift();
    if (p === undefined) { throw new Error('No goals left.') }
    const [as, g] = p;
    if (as && g) { ps.assumptions.push(...as); ps.current_goal = g; }
  }
  
  // If no rule, just pop and be done.
  if (r.rulename === undefined) { return ps }

  if (r.rulename === 'goal') {
    const p = r.param;
    if (p === undefined || typeof p === 'number') { throw new Error('Not a valid goal.') }
    return { assumptions: [], current_goal: p, other_goals: [] };
  }
  
  // If we are not setting a goal, and we do not have one, throw error.

  if (ps.current_goal === 'none') { throw new Error('No current goal. Either set or pop one.')}

  switch (r.rulename) {
    case 'assm': {
      const p = r.param;
      if (typeof p !== 'number') { throw new Error('Assumption rule requires a positive number.') }
      if (0 < p - 1 && p - 1 >= ps.assumptions.length) { throw new Error('Assumption out of bounds.')}
      if (_.isEqual(ps.assumptions[p-1], ps.current_goal)) {
        return {...ps, current_goal: 'none' }
      } 
      throw new Error('Assumption does not match goal.')
    }
    case 'andI': {
      const f = ps.current_goal;
      if (f.operator !== 'and') { throw new Error('Not an & formula.') }
      const new_goals = f.operands.map(o => [[], o] as [Formula[], Formula])
      return {...ps, current_goal: 'none', other_goals: [...ps.other_goals, ...new_goals] };
    }
    case 'andE1': {
      const f = ps.current_goal;
      const p = r.param;
      if (p === undefined || typeof p === 'number') { throw new Error('No valid & formula given.')}
      if (p.operator === 'and' && _.isEqual(p.operands[1], f)) {
        return {...ps, current_goal: p }; 
      }
      throw new Error('And-elimination-1 does not apply.')
    }
    case 'andE2': {
      const f = ps.current_goal;
      const p = r.param;
      if (p !== undefined && typeof p !== 'number'
          && p.operator === 'and' && _.isEqual(p.operands[2], f)) {
        return {...ps, current_goal : p}; 
      }
      throw new Error('And-elimination-2 does not apply.')
    }
    case 'orI1': {
      const f = ps.current_goal;
      if (f.operator !== 'or') { throw new Error('Not an or formula.') }
      return {...ps, current_goal: f.operands[0]}
    }
    case 'orI2': {
      const f = ps.current_goal;
      if (f.operator !== 'or') { throw new Error('Not an or formula.') }
      return {...ps, current_goal: f.operands[1]}
    }
    case 'orE': {
      const f = ps.current_goal;
      const p = r.param;
      if (p === undefined || typeof p === 'number' || p.operator !== 'or') { throw new Error('Or-elimination needs a disjunctive motive.') }
      const phi1 = p.operands[0]; const phi2 = p.operands[1]
      const new_goals = [ [[], p], [[phi1], f], [[phi2], f] ] as [Formula[], Formula][]
      return {...ps, current_goal: 'none', other_goals: [...ps.other_goals, ...new_goals]}
    }
    case 'implI': {
      const f = ps.current_goal;
      if (f.operator !== 'impl') { throw new Error('Impl-introduction does not apply.') }
      const [ante, cons] = f.operands;
      return {...ps, assumptions : [...ps.assumptions, ante], current_goal: cons}
    }
    default:
      throw new Error('Unsupported rule.')
  }
}

export { updateState };