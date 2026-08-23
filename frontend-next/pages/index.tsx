import React from 'react';

export default function Home() {
  // Load the static SPA built into /spa
  return (
    <div style={{height: '100vh', margin: 0}}>
      <iframe src="/spa/index.html" title="Avril Forme SPA" style={{border: 0, width: '100%', height: '100%'}} />
    </div>
  );
}
