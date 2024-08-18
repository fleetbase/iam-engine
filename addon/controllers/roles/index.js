import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class RolesIndexController extends Controller {
    @service store;
    @service intl;
    @service notifications;
    @service currentUser;
    @service modalsManager;
    @service hostRouter;
    @service crud;
    @service fetch;
    @service abilities;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query'];

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The search query param
     *
     * @var {Integer}
     */
    @tracked query;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * All columns applicable for roles
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            permission: 'iam view role',
            onClick: this.editRole,
            width: '30%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '50%',
        },
        {
            label: this.intl.t('iam.common.create'),
            valuePath: 'createdAt',
            sortable: false,
            width: '10%',
            tooltip: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('iam.roles.index.role-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('iam.roles.index.edit-role'),
                    fn: this.editRole,
                    permission: 'iam view role',
                },
                {
                    label: this.intl.t('iam.roles.index.delete-role'),
                    fn: this.deleteRole,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'iam delete role',
                },
            ],
        },
    ];

    /**
     * The search task.
     *
     * @void
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        // timeout for typing
        yield timeout(250);

        // reset page for results
        if (this.page > 1) {
            this.page = 1;
        }

        // update the query param
        this.query = value;
    }

    /**
     * Bulk deletes selected `role` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteRoles() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('iam.roles.index.delete-roles'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to create a new Role
     *
     * @void
     */
    @action createRole() {
        const formPermission = 'iam create role';
        const role = this.store.createRecord('role');

        this.editRole(role, {
            title: this.intl.t('iam.roles.index.new-role'),
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
                    await role.save();
                    this.notifications.success(this.intl.t('iam.roles.index.new-role-create'));
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
        const formPermission = 'iam update role';
        this.modalsManager.show('modals/role-form', {
            title: this.intl.t('iam.roles.index.edit-role-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            role,
            setPermissions: (permissions) => {
                role.permissions = permissions;
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await role.save();
                    this.notifications.success(this.intl.t('iam.roles.index.changes-role-saved'));
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
     * Toggles dialog to export roles
     *
     * @void
     */
    @action exportRoles() {
        this.crud.export('role');
    }
}
