import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class GroupsIndexController extends Controller {
    /**
     * Inject the `UsersIndexController` controller
     *
     * @memberof GroupsIndexController
     */
    @controller('users.index') usersIndexController;

    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

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
    queryParams = ['page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status'];

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
     * All columns applicable for groups
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: 'Name',
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            onClick: this.editGroup,
            width: '20%',
            sortable: false,
        },
        {
            label: 'Description',
            valuePath: 'description',
            sortable: false,
            width: '25%',
        },
        {
            label: 'Members',
            valuePath: 'users',
            cellComponent: 'table/cell/group-members',
            onClick: (user) => {
                this.usersIndexController.editUser(user);
            },
            sortable: false,
            width: '35%',
        },
        {
            label: 'Created',
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
            ddMenuLabel: 'Contact Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: 'Edit group...',
                    fn: this.editGroup,
                },
                {
                    label: 'Delete group...',
                    fn: this.deleteGroup,
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
     * Bulk deletes selected `user` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteGroups() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: 'Delete Groups',
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

    /**
     * Toggles modal to create a new group
     *
     * @void
     */
    @action createGroup() {
        const group = this.store.createRecord('group', { users: [] });

        this.editGroup(group, {
            title: 'New Group',
            group,
            confirm: (modal) => {
                modal.startLoading();
                return group.save().then(() => {
                    this.notifications.success('New group created.');
                    return this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Toggles modal to edit a group
     *
     * @void
     */
    @action editGroup(group, options = {}) {
        this.modalsManager.show('modals/group-form', {
            title: 'Edit Group',
            group,
            lastSelectedUser: null,
            removeUser: (user) => {
                group.users.removeObject(user);
            },
            addUser: (user) => {
                group.users.pushObject(user);
                this.modalsManager.setOption('lastSelectedUser', null);
            },
            confirm: (modal) => {
                modal.startLoading();
                return group.save().then(() => {
                    this.notifications.success('Changes to group saved.');
                    return this.hostRouter.refresh();
                });
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
        this.modalsManager.confirm({
            title: `Delete (${group.name || 'Untitled'}) group`,
            body: 'Are you sure you want to delete this group? All data assosciated with this group will also be deleted. This action cannot be undone.',
            confirm: (modal) => {
                modal.startLoading();
                return group.destroyRecord().then((group) => {
                    this.notifications.success(`Group (${group.name}) deleted.`);
                    this.hostRouter.refresh();
                });
            },
        });
    }
}
