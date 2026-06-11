import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

export default class WidgetIamKpiTileComponent extends Component {
    @service fetch;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get metric() {
        return this.data?.[this.args.metric] ?? {};
    }

    get value() {
        if (this.metric.format === 'unavailable' || this.metric.available === false) {
            return 'N/A';
        }

        if (this.metric.format === 'percent') {
            return `${this.metric.value ?? 0}%`;
        }

        return Number(this.metric.value ?? 0).toLocaleString();
    }

    get footnote() {
        if (this.metric.format === 'unavailable' || this.metric.available === false) {
            return this.args.unavailableText ?? 'Coverage unavailable';
        }

        return this.args.footnote ?? this.metric.format ?? 'Current';
    }

    get accentClass() {
        return `iam-kpi-accent-${this.args.accent ?? 'blue'}`;
    }

    @task *load() {
        try {
            this.data = yield this.fetch.get('metrics/iam/kpis');
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load KPI';
        }
    }
}
