import { module, test } from 'qunit';
import { registerWidgets } from '@fleetbase/iam-engine/extension';

module('Unit | Extension', function () {
    test('registers the dedicated IAM dashboard widget suite', function (assert) {
        const dashboards = [];
        const registrations = [];
        const widgetService = {
            registerDashboard(id) {
                dashboards.push(id);
            },
            registerWidgets(id, widgets) {
                registrations.push({ id, widgets });
            },
        };

        registerWidgets(widgetService);

        const iamRegistration = registrations.find((registration) => registration.id === 'iam');
        const defaultWidgets = iamRegistration.widgets.filter((widget) => widget.isDefault());
        const kpiWidgets = iamRegistration.widgets.filter((widget) => widget.category === 'KPI Tiles');
        const legacyWidget = iamRegistration.widgets.find((widget) => widget.id === 'iam-metrics-widget');

        assert.deepEqual(dashboards, ['iam']);
        assert.notOk(
            registrations.find((registration) => registration.id === 'dashboard'),
            'does not leak IAM widgets into the generic dashboard'
        );
        assert.strictEqual(iamRegistration.widgets.length, 17, 'registers 16 new widgets plus the legacy widget');
        assert.strictEqual(defaultWidgets.length, 16, 'registers exactly 16 new default widgets');
        assert.strictEqual(kpiWidgets.length, 8, 'registers an even set of 8 KPI widgets');
        assert.true(
            kpiWidgets.every((widget) => widget.grid_options.w === 3 && widget.grid_options.h === 4),
            'all KPI widgets use the same compact grid size'
        );
        assert.false(legacyWidget.isDefault(), 'legacy metrics widget remains non-default');
    });
});
