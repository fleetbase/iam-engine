import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Group actions shared by the IAM pages and other engines (for example Fleetbase AI), so the
 * same dialogs open from anywhere in the console.
 */
export default class GroupActionsService extends ResourceActionService {
    constructor() {
        super(...arguments);
        this.initialize('group', { permissionPrefix: 'iam', mountPrefix: 'console.iam' });
    }

    transition = {
        list: () => this.transitionTo('groups'),
    };

    modal = {
        create: (...args) => this.createGroup(...args),
        edit: (...args) => this.editGroup(...args),
    };

    /**
     * Toggles modal to create a new group
     *
     * @void
     */
    @action createGroup() {
        const formPermission = 'iam create group';
        const group = this.store.createRecord('group', { users: [] });

        this.editGroup(group, {
            title: this.intl.t('iam.groups.index.new-group'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            group,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }
                try {
                    await group.save();
                    this.notifications.success(this.intl.t('iam.groups.index.new-group-created'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles modal to edit a group
     *
     * @void
     */
    @action editGroup(group, options = {}) {
        const formPermission = 'iam update group';
        this.modalsManager.show('modals/group-form', {
            title: this.intl.t('iam.groups.index.edit-group-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            group,
            lastSelectedUser: null,
            removeUser: (user) => {
                group.users.removeObject(user);
            },
            addUser: (user) => {
                group.users.pushObject(user);
                this.modalsManager.setOption('lastSelectedUser', null);
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await group.save();
                    this.notifications.success(this.intl.t('iam.groups.index.changes-group-save'));
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
     * Toggles dialog to delete a group
     *
     * @void
     */
    @action deleteGroup(group) {
        const groupName = getWithDefault(group, 'name', this.intl.t('iam.groups.index.untitled'));

        this.modalsManager.confirm({
            title: this.intl.t('iam.groups.index.delete-group-title', { groupName }),
            body: this.intl.t('iam.groups.index.data-assosciated-this-group-deleted'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await group.destroyRecord();
                    this.notifications.success(this.intl.t('iam.groups.index.delete-group-success-message', { name: group.name }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }
}
