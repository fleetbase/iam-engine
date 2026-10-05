import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class GroupsIndexController extends Controller {
    @service groupActions;
    @controller('users.index') usersIndexController;
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
    queryParams = this.groupActions.queryParamsFor(['view_group', 'page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status']);

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
    @tracked view_group;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * Header buttons. Extensions add to them through `iam:group:table:actions`.
     *
     * @var {Array}
     */
    get actionButtons() {
        return [
            {
                id: 'create',
                text: this.intl.t('iam.common.new'),
                type: 'primary',
                icon: 'plus',
                iconPrefix: 'fas',
                onClick: this.createGroup,
                permission: 'iam create group',
            },
            {
                id: 'export',
                text: this.intl.t('iam.common.export'),
                icon: 'long-arrow-up',
                iconClass: 'rotate-icon-45',
                onClick: this.exportGroups,
                permission: 'iam export group',
            },
        ];
    }

    /**
     * Bulk actions for the selected rows. Extensions add to them through `iam:group:table:bulk-actions`.
     *
     * @var {Array}
     */
    get bulkActions() {
        return [
            {
                id: 'bulk-delete',
                label: this.intl.t('iam.groups.index.delete-groups'),
                class: 'text-red-500',
                fn: this.bulkDeleteGroups,
                permission: 'iam delete group',
            },
        ];
    }

    /**
     * All columns applicable for groups
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            id: 'name',
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            permission: 'iam view group',
            onClick: this.editGroup,
            width: '20%',
            sortable: false,
        },
        {
            id: 'description',
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '25%',
        },
        {
            id: 'users',
            label: this.intl.t('iam.common.member'),
            valuePath: 'users',
            cellComponent: 'table/cell/group-members',
            onClick: (user) => {
                this.usersIndexController.editUser(user);
            },
            sortable: false,
            width: '35%',
        },
        {
            id: 'created-at',
            label: this.intl.t('iam.groups.index.created'),
            valuePath: 'createdAt',
            sortable: false,
            width: '10%',
            tooltip: true,
            cellClassNames: 'overflow-visible',
        },
        {
            id: 'row-actions',
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('iam.groups.index.group-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    id: 'edit-group',
                    label: this.intl.t('iam.groups.index.edit-group'),
                    fn: this.editGroup,
                    permission: 'iam view group',
                },
                {
                    id: 'delete-group',
                    label: this.intl.t('iam.groups.index.delete-group-label'),
                    fn: this.deleteGroup,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'iam delete group',
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
     * Bulk deletes selected `user` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteGroups() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('iam.groups.index.delete-group'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to export `group`
     *
     * @void
     */
    @action exportGroups() {
        this.crud.export('group');
    }

    // Dialog and lifecycle actions live in the group-actions service so other engines can open them too.
    @action createGroup(...args) {
        return this.groupActions.createGroup(...args);
    }

    @action editGroup(...args) {
        return this.groupActions.editGroup(...args);
    }

    @action deleteGroup(...args) {
        return this.groupActions.deleteGroup(...args);
    }

    @action async openDeepLinkedResource() {
        const resourceId = this.view_group;

        if (!resourceId) {
            return;
        }

        try {
            const record = this.store.peekRecord('group', resourceId) ?? (await this.store.findRecord('group', resourceId));
            this.editGroup(record, {
                onDecline: this.clearDeepLinkedResource,
                onFinish: this.clearDeepLinkedResource,
            });
        } catch (_) {
            this.notifications.warning('Unable to open the selected IAM resource.');
            this.clearDeepLinkedResource();
        }
    }

    @action clearDeepLinkedResource() {
        if (!this.view_group) {
            return;
        }

        this.view_group = null;
        this.hostRouter.transitionTo({ queryParams: { view_group: null } });
    }
}
