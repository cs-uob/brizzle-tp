import React, { useEffect, useState } from 'react';
import './App.css';
import bristolLogo from './BristolLogo.png';
import AceEditor from 'react-ace';
import process from './Parser';
import { printFormula, ProofState, MiniBufferState, Rule } from './Types';
import { updateState } from './Engine';

function Display(props : { proofState : ProofState, miniBuffer : MiniBufferState }) {
  return (
      <div className="Display">
        <div className="ProofState">
          <div className="Assumptions">
            Assumptions:
              <table className="Goal">
                <tbody>
                {
                  props.proofState.assumptions.map((assm, key) => {
                    return (
                      <tr key={key}><td>{key+1}: {printFormula(assm)}</td></tr>
                    )
                  })
                }
                </tbody>
              </table>
          </div>
          <div className="OtherGoals">
            Remaining goals:
              <table className="Goal">
                <tbody>
                {
                  props.proofState.other_goals.map(([assms, g], key) => {
                    return (
                      <tr key={key}><td>{assms.map(printFormula).join(', ') + ' ⊢ ' + printFormula(g)}</td></tr>
                    )
                  })
                }
                </tbody>
              </table>
          </div>
          <div className="CurrentGoal">
            Current goal: { 
              props.proofState.current_goal === 'none' ? 
                  <div className="Goal Success">Done.</div>
                : <div className="Goal">{printFormula(props.proofState.current_goal)}</div>
            }
          </div>
        </div>
        <div className={`MiniBuffer ${props.miniBuffer.state === 'error' ? "Failure" : ""}`}>
          { props.miniBuffer.text }
        </div>
      </div>
  );
}

function App() {
  
  const initialProofState : () => ProofState = 
    () => { return { assumptions : [], current_goal : 'none', other_goals: []} };

  let initialProof : string = `goal (a => b => a)\nimplI\nimplI\nassm 1`;
  let initialMiniBuffer : MiniBufferState = { text: 'Ready.', state: 'ok' };

  const [editor, setEditor] = useState(initialProof);
  const [cursorRow, setCursorRow] = useState(-1);
  const [markerRow, setMarkerRow] = useState(-1);
  const [proofState, setProofState] = useState(initialProofState());
  const [miniBuffer, setMiniBuffer] = useState(initialMiniBuffer);
  
  function initialiseProver() {
    setProofState(initialProofState());
    setMiniBuffer(initialMiniBuffer);
    setMarkerRow(-1);
  }

  function onCursorChange(e : any) {
    setCursorRow(e.getCursor().row);
  }
  
  function onChange(s : string, edit : any) {
    
    const isNewline : boolean =
      edit.end.row === edit.start.row + 1 && edit.end.column === 0

    setEditor(s);
    if (edit.start.row <= markerRow && !isNewline) {
      setMarkerRow(edit.start.row-1);
      runProver(edit.start.row);
    }
  }
  
  function makeMarker() {
    return {
      startRow: 0, startCol: 0, endRow : markerRow, endCol: 50, className: 'Processed', type : 'fullLine' as 'fullLine'
    };
  }
  
  function runProver(endRow : number) : boolean {
      try {
        let contents = editor.split('\n').slice(0, endRow).join('\n');
        const rules : Rule[] = process(contents)
        if (rules) {
          const s = rules.reduce(updateState, initialProofState());
          setProofState(s); setMiniBuffer({ state: 'ok', text: 'OK.' });
          return true;
        }
      }
      catch (e) { setMiniBuffer({ state: 'error', text: (e as Error).message }) };
      return false;
  }
  
  function processEvent(e : KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.code === 'Enter') {
      if (runProver(cursorRow+1)) {
        setMarkerRow(cursorRow);
      }
    }
  }
  
  useEffect(() => {
    window.addEventListener("keydown", processEvent)
    return () => window.removeEventListener("keydown", processEvent)
  });
  
  return (
    <div className="App">
      <header className="App-header">
        <div id="bristolLogo"><img src={bristolLogo} alt="University of Bristol logo" /></div>
        <h1>Brizzle TP</h1>
      </header>
      <div className="editor">
        <AceEditor
          onChange={onChange}
          onCursorChange={onCursorChange}
          name="EditorWindow"
          fontSize={18}
          editorProps={{ $blockScrolling: true }}
          width={'50vw'}
          height={'80vh'}
          highlightActiveLine={true}
          defaultValue={initialProof}
          markers={[makeMarker()]}
          style={{
            fontFamily: 'JetBrains Mono',
            backgroundColor: "lightsteelblue",
            fontSize: "1.3rem",
          }}
        />
      </div>
      <Display proofState={proofState} miniBuffer={miniBuffer} />
      <div className="Help">
          <p>This is an LCF-style theorem prover for propositional logic.</p>
          <p>At the bottom right of your screen is your <i>proof goal</i>, which is what you are currently proving.</p>
          <p>Every line is an instruction that applies a rule to the proof goal.</p>
          <p>A rule might prove a goal, add more assumptions, or generate further proof goals.</p>
          <p>Instructions:
            <ul>
              <li>Press <strong>CTRL+ENTER</strong> to run the proof engine to the line of the cursor.</li>
              <li><strong>goal (a or b)</strong> resets the proof state to a new goal.</li>
              <li>A single dash <strong>{'"-"'}</strong> installs a new proof goal from the list of remaining goals. The same line must also contain another command, thereby structuring the proof by cases.</li>
              <li><strong>assm n</strong> uses the n'th assumption.</li>
              <li><strong>andI</strong> applies the and-introduction rule to the goal.</li>
              <li><strong>andE1 (a and b)</strong> proves <strong>a</strong> by changing the proof goal to <strong>(a and b)</strong>. Similarly for <strong>andE2</strong>.</li>
              <li><strong>or1</strong> allows you to prove <strong>a or b</strong> by proving <strong>a</strong>. Similarly for <strong>orI2</strong>.</li>
              <li><strong>orE (a or b)</strong> allows you to prove the goal by proving 
              <strong>a or b</strong>, and then showing that the goal follows from either <strong>a</strong> or <strong>b</strong>.</li>
              <li><strong>implI</strong> applies the implication-introduction rule to the goal.</li>
              <li><strong>implE (a {'=>'} b)</strong> proves <strong>b</strong> by adding two new goals, <strong>a {'=>'} b</strong> and <strong>a</strong>.</li>
              <li><strong>lem</strong> proves any formula that fits the excluded middle.</li>
              <li><strong>notI</strong> proves <strong>¬ a</strong> by allowing you to prove <strong>⊥</strong> from <strong>a</strong>.</li>
            </ul>
            and so on.
          </p>
      </div>
    </div>
  );
}

export default App;
