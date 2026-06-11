import { Widget, ExtensionComponent } from '@fleetbase/ember-core/contracts';

export function registerWidgets(widgetService) {
    const kpiGridOptions = { w: 3, h: 4, minW: 3, minH: 4 };
    const insightGridOptions = { w: 6, h: 8, minW: 5, minH: 7 };
    const operationsGridOptions = { w: 6, h: 7, minW: 4, minH: 6 };
    const widgets = [
        new Widget({
            id: 'iam-kpi-active-users',
            name: 'Active Users',
            description: 'Active users who can currently access the organization.',
            icon: 'user-check',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-active-users'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-kpi-pending-invites',
            name: 'Pending Invites',
            description: 'Users invited or awaiting verification.',
            icon: 'envelope-open-text',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-pending-invites'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-kpi-inactive-users',
            name: 'Inactive Users',
            description: 'Users whose organization access is inactive.',
            icon: 'user-slash',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-inactive-users'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-kpi-dormant-users',
            name: 'Dormant Users',
            description: 'Users with no recent login activity.',
            icon: 'bed',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-dormant-users'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-kpi-mfa-coverage',
            name: 'MFA Coverage',
            description: 'Share of users with two-factor authentication enabled when available.',
            icon: 'lock',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-mfa-coverage'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-kpi-roles',
            name: 'Roles',
            description: 'Organization-managed IAM roles.',
            icon: 'user-tag',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-roles'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-kpi-policies',
            name: 'Policies',
            description: 'Organization-managed access policies.',
            icon: 'file-shield',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/kpi-policies'),
            grid_options: kpiGridOptions,
            category: 'KPI Tiles',
            default: true,
        }),
        new Widget({
            id: 'iam-user-type-creation-trend',
            name: 'Users by Type Created Over Time',
            description: 'New identities created by user type over the selected period.',
            icon: 'chart-column',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/user-type-creation-trend'),
            grid_options: insightGridOptions,
            category: 'Analytics',
            default: true,
        }),
        new Widget({
            id: 'iam-access-risk',
            name: 'Access Risk',
            description: 'Privileged roles, wildcard policies, and direct privileged grants.',
            icon: 'user-lock',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/access-risk'),
            grid_options: insightGridOptions,
            category: 'Security',
            default: true,
        }),
        new Widget({
            id: 'iam-policy-surface',
            name: 'Policy Surface',
            description: 'Policies grouped by service and ownership.',
            icon: 'diagram-project',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/policy-surface'),
            grid_options: insightGridOptions,
            category: 'Governance',
            default: true,
        }),
        new Widget({
            id: 'iam-recent-activity',
            name: 'Recent IAM Activity',
            description: 'Recent user, group, role, and policy changes.',
            icon: 'clock-rotate-left',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/recent-activity'),
            grid_options: operationsGridOptions,
            category: 'Operations',
            default: true,
        }),
        new Widget({
            id: 'iam-quick-actions',
            name: 'IAM Quick Actions',
            description: 'Shortcuts for common IAM management tasks.',
            icon: 'bolt',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/quick-actions'),
            grid_options: operationsGridOptions,
            category: 'Actions',
            default: true,
        }),
        new Widget({
            id: 'iam-metrics-widget',
            name: 'IAM Metrics (Legacy)',
            description: 'Legacy grouped IAM usage metrics.',
            icon: 'user-shield',
            component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/iam-metrics'),
            grid_options: { w: 6, h: 8, minW: 4, minH: 6 },
            options: { title: 'IAM Metrics' },
            category: 'Legacy',
            default: false,
        }),
    ];

    widgetService.registerDashboard('iam');
    widgetService.registerWidgets('iam', widgets);
}

export default {
    setupExtension(app, universe) {
        const menuService = universe.getService('menu');
        const widgetService = universe.getService('widget');

        // Register in header menu
        menuService.registerHeaderMenuItem('IAM', 'console.iam', {
            icon: 'shield-halved',
            priority: 3,
            description: 'Identity and access management: users, roles, policies, and permissions.',
            shortcuts: [
                {
                    title: 'Users',
                    description: 'Manage console user accounts and their access levels.',
                    icon: 'user',
                    route: 'console.iam.users',
                },
                {
                    title: 'Drivers',
                    description: 'View and manage driver accounts linked to your organisation.',
                    icon: 'id-card',
                    route: 'console.iam.users.drivers',
                },
                {
                    title: 'Customers',
                    description: 'View and manage customer accounts linked to your organisation.',
                    icon: 'users',
                    route: 'console.iam.users.customers',
                },
                {
                    title: 'Groups',
                    description: 'Organise users into groups for bulk permission management.',
                    icon: 'people-group',
                    route: 'console.iam.groups',
                },
                {
                    title: 'Roles',
                    description: 'Define named roles that bundle sets of permissions.',
                    icon: 'user-tag',
                    route: 'console.iam.roles',
                },
                {
                    title: 'Policies',
                    description: 'Create fine-grained access control policies for resources.',
                    icon: 'file-shield',
                    route: 'console.iam.policies',
                },
            ],
        });

        // Register dashboard and widgets
        registerWidgets(widgetService);
    },
};
