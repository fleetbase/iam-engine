import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class RolesIndexController extends Controller {
    @service roleActions;
    @service store;
    @service intl;
    @service notifications;
    @service currentUser;
    @service modalsManager;
    @service hostRouter;
    @service filters;
    @service crud;
    @service fetch;
    @service abilities;
    @service iam;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['view_role', 'page', 'limit', 'sort', 'query', 'service', 'type'];

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
    @tracked view_role;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * All services for roles.
     *
     * @memberof RolesIndexController
     */
    @tracked services = [];

    /**
     * All types of roles.
     *
     * @memberof RolesIndexController
     */
    @tracked types = this.iam.schemeTypes;

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
            width: '20%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '28%',
        },
        {
            label: this.intl.t('iam.common.service'),
            valuePath: 'service',
            sortable: false,
            width: '12%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.services,
        },
        {
            label: this.intl.t('iam.common.type'),
            valuePath: 'type',
            sortable: false,
            width: '13%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptionLabel: 'name',
            filterOptionValue: 'id',
            filterOptions: this.types,
        },
        {
            label: this.intl.t('iam.common.create'),
            valuePath: 'createdAt',
            sortable: false,
            width: '12%',
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
            width: '15%',
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
     * Creates an instance of RolesIndexController.
     * @memberof RolesIndexController
     */
    constructor() {
        super(...arguments);
        this.iam.getServices.perform({
            onSuccess: (services) => {
                this.services = services;
            },
        });
    }

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

    // Dialog and lifecycle actions live in the role-actions service so other engines can open them too.
    @action createRole(...args) {
        return this.roleActions.createRole(...args);
    }

    @action editRole(...args) {
        return this.roleActions.editRole(...args);
    }

    @action deleteRole(...args) {
        return this.roleActions.deleteRole(...args);
    }

    @action viewRolePermissions(...args) {
        return this.roleActions.viewRolePermissions(...args);
    }

    /**
     * Toggles dialog to export roles
     *
     * @void
     */
    @action exportRoles() {
        this.crud.export('role');
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    @action async openDeepLinkedResource() {
        const resourceId = this.view_role;

        if (!resourceId) {
            return;
        }

        try {
            const record = this.store.peekRecord('role', resourceId) ?? (await this.store.findRecord('role', resourceId));
            this.editRole(record, {
                onDecline: this.clearDeepLinkedResource,
                onFinish: this.clearDeepLinkedResource,
            });
        } catch (_) {
            this.notifications.warning('Unable to open the selected IAM resource.');
            this.clearDeepLinkedResource();
        }
    }

    @action clearDeepLinkedResource() {
        if (!this.view_role) {
            return;
        }

        this.view_role = null;
        this.hostRouter.transitionTo({ queryParams: { view_role: null } });
    }
}
