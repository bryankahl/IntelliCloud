// src/pages/Decipher.jsx
import React from 'react';
import { runDecipher } from '../decipher';

export default function Decipher() {
    const [algo, setAlgo] = React.useState('hex');
    const [mode, setMode] = React.useState('enc');
    const [input, setInput] = React.useState('');
    const [rails, setRails] = React.useState(3);
    const [key, setKey] = React.useState('');
    const [output, setOutput] = React.useState('');
    const [err, setErr] = React.useState('');

    React.useEffect(() => {
    try { setOutput(runDecipher({ algo, mode, input, rails, key })); setErr(''); }
    catch (e) { setOutput(''); setErr(e?.message || String(e)); }
    }, [algo, mode, input, rails, key]);

    const onCopy = async () => { try { await navigator.clipboard.writeText(output || ''); } catch {/* */} };
    const onDownload = () => {
    const blob = new Blob([output || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `decipher-${algo}-${mode}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    const showRails = algo === 'railfence';
    const showKey = algo === 'vigenere';
    const showMode = !['rot13','atbash'].includes(algo);

    return (
    <div className="page-decipher shell">
        <div className="card decipher-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
            <h3 className="h1" style={{ fontSize: 20, margin: 0 }}>Decipher</h3>
        </div>

        <div className="toolbar" style={{ alignItems:'center' }}>
            <div>
            <label className="label" htmlFor="algo">Algorithm</label>
            <select id="algo" className="input" value={algo} onChange={e=>setAlgo(e.target.value)} style={{ minWidth: 180 }}>
                <option value="hex">Hex</option>
                <option value="base64">Base64</option>
                <option value="rot13">ROT13</option>
                <option value="atbash">Atbash</option>
                <option value="morse">Morse</option>
                <option value="railfence">Rail Fence</option>
                <option value="vigenere">Vigenère</option>
            </select>
            </div>

            {showMode && (
            <div>
                <label className="label" htmlFor="mode">Mode</label>
                <select id="mode" className="input" value={mode} onChange={e=>setMode(e.target.value)} style={{ width: 140 }}>
                <option value="enc">Encode</option>
                <option value="dec">Decode</option>
                </select>
            </div>
            )}

            {showRails && (
            <div>
                <label className="label" htmlFor="rails">Rails</label>
                <input id="rails" type="number" className="input" min="2" value={rails}
                        onChange={e=>setRails(Number(e.target.value)||2)} style={{ width: 100 }} />
            </div>
            )}

            {showKey && (
            <div>
                <label className="label" htmlFor="key">Key</label>
                <input id="key" className="input" placeholder="letters only" value={key}
                        onChange={e=>setKey(e.target.value)} style={{ width: 200 }} />
            </div>
            )}

            <div style={{ flex:1 }} />
        </div>

        <div className="io-grid">
            <div>
            <label className="label" htmlFor="in">Input</label>
            <textarea id="in" className="input" value={input}
                        onChange={e=>setInput(e.target.value)} placeholder="Type or paste here..." />
            </div>
            <div>
            <label className="label" htmlFor="out">Output</label>
            <textarea id="out" className="input" value={output} readOnly
                        placeholder="Result updates as you type..." />
            <div style={{ display:'flex', gap:10, marginTop:10 }}>
                <button className="btn" onClick={onCopy}>Copy</button>
                <button className="btn" onClick={onDownload}>Download</button>
            </div>
            </div>
        </div>

        {err && <p className="helper" style={{ color: 'salmon', marginTop: 8 }}>{err}</p>}
        </div>
    </div>
    );
}
