import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';

/**
 * Role actions shared by the IAM pages and other engines (for example Fleetbase AI), so the
 * same dialogs open from anywhere in the console.
 */
export default class RoleActionsService extends ResourceActionService {
    constructor() {
        super(...arguments);
        this.initialize('role', { permissionPrefix: 'iam', mountPrefix: 'console.iam' });
    }

    transition = {
        list: () => this.transitionTo('roles'),
    };

    modal = {
        create: (...args) => this.createRole(...args),
        edit: (...args) => this.editRole(...args),
        viewPermissions: (...args) => this.viewRolePermissions(...args),
    };

    /**
     * Toggles dialog to create a new Role
     *
     * @void
     */
    @action createRole() {
        const formPermission = 'iam create role';
        const role = this.store.createRecord('role', { is_mutable: true });

        this.editRole(role, {
            title: this.intl.t('iam.roles.index.new-role'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            keepOpen: true,
            confirm: async (modal) => {
                modal.startLoading();

                if (!role.name || typeof role.name !== 'string') {
                    modal.stopLoading();
                    return this.notifications.warning('Role name is required.');
                }

                const roleName = role.name.toLowerCase();
                if (roleName === 'administrator' || roleName.startsWith('admin')) {
                    modal.stopLoading();
                    return this.notifications.error('Creating a role with name "Administrator" or a role name that starts with "Admin" is prohibited, as the name is system reserved.');
                }

                if (this.abilities.cannot(formPermission)) {
                    modal.stopLoading();
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await role.save();
                    this.notifications.success(this.intl.t('iam.roles.index.new-role-create'));
                    modal.done();
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles dialog to edit a Role
     *
     * @void
     */
    @action editRole(role, options = {}) {
        if (!role.is_mutable) {
            return this.viewRolePermissions(role, options);
        }

        const formPermission = 'iam update role';
        this.modalsManager.show('modals/role-form', {
            title: this.intl.t('iam.roles.index.edit-role-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            keepOpen: true,
            formPermission,
            role,
            setPermissions: (permissions) => {
                role.permissions = permissions;
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (!role.name || typeof role.name !== 'string') {
                    modal.stopLoading();
                    return this.notifications.warning('Role name is required.');
                }

                const roleName = role.name.toLowerCase();
                if (roleName === 'administrator' || roleName.startsWith('admin')) {
                    modal.stopLoading();
                    return this.notifications.error('Creating a role with name "Administrator" or a role name that starts with "Admin" is prohibited, as the name is system reserved.');
                }

                if (this.abilities.cannot(formPermission)) {
                    modal.stopLoading();
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await role.save();
                    this.notifications.success(this.intl.t('iam.roles.index.changes-role-saved'));
                    modal.done();
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
     * Toggles dialog to delete Role
     *
     * @void
     */
    @action deleteRole(role) {
        if (!role.is_deletable) {
            return this.notifications.warning(this.intl.t('iam.roles.index.unable-delete-role-warning', { roleType: role.type }));
        }

        this.modalsManager.confirm({
            title: `Delete (${role.name || 'Untitled'}) role`,
            body: this.intl.t('iam.roles.index.data-assosciated-this-role-deleted'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await role.destroyRecord();
                    this.notifications.success(this.intl.t('iam.roles.index.role-deleted', { roleName: role.name }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * View role permissions
     *
     * @param {RoleModel} role
     * @memberof RoleActionsService
     */
    @action viewRolePermissions(role, options = {}) {
        this.modalsManager.show('modals/view-role-permissions', {
            title: this.intl.t('iam.components.modals.view-role-permissions.view-permissions', { roleName: role.name }),
            hideDeclineButton: true,
            acceptButtonText: this.intl.t('common.done'),
            role,
            ...options,
        });
    }
}
