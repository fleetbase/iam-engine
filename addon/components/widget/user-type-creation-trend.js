import Component from '@glimmer/component';

export default class WidgetUserTypeCreationTrendComponent extends Component {
    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { mode: 'index', intersect: false },
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { stacked: true, ticks: { precision: 0, font: { size: 10 } } },
            },
        };
    }
}
