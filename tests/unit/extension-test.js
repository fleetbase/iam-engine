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
        const insightWidgets = iamRegistration.widgets.filter((widget) => ['iam-user-type-creation-trend', 'iam-access-risk', 'iam-policy-surface'].includes(widget.id));
        const operationsWidgets = iamRegistration.widgets.filter((widget) => ['iam-recent-activity', 'iam-quick-actions'].includes(widget.id));
        const legacyWidget = iamRegistration.widgets.find((widget) => widget.id === 'iam-metrics-widget');

        assert.deepEqual(dashboards, ['iam']);
        assert.notOk(
            registrations.find((registration) => registration.id === 'dashboard'),
            'does not leak IAM widgets into the generic dashboard'
        );
        assert.strictEqual(iamRegistration.widgets.length, 13, 'registers 12 focused widgets plus the legacy widget');
        assert.strictEqual(defaultWidgets.length, 12, 'registers exactly 12 focused default widgets');
        assert.strictEqual(kpiWidgets.length, 7, 'registers a compact set of 7 KPI widgets');
        assert.true(
            kpiWidgets.every((widget) => widget.grid_options.w === 3 && widget.grid_options.h === 4),
            'all KPI widgets use the same compact grid size'
        );
        assert.deepEqual(
            defaultWidgets.map((widget) => widget.id),
            [
                'iam-kpi-active-users',
                'iam-kpi-pending-invites',
                'iam-kpi-inactive-users',
                'iam-kpi-dormant-users',
                'iam-kpi-mfa-coverage',
                'iam-kpi-roles',
                'iam-kpi-policies',
                'iam-user-type-creation-trend',
                'iam-access-risk',
                'iam-policy-surface',
                'iam-recent-activity',
                'iam-quick-actions',
            ],
            'defaults stay focused on KPIs, identity creation, access risk, policy surface, activity, and actions'
        );
        assert.true(
            insightWidgets.every((widget) => widget.grid_options.w === 6 && widget.grid_options.h === 8 && widget.grid_options.minH === 7),
            'main insight widgets share a consistent dashboard height'
        );
        assert.true(
            operationsWidgets.every((widget) => widget.grid_options.w === 6 && widget.grid_options.h === 7 && widget.grid_options.minH === 6),
            'activity and action widgets share a consistent dashboard height'
        );
        assert.notOk(
            iamRegistration.widgets.find((widget) => widget.id === 'iam-identity-health'),
            'removes the low-signal identity health panel'
        );
        assert.notOk(
            iamRegistration.widgets.find((widget) => widget.id === 'iam-access-coverage'),
            'removes the low-signal access coverage panel'
        );
        assert.notOk(
            iamRegistration.widgets.find((widget) => widget.id === 'iam-group-coverage'),
            'removes the low-signal group coverage panel'
        );
        assert.notOk(
            iamRegistration.widgets.find((widget) => widget.id === 'iam-user-lifecycle'),
            'replaces the lifecycle chart with the user type creation chart'
        );
        assert.false(legacyWidget.isDefault(), 'legacy metrics widget remains non-default');
    });
});
