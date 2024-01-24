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
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('iam.common.name'),
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
            label: this.intl.t('iam.common.email'),
            valuePath: 'email',
            cellComponent: 'click-to-copy',
            sortable: false,
            width: '12%',
        },
        {
            label: this.intl.t('iam.common.phone'),
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            sortable: false,
            width: '12%',
        },
        {
            label: this.intl.t('iam.common.type'),
            valuePath: 'typesList',
            sortable: false,
            width: '12%',
        },
        {
            label: this.intl.t('iam.common.status'),
            valuePath: 'session_status',
            sortable: false,
            width: '12%',
            cellComponent: 'table/cell/status',
        },
        {
            label: this.intl.t('iam.users.index.last-login'),
            valuePath: 'lastLogin',
            width: '130px',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('iam.users.index.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '130px',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('iam.users.index.updated-at'),
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
            ddMenuLabel: this.intl.t('iam.users.index.contact-action'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('iam.users.index.edit-user'),
                    fn: this.editUser,
                },
                {
                    label: this.intl.t('iam.users.index.re-send-invitation'),
                    fn: this.resendInvitation,
                    isVisible: (user) => user.get('session_status') === 'pending',
                },
                {
                    label: this.intl.t('iam.users.index.deactivate-user'),
                    fn: this.deactivateUser,
                    className: 'text-danger',
                    isVisible: (user) => user.get('session_status') === 'active',
                },
                {
                    label: this.intl.t('iam.users.index.activate-user'),
                    fn: this.activateUser,
                    className: 'text-danger',
                    isVisible: (user) => user.get('session_status') === 'inactive' || (this.currentUser.user.is_admin && user.get('session_status') === 'pending'),
                },
                {
                    label: this.intl.t('iam.users.index.delete-user'),
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
            acceptButtonText: this.intl.t('iam.users.index.delete-users'),
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
            title: this.intl.t('iam.users.index.new-user'),
            confirm: (modal) => {
                modal.startLoading();

                user.save()
                    .then(() => {
                        modal.done();
                        this.notifications.success(this.intl.t('iam.users.index.user-invited-join-your-organization-success'));
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
            title: this.intl.t('iam.users.index.edit-user-title'),
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
                        this.notifications.success(this.intl.t('iam.users.index.user-changes-saved-success'));
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
            return this.notifications.error(this.intl.t('iam.users.index.error-you-cant-delete-yourself'));
        }

        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.delete-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.data-assosciated-user-delete'),
            confirm: (modal) => {
                modal.startLoading();
                return user.removeFromCurrentCompany().then(() => {
                    this.notifications.success(this.intl.t('iam.users.index.delete-user-success-message', { userName: user.get('name') }));
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
            title: this.intl.t('iam.users.index.deactivate-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.access-account-or-resources-unless-re-activated'),
            confirm: (modal) => {
                modal.startLoading();
                return user.deactivate().then(() => {
                    this.notifications.success(this.intl.t('iam.users.index.deactivate-user-success-message', { userName: user.get('name') }));
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
            title: this.intl.t('iam.users.index.re-activate-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.this-user-will-regain-access-to-your-organization'),
            confirm: (modal) => {
                modal.startLoading();
                return user.activate().then(() => {
                    this.notifications.success(this.intl.t('iam.users.index.re-activate-user-success-message', { userName: user.get('name') }));
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
            title: this.intl.t('iam.users.index.resend-invitation-to-join-organization'),
            body: this.intl.t('iam.users.index.confirming-fleetbase-will-re-send-invitation-for-user-to-join-your-organization'),
            confirm: (modal) => {
                modal.startLoading();
                return user.resendInvite().then(() => {
                    this.notifications.success(this.intl.t('iam.users.index.invitation-resent'));
                    this.hostRouter.refresh();
                });
            },
        });
    }
}
