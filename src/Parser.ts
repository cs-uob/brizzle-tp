/* eslint-disable @typescript-eslint/no-use-before-define */
import { apply, buildLexer, expectEOF, expectSingleResult, list_sc, lrec_sc, Parser, rule, Token } from 'typescript-parsec';
import { alt, opt, seq, str, tok } from 'typescript-parsec';
import { Formula, Rule } from './Types';

enum TokenKind { 
  Dash,
  Number,
  RuleName,
  Assumption,
  Case,
  Space,
  Newline,
  Var,
  And,
  Or,
  Not,
  LParen,
  RParen
}

/*

  LINE ::= 
      '-' RULE
    | RULE

  RULENAME ::= 
      andI
    | andE1
    | andE2
    | orI1
    | orI2
    | orE
    | implI
    | implE
    | assm

  RULE ::= RULENAME PARAM

  PARAM ::= NUMBER | FORMULA
    
  SCRIPT ::= list of LINE

*/

const lexer = buildLexer([
  [true, /^\-/g, TokenKind.Dash],
  [true, /^\d+/g, TokenKind.Number],
  [true, /^andI/g, TokenKind.RuleName],
  [true, /^andE[12]/g, TokenKind.RuleName],
  [true, /^orI[12]/g, TokenKind.RuleName],
  [true, /^orE/g, TokenKind.RuleName],
  [true, /^implI/g, TokenKind.RuleName],
  [true, /^implE/g, TokenKind.RuleName],
  [true, /^notI/g, TokenKind.RuleName],
  [true, /^notE/g, TokenKind.RuleName],
  [true, /^dNeg/g, TokenKind.RuleName],
  [true, /^lem/g, TokenKind.RuleName],
  [true, /^abort/g, TokenKind.RuleName],
  [true, /^goal/g, TokenKind.RuleName],
  [true, /^assm/g, TokenKind.RuleName],
  [true, /^[a-z]+/g, TokenKind.Var],
  [true, /^-/g, TokenKind.Case],
  [true, /^\(/g, TokenKind.LParen],
  [true, /^\)/g, TokenKind.RParen], 
  [true, /^&/g, TokenKind.And], 
  [true, /^or/g, TokenKind.Or], 
  [true, /^=>/g, TokenKind.Or], 
  [true, /^~/g, TokenKind.Not], 
  [true, /^\n/g, TokenKind.Newline],
  [false, /^[^\S\r\n]+/g, TokenKind.Space]
]);

// Boolean formula parser

const VAR : Parser<TokenKind, Formula> = apply(
  tok(TokenKind.Var),
  (tok) => { return { operator: 'var', var_name: tok.text, operands: [] } }
);

const _FORMULA = rule();

const PFORMULA = apply(
  seq(str('('), _FORMULA, str(')')),
  ([x, phi, y]) => phi
) as Parser<TokenKind, Formula>;

const LIT : Parser<TokenKind, Formula> = alt(
  VAR,
  apply(
    seq(str('~'), VAR),
  ([x,phi]) => { return { operator: 'not', operands: [phi] } }
  )
);

const NOT = rule();
NOT.setPattern(
  apply(
    seq(str('~'), alt(NOT, PFORMULA)),
    ([x,phi]) => { return { operator: 'not', operands: [phi] } }
  )
);

const AND = apply(
  seq(alt(LIT, NOT, PFORMULA), str('&'), list_sc(alt(LIT, NOT, PFORMULA), str('&'))),
  function ([l, _, xs]) { 
    return {
      operator: 'and',
      operands: [l, xs.reduce((a, l) => { return { operator: 'and', operands: [a, l] } })] 
    }
  }
);

const OR = apply(
  seq(alt(LIT, NOT, PFORMULA), str('or'), list_sc(alt(LIT, NOT, PFORMULA), str('or'))),
  function ([l, _, xs]) { 
    return {
      operator: 'or',
      operands: [l, xs.reduce((a, l) => { return { operator: 'or', operands: [a, l] } })] 
    }
  }
);

const IMPL = apply(
  seq(alt(LIT, NOT, PFORMULA), str('=>'), list_sc(alt(LIT, NOT, PFORMULA), str('=>'))),
  function ([l, _, xs]) { 
    return {
      operator: 'impl',
      operands: [l, xs.reduce((a, l) => { return { operator: 'impl', operands: [a, l] } })] 
    }
  }
);

_FORMULA.setPattern(alt(LIT, AND, OR, IMPL, NOT, PFORMULA));

const FORMULA = _FORMULA as Parser<TokenKind, Formula>;


// Rule parsing

const RULENAME = apply(
  tok(TokenKind.RuleName),
  (token) => { 
    switch (token.text) {
      case 'assm':  return { rulename : 'assm' }
      case 'andI':  return { rulename : 'andI' }
      case 'andE1': return { rulename : 'andE1' }
      case 'andE2': return { rulename : 'andE2' }
      case 'orI1':  return { rulename : 'orI1' }
      case 'orI2':  return { rulename : 'orI2' }
      case 'orE':   return { rulename : 'orE' }
      case 'implI': return { rulename : 'implI' }
      case 'implE': return { rulename : 'implE' }
      case 'goal': return { rulename : 'goal' }
      case 'notI': return { rulename : 'notI' }
      case 'notE': return { rulename : 'notE' }
      case 'dNeg': return { rulename : 'dNeg' }
      case 'lem': return { rulename : 'lem' }
      case 'abort': return { rulename : 'abort' }
      default:
        throw new Error('Unknown rule.')
    } 
  }  
);

const ASSMNO = apply(
  tok(TokenKind.Number),
  (assmno) => { return +assmno.text; }
);

const PARAM = alt(FORMULA, ASSMNO);

const DASH = tok(TokenKind.Dash);

const RULE : Parser<TokenKind, Rule> = apply(
  seq(opt(DASH), opt(RULENAME), opt(PARAM)),
  ([dash, rn, param]) => 
    param ?
      {...rn, dash: dash ? true : false, param: param} 
      :
      {...rn, dash: dash ? true : false} 
);

const SCRIPT = list_sc(RULE, str('\n'));

function process(s : string) : Rule[] {
  try {
    const result = expectSingleResult(expectEOF(SCRIPT.parse(lexer.parse(s))));
    return result
  }
  catch (e) {
    let m = (e as Error).message;
    throw new Error('Lexing and parsing failed:' + m.substring(m.lastIndexOf(':') + 1)) }
}

export default process;