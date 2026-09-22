import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Controller | users/index', function (hooks) {
    setupTest(hooks);

    // TODO: Replace this with your real tests.
    test('it exists', function (assert) {
        let controller = this.owner.lookup('controller:users/index');
        assert.ok(controller);
    });

    test('it offers verification only for a set, unverified email or phone', function (assert) {
        const controller = this.owner.lookup('controller:users/index');
        const user = (attributes) => ({ get: (key) => attributes[key] });

        assert.true(controller.canVerify(user({ email: 'ada@example.test', email_verified_at: null }), 'email'));
        assert.false(controller.canVerify(user({ email: 'ada@example.test', email_verified_at: '2026-09-22' }), 'email'));
        assert.false(controller.canVerify(user({ phone: null, phone_verified_at: null }), 'phone'));
        assert.true(controller.canVerify(user({ phone: '+15550001111', phone_verified_at: null }), 'phone'));
    });

    test('it shows verification and profile columns, with the profile ones hidden by default', function (assert) {
        const controller = this.owner.lookup('controller:users/index');
        const column = (valuePath) => controller.columns.find((c) => c.valuePath === valuePath);

        assert.strictEqual(column('email_verified_at').filterParam, 'email_verified');
        assert.strictEqual(column('phone_verified_at').filterParam, 'phone_verified');
        assert.deepEqual(
            controller.verificationFilterOptions.map((option) => option.value),
            ['true', 'false']
        );
        ['country', 'timezone', 'date_of_birth', 'ip_address'].forEach((valuePath) => assert.true(column(valuePath).hidden, `${valuePath} is hidden by default`));
    });
});
