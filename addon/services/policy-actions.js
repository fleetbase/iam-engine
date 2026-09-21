import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';

/**
 * Policy actions shared by the IAM pages and other engines (for example Fleetbase AI), so the
 * same dialogs open from anywhere in the console.
 */
export default class PolicyActionsService extends ResourceActionService {
    constructor() {
        super(...arguments);
        this.initialize('policy', { permissionPrefix: 'iam', mountPrefix: 'console.iam' });
    }

    transition = {
        list: () => this.transitionTo('policies'),
    };

    modal = {
        create: (...args) => this.createPolicy(...args),
        edit: (...args) => this.editPolicy(...args),
        viewPermissions: (...args) => this.viewPolicyPermissions(...args),
    };

    /**
     * Opens the dialog for this resource
     *
     * @void
     */
    @action createPolicy() {
        const formPermission = 'iam create policy';
        const policy = this.store.createRecord('policy', {
            is_mutable: true,
            is_deletable: true,
        });

        this.editPolicy(policy, {
            title: this.intl.t('iam.policies.index.new-policy'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await policy.save();
                    this.notifications.success(this.intl.t('iam.policies.index.new-policy-created'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Opens the dialog for this resource
     *
     * @param {PolicyModel} policy
     * @memberof PolicyActionsService
     * @void
     */
    @action editPolicy(policy, options = {}) {
        if (!policy.is_mutable) {
            return this.viewPolicyPermissions(policy, options);
        }

        const formPermission = 'iam update policy';
        this.modalsManager.show('modals/policy-form', {
            title: this.intl.t('iam.policies.index.edit-policy-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            policy,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await policy.save();
                    this.notifications.success(this.intl.t('iam.policies.index.changes-policy-saved-success'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * View policy permissions
     *
     * @param {PolicyModel} policy
     * @memberof PolicyActionsService
     */
    @action viewPolicyPermissions(policy, options = {}) {
        this.modalsManager.show('modals/view-policy-permissions', {
            title: this.intl.t('iam.components.modals.view-policy-permissions.view-permissions', { policyName: policy.name }),
            hideDeclineButton: true,
            acceptButtonText: this.intl.t('common.done'),
            policy,
            ...options,
        });
    }

    /**
     * Confirms and deletes the resource
     *
     * @param {PolicyModel} policy
     * @memberof PolicyActionsService
     * @void
     */
    @action deletePolicy(policy) {
        if (!policy.is_deletable) {
            return this.notifications.warning(this.intl.t('iam.policies.index.unable-delete-policy-warning', { policyType: policy.type }));
        }

        this.modalsManager.confirm({
            title: `Delete (${policy.name || 'Untitled'}) policy`,
            body: this.intl.t('iam.policies.index.data-assosciated-this-policy-deleted'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await policy.destroyRecord();
                    this.notifications.success(this.intl.t('iam.policies.index.policy-deleted', { policyName: policy.name }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }
}
