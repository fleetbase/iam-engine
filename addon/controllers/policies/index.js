import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class PoliciesIndexController extends Controller {
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
     * All columns applicable for roles
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: 'Name',
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            onClick: this.editPolicy,
            width: '20%',
            sortable: false,
        },
        {
            label: 'Description',
            valuePath: 'description',
            sortable: false,
            width: '40%',
        },
        {
            label: 'Type',
            valuePath: 'type',
            sortable: false,
            width: '20%',
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
                    label: 'Edit policy...',
                    fn: this.editPolicy,
                },
                {
                    label: 'Delete policy...',
                    fn: this.deletePolicy,
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
     * Bulk deletes selected `role` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeletePolicies() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: 'Delete Policies',
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createPolicy() {
        const policy = this.store.createRecord('policy', {
            is_mutable: true,
            is_deletable: true,
        });

        this.editPolicy(policy, {
            title: 'New Policy',
            confirm: (modal) => {
                modal.startLoading();
                return policy.save().then(() => {
                    this.notifications.success('New policy created.');
                    return this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editPolicy(policy, options = {}) {
        if (!policy.is_mutable) {
            return this.notifications.warning(`Unable to make changes to a ${policy.type} policy.`);
        }

        this.modalsManager.show('modals/policy-form', {
            title: 'Edit Policy',
            policy,
            confirm: (modal) => {
                modal.startLoading();
                return policy.save().then(() => {
                    this.notifications.success('Changes to policy saved.');
                    return this.hostRouter.refresh();
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
    @action deletePolicy(policy) {
        if (!policy.is_deletable) {
            return this.notifications.warning(`Unable to delete a ${policy.type} policy.`);
        }

        this.modalsManager.confirm({
            title: `Delete (${policy.name || 'Untitled'}) policy`,
            body: 'Are you sure you want to delete this policy? All data assosciated with this policy will also be deleted. This action cannot be undone.',
            confirm: (modal) => {
                modal.startLoading();
                return policy.destroyRecord().then((policy) => {
                    this.notifications.success(`Policy (${policy.name}) deleted.`);
                    return this.hostRouter.refresh();
                });
            },
        });
    }

    /**
     * Toggles dialog to export API credentials
     *
     * @void
     */
    @action exportPolicies() {
        this.crud.export('policy');
    }
}
