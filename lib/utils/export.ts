// Export utilities for meal plans, protocols, etc.

export function exportAsText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsPDF(content: string, filename: string) {
  // Simple PDF export using browser print
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1, h2, h3 { color: #1e293b; }
          pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: inherit;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

export function formatForExport(content: string): string {
  // Convert markdown to plain text for export
  return content
    .replace(/^###\s+(.+)$/gm, "\n$1\n" + "=".repeat(50))
    .replace(/^##\s+(.+)$/gm, "\n\n$1\n" + "=".repeat(50))
    .replace(/^#\s+(.+)$/gm, "\n\n$1\n" + "=".repeat(50))
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^-\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "");
}

