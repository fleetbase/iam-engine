import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class PoliciesIndexController extends Controller {
    @service policyActions;
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
    @service iam;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['view_policy', 'page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status', 'service', 'type'];

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
    @tracked view_policy;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = 'name';

    /**
     * All services for policies.
     *
     * @memberof PoliciesIndexController
     */
    @tracked services = [];

    /**
     * All types of policies.
     *
     * @memberof PoliciesIndexController
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
            permission: 'iam view policy',
            onClick: this.editPolicy,
            width: '20%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '35%',
        },
        {
            label: this.intl.t('iam.common.service'),
            valuePath: 'service',
            sortable: false,
            width: '10%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.services,
        },
        {
            label: this.intl.t('iam.common.type'),
            valuePath: 'type',
            sortable: false,
            width: '10%',
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
            ddMenuLabel: this.intl.t('iam.policies.index.policy-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '15%',
            actions: [
                {
                    label: this.intl.t('iam.policies.index.edit-policy'),
                    fn: this.editPolicy,
                    permission: 'iam view policy',
                },
                {
                    label: this.intl.t('iam.policies.index.delete-policy'),
                    fn: this.deletePolicy,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'iam delete policy',
                },
            ],
        },
    ];

    /**
     * Creates an instance of PoliciesIndexController.
     * @memberof PoliciesIndexController
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
    @action bulkDeletePolicies() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('iam.policies.index.delete-policies'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    // Dialog and lifecycle actions live in the policy-actions service so other engines can open them too.
    @action createPolicy(...args) {
        return this.policyActions.createPolicy(...args);
    }

    @action editPolicy(...args) {
        return this.policyActions.editPolicy(...args);
    }

    @action viewPolicyPermissions(...args) {
        return this.policyActions.viewPolicyPermissions(...args);
    }

    @action deletePolicy(...args) {
        return this.policyActions.deletePolicy(...args);
    }

    /**
     * Toggles dialog to export API credentials
     *
     * @void
     */
    @action exportPolicies() {
        this.crud.export('policy');
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    @action async openDeepLinkedResource() {
        const resourceId = this.view_policy;

        if (!resourceId) {
            return;
        }

        try {
            const record = this.store.peekRecord('policy', resourceId) ?? (await this.store.findRecord('policy', resourceId));
            this.editPolicy(record, {
                onDecline: this.clearDeepLinkedResource,
                onFinish: this.clearDeepLinkedResource,
            });
        } catch (_) {
            this.notifications.warning('Unable to open the selected IAM resource.');
            this.clearDeepLinkedResource();
        }
    }

    @action clearDeepLinkedResource() {
        if (!this.view_policy) {
            return;
        }

        this.view_policy = null;
        this.hostRouter.transitionTo({ queryParams: { view_policy: null } });
    }
}
