// Apply animations to mermaid diagrams after they render
document.addEventListener('DOMContentLoaded', function() {
  // Wait for mermaid to render
  setTimeout(function() {
    const mermaidContainer = document.querySelector('.mermaid-animated');
    if (mermaidContainer) {
      const svg = mermaidContainer.querySelector('svg');
      if (svg) {
        // Find all edge paths
        const edgePaths = svg.querySelectorAll('.edgePath path, path.flowchart-link, g[class*="edge"] path');
        edgePaths.forEach(function(path, index) {
          path.style.strokeDasharray = '20 10';
          path.style.animation = 'edge-flow 2s linear infinite';
          path.style.animationDelay = (index * 0.5) + 's';
          path.style.strokeWidth = '4px';
          path.style.stroke = '#6ee7b7';
        });
        
        // Find all arrowhead markers
        const markers = svg.querySelectorAll('marker path, defs marker path');
        markers.forEach(function(marker) {
          marker.style.animation = 'arrow-pulse 1s ease-in-out infinite';
          marker.style.fill = '#6ee7b7';
        });
      }
    }
  }, 500);
});
