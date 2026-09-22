import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';

/**
 * User actions shared by the IAM pages and other engines (for example Fleetbase AI), so the
 * same dialogs open from anywhere in the console.
 */
export default class UserActionsService extends ResourceActionService {
    constructor() {
        super(...arguments);
        this.initialize('user', { permissionPrefix: 'iam', mountPrefix: 'console.iam' });
    }

    transition = {
        list: () => this.transitionTo('users.index'),
    };

    modal = {
        create: (...args) => this.createUser(...args),
        edit: (...args) => this.editUser(...args),
        invite: (...args) => this.inviteUser(...args),
        viewPermissions: (...args) => this.viewUserPermissions(...args),
        changePassword: (...args) => this.changeUserPassword(...args),
        changeEmail: (...args) => this.changeUserEmail(...args),
    };

    /**
     * View user permissions.
     *
     * @param {UserModel} user
     * @memberof UserActionsService
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
     * Opens the dialog for this resource
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
            allowEmailEdit: true,
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
     * Opens the dialog for this resource
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
            allowEmailEdit: false,
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
     * Confirms and deletes the resource
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
        return this.markVerified(user, 'email');
    }

    /**
     * Manually mark a user's email or phone as verified, bypassing verification.
     *
     * @param {UserModel} user
     * @param {String} channel `email` or `phone`
     * @void
     */
    @action markVerified(user, channel = 'email') {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.mark-verified-title', { userName: user.get('name'), channel: this.channelLabel(channel) }),
            body: this.intl.t('iam.users.index.mark-verified-prompt', { channel: this.channelLabel(channel) }),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.patch(`users/verify/${user.id}`, { channel });
                    this.notifications.success(this.intl.t('iam.users.index.user-verified-success-message', { userName: user.get('name') }));
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
     * Send the user a link to verify their email or phone.
     *
     * @param {UserModel} user
     * @param {String} channel `email` or `phone`
     * @void
     */
    @action sendVerification(user, channel = 'email') {
        const destination = user.get(channel);

        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.send-verification-title', { channel: this.channelLabel(channel) }),
            body: this.intl.t('iam.users.index.send-verification-prompt', { userName: user.get('name'), destination }),
            acceptButtonText: this.intl.t('iam.users.index.send-verification'),
            acceptButtonIcon: 'paper-plane',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.post(`users/${user.id}/send-verification`, { channel });
                    this.notifications.success(this.intl.t('iam.users.index.verification-sent', { destination }));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * The translated name of a verification channel.
     *
     * @param {String} channel `email` or `phone`
     * @return {String}
     */
    channelLabel(channel) {
        return this.intl.t(channel === 'phone' ? 'iam.users.index.channel-phone' : 'iam.users.index.channel-email');
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
     * Change email for a user
     *
     * @void
     */
    @action changeUserEmail(user) {
        this.modalsManager.show('modals/change-user-email', {
            keepOpen: true,
            user,
            onEmailChangeComplete: () => {
                return this.hostRouter.refresh();
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
}
