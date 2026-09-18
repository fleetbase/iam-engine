import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import Service from '@ember/service';

class ModalsManagerStub extends Service {
    shown = [];

    show(component, options) {
        this.shown.push({ component, options });
    }
}

class StoreStub extends Service {
    createRecord(modelName, attributes) {
        return { modelName, ...attributes };
    }
}

class AbilitiesStub extends Service {
    cannot() {
        return false;
    }
}

class IntlStub extends Service {
    t(key) {
        return key;
    }
}

module('Unit | Service | user-actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:store', StoreStub);
        this.owner.register('service:abilities', AbilitiesStub);
        this.owner.register('service:intl', IntlStub);
    });

    test('modal.create opens the user form for a new pending user', function (assert) {
        const service = this.owner.lookup('service:user-actions');
        const modals = this.owner.lookup('service:modals-manager');

        service.modal.create();

        assert.strictEqual(modals.shown.length, 1);
        assert.strictEqual(modals.shown[0].component, 'modals/user-form');
        assert.strictEqual(modals.shown[0].options.user.modelName, 'user');
        assert.strictEqual(modals.shown[0].options.user.status, 'pending');
        assert.strictEqual(modals.shown[0].options.formPermission, 'iam create user');
        assert.true(modals.shown[0].options.allowEmailEdit);
    });

    test('modal.invite opens the invite user form', function (assert) {
        const service = this.owner.lookup('service:user-actions');
        const modals = this.owner.lookup('service:modals-manager');

        service.modal.invite();

        assert.strictEqual(modals.shown[0].component, 'modals/invite-user');
        assert.strictEqual(modals.shown[0].options.email, '');
    });
});

module('Unit | Service | group, role, and policy actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:store', StoreStub);
        this.owner.register('service:abilities', AbilitiesStub);
        this.owner.register('service:intl', IntlStub);
    });

    test('modal.create opens each resource form', function (assert) {
        const modals = this.owner.lookup('service:modals-manager');

        this.owner.lookup('service:group-actions').modal.create();
        this.owner.lookup('service:role-actions').modal.create();
        this.owner.lookup('service:policy-actions').modal.create();

        assert.deepEqual(
            modals.shown.map((modal) => modal.component),
            ['modals/group-form', 'modals/role-form', 'modals/policy-form']
        );
        assert.strictEqual(modals.shown[1].options.role.is_mutable, true);
        assert.strictEqual(modals.shown[2].options.policy.is_deletable, true);
    });
});
