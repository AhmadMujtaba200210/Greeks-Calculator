// Shared UI Utilities

/**
 * Custom Luxury Tooltip for Chart.js
 * Matches the glassmorphism and premium aesthetics of the app.
 */
export const customTooltip = (context) => {
    let tooltipEl = document.getElementById('chartjs-tooltip');

    // Create element if it doesn't exist
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chartjs-tooltip';
        document.body.appendChild(tooltipEl);
    }

    const tooltipModel = context.tooltip;
    if (tooltipModel.opacity === 0) {
        tooltipEl.style.opacity = 0;
        return;
    }

    if (tooltipModel.body) {
        const titleLines = tooltipModel.title || [];
        const bodyLines = tooltipModel.body.map(b => b.lines);

        let innerHtml = '<div class="tooltip-title">' + (titleLines[0] || '') + '</div>';
        innerHtml += '<div class="tooltip-body">';
        bodyLines.forEach((body, i) => {
            const colors = tooltipModel.labelColors[i];
            const dash = `<span style="display:inline-block;width:10px;height:10px;background:${colors.borderColor};margin-right:8px;border-radius:2px"></span>`;
            innerHtml += `<div>${dash}${body}</div>`;
        });
        innerHtml += '</div>';
        tooltipEl.innerHTML = innerHtml;
    }

    const position = context.chart.canvas.getBoundingClientRect();

    // Position the tooltip
    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
    tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY - 10 + 'px';
    tooltipEl.style.transform = 'translate(-50%, -100%)';
};
