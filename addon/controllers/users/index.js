import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked, cached } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class UsersIndexController extends Controller {
    @service userActions;
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
                id: 'refresh',
                icon: 'refresh',
                onClick: () => this.hostRouter.refresh(),
                helpText: this.intl.t('common.refresh'),
            },
            {
                id: 'invite-user',
                text: this.intl.t('iam.users.index.invite-user'),
                type: 'default',
                icon: 'paper-plane',
                permission: 'iam create user',
                onClick: this.inviteUser,
            },
            {
                id: 'create-user',
                text: this.intl.t('common.new'),
                type: 'primary',
                icon: 'plus',
                permission: 'iam create user',
                onClick: this.createUser,
            },
            {
                id: 'export-users',
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
                id: 'bulk-delete-users',
                label: this.intl.t('common.delete-selected-count', { count: selected.length }),
                class: 'text-red-500',
                fn: this.bulkDeleteUsers,
            },
        ];
    }

    queryParams = this.userActions.queryParamsFor([
        'view_user',
        'page',
        'limit',
        'sort',
        'query',
        'type',
        'created_by',
        'updated_by',
        'status',
        'role',
        'name',
        'phone',
        'email',
        'email_verified',
        'phone_verified',
        'country',
        'timezone',
    ]);
    @tracked page = 1;
    @tracked limit;
    @tracked query;
    @tracked view_user;

    @tracked name;
    @tracked phone;
    @tracked email;
    @tracked role;
    @tracked email_verified;
    @tracked phone_verified;
    @tracked country;
    @tracked timezone;
    @tracked sort = '-created_at';

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked baseColumns = [
        {
            id: 'name',
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
            id: 'email',
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
            id: 'phone',
            label: this.intl.t('iam.common.phone'),
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            id: 'role-name',
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
            id: 'session-status',
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
            id: 'email-verified-at',
            label: this.intl.t('iam.users.index.email-verified'),
            valuePath: 'email_verified_at',
            contactPath: 'email',
            cellComponent: 'table/cell/verification-status',
            sortable: false,
            filterable: true,
            filterComponent: 'filter/select',
            filterParam: 'email_verified',
            filterOptions: this.verificationFilterOptions,
        },
        {
            id: 'phone-verified-at',
            label: this.intl.t('iam.users.index.phone-verified'),
            valuePath: 'phone_verified_at',
            contactPath: 'phone',
            cellComponent: 'table/cell/verification-status',
            sortable: false,
            filterable: true,
            filterComponent: 'filter/select',
            filterParam: 'phone_verified',
            filterOptions: this.verificationFilterOptions,
        },
        {
            id: 'country',
            label: this.intl.t('iam.common.country'),
            valuePath: 'country',
            cellComponent: 'table/cell/country',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/country',
            filterParam: 'country',
        },
        {
            id: 'timezone',
            label: this.intl.t('iam.users.index.timezone'),
            valuePath: 'timezone',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
            filterParam: 'timezone',
        },
        {
            id: 'date-of-birth',
            label: this.intl.t('iam.users.index.date-of-birth'),
            valuePath: 'date_of_birth',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: false,
        },
        {
            id: 'ip-address',
            label: this.intl.t('iam.users.index.ip-address'),
            valuePath: 'ip_address',
            cellComponent: 'click-to-copy',
            hidden: true,
            resizable: true,
            sortable: false,
            filterable: false,
        },
        {
            id: 'last-login',
            label: this.intl.t('iam.users.index.last-login'),
            valuePath: 'lastLogin',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            id: 'created-at',
            label: this.intl.t('iam.users.index.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            id: 'updated-at',
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
            id: 'row-actions',
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
                    id: 'edit-user',
                    label: this.intl.t('iam.users.index.edit-user'),
                    fn: this.editUser,
                    permission: 'iam view user',
                },
                {
                    id: 'view-user-permissions',
                    label: this.intl.t('iam.users.index.view-user-permissions'),
                    fn: this.viewUserPermissions,
                    permission: 'iam view user',
                },
                {
                    id: 'resend-invitation',
                    label: this.intl.t('iam.users.index.re-send-invitation'),
                    fn: this.resendInvitation,
                    permission: 'iam update user',
                    isVisible: (user) => user.get('session_status') === 'pending',
                },
                {
                    id: 'deactivate-user',
                    label: this.intl.t('iam.users.index.deactivate-user'),
                    fn: this.deactivateUser,
                    className: 'text-danger',
                    permission: 'iam deactivate user',
                    isVisible: (user) => user.get('session_status') === 'active',
                },
                {
                    id: 'activate-user',
                    label: this.intl.t('iam.users.index.activate-user'),
                    fn: this.activateUser,
                    className: 'text-danger',
                    permission: 'iam activate user',
                    isVisible: (user) => user.get('session_status') === 'inactive' || (this.currentUser.user.is_admin && user.get('session_status') === 'pending'),
                },
                {
                    id: 'send-email-verification',
                    label: this.intl.t('iam.users.index.send-email-verification'),
                    fn: (user) => this.userActions.sendVerification(user, 'email'),
                    permission: 'iam verify user',
                    isVisible: (user) => this.canVerify(user, 'email'),
                },
                {
                    id: 'send-phone-verification',
                    label: this.intl.t('iam.users.index.send-phone-verification'),
                    fn: (user) => this.userActions.sendVerification(user, 'phone'),
                    permission: 'iam verify user',
                    isVisible: (user) => this.canVerify(user, 'phone'),
                },
                {
                    id: 'mark-email-verified',
                    label: this.intl.t('iam.users.index.mark-email-verified'),
                    fn: (user) => this.userActions.markVerified(user, 'email'),
                    className: 'text-danger',
                    permission: 'iam verify user',
                    isVisible: (user) => this.canVerify(user, 'email'),
                },
                {
                    id: 'mark-phone-verified',
                    label: this.intl.t('iam.users.index.mark-phone-verified'),
                    fn: (user) => this.userActions.markVerified(user, 'phone'),
                    className: 'text-danger',
                    permission: 'iam verify user',
                    isVisible: (user) => this.canVerify(user, 'phone'),
                },
                {
                    id: 'change-user-password',
                    label: this.intl.t('iam.users.index.change-user-password'),
                    fn: this.changeUserPassword,
                    className: 'text-danger',
                    isVisible: (user) => this.abilities.can('iam change-password-for user') || user.role_name === 'Administrator' || user.is_admin === true,
                },
                {
                    id: 'change-user-email',
                    label: this.intl.t('iam.users.index.change-user-email'),
                    fn: this.changeUserEmail,
                    className: 'text-danger',
                    isVisible: () => this.abilities.can('iam change-email-for user') || this.currentUser.user.role_name === 'Administrator' || this.currentUser.user.is_admin === true,
                },
                {
                    id: 'delete-user',
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
     * The columns with what extensions registered under `iam:table:user` merged in.
     * The table and its header (`users.hbs`) render separately, so both read this.
     *
     * @var {Array}
     */
    @cached get columns() {
        return this.userActions.mergeRegisteredColumns(this.baseColumns, { controller: this });
    }

    /**
     * Options for the email/phone verified column filters.
     *
     * @var {Array}
     */
    get verificationFilterOptions() {
        return [
            { label: this.intl.t('iam.users.index.verified'), value: 'true' },
            { label: this.intl.t('iam.users.index.unverified'), value: 'false' },
        ];
    }

    /**
     * Whether the user's email or phone can be verified: it is set and not yet verified.
     *
     * @param {UserModel} user
     * @param {String} channel `email` or `phone`
     * @return {Boolean}
     */
    canVerify(user, channel) {
        return Boolean(user.get(channel)) && !user.get(`${channel}_verified_at`);
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

    // Dialog and lifecycle actions live in the user-actions service so other engines can open them too.
    @action viewUserPermissions(...args) {
        return this.userActions.viewUserPermissions(...args);
    }

    @action inviteUser(...args) {
        return this.userActions.inviteUser(...args);
    }

    @action createUser(...args) {
        return this.userActions.createUser(...args);
    }

    @action editUser(...args) {
        return this.userActions.editUser(...args);
    }

    @action deleteUser(...args) {
        return this.userActions.deleteUser(...args);
    }

    @action deactivateUser(...args) {
        return this.userActions.deactivateUser(...args);
    }

    @action activateUser(...args) {
        return this.userActions.activateUser(...args);
    }

    @action verifyUser(...args) {
        return this.userActions.verifyUser(...args);
    }

    @action changeUserPassword(...args) {
        return this.userActions.changeUserPassword(...args);
    }

    @action changeUserEmail(...args) {
        return this.userActions.changeUserEmail(...args);
    }

    @action resendInvitation(...args) {
        return this.userActions.resendInvitation(...args);
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    @action async openDeepLinkedResource() {
        const resourceId = this.view_user;

        if (!resourceId) {
            return;
        }

        try {
            const record = this.store.peekRecord('user', resourceId) ?? (await this.store.findRecord('user', resourceId));
            this.editUser(record, {
                onDecline: this.clearDeepLinkedResource,
                onFinish: this.clearDeepLinkedResource,
            });
        } catch (_) {
            this.notifications.warning('Unable to open the selected IAM resource.');
            this.clearDeepLinkedResource();
        }
    }

    @action clearDeepLinkedResource() {
        if (!this.view_user) {
            return;
        }

        this.view_user = null;
        this.hostRouter.transitionTo({ queryParams: { view_user: null } });
    }
}
