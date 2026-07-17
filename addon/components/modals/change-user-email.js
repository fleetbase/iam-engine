import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';

export default class ModalsChangeUserEmailComponent extends Component {
    @service fetch;
    @service intl;
    @service notifications;

    @tracked options = {};
    @tracked email;
    @tracked user;

    constructor(owner, { options }) {
        super(...arguments);
        this.user = options.user;
        this.options = options;
        this.setupOptions();
    }

    setupOptions() {
        this.options.title = this.intl.t('iam.components.modals.change-user-email.title');
        this.options.acceptButtonText = this.intl.t('iam.components.modals.change-user-email.send-verification');
        this.options.declineButtonHidden = true;
        this.options.confirm = async (modal) => {
            modal.startLoading();

            if (isBlank(this.email)) {
                this.notifications.warning(this.intl.t('iam.components.modals.change-user-email.email-required'));
                return modal.stopLoading();
            }

            try {
                await this.fetch.post(`users/${this.user.id}/change-email`, {
                    email: this.email,
                });

                this.notifications.success(this.intl.t('iam.components.modals.change-user-email.verification-sent'));

                if (typeof this.options.onEmailChangeComplete === 'function') {
                    this.options.onEmailChangeComplete();
                }

                modal.done();
            } catch (error) {
                this.notifications.serverError(error);
                modal.stopLoading();
            }
        };
    }
}
