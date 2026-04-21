import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class UsersIndexController extends Controller {
    @service store;
    @service intl;
    @service notifications;
    @service currentUser;
    @service modalsManager;
    @service hostRouter;
    @service crud;
    @service fetch;
    @service abilities;
    @service filters;
    @service tableContext;

    /** action buttons */
    get actionButtons() {
        return [
            {
                icon: 'refresh',
                onClick: () => this.hostRouter.refresh(),
                helpText: this.intl.t('common.refresh'),
            },
            {
                text: this.intl.t('iam.users.index.invite-user'),
                type: 'default',
                icon: 'paper-plane',
                permission: 'iam create user',
                onClick: this.inviteUser,
            },
            {
                text: this.intl.t('common.new'),
                type: 'primary',
                icon: 'plus',
                permission: 'iam create user',
                onClick: this.createUser,
            },
            {
                text: this.intl.t('common.export'),
                icon: 'long-arrow-up',
                iconClass: 'rotate-icon-45',
                wrapperClass: 'hidden md:flex',
                permission: 'iam export user',
                onClick: this.exportUsers,
            },
        ];
    }

    /** bulk actions */
    get bulkActions() {
        const selected = this.tableContext.getSelectedRows();

        return [
            {
                label: this.intl.t('common.delete-selected-count', { count: selected.length }),
                class: 'text-red-500',
                fn: this.bulkDeleteUsers,
            },
        ];
    }

    queryParams = ['page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status', 'role', 'name', 'phone', 'email'];
    @tracked page = 1;
    @tracked limit;
    @tracked query;
    @tracked name;
    @tracked phone;
    @tracked email;
    @tracked role;
    @tracked sort = '-created_at';

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            sticky: true,
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/user-name',
            permission: 'iam view user',
            mediaPath: 'avatar_url',
            action: this.editUser,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            sticky: true,
            label: this.intl.t('iam.common.email'),
            valuePath: 'email',
            cellComponent: 'click-to-copy',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('iam.common.phone'),
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('iam.common.role'),
            valuePath: 'role.name',
            sortable: false,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select role',
            filterParam: 'role',
            model: 'role',
        },
        {
            label: this.intl.t('iam.common.status'),
            valuePath: 'session_status',
            sortable: false,
            cellComponent: 'table/cell/status',
            filterable: true,
            filterComponent: 'filter/select',
            filterParam: 'status',
            filterOptions: ['pending', 'active', 'inactive'],
        },
        {
            label: this.intl.t('iam.users.index.last-login'),
            valuePath: 'lastLogin',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('iam.users.index.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('iam.users.index.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
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
            ddMenuLabel: this.intl.t('iam.users.index.user-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            sticky: 'right',
            width: 60,
            actions: [
                {
                    label: this.intl.t('iam.users.index.edit-user'),
                    fn: this.editUser,
                    permission: 'iam view user',
                },
                {
                    label: this.intl.t('iam.users.index.view-user-permissions'),
                    fn: this.viewUserPermissions,
                    permission: 'iam view user',
                },
                {
                    label: this.intl.t('iam.users.index.re-send-invitation'),
                    fn: this.resendInvitation,
                    permission: 'iam update user',
                    isVisible: (user) => user.get('session_status') === 'pending',
                },
                {
                    label: this.intl.t('iam.users.index.deactivate-user'),
                    fn: this.deactivateUser,
                    className: 'text-danger',
                    permission: 'iam deactivate user',
                    isVisible: (user) => user.get('session_status') === 'active',
                },
                {
                    label: this.intl.t('iam.users.index.activate-user'),
                    fn: this.activateUser,
                    className: 'text-danger',
                    permission: 'iam activate user',
                    isVisible: (user) => user.get('session_status') === 'inactive' || (this.currentUser.user.is_admin && user.get('session_status') === 'pending'),
                },
                {
                    label: this.intl.t('iam.users.index.verify-user'),
                    fn: this.verifyUser,
                    className: 'text-danger',
                    permission: 'iam verify user',
                    isVisible: (user) => !user.get('email_verified_at'),
                },
                {
                    label: this.intl.t('iam.users.index.change-user-password'),
                    fn: this.changeUserPassword,
                    className: 'text-danger',
                    isVisible: (user) => this.abilities.can('iam change-password-for user') || user.role_name === 'Administrator' || user.is_admin === true,
                },
                {
                    label: this.intl.t('iam.users.index.delete-user'),
                    fn: this.deleteUser,
                    className: 'text-danger',
                    permission: 'iam delete user',
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
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('users', { params: { selections } });
    }

    /**
     * View user permissions.
     *
     * @param {UserModel} user
     * @memberof UsersIndexController
     */
    @action viewUserPermissions(user) {
        this.modalsManager.show('modals/view-user-permissions', {
            title: this.intl.t('iam.components.modals.view-user-permissions.view-permissions', { userName: user.name }),
            hideDeclineButton: true,
            acceptButtonText: this.intl.t('common.done'),
            user,
        });
    }

    /**
     * Opens the Invite User dialog.
     *
     * Sends only an email (and optional name / role) to POST users/invite-user.
     * The backend handles both cases transparently:
     *   - Email already in the system → cross-organisation invite issued.
     *   - Brand-new email → pending user created and invite email sent.
     *
     * The response includes `invited: true` when an existing user was invited,
     * allowing the frontend to display the appropriate success message.
     *
     * @void
     */
    @action inviteUser() {
        this.modalsManager.show('modals/invite-user', {
            title: this.intl.t('iam.users.invite.title'),
            acceptButtonText: this.intl.t('iam.users.invite.send-invitation'),
            acceptButtonIcon: 'paper-plane',
            email: '',
            name: '',
            role: null,
            confirm: async (modal) => {
                modal.startLoading();

                const email = modal.getOption('email');
                const name = modal.getOption('name');
                const role = modal.getOption('role');

                if (!email) {
                    this.notifications.warning(this.intl.t('iam.users.invite.email-required'));
                    return modal.stopLoading();
                }

                try {
                    const response = await this.fetch.post('users/invite-user', {
                        user: {
                            email,
                            name,
                            role_uuid: role ? role.id : undefined,
                        },
                    });

                    const wasExistingUser = response && response.invited === true;
                    this.notifications.success(wasExistingUser ? this.intl.t('iam.users.invite.invitation-sent-existing') : this.intl.t('iam.users.invite.invitation-sent-new'));

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
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createUser() {
        const formPermission = 'iam create user';
        const user = this.store.createRecord('user', {
            status: 'pending',
            type: 'user',
        });

        this.editUser(user, {
            title: this.intl.t('iam.users.index.new-user'),
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
                    await user.save();
                    this.notifications.success(this.intl.t('iam.users.index.new-user-created'));
                    this.hostRouter.refresh();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editUser(user, options = {}) {
        const formPermission = 'iam update user';
        this.modalsManager.show('modals/user-form', {
            title: this.intl.t('iam.users.index.edit-user-title'),
            modalClass: 'modal-lg',
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            keepOpen: true,
            formPermission,
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
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await user.save();
                    this.notifications.success(this.intl.t('iam.users.index.user-changes-saved-success'));
                    this.hostRouter.refresh();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);

                    // If error is because email address was made empty rollback changes
                    if (error && typeof error.message === 'string' && error.message.includes('Email address cannot be empty')) {
                        user.rollbackAttributes();
                    }

                    modal.stopLoading();
                }
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
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await user.removeFromCurrentCompany();
                    this.notifications.success(this.intl.t('iam.users.index.delete-user-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
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
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await user.deactivate();
                    this.notifications.success(this.intl.t('iam.users.index.deactivate-user-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Activate a user
     *
     * @void
     */
    @action activateUser(user) {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.re-activate-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.this-user-will-regain-access-to-your-organization'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await user.activate();
                    this.notifications.success(this.intl.t('iam.users.index.re-activate-user-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Verify a user
     *
     * @void
     */
    @action verifyUser(user) {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.verify-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.verify-user-manually-prompt'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await user.verify();
                    this.notifications.success(this.intl.t('iam.users.index.user-verified-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Change password for a user
     *
     * @void
     */
    @action changeUserPassword(user) {
        this.modalsManager.show('modals/change-user-password', {
            keepOpen: true,
            user,
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
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await user.resendInvite();
                    this.notifications.success(this.intl.t('iam.users.index.invitation-resent'));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
}
