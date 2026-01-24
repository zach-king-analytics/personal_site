// Apply animations and styling to mermaid diagrams after they render
document.addEventListener('DOMContentLoaded', function() {
  // Wait for mermaid to render
  setTimeout(function() {
    const mermaidContainer = document.querySelector('.mermaid-animated');
    if (mermaidContainer) {
      const svg = mermaidContainer.querySelector('svg');
      if (svg) {
        // Find all rectangles (nodes)
        const rects = svg.querySelectorAll('rect[rx], rect[ry], g.node rect');
        rects.forEach(function(rect) {
          rect.setAttribute('fill', '#17b8a6');
          rect.setAttribute('stroke', '#0d8a7f');
          rect.setAttribute('stroke-width', '2.5');
          rect.style.fill = '#17b8a6 !important';
          rect.style.stroke = '#0d8a7f !important';
          rect.style.strokeWidth = '2.5px !important';
        });
        
        // Find all text labels
        const labels = svg.querySelectorAll('text, tspan');
        labels.forEach(function(label) {
          label.style.fontSize = '20px !important';
          label.style.fontWeight = '800 !important';
          label.style.fill = '#ffffff !important';
          label.style.textShadow = '0 2px 8px rgba(0,0,0,0.9) !important';
        });
        
        // Find all edge paths
        const edgePaths = svg.querySelectorAll('path[class*="edge"], path[d*="M"], g path');
        edgePaths.forEach(function(path, index) {
          const pathData = path.getAttribute('d') || '';
          // Only animate paths that look like edges (not node outlines)
          if (pathData.length > 20) {
            path.style.strokeDasharray = '20 10 !important';
            path.style.animation = 'edge-flow 2s linear infinite !important';
            path.style.animationDelay = (index * 0.5) + 's !important';
            path.style.strokeWidth = '4px !important';
            path.style.stroke = '#6ee7b7 !important';
          }
        });
        
        // Find all markers/arrowheads
        const markers = svg.querySelectorAll('marker path, defs marker path');
        markers.forEach(function(marker) {
          marker.style.animation = 'arrow-pulse 1s ease-in-out infinite !important';
          marker.style.fill = '#6ee7b7 !important';
        });
        
        console.log('Mermaid diagram styling applied');
      }
    }
  }, 300);
  
  // Also try again after a longer delay in case mermaid is slow
  setTimeout(function() {
    const mermaidContainer = document.querySelector('.mermaid-animated');
    if (mermaidContainer) {
      const svg = mermaidContainer.querySelector('svg');
      if (svg) {
        const rects = svg.querySelectorAll('rect[rx], rect[ry]');
        if (rects.length > 0) {
          rects.forEach(function(rect) {
            rect.style.fill = '#17b8a6 !important';
            rect.style.stroke = '#0d8a7f !important';
          });
          console.log('Applied styling to ' + rects.length + ' rectangles');
        }
      }
    }
  }, 800);
});

