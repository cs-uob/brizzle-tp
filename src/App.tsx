import React, { useEffect, useState } from 'react';
import './App.css';
import AceEditor from 'react-ace';
import process from './Parser';
import { printFormula, ProofState, Rule } from './Types';
import { updateState } from './Engine';
import { Helmet } from 'react-helmet';

function Display(props : { proofState : ProofState, buffer : string }) {
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
                      <tr key={key}><td>{printFormula(assm)}</td></tr>
                    )
                  })
                }
                </tbody>
              </table>
          </div>
          <div className="OtherGoals">
            Other goals:
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
        <div className="Buffer">{ props.buffer }</div>
      </div>
  );
}

function App() {
  
  const init : () => ProofState = 
    () => { return { assumptions : [], current_goal : 'none', other_goals: []} };
  
  const [proofState, setProofState] = useState(init());
  const [buffer, setBuffer] = useState('OK.');
  const [editor, setEditor] = useState('');
  
  function processEvent(e : KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.code === 'Enter') {
      try {
        const rules : Rule[] = process(editor);
        if (rules) {
          const s = rules.reduce(updateState, init());
          setProofState(s); setBuffer('OK.');
        }
      }
      catch (e) { setBuffer((e as Error).message) };
    }
  }
  
  useEffect(() => {
    window.addEventListener("keydown", processEvent)
    return () => window.removeEventListener("keydown", processEvent)
  });

  return (
    <div className="App">
      <header className="App-header">
        <h1>Brizzle TP</h1>
      </header>
      <div className="editor">
        <AceEditor
          onChange={setEditor}
          name="EditorWindow"
          fontSize={18}
          editorProps={{ $blockScrolling: true }}
          width={'50vw'}
          style={{
            backgroundColor: "rgb(255,252,201)",
            fontSize: "1.3rem",
          }}
        />
      </div>
      <Display proofState={proofState} buffer={buffer} />
    </div>
  );
}

export default App;
