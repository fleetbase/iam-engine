import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class UsersIndexController extends Controller {
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
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: 'Name',
            valuePath: 'name',
            width: '170px',
            cellComponent: 'table/cell/user-name',
            mediaPath: 'avatar_url',
            action: this.editUser,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Email',
            valuePath: 'email',
            cellComponent: 'click-to-copy',
            sortable: false,
            width: '12%',
        },
        {
            label: 'Phone',
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            sortable: false,
            width: '12%',
        },
        {
            label: 'Type',
            valuePath: 'typesList',
            sortable: false,
            width: '12%',
        },
        {
            label: 'Status',
            valuePath: 'session_status',
            sortable: false,
            width: '12%',
            cellComponent: 'table/cell/status',
        },
        {
            label: 'Last Login',
            valuePath: 'lastLogin',
            width: '130px',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: 'Created At',
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '130px',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: 'Updated At',
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '130px',
            resizable: true,
            hidden: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
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
                    label: 'Edit user...',
                    fn: this.editUser,
                },
                {
                    label: 'Re-send invitation...',
                    fn: this.resendInvitation,
                    isVisible: (user) => user.get('session_status') === 'pending',
                },
                {
                    label: 'Deactivate user...',
                    fn: this.deactivateUser,
                    className: 'text-danger',
                    isVisible: (user) => user.get('session_status') === 'active',
                },
                {
                    label: 'Activate user...',
                    fn: this.activateUser,
                    className: 'text-danger',
                    isVisible: (user) => user.get('session_status') === 'inactive' || (this.currentUser.user.is_admin && user.get('session_status') === 'pending'),
                },
                {
                    label: 'Delete user...',
                    fn: this.deleteUser,
                    className: 'text-danger',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
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
    @action bulkDeleteUsers() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: 'Delete Users',
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to export `user`
     *
     * @void
     */
    @action exportUsers() {
        this.crud.export('user');
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createUser() {
        const user = this.store.createRecord('user', {
            status: 'pending',
            type: 'user',
        });

        this.editUser(user, {
            title: 'New User',
            confirm: (modal) => {
                modal.startLoading();

                user.save()
                    .then(() => {
                        modal.done();
                        this.notifications.success('User has been invited to join your organization.');
                        return this.hostRouter.refresh();
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    });
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editUser(user, options = {}) {
        this.modalsManager.show('modals/user-form', {
            title: 'Edit User',
            user,
            uploadNewPhoto: (file) => {
                this.fetch.uploadFile.perform(
                    file,
                    {
                        path: `uploads/${user.company_uuid}/users/${user.slug}`,
                        key_uuid: user.id,
                        key_type: `user`,
                        type: `user_photo`,
                    },
                    (uploadedFile) => {
                        user.setProperties({
                            avatar_uuid: uploadedFile.id,
                            avatar_url: uploadedFile.url,
                            avatar: uploadedFile,
                        });
                    }
                );
            },
            confirm: (modal) => {
                modal.startLoading();

                user.save()
                    .then(() => {
                        modal.done();
                        this.notifications.success('User changes saved.');
                        return this.hostRouter.refresh();
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    });
            },
            ...options,
        });
    }

    /**
     * Toggles dialog to delete API key
     *
     * @void
     */
    @action deleteUser(user) {
        if (user.id === this.currentUser.id) {
            return this.notifications.error("You can't delete yourself");
        }

        this.modalsManager.confirm({
            title: `Delete ${user.get('name')} user`,
            body: 'Are you sure you want to delete this user? All data assosciated with this user will also be deleted. This action cannot be undone.',
            confirm: (modal) => {
                modal.startLoading();
                return user.removeFromCurrentCompany().then(() => {
                    this.notifications.success(`User (${user.get('name')}) deleted.`);
                    this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Deactivates a user
     *
     * @void
     */
    @action deactivateUser(user) {
        this.modalsManager.confirm({
            title: `Deactivate ${user.get('name')} user's account`,
            body: 'Are you sure you want to deactivate this user? This user will no longer be able to access their account or resources unless re-activated.',
            confirm: (modal) => {
                modal.startLoading();
                return user.deactivate().then(() => {
                    this.notifications.success(`User (${user.get('name')}) deactivated.`);
                    this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Deactivates a user
     *
     * @void
     */
    @action activateUser(user) {
        this.modalsManager.confirm({
            title: `Re-activate ${user.get('name')} user's account`,
            body: 'Are you sure you want to re-activate this user? This user will regain access to your organization.',
            confirm: (modal) => {
                modal.startLoading();
                return user.activate().then(() => {
                    this.notifications.success(`User (${user.get('name')}) activated.`);
                    this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Resends invite for a user to join.
     *
     * @void
     */
    @action resendInvitation(user) {
        this.modalsManager.confirm({
            title: `Resend invitation to join organization`,
            body: 'By confirming Fleetbase will re-send the invitation for this user to join your organization.',
            confirm: (modal) => {
                modal.startLoading();
                return user.resendInvite().then(() => {
                    this.notifications.success(`Invitation resent.`);
                    this.hostRouter.refresh();
                });
            },
        });
    }
}
