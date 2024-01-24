import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class RolesIndexController extends Controller {
    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * Inject the `modalsManager` service
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `hostRouter` service
     *
     * @var {Service}
     */
    @service hostRouter;

    /**
     * Inject the `crud` service
     *
     * @var {Service}
     */
    @service crud;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

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
            ddMenuLabel: this.intl.t('iam.roles.index.contact-action'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('iam.roles.index.edit-role'),
                    fn: this.editRole,
                },
                {
                    label: this.intl.t('iam.roles.index.delete-role'),
                    fn: this.deleteRole,
                    className: 'text-red-700 hover:text-red-800',
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
        const role = this.store.createRecord('role');

        this.editRole(role, {
            title: this.intl.t('iam.roles.index.new-role'),
            confirm: (modal) => {
                modal.startLoading();
                return role.save().then(() => {
                    this.notifications.success(this.intl.t('iam.roles.index.new-role-create'));
                    return this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Toggles dialog to edit a Role
     *
     * @void
     */
    @action editRole(role, options = {}) {
        this.modalsManager.show('modals/role-form', {
            title: this.intl.t('iam.roles.index.edit-role-title'),
            role,
            setPermissions: (permissions) => {
                role.permissions = permissions;
            },
            confirm: (modal) => {
                modal.startLoading();
                return role.save().then(() => {
                    this.notifications.success(this.intl.t('iam.roles.index.changes-role-saved'));
                    return this.hostRouter.refresh();
                });
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
            confirm: (modal) => {
                modal.startLoading();
                return role.destroyRecord().then((role) => {
                    this.notifications.success(this.intl.t('iam.roles.index.role-deleted', { roleName: role.name }));
                    return this.hostRouter.refresh();
                });
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
