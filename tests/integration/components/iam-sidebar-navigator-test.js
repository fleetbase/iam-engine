import { click, fillIn, render, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';

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

module('Integration | Component | iam-sidebar-navigator', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:abilities', AbilitiesStub);
        this.items = this.owner.lookup('controller:application').navigationItems;
    });

    test('it renders IAM root navigation through the new sidebar navigator', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @searchPlaceholder="Search IAM..." />`);

        assert.dom('.next-sidebar-navigator').exists();
        assert.dom('.next-sidebar-navigator-search input').hasAttribute('placeholder', 'Search IAM...');
        assert.dom('.next-sidebar-navigator-item').exists({ count: 5 });
        assert.dom('.next-sidebar-navigator').includesText('Dashboard');
        assert.dom('.next-sidebar-navigator').includesText('User');
        assert.dom('.next-sidebar-navigator').includesText('Policies');
    });

    test('it opens the IAM users nested navigation and supports search breadcrumbs', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        await click('.next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.next-sidebar-navigator-back').hasText('User');
        assert.dom('.next-sidebar-navigator').includesText('All Users');
        assert.dom('.next-sidebar-navigator').includesText('Drivers');
        assert.dom('.next-sidebar-navigator').includesText('Customers');

        await fillIn('.next-sidebar-navigator-search input', 'driver');
        await waitFor('.next-sidebar-navigator-search-result');

        assert.dom('.next-sidebar-navigator-search-popover').exists();
        assert.dom('.next-sidebar-navigator-search-popover-input input').hasValue('driver');
        assert.dom('.next-sidebar-navigator-search-result .next-sidebar-navigator-search-result-label').hasText('Drivers');
        assert.dom('.next-sidebar-navigator-search-result').includesText('User > Drivers');
        assert.dom('.next-sidebar-navigator-view-in').includesText('All Users');
    });

    test('it filters IAM navigation items by permission', async function (assert) {
        const abilities = this.owner.lookup('service:abilities');
        abilities.denied.add('iam list role');
        this.items = this.owner.lookup('controller:application').navigationItems;

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator').doesNotIncludeText('Roles');
        assert.dom('.next-sidebar-navigator').includesText('Policies');
    });
});
