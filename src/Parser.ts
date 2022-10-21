/* eslint-disable @typescript-eslint/no-use-before-define */
import { apply, buildLexer, expectEOF, expectSingleResult, list_sc, lrec_sc, Parser, rule, Token } from 'typescript-parsec';
import { alt, opt, list, seq, str, tok } from 'typescript-parsec';
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
  [false, /^\s+/g, TokenKind.Space]
]);

const VAR = apply(
  tok(TokenKind.Var),
  (tok) => { return { operator: 'var', var_name: tok.text } }
);

const _FORMULA = rule();

const AND = apply(
  seq(str('('), _FORMULA, str('&'), _FORMULA, str(')')),
  ([x,phi1,y,phi2,z]) => { return { operator: 'and', operands: [phi1, phi2] } }
);

const OR = apply(
  seq(str('('), _FORMULA, str('or'), _FORMULA, str(')')),
  ([x,phi1,y,phi2,z]) => { return { operator: 'or', operands: [phi1, phi2] } }
);

const IMPL = apply(
  seq(str('('), _FORMULA, str('=>'), _FORMULA, str(')')),
  ([x,phi1,y,phi2,z]) => { return { operator: 'impl', operands: [phi1, phi2] } }
);

const NOT = apply(
  seq(str('('), str('~'), _FORMULA, str(')')),
  ([x,y,phi]) => { return { operator: 'or', operands: [phi] } }
);

_FORMULA.setPattern(alt(VAR, AND, OR, IMPL, NOT));

const FORMULA = _FORMULA as Parser<TokenKind, Formula>;


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

const RULE : Parser<TokenKind, Rule> = apply(
  seq(opt(tok(TokenKind.Dash)), opt(RULENAME), opt(PARAM)),
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
  catch (e) { throw Error('Lexing and parsing failed.')}
}

export default process;