import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class IntlStub {
    translations = {
        'iam.common.dashboard': 'Dashboard',
        'iam.common.user': 'User',
        'iam.common.group': 'Group',
        'iam.common.roles': 'Roles',
        'iam.common.policies': 'Policies',
    };

    t(key) {
        return this.translations[key] ?? key;
    }
}

class AbilitiesStub {
    denied = new Set();

    can(permission) {
        return !this.denied.has(permission);
    }
}

class FetchStub {
    requests = [];
    response = {
        results: [
            {
                label: 'Tyler Demo',
                description: 'tyler@example.com',
                icon: 'user',
                type: 'User',
                route: 'console.iam.users.index',
                breadcrumb: 'IAM > Users',
                queryParams: { query: 'tyler', view_user: 'user_uuid' },
            },
        ],
    };

    get(url, params) {
        this.requests.push({ url, params });
        return Promise.resolve(this.response);
    }
}

module('Unit | Controller | application', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:abilities', AbilitiesStub);
        this.owner.register('service:fetch', FetchStub);
    });

    test('it builds IAM sidebar navigator items with host routes and nested users', function (assert) {
        const controller = this.owner.lookup('controller:application');
        const items = controller.navigationItems;
        const users = items.find((item) => item.route === 'console.iam.users');

        assert.deepEqual(
            items.map((item) => item.route),
            ['console.iam.home', 'console.iam.users', 'console.iam.groups', 'console.iam.roles', 'console.iam.policies'],
            'root items keep the console host route names'
        );
        assert.deepEqual(
            users.children.map((item) => item.route),
            ['console.iam.users.index', 'console.iam.users.drivers', 'console.iam.users.customers'],
            'users item exposes child routes for nested navigator testing'
        );
        assert.deepEqual(
            users.children.map((item) => item.label),
            ['Users', 'Drivers', 'Customers'],
            'users item labels distinguish actual users from drivers and customers'
        );
        assert.true(items[0].tooltip, 'dashboard opts into description-backed tooltip behavior');
        assert.strictEqual(users.permission, 'iam list user', 'users item keeps list permission filtering');
        assert.true(users.visible, 'users item is visible when the see permission is allowed');
    });

    test('it marks IAM navigator items hidden when see permissions are denied', function (assert) {
        const abilities = this.owner.lookup('service:abilities');
        abilities.denied.add('iam see group');

        const controller = this.owner.lookup('controller:application');
        const groups = controller.navigationItems.find((item) => item.route === 'console.iam.groups');

        assert.false(groups.visible);
    });

    test('it fetches IAM entity search results for the sidebar navigator', async function (assert) {
        const controller = this.owner.lookup('controller:application');
        const fetch = this.owner.lookup('service:fetch');
        const results = await controller.searchNavigation({ query: ' tyler ', limit: 12 });

        assert.deepEqual(fetch.requests, [{ url: 'iam/search', params: { query: 'tyler', limit: 12 } }], 'calls the IAM search adapter endpoint with the trimmed query');
        assert.deepEqual(results, fetch.response.results, 'returns navigator-ready endpoint results');
    });

    test('it does not fetch IAM entity search results for blank queries', async function (assert) {
        const controller = this.owner.lookup('controller:application');
        const fetch = this.owner.lookup('service:fetch');
        const results = await controller.searchNavigation({ query: '   ', limit: 12 });

        assert.deepEqual(results, []);
        assert.deepEqual(fetch.requests, [], 'blank queries do not call the adapter');
    });

    test('it returns empty IAM search results when the adapter fails', async function (assert) {
        const controller = this.owner.lookup('controller:application');
        const fetch = this.owner.lookup('service:fetch');

        fetch.get = () => Promise.reject(new Error('adapter failed'));

        const results = await controller.searchNavigation({ query: 'tyler', limit: 12 });

        assert.deepEqual(results, []);
    });
});
