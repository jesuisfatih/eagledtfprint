'use client';

import { useState } from 'react';

export default function SnippetTester() {
  const [testResult, setTestResult] = useState('');

  const testSnippet = async () => {
    try {
      const response = await fetch('https://cdn.eagledtfsupply.com/snippet.iife.js');
      if (response.ok) {
        const code = await response.text();
        setTestResult(`✅ Snippet loaded successfully (${code.length} bytes)`);
      } else {
        setTestResult('❌ Snippet not accessible');
      }
    } catch (err) {
      setTestResult('❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="apple-card">
      <div className="apple-card-header">
        <h3 className="apple-card-title">Snippet Test</h3>
      </div>
      <div className="apple-card-body">
        <button onClick={testSnippet} className="btn-apple primary">
          <i className="ti ti-code" /> Test Snippet
        </button>
        {testResult && (
          <div className={`apple-alert ${testResult.includes('✅') ? 'success' : 'error'}`} style={{ marginTop: 12 }}>
            <i className={`ti ${testResult.includes('✅') ? 'ti-check' : 'ti-x'}`} />
            <span>{testResult}</span>
          </div>
        )}
      </div>
    </div>
  );
}

