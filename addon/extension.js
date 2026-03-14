import { Widget, ExtensionComponent } from '@fleetbase/ember-core/contracts';

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

        // register metrics widget
        const widgets = [
            new Widget({
                id: 'iam-metrics-widget',
                name: 'IAM Metrics',
                description: 'IAM usage metrics.',
                icon: 'user-shield',
                component: new ExtensionComponent('@fleetbase/iam-engine', 'widget/iam-metrics'),
                grid_options: { w: 6, h: 8, minW: 6, minH: 8 },
                options: { title: 'IAM Metrics' },
            }),
        ];

        widgetService.registerWidgets('dashboard', widgets);
    },
};
