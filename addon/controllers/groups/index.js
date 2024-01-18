import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

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
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            onClick: this.editGroup,
            width: '20%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '25%',
        },
        {
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
            label: this.intl.t('iam.groups.index.created'),
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
                    label: this.intl.t('iam.groups.index.edit-group'),
                    fn: this.editGroup,
                },
                {
                    label: this.intl.t('iam.groups.index.delete-group-label'),
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
            acceptButtonText: this.intl.t('aim.groups.index.delete-group'),
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
            title: this.intl.t('iam.groups.index.new-group'),
            group,
            confirm: (modal) => {
                modal.startLoading();
                return group.save().then(() => {
                    this.notifications.success(this.intl.t('iam.groups.index.new-group-created'));
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
            title: this.intl.t('iam.groups.index.edit-group-title'),
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
                    this.notifications.success(this.intl.t('iam.groups.index.changes-group-save'));
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
        const groupName = getWithDefault(group, 'name', this.intl.t('iam.groups.index.untitled'));

        this.modalsManager.confirm({
            title: this.intl.t('iam.groups.index.delete-group-title', { groupName }),
            body: this.intl.t('iam.groups.index.data-assosciated-this-group-deleted'),
            confirm: (modal) => {
                modal.startLoading();
                return group.destroyRecord().then((group) => {
                    this.notifications.success(this.intl.t('iam.groups.index.delete-group-success-message', {name: group.name }),);
                    this.hostRouter.refresh();
                });
            },
        });
    }
}
